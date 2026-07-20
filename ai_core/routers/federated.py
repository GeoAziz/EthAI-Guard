"""FastAPI router for federated learning endpoints."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, Depends, Header
import hmac
import logging
import os
import importlib

logger = logging.getLogger("ai_core.federated")

_ENV = os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development"))
_SERVICE_TOKEN = os.environ.get("AI_CORE_SERVICE_TOKEN")
if not _SERVICE_TOKEN and _ENV == "production":
    raise RuntimeError("AI_CORE_SERVICE_TOKEN is required in production to protect federated learning endpoints")


def verify_service_token(x_service_token: Optional[str] = Header(default=None)):
    """Require a shared service token from the backend on every federated
    learning route. These endpoints can register nodes, submit metrics into
    aggregation, and read cross-node status, so they must not be reachable
    by an unauthenticated caller (ai_core is published on its own port
    alongside the backend in docker-compose)."""
    if not _SERVICE_TOKEN:
        logger.warning("federated_endpoint_called_without_service_token_configured")
        return
    if not x_service_token or not hmac.compare_digest(x_service_token, _SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="invalid_or_missing_service_token")


router = APIRouter(
    prefix="/federated",
    tags=["federated-learning"],
    dependencies=[Depends(verify_service_token)],
)


class RegisterNodeRequest(BaseModel):
    node_id: str
    node_name: Optional[str] = None


class RegisterNodeResponse(BaseModel):
    node_id: str
    status: str
    message: str


class ComputeLocalMetricsRequest(BaseModel):
    node_id: str
    y_true: List[int]
    y_pred: List[int]
    sensitive_attr: List[int]
    dataset_size: int
    protected_attr_name: str = "sensitive"


class LocalMetricsResponse(BaseModel):
    node_id: str
    metrics: Dict[str, float]
    data_hash: str
    timestamp: float


class ApplyPrivacyRequest(BaseModel):
    node_id: str
    metrics: Dict[str, float]
    epsilon: Optional[float] = None


class PrivacyResponse(BaseModel):
    node_id: str
    noisy_metrics: Dict[str, float]
    noise_added: Dict[str, float]
    epsilon_used: float
    timestamp: float


class AggregateMetricsRequest(BaseModel):
    node_metrics: Dict[str, Dict[str, float]]
    aggregation_method: str = "weighted_average"
    weights: Optional[Dict[str, float]] = None
    byzantine_nodes: int = 0


class AggregateMetricsResponse(BaseModel):
    aggregated_metrics: Dict[str, float]
    confidence_scores: Dict[str, float]
    num_nodes: int
    aggregation_method: str
    timestamp: float


class ValidateEdgeModelRequest(BaseModel):
    model_predictions: List[float]
    true_labels: List[int]
    protected_attribute: List[int]
    min_confidence: float = 0.8


class ValidateEdgeModelResponse(BaseModel):
    is_valid: bool
    metrics: Dict[str, Any]
    violations: Dict[str, Dict[str, float]]
    timestamp: float


class NodeStatusResponse(BaseModel):
    node_id: str
    status: str
    last_heartbeat: float
    epsilon_remaining: float


class NodeHealthResponse(BaseModel):
    healthy_nodes: List[str]
    total_nodes: int
    timeout_seconds: float


# Global coordinator instance
_coordinator = None


def get_coordinator():
    """Get or initialize the federated learning coordinator."""
    global _coordinator
    if _coordinator is None:
        try:
            from ai_core.governance.federated_learning import FederatedLearningCoordinator, DifferentialPrivacyConfig
        except ImportError:
            from governance.federated_learning import FederatedLearningCoordinator, DifferentialPrivacyConfig

        dp_config = DifferentialPrivacyConfig(
            epsilon=1.0,
            delta=1e-5,
            sensitivity=1.0,
            noise_mechanism="laplace",
        )
        _coordinator = FederatedLearningCoordinator(dp_config=dp_config)
    return _coordinator


@router.post("/register-node", response_model=RegisterNodeResponse)
def register_node(req: RegisterNodeRequest):
    """Register a new federated learning node."""
    try:
        coordinator = get_coordinator()
        node = coordinator.register_node(req.node_id)
        return RegisterNodeResponse(
            node_id=req.node_id,
            status="registered",
            message=f"Node {req.node_id} registered successfully",
        )
    except Exception as e:
        logger.exception("register_node_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compute-local-metrics", response_model=LocalMetricsResponse)
def compute_local_metrics(req: ComputeLocalMetricsRequest):
    """Compute fairness metrics locally at an edge node."""
    try:
        import numpy as np

        coordinator = get_coordinator()
        node = coordinator.register_node(req.node_id)

        y_true = np.array(req.y_true)
        y_pred = np.array(req.y_pred)
        sensitive_attr = np.array(req.sensitive_attr)

        local_metrics = node.compute_local_metrics(
            y_true=y_true,
            y_pred=y_pred,
            sensitive_attr=sensitive_attr,
            dataset_size=req.dataset_size,
            protected_attr_name=req.protected_attr_name,
        )

        return LocalMetricsResponse(
            node_id=local_metrics.node_id,
            metrics=local_metrics.metrics,
            data_hash=local_metrics.data_hash,
            timestamp=local_metrics.timestamp,
        )
    except Exception as e:
        logger.exception("compute_local_metrics_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-privacy", response_model=PrivacyResponse)
def apply_privacy(req: ApplyPrivacyRequest):
    """Apply differential privacy to metrics before aggregation."""
    try:
        from ai_core.governance.federated_learning import LocalFairnessMetrics
        import time

        coordinator = get_coordinator()
        node = coordinator.get_node(req.node_id)

        if node is None:
            raise HTTPException(status_code=404, detail=f"Node {req.node_id} not found")

        # Create a local metrics object
        local_metrics = LocalFairnessMetrics(
            node_id=req.node_id,
            dataset_size=0,
            metrics=req.metrics,
            protected_attribute="sensitive",
            timestamp=time.time(),
            data_hash="",
        )

        privacy_metrics = node.apply_privacy(local_metrics)

        return PrivacyResponse(
            node_id=privacy_metrics.node_id,
            noisy_metrics=privacy_metrics.noisy_metrics,
            noise_added=privacy_metrics.noise_added,
            epsilon_used=privacy_metrics.epsilon_used,
            timestamp=privacy_metrics.timestamp,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("apply_privacy_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/aggregate-metrics", response_model=AggregateMetricsResponse)
def aggregate_metrics(req: AggregateMetricsRequest):
    """Aggregate fairness metrics from multiple federated nodes.

    NOTE: this accepts node_metrics directly rather than requiring they came
    through /apply-privacy, so a caller holding the service token can submit
    metrics that bypass the differential-privacy pipeline. The service-token
    check above restricts this to the trusted backend, but does not by
    itself guarantee DP was applied. If that guarantee needs to be
    enforced end-to-end, track provenance (e.g. require a data_hash issued
    by /apply-privacy for each node) before aggregating.
    """
    try:
        import time

        coordinator = get_coordinator()

        aggregated, confidence = coordinator.aggregate_metrics(
            node_metrics=req.node_metrics,
            aggregation_method=req.aggregation_method,
            weights=req.weights,
            byzantine_nodes=req.byzantine_nodes,
        )

        return AggregateMetricsResponse(
            aggregated_metrics=aggregated,
            confidence_scores=confidence,
            num_nodes=len(req.node_metrics),
            aggregation_method=req.aggregation_method,
            timestamp=time.time(),
        )
    except Exception as e:
        logger.exception("aggregate_metrics_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-edge-model", response_model=ValidateEdgeModelResponse)
def validate_edge_model(req: ValidateEdgeModelRequest):
    """Validate edge node model predictions for fairness violations."""
    try:
        import numpy as np

        coordinator = get_coordinator()

        is_valid, report = coordinator.validate_edge_model(
            model_predictions=np.array(req.model_predictions),
            true_labels=np.array(req.true_labels),
            protected_attribute=np.array(req.protected_attribute),
            min_confidence=req.min_confidence,
        )

        return ValidateEdgeModelResponse(
            is_valid=is_valid,
            metrics=report.get("metrics", {}),
            violations=report.get("violations", {}),
            timestamp=report.get("timestamp", 0.0),
        )
    except Exception as e:
        logger.exception("validate_edge_model_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node-status/{node_id}", response_model=NodeStatusResponse)
def get_node_status(node_id: str):
    """Get status of a specific federated node."""
    try:
        coordinator = get_coordinator()
        node = coordinator.get_node(node_id)

        if node is None:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

        return NodeStatusResponse(
            node_id=node_id,
            status=node.status.value,
            last_heartbeat=node.last_heartbeat,
            epsilon_remaining=node.dp_engine.get_remaining_epsilon(),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_node_status_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/node-heartbeat/{node_id}")
def node_heartbeat(node_id: str):
    """Record heartbeat from a federated node."""
    try:
        coordinator = get_coordinator()
        node = coordinator.get_node(node_id)

        if node is None:
            node = coordinator.register_node(node_id)

        node.heartbeat()
        return {"status": "ok", "node_id": node_id}
    except Exception as e:
        logger.exception("node_heartbeat_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/nodes", response_model=NodeHealthResponse)
def get_node_health(timeout_seconds: float = 300.0):
    """Get health status of all federated nodes."""
    try:
        coordinator = get_coordinator()
        healthy_nodes = coordinator.get_healthy_nodes(timeout_seconds)

        return NodeHealthResponse(
            healthy_nodes=healthy_nodes,
            total_nodes=len(coordinator.nodes),
            timeout_seconds=timeout_seconds,
        )
    except Exception as e:
        logger.exception("get_node_health_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/aggregation-history")
def get_aggregation_history(limit: int = 10):
    """Get recent aggregation history."""
    try:
        coordinator = get_coordinator()
        history = coordinator.get_aggregation_history(limit)
        return {"history": history, "count": len(history)}
    except Exception as e:
        logger.exception("get_aggregation_history_failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/coordinator-status")
def get_coordinator_status():
    """Get coordinator status and statistics."""
    try:
        coordinator = get_coordinator()
        return {
            "coordinator_id": coordinator.coordinator_id,
            "total_nodes": len(coordinator.nodes),
            "nodes": list(coordinator.nodes.keys()),
            "total_aggregations": len(coordinator.aggregation_history),
            "dp_config": {
                "epsilon": coordinator.dp_config.epsilon,
                "delta": coordinator.dp_config.delta,
                "noise_mechanism": coordinator.dp_config.noise_mechanism,
            },
        }
    except Exception as e:
        logger.exception("get_coordinator_status_failed")
        raise HTTPException(status_code=500, detail=str(e))
