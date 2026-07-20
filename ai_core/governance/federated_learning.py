"""Federated Learning Support: Distributed fairness evaluation with privacy preservation."""

from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import json
import hashlib
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import time

logger = logging.getLogger("ai_core.federated_learning")


class NodeStatus(Enum):
    HEALTHY = "healthy"
    STALE = "stale"
    OFFLINE = "offline"
    FAILED = "failed"


@dataclass
class DifferentialPrivacyConfig:
    """Configuration for differential privacy mechanisms."""
    epsilon: float = 1.0
    delta: float = 1e-5
    sensitivity: float = 1.0
    noise_mechanism: str = "laplace"  # laplace or gaussian


@dataclass
class LocalFairnessMetrics:
    """Local fairness metrics computed at edge node."""
    node_id: str
    dataset_size: int
    metrics: Dict[str, float]
    protected_attribute: str
    timestamp: float
    data_hash: str


@dataclass
class PrivacyPreservingMetrics:
    """Metrics with differential privacy applied."""
    node_id: str
    noisy_metrics: Dict[str, float]
    noise_added: Dict[str, float]
    epsilon_used: float
    timestamp: float


class LaplaceMechanism:
    """Laplace mechanism for differential privacy."""

    @staticmethod
    def add_noise(value: float, sensitivity: float, epsilon: float) -> Tuple[float, float]:
        """Add Laplace noise to a value.

        Args:
            value: The true value
            sensitivity: The global sensitivity of the value
            epsilon: Privacy budget (smaller = more privacy = more noise)

        Returns:
            Tuple of (noisy_value, noise_amount)
        """
        scale = sensitivity / epsilon
        noise = np.random.laplace(0, scale)
        return float(value + noise), float(noise)


class GaussianMechanism:
    """Gaussian mechanism for differential privacy."""

    @staticmethod
    def add_noise(value: float, sensitivity: float, epsilon: float, delta: float) -> Tuple[float, float]:
        """Add Gaussian noise to a value.

        Args:
            value: The true value
            sensitivity: The global sensitivity of the value
            epsilon: Privacy budget
            delta: Failure probability

        Returns:
            Tuple of (noisy_value, noise_amount)
        """
        sigma = np.sqrt(2 * np.log(1.25 / delta)) * sensitivity / epsilon
        noise = np.random.normal(0, sigma)
        return float(value + noise), float(noise)


class DifferentialPrivacyEngine:
    """Engine for applying differential privacy to fairness metrics."""

    def __init__(self, config: Optional[DifferentialPrivacyConfig] = None):
        self.config = config or DifferentialPrivacyConfig()
        self.epsilon_budget = self.config.epsilon
        self.total_epsilon_used = 0.0

    def privatize_metrics(
        self,
        metrics: Dict[str, float],
        epsilon_fraction: float = 0.5,
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        """Apply differential privacy to fairness metrics.

        Args:
            metrics: Dictionary of metric values
            epsilon_fraction: Fraction of epsilon budget to use

        Returns:
            Tuple of (noisy_metrics, noise_added_dict)
        """
        if self.total_epsilon_used >= self.epsilon_budget:
            logger.warning("epsilon_budget_exhausted")
            return metrics.copy(), {}

        available_epsilon = self.epsilon_budget - self.total_epsilon_used
        epsilon_per_metric = (available_epsilon * epsilon_fraction) / max(len(metrics), 1)

        noisy_metrics = {}
        noise_dict = {}

        for metric_name, value in metrics.items():
            if metric_name in ("disparate_impact_ratio",):
                # Bounded metric [0, 1] - lower sensitivity
                sensitivity = 1.0 / len(metrics) if len(metrics) > 0 else 1.0
            else:
                # Difference metric - sensitivity depends on sample size
                sensitivity = self.config.sensitivity

            if self.config.noise_mechanism == "laplace":
                noisy_val, noise = LaplaceMechanism.add_noise(
                    value, sensitivity, epsilon_per_metric
                )
            else:  # gaussian
                noisy_val, noise = GaussianMechanism.add_noise(
                    value, sensitivity, epsilon_per_metric, self.config.delta
                )

            noisy_metrics[metric_name] = noisy_val
            noise_dict[metric_name] = noise
            self.total_epsilon_used += epsilon_per_metric

        return noisy_metrics, noise_dict

    def get_remaining_epsilon(self) -> float:
        """Get remaining epsilon budget."""
        return max(0.0, self.epsilon_budget - self.total_epsilon_used)

    def reset(self) -> None:
        """Reset epsilon budget tracker."""
        self.total_epsilon_used = 0.0


class FederatedAggregator:
    """Aggregates fairness metrics from multiple federated nodes."""

    @staticmethod
    def weighted_average(
        metrics_list: List[Dict[str, float]],
        weights: Optional[List[float]] = None,
    ) -> Dict[str, float]:
        """Compute weighted average of metrics.

        Args:
            metrics_list: List of metric dictionaries from each node
            weights: Optional weights (e.g., based on dataset size)

        Returns:
            Aggregated metrics dictionary
        """
        if not metrics_list:
            return {}

        if weights is None:
            weights = [1.0] * len(metrics_list)

        # Normalize weights
        total_weight = sum(weights)
        if total_weight == 0:
            return {}
        weights = [w / total_weight for w in weights]

        # Aggregate each metric
        aggregated = {}
        all_keys = set()
        for m in metrics_list:
            all_keys.update(m.keys())

        for key in all_keys:
            values = []
            for i, m in enumerate(metrics_list):
                if key in m:
                    values.append(m[key] * weights[i])
            if values:
                aggregated[key] = sum(values)

        return aggregated

    @staticmethod
    def median_aggregate(
        metrics_list: List[Dict[str, float]],
    ) -> Dict[str, float]:
        """Compute median of metrics across nodes (robust to outliers).

        Args:
            metrics_list: List of metric dictionaries from each node

        Returns:
            Aggregated metrics dictionary using median
        """
        if not metrics_list:
            return {}

        aggregated = {}
        all_keys = set()
        for m in metrics_list:
            all_keys.update(m.keys())

        for key in all_keys:
            values = [m[key] for m in metrics_list if key in m]
            if values:
                aggregated[key] = float(np.median(values))

        return aggregated

    @staticmethod
    def krum_aggregate(
        metrics_list: List[Dict[str, float]],
        byzantine_nodes: int = 0,
    ) -> Dict[str, float]:
        """Byzantine-robust aggregation using Krum rule.

        Selects the metric vector that is closest to all other vectors,
        excluding the furthest `byzantine_nodes` outliers.

        Args:
            metrics_list: List of metric dictionaries
            byzantine_nodes: Number of potentially malicious nodes

        Returns:
            Selected metric dictionary
        """
        if not metrics_list:
            return {}

        if len(metrics_list) <= byzantine_nodes + 1:
            return metrics_list[0]  # Fallback to first

        # Convert to vectors
        all_keys = sorted(set(k for m in metrics_list for k in m.keys()))
        vectors = []
        for metrics in metrics_list:
            vec = np.array([metrics.get(k, 0.0) for k in all_keys])
            vectors.append(vec)

        vectors = np.array(vectors)

        # Compute pairwise distances
        distances = np.linalg.norm(vectors[:, None, :] - vectors[None, :, :], axis=-1)

        # For each node, sum distances to all others (excluding self)
        sum_distances = np.sum(distances, axis=1)

        # Select node with minimum distance sum
        selected_idx = np.argsort(sum_distances)[byzantine_nodes]

        return {k: float(vectors[selected_idx, i]) for i, k in enumerate(all_keys)}

    @staticmethod
    def compute_aggregation_confidence(
        metrics_list: List[Dict[str, float]],
        num_nodes: int,
    ) -> Dict[str, float]:
        """Compute confidence scores for aggregated metrics.

        High confidence = strong agreement between nodes.
        Low confidence = high variance.

        Args:
            metrics_list: List of metric dictionaries
            num_nodes: Total number of expected nodes

        Returns:
            Confidence scores per metric
        """
        if not metrics_list:
            return {}

        all_keys = set()
        for m in metrics_list:
            all_keys.update(m.keys())

        confidence = {}
        for key in all_keys:
            values = np.array([m[key] for m in metrics_list if key in m])
            if len(values) == 0:
                confidence[key] = 0.0
                continue

            # Variance-based confidence: 1 / (1 + std_dev)
            std_dev = float(np.std(values))
            confidence[key] = 1.0 / (1.0 + std_dev)

            # Participation bonus: factor in number of nodes that contributed
            participation_rate = len(values) / num_nodes if num_nodes > 0 else 0.0
            confidence[key] *= participation_rate

        return confidence


class FederatedNode:
    """Represents a federated learning node."""

    def __init__(
        self,
        node_id: str,
        dp_config: Optional[DifferentialPrivacyConfig] = None,
    ):
        self.node_id = node_id
        self.dp_engine = DifferentialPrivacyEngine(dp_config)
        self.last_heartbeat = time.time()
        self.status = NodeStatus.HEALTHY
        self.local_metrics_history: List[LocalFairnessMetrics] = []

    def compute_local_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        sensitive_attr: np.ndarray,
        dataset_size: int,
        protected_attr_name: str = "sensitive",
    ) -> LocalFairnessMetrics:
        """Compute local fairness metrics at this node.

        Args:
            y_true: True labels
            y_pred: Predictions
            sensitive_attr: Protected attribute values
            dataset_size: Total dataset size
            protected_attr_name: Name of protected attribute

        Returns:
            LocalFairnessMetrics object
        """
        try:
            from ai_core.utils.fairness import compute_all_metrics
        except ImportError:
            from utils.fairness import compute_all_metrics

        # Compute all available metrics
        metrics = compute_all_metrics(
            y_true=y_true,
            y_pred=y_pred,
            sensitive=sensitive_attr,
        )

        # Convert nested structures to floats
        flat_metrics = {}
        for k, v in metrics.items():
            if isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    flat_metrics[f"{k}_{sub_k}"] = float(sub_v)
            else:
                flat_metrics[k] = float(v)

        # Create data hash for integrity verification
        data_str = f"{dataset_size}_{protected_attr_name}_{len(y_true)}"
        data_hash = hashlib.sha256(data_str.encode()).hexdigest()[:16]

        local_metrics = LocalFairnessMetrics(
            node_id=self.node_id,
            dataset_size=dataset_size,
            metrics=flat_metrics,
            protected_attribute=protected_attr_name,
            timestamp=time.time(),
            data_hash=data_hash,
        )

        self.local_metrics_history.append(local_metrics)
        return local_metrics

    def apply_privacy(
        self,
        local_metrics: LocalFairnessMetrics,
    ) -> PrivacyPreservingMetrics:
        """Apply differential privacy to local metrics before sharing.

        Args:
            local_metrics: Local fairness metrics

        Returns:
            Privacy-preserving metrics object
        """
        noisy_metrics, noise_dict = self.dp_engine.privatize_metrics(local_metrics.metrics)

        return PrivacyPreservingMetrics(
            node_id=self.node_id,
            noisy_metrics=noisy_metrics,
            noise_added=noise_dict,
            epsilon_used=self.dp_engine.total_epsilon_used,
            timestamp=time.time(),
        )

    def heartbeat(self) -> None:
        """Record heartbeat to track node health."""
        self.last_heartbeat = time.time()
        self.status = NodeStatus.HEALTHY

    def check_health(self, timeout_seconds: float = 300.0) -> NodeStatus:
        """Check if node is responsive.

        Args:
            timeout_seconds: Timeout before marking as stale/offline

        Returns:
            Current node status
        """
        elapsed = time.time() - self.last_heartbeat
        if elapsed > timeout_seconds:
            self.status = NodeStatus.OFFLINE
        elif elapsed > timeout_seconds * 0.5:
            self.status = NodeStatus.STALE
        else:
            self.status = NodeStatus.HEALTHY

        return self.status


class FederatedLearningCoordinator:
    """Coordinates federated learning across multiple nodes."""

    def __init__(
        self,
        coordinator_id: str = "central",
        dp_config: Optional[DifferentialPrivacyConfig] = None,
    ):
        self.coordinator_id = coordinator_id
        self.nodes: Dict[str, FederatedNode] = {}
        self.dp_config = dp_config or DifferentialPrivacyConfig()
        self.aggregation_history: List[Dict[str, Any]] = []

    def register_node(self, node_id: str) -> FederatedNode:
        """Register a new federated node.

        Args:
            node_id: Unique node identifier

        Returns:
            FederatedNode instance
        """
        if node_id not in self.nodes:
            self.nodes[node_id] = FederatedNode(node_id, self.dp_config)
            logger.info(f"registered_federated_node: {node_id}")
        return self.nodes[node_id]

    def get_node(self, node_id: str) -> Optional[FederatedNode]:
        """Get a registered node."""
        return self.nodes.get(node_id)

    def get_healthy_nodes(self, timeout_seconds: float = 300.0) -> List[str]:
        """Get list of healthy node IDs.

        Args:
            timeout_seconds: Timeout for node responsiveness

        Returns:
            List of healthy node IDs
        """
        healthy = []
        for node_id, node in self.nodes.items():
            if node.check_health(timeout_seconds) == NodeStatus.HEALTHY:
                healthy.append(node_id)
        return healthy

    def aggregate_metrics(
        self,
        node_metrics: Dict[str, Dict[str, float]],
        aggregation_method: str = "weighted_average",
        weights: Optional[Dict[str, float]] = None,
        byzantine_nodes: int = 0,
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        """Aggregate fairness metrics from multiple nodes.

        Args:
            node_metrics: Dict of {node_id: metrics_dict}
            aggregation_method: "weighted_average", "median", or "krum"
            weights: Optional weights per node
            byzantine_nodes: Number of potentially malicious nodes (for krum)

        Returns:
            Tuple of (aggregated_metrics, confidence_scores)
        """
        if not node_metrics:
            return {}, {}

        metrics_list = list(node_metrics.values())

        if aggregation_method == "weighted_average":
            weights_list = None
            if weights:
                weights_list = [weights.get(nid, 1.0) for nid in node_metrics.keys()]
            aggregated = FederatedAggregator.weighted_average(metrics_list, weights_list)

        elif aggregation_method == "median":
            aggregated = FederatedAggregator.median_aggregate(metrics_list)

        elif aggregation_method == "krum":
            aggregated = FederatedAggregator.krum_aggregate(metrics_list, byzantine_nodes)

        else:
            aggregated = FederatedAggregator.weighted_average(metrics_list)

        # Compute confidence scores
        confidence = FederatedAggregator.compute_aggregation_confidence(
            metrics_list, len(self.nodes)
        )

        # Store in history
        self.aggregation_history.append({
            "timestamp": time.time(),
            "method": aggregation_method,
            "num_nodes": len(node_metrics),
            "aggregated_metrics": aggregated,
            "confidence_scores": confidence,
        })

        return aggregated, confidence

    def validate_edge_model(
        self,
        model_predictions: np.ndarray,
        true_labels: np.ndarray,
        protected_attribute: np.ndarray,
        min_confidence: float = 0.8,
    ) -> Tuple[bool, Dict[str, Any]]:
        """Validate an edge node's model predictions.

        Args:
            model_predictions: Model output
            true_labels: Ground truth
            protected_attribute: Protected attribute values
            min_confidence: Minimum required confidence in fairness

        Returns:
            Tuple of (is_valid, validation_report)
        """
        try:
            from ai_core.utils.fairness import compute_all_metrics
        except ImportError:
            from utils.fairness import compute_all_metrics

        metrics = compute_all_metrics(
            y_true=true_labels,
            y_pred=model_predictions,
            sensitive=protected_attribute,
        )

        # Check fairness metric violations
        violations = {}
        thresholds = {
            "demographic_parity_difference": 0.10,
            "equal_opportunity_difference": 0.10,
            "equalized_odds_difference": 0.10,
        }

        for metric_name, threshold in thresholds.items():
            value = metrics.get(metric_name, 0.0)
            if abs(value) > threshold:
                violations[metric_name] = {
                    "value": float(value),
                    "threshold": float(threshold),
                }

        is_valid = len(violations) == 0

        report = {
            "is_valid": is_valid,
            "metrics": metrics,
            "violations": violations,
            "timestamp": time.time(),
        }

        return is_valid, report

    def get_aggregation_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent aggregation history.

        Args:
            limit: Maximum number of recent records to return

        Returns:
            List of aggregation records
        """
        return self.aggregation_history[-limit:]
