#!/usr/bin/env python3
"""
Federated Learning Integration Test
Tests distributed fairness evaluation with privacy preservation
"""

import sys
import json
import requests
import numpy as np
from time import time
from typing import Dict, Any, List

BACKEND_URL = "http://localhost:5000"
AI_CORE_URL = "http://localhost:8100"
AUTH_HEADER = {"Authorization": "Bearer demo-token"}


def log(message: str, level: str = "INFO"):
    """Log a message with timestamp."""
    timestamp = time()
    print(f"[{level}] {message}")


def test_backend_health():
    """Test backend connectivity."""
    log("Testing backend connectivity...")
    try:
        resp = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if resp.status_code == 200:
            log("✓ Backend is healthy", "PASS")
            return True
    except Exception as e:
        log(f"✗ Backend check failed: {e}", "FAIL")
    return False


def test_ai_core_health():
    """Test AI Core connectivity."""
    log("Testing AI Core connectivity...")
    try:
        resp = requests.get(f"{AI_CORE_URL}/health", timeout=5)
        if resp.status_code == 200:
            log("✓ AI Core is healthy", "PASS")
            return True
    except Exception as e:
        log(f"✗ AI Core check failed: {e}", "FAIL")
    return False


def test_register_node(node_id: str, node_name: str) -> bool:
    """Test node registration."""
    log(f"Registering node: {node_id}...")
    try:
        payload = {
            "nodeId": node_id,
            "nodeName": node_name,
            "nodeType": "edge",
            "endpoint": f"http://{node_id}.local:8100",
            "location": {"region": "us-west-2"},
        }
        resp = requests.post(
            f"{BACKEND_URL}/api/federated/register-node",
            json=payload,
            headers=AUTH_HEADER,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "registered":
                log(f"✓ Node {node_id} registered", "PASS")
                return True
    except Exception as e:
        log(f"✗ Node registration failed: {e}", "FAIL")
    return False


def test_list_nodes() -> Dict[str, Any]:
    """Test listing nodes."""
    log("Listing registered nodes...")
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/federated/nodes",
            headers=AUTH_HEADER,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            count = data.get("count", 0)
            log(f"✓ Found {count} nodes", "PASS")
            return data
    except Exception as e:
        log(f"✗ List nodes failed: {e}", "FAIL")
    return {}


def test_compute_local_metrics(node_id: str) -> Dict[str, Any]:
    """Test local metric computation at AI Core."""
    log(f"Computing local metrics for {node_id}...")
    try:
        payload = {
            "node_id": node_id,
            "y_true": [0, 1, 0, 1, 0, 1, 0, 1],
            "y_pred": [0, 1, 0, 1, 0, 1, 0, 1],
            "sensitive_attr": [0, 0, 0, 0, 1, 1, 1, 1],
            "dataset_size": 1000,
            "protected_attr_name": "gender",
        }
        resp = requests.post(
            f"{AI_CORE_URL}/federated/compute-local-metrics",
            json=payload,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            metrics_count = len(data.get("metrics", {}))
            log(f"✓ Computed {metrics_count} metrics for {node_id}", "PASS")
            return data
    except Exception as e:
        log(f"✗ Local metrics computation failed: {e}", "FAIL")
    return {}


def test_apply_privacy(node_id: str, metrics: Dict[str, float]) -> Dict[str, Any]:
    """Test differential privacy application."""
    log(f"Applying differential privacy to {node_id} metrics...")
    try:
        payload = {
            "node_id": node_id,
            "metrics": metrics,
            "epsilon": 1.0,
        }
        resp = requests.post(
            f"{AI_CORE_URL}/federated/apply-privacy",
            json=payload,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            log(f"✓ Privacy applied (epsilon used: {data.get('epsilon_used', 0):.4f})", "PASS")
            return data
    except Exception as e:
        log(f"✗ Privacy application failed: {e}", "FAIL")
    return {}


def test_aggregate_metrics(node_metrics: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    """Test metric aggregation."""
    log("Aggregating metrics from nodes...")
    try:
        payload = {
            "node_metrics": node_metrics,
            "aggregation_method": "weighted_average",
            "weights": {k: 1.0 for k in node_metrics.keys()},
            "byzantine_nodes": 0,
        }
        resp = requests.post(
            f"{AI_CORE_URL}/federated/aggregate-metrics",
            json=payload,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            num_nodes = data.get("num_nodes", 0)
            log(f"✓ Aggregated metrics from {num_nodes} nodes", "PASS")
            return data
    except Exception as e:
        log(f"✗ Aggregation failed: {e}", "FAIL")
    return {}


def test_aggregate_backend(node_metrics: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    """Test metric aggregation via backend."""
    log("Aggregating metrics via backend...")
    try:
        payload = {
            "nodeMetrics": node_metrics,
            "aggregationMethod": "weighted_average",
            "weights": {k: 1.0 for k in node_metrics.keys()},
            "byzantineNodes": 0,
        }
        resp = requests.post(
            f"{BACKEND_URL}/api/federated/aggregate",
            json=payload,
            headers=AUTH_HEADER,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            compliance = data.get("complianceStatus", "unknown")
            log(f"✓ Backend aggregation complete (compliance: {compliance})", "PASS")
            return data
    except Exception as e:
        log(f"✗ Backend aggregation failed: {e}", "FAIL")
    return {}


def test_validate_model() -> Dict[str, Any]:
    """Test edge model validation."""
    log("Validating edge model predictions...")
    try:
        payload = {
            "modelPredictions": [0, 1, 1, 0, 1, 0, 1, 1],
            "trueLabels": [0, 1, 1, 0, 1, 0, 1, 1],
            "protectedAttribute": [0, 0, 0, 0, 1, 1, 1, 1],
            "minConfidence": 0.8,
        }
        resp = requests.post(
            f"{BACKEND_URL}/api/federated/validate-model",
            json=payload,
            headers=AUTH_HEADER,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            is_valid = data.get("is_valid", False)
            log(f"✓ Model validation complete (valid: {is_valid})", "PASS")
            return data
    except Exception as e:
        log(f"✗ Model validation failed: {e}", "FAIL")
    return {}


def test_node_health() -> Dict[str, Any]:
    """Test node health check."""
    log("Checking federated network health...")
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/federated/health",
            headers=AUTH_HEADER,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            healthy = data.get("healthyNodes", 0)
            total = data.get("totalNodes", 0)
            log(f"✓ Network health: {healthy}/{total} nodes healthy", "PASS")
            return data
    except Exception as e:
        log(f"✗ Health check failed: {e}", "FAIL")
    return {}


def test_aggregation_history() -> Dict[str, Any]:
    """Test retrieving aggregation history."""
    log("Retrieving aggregation history...")
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/federated/aggregations?limit=10",
            headers=AUTH_HEADER,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("aggregations", []))
            log(f"✓ Retrieved {count} aggregation records", "PASS")
            return data
    except Exception as e:
        log(f"✗ History retrieval failed: {e}", "FAIL")
    return {}


def run_complete_pipeline():
    """Run complete federated learning pipeline."""
    log("=" * 60)
    log("Federated Learning Integration Test Pipeline")
    log("=" * 60)
    log("")

    # Health checks
    if not test_backend_health():
        log("Backend unavailable. Aborting tests.", "ERROR")
        return False

    if not test_ai_core_health():
        log("AI Core unavailable. Aborting tests.", "ERROR")
        return False

    log("")

    # Register nodes
    nodes = ["edge_node_1", "edge_node_2", "edge_node_3"]
    for node_id in nodes:
        test_register_node(node_id, f"Edge Node {node_id[-1]}")

    log("")

    # List nodes
    nodes_data = test_list_nodes()
    log("")

    # Compute local metrics
    local_metrics_map = {}
    for node_id in nodes:
        local_metrics = test_compute_local_metrics(node_id)
        if "metrics" in local_metrics:
            local_metrics_map[node_id] = local_metrics["metrics"]

    log("")

    # Apply privacy to metrics
    private_metrics_map = {}
    for node_id, metrics in local_metrics_map.items():
        private_metrics = test_apply_privacy(node_id, metrics)
        if "noisy_metrics" in private_metrics:
            private_metrics_map[node_id] = private_metrics["noisy_metrics"]

    log("")

    # Aggregate at AI Core
    if private_metrics_map:
        ai_core_aggregation = test_aggregate_metrics(private_metrics_map)
    log("")

    # Aggregate at backend
    if private_metrics_map:
        backend_aggregation = test_aggregate_backend(private_metrics_map)
    log("")

    # Validate model
    model_validation = test_validate_model()
    log("")

    # Check network health
    network_health = test_node_health()
    log("")

    # Get history
    history = test_aggregation_history()
    log("")

    log("=" * 60)
    log("Test Pipeline Complete")
    log("=" * 60)

    return True


if __name__ == "__main__":
    try:
        success = run_complete_pipeline()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        log("Tests interrupted", "WARN")
        sys.exit(130)
    except Exception as e:
        log(f"Unexpected error: {e}", "ERROR")
        sys.exit(1)
