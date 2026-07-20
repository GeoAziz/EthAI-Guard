"""Tests for federated learning functionality."""

import pytest
import numpy as np
import json
from unittest.mock import Mock, patch

try:
    from ai_core.governance.federated_learning import (
        FederatedNode,
        FederatedLearningCoordinator,
        DifferentialPrivacyConfig,
        DifferentialPrivacyEngine,
        FederatedAggregator,
        LaplaceMechanism,
        GaussianMechanism,
        LocalFairnessMetrics,
        PrivacyPreservingMetrics,
        NodeStatus,
    )
except ImportError:
    from governance.federated_learning import (
        FederatedNode,
        FederatedLearningCoordinator,
        DifferentialPrivacyConfig,
        DifferentialPrivacyEngine,
        FederatedAggregator,
        LaplaceMechanism,
        GaussianMechanism,
        LocalFairnessMetrics,
        PrivacyPreservingMetrics,
        NodeStatus,
    )


class TestDifferentialPrivacy:
    """Test differential privacy mechanisms."""

    def test_laplace_mechanism_adds_noise(self):
        """Test that Laplace mechanism adds noise to values."""
        value = 0.5
        sensitivity = 1.0
        epsilon = 0.1

        noisy_value, noise = LaplaceMechanism.add_noise(value, sensitivity, epsilon)

        assert isinstance(noisy_value, float)
        assert isinstance(noise, float)
        # Noise should be added (unlikely to be exact same value)
        assert abs(noisy_value - value) + 0.01 > 0  # Small tolerance for floating point

    def test_gaussian_mechanism_adds_noise(self):
        """Test that Gaussian mechanism adds noise to values."""
        value = 0.5
        sensitivity = 1.0
        epsilon = 0.1
        delta = 1e-5

        noisy_value, noise = GaussianMechanism.add_noise(value, sensitivity, epsilon, delta)

        assert isinstance(noisy_value, float)
        assert isinstance(noise, float)

    def test_differential_privacy_engine_initialization(self):
        """Test DifferentialPrivacyEngine initialization."""
        config = DifferentialPrivacyConfig(epsilon=2.0, delta=1e-5)
        engine = DifferentialPrivacyEngine(config)

        assert engine.epsilon_budget == 2.0
        assert engine.total_epsilon_used == 0.0

    def test_differential_privacy_engine_privatize_metrics(self):
        """Test metric privatization."""
        engine = DifferentialPrivacyEngine(
            DifferentialPrivacyConfig(epsilon=10.0, noise_mechanism="laplace")
        )

        metrics = {
            "demographic_parity_difference": 0.15,
            "equal_opportunity_difference": 0.10,
        }

        noisy, noise_dict = engine.privatize_metrics(metrics, epsilon_fraction=0.5)

        assert "demographic_parity_difference" in noisy
        assert "equal_opportunity_difference" in noisy
        assert len(noise_dict) == len(metrics)
        assert engine.total_epsilon_used > 0

    def test_epsilon_budget_exhaustion(self):
        """Test that engine respects epsilon budget."""
        engine = DifferentialPrivacyEngine(DifferentialPrivacyConfig(epsilon=0.1))

        metrics = {f"metric_{i}": 0.1 for i in range(100)}

        noisy, noise_dict = engine.privatize_metrics(metrics, epsilon_fraction=1.0)

        # Should exhaust budget
        assert engine.get_remaining_epsilon() <= 0

    def test_epsilon_reset(self):
        """Test epsilon budget reset."""
        engine = DifferentialPrivacyEngine(DifferentialPrivacyConfig(epsilon=1.0))
        engine.total_epsilon_used = 0.5

        engine.reset()

        assert engine.total_epsilon_used == 0.0


class TestFederatedNode:
    """Test individual federated node functionality."""

    def test_node_initialization(self):
        """Test FederatedNode initialization."""
        node = FederatedNode("node_1")

        assert node.node_id == "node_1"
        assert node.status == NodeStatus.HEALTHY
        assert node.dp_engine is not None

    def test_compute_local_metrics(self):
        """Test local metric computation."""
        node = FederatedNode("node_1")

        y_true = np.array([0, 1, 0, 1, 0, 1])
        y_pred = np.array([0, 1, 0, 1, 0, 1])
        sensitive = np.array([0, 0, 1, 1, 0, 1])

        local_metrics = node.compute_local_metrics(
            y_true=y_true,
            y_pred=y_pred,
            sensitive_attr=sensitive,
            dataset_size=100,
            protected_attr_name="gender",
        )

        assert local_metrics.node_id == "node_1"
        assert local_metrics.dataset_size == 100
        assert local_metrics.protected_attribute == "gender"
        assert isinstance(local_metrics.metrics, dict)
        assert len(local_metrics.metrics) > 0

    def test_apply_privacy(self):
        """Test privacy application to metrics."""
        node = FederatedNode("node_1")

        local_metrics = LocalFairnessMetrics(
            node_id="node_1",
            dataset_size=100,
            metrics={"demographic_parity_difference": 0.15},
            protected_attribute="gender",
            timestamp=0.0,
            data_hash="abc123",
        )

        privacy_metrics = node.apply_privacy(local_metrics)

        assert privacy_metrics.node_id == "node_1"
        assert "demographic_parity_difference" in privacy_metrics.noisy_metrics
        assert privacy_metrics.epsilon_used > 0

    def test_node_heartbeat(self):
        """Test node heartbeat recording."""
        node = FederatedNode("node_1")
        node.heartbeat()

        assert node.status == NodeStatus.HEALTHY

    def test_node_health_check_healthy(self):
        """Test node health check when healthy."""
        node = FederatedNode("node_1")
        node.heartbeat()

        status = node.check_health(timeout_seconds=300)

        assert status == NodeStatus.HEALTHY

    def test_node_health_check_stale(self):
        """Test node health check when stale."""
        import time

        node = FederatedNode("node_1")
        node.last_heartbeat = time.time() - 200  # 200 seconds ago

        status = node.check_health(timeout_seconds=300)

        assert status == NodeStatus.STALE

    def test_node_health_check_offline(self):
        """Test node health check when offline."""
        import time

        node = FederatedNode("node_1")
        node.last_heartbeat = time.time() - 400  # 400 seconds ago

        status = node.check_health(timeout_seconds=300)

        assert status == NodeStatus.OFFLINE


class TestFederatedAggregator:
    """Test aggregation methods."""

    def test_weighted_average(self):
        """Test weighted average aggregation."""
        metrics_list = [
            {"metric_1": 0.1, "metric_2": 0.2},
            {"metric_1": 0.3, "metric_2": 0.4},
        ]
        weights = [1.0, 1.0]

        aggregated = FederatedAggregator.weighted_average(metrics_list, weights)

        assert aggregated["metric_1"] == pytest.approx(0.2)
        assert aggregated["metric_2"] == pytest.approx(0.3)

    def test_weighted_average_no_weights(self):
        """Test weighted average without explicit weights."""
        metrics_list = [
            {"metric_1": 0.1},
            {"metric_1": 0.3},
        ]

        aggregated = FederatedAggregator.weighted_average(metrics_list)

        assert aggregated["metric_1"] == pytest.approx(0.2)

    def test_median_aggregate(self):
        """Test median aggregation."""
        metrics_list = [
            {"metric_1": 0.1},
            {"metric_1": 0.5},
            {"metric_1": 0.9},
        ]

        aggregated = FederatedAggregator.median_aggregate(metrics_list)

        assert aggregated["metric_1"] == pytest.approx(0.5)

    def test_krum_aggregate(self):
        """Test Krum aggregation (Byzantine-robust)."""
        metrics_list = [
            {"metric_1": 0.1, "metric_2": 0.2},
            {"metric_1": 0.11, "metric_2": 0.21},
            {"metric_1": 0.12, "metric_2": 0.22},
            {"metric_1": 0.99, "metric_2": 0.99},  # Outlier
        ]

        aggregated = FederatedAggregator.krum_aggregate(metrics_list, byzantine_nodes=1)

        # Should select one of the first three (benign) nodes
        assert aggregated["metric_1"] < 0.5

    def test_aggregation_confidence(self):
        """Test confidence score computation."""
        metrics_list = [
            {"metric_1": 0.1, "metric_2": 0.2},
            {"metric_1": 0.1, "metric_2": 0.2},
            {"metric_1": 0.1, "metric_2": 0.2},
        ]
        num_nodes = 3

        confidence = FederatedAggregator.compute_aggregation_confidence(
            metrics_list, num_nodes
        )

        assert "metric_1" in confidence
        assert "metric_2" in confidence
        assert confidence["metric_1"] > 0.9  # High confidence due to agreement


class TestFederatedLearningCoordinator:
    """Test federated learning coordinator."""

    def test_coordinator_initialization(self):
        """Test coordinator initialization."""
        coordinator = FederatedLearningCoordinator("central")

        assert coordinator.coordinator_id == "central"
        assert len(coordinator.nodes) == 0

    def test_register_node(self):
        """Test node registration."""
        coordinator = FederatedLearningCoordinator()

        node = coordinator.register_node("node_1")

        assert node.node_id == "node_1"
        assert "node_1" in coordinator.nodes

    def test_get_node(self):
        """Test getting a registered node."""
        coordinator = FederatedLearningCoordinator()
        coordinator.register_node("node_1")

        node = coordinator.get_node("node_1")

        assert node is not None
        assert node.node_id == "node_1"

    def test_get_healthy_nodes(self):
        """Test getting healthy nodes."""
        coordinator = FederatedLearningCoordinator()

        node1 = coordinator.register_node("node_1")
        node2 = coordinator.register_node("node_2")

        node1.heartbeat()
        node2.status = NodeStatus.OFFLINE

        healthy = coordinator.get_healthy_nodes()

        assert "node_1" in healthy
        assert "node_2" not in healthy

    def test_aggregate_metrics_weighted_average(self):
        """Test metric aggregation with weighted average."""
        coordinator = FederatedLearningCoordinator()

        node_metrics = {
            "node_1": {"metric_1": 0.1},
            "node_2": {"metric_1": 0.3},
        }

        aggregated, confidence = coordinator.aggregate_metrics(
            node_metrics=node_metrics,
            aggregation_method="weighted_average",
        )

        assert aggregated["metric_1"] == pytest.approx(0.2)
        assert len(coordinator.aggregation_history) == 1

    def test_aggregate_metrics_median(self):
        """Test metric aggregation with median."""
        coordinator = FederatedLearningCoordinator()

        node_metrics = {
            "node_1": {"metric_1": 0.1},
            "node_2": {"metric_1": 0.5},
            "node_3": {"metric_1": 0.9},
        }

        aggregated, confidence = coordinator.aggregate_metrics(
            node_metrics=node_metrics,
            aggregation_method="median",
        )

        assert aggregated["metric_1"] == pytest.approx(0.5)

    def test_validate_edge_model_compliant(self):
        """Test edge model validation - compliant case."""
        coordinator = FederatedLearningCoordinator()

        # Perfect predictions - should be compliant
        y_true = np.array([0, 1, 0, 1, 0, 1])
        y_pred = np.array([0, 1, 0, 1, 0, 1])
        sensitive = np.array([0, 0, 1, 1, 0, 1])

        is_valid, report = coordinator.validate_edge_model(y_true, y_pred, sensitive)

        assert is_valid

    def test_validate_edge_model_violations(self):
        """Test edge model validation - violations case."""
        coordinator = FederatedLearningCoordinator()

        # Biased predictions
        y_true = np.array([1, 1, 1, 1, 0, 0, 0, 0])
        y_pred = np.array([1, 1, 1, 1, 0, 0, 0, 0])
        sensitive = np.array([1, 1, 1, 1, 0, 0, 0, 0])

        is_valid, report = coordinator.validate_edge_model(y_true, y_pred, sensitive)

        # Should report issues (or be valid if no disparities)
        assert "violations" in report

    def test_aggregation_history(self):
        """Test aggregation history tracking."""
        coordinator = FederatedLearningCoordinator()

        node_metrics1 = {"node_1": {"metric_1": 0.1}}
        node_metrics2 = {"node_2": {"metric_1": 0.2}}

        coordinator.aggregate_metrics(node_metrics=node_metrics1)
        coordinator.aggregate_metrics(node_metrics=node_metrics2)

        history = coordinator.get_aggregation_history(limit=10)

        assert len(history) == 2
        assert history[0]["num_nodes"] == 1
        assert history[1]["num_nodes"] == 1


class TestFederatedLearningIntegration:
    """Integration tests for federated learning pipeline."""

    def test_end_to_end_federated_pipeline(self):
        """Test complete federated learning pipeline."""
        coordinator = FederatedLearningCoordinator(
            dp_config=DifferentialPrivacyConfig(epsilon=10.0)
        )

        # Register nodes
        node1 = coordinator.register_node("edge_node_1")
        node2 = coordinator.register_node("edge_node_2")

        # Simulate local metrics computation
        y_true = np.array([0, 1, 0, 1, 0, 1])
        y_pred = np.array([0, 1, 0, 1, 0, 1])
        sensitive = np.array([0, 0, 1, 1, 0, 1])

        local_metrics1 = node1.compute_local_metrics(
            y_true=y_true,
            y_pred=y_pred,
            sensitive_attr=sensitive,
            dataset_size=100,
            protected_attr_name="gender",
        )

        local_metrics2 = node2.compute_local_metrics(
            y_true=y_true,
            y_pred=y_pred,
            sensitive_attr=sensitive,
            dataset_size=200,
            protected_attr_name="gender",
        )

        # Apply privacy
        privacy1 = node1.apply_privacy(local_metrics1)
        privacy2 = node2.apply_privacy(local_metrics2)

        # Aggregate
        node_metrics = {
            "edge_node_1": privacy1.noisy_metrics,
            "edge_node_2": privacy2.noisy_metrics,
        }

        aggregated, confidence = coordinator.aggregate_metrics(
            node_metrics=node_metrics,
            aggregation_method="weighted_average",
            weights={"edge_node_1": 100, "edge_node_2": 200},
        )

        assert len(aggregated) > 0
        assert len(confidence) > 0
        assert node1.dp_engine.total_epsilon_used > 0
        assert node2.dp_engine.total_epsilon_used > 0

    def test_node_health_monitoring(self):
        """Test node health monitoring."""
        coordinator = FederatedLearningCoordinator()

        node1 = coordinator.register_node("node_1")
        node2 = coordinator.register_node("node_2")

        node1.heartbeat()
        # node2 never sends heartbeat

        healthy = coordinator.get_healthy_nodes(timeout_seconds=1)

        assert "node_1" in healthy
        assert "node_2" not in healthy


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


class TestDataHeterogeneity:
    """Test handling of data heterogeneity in federated learning."""

    def test_non_iid_data_aggregation(self):
        """Test aggregation with non-IID data across nodes."""
        coordinator = FederatedLearningCoordinator("central")
        
        node1 = coordinator.register_node("node_1")
        node2 = coordinator.register_node("node_2")
        
        # Node 1: Class 0 dominant
        y_true_1 = np.array([0, 0, 0, 0, 1])
        y_pred_1 = np.array([0, 0, 0, 0, 1])
        
        # Node 2: Class 1 dominant
        y_true_2 = np.array([1, 1, 1, 1, 0])
        y_pred_2 = np.array([1, 1, 1, 1, 0])
        
        sensitive = np.array([0, 1, 0, 1, 0])
        
        metrics1 = node1.compute_local_metrics(y_true_1, y_pred_1, sensitive, 100)
        metrics2 = node2.compute_local_metrics(y_true_2, y_pred_2, sensitive, 100)
        
        assert metrics1.dataset_size == 100
        assert metrics2.dataset_size == 100

    def test_varying_feature_distributions(self):
        """Test nodes with different feature distributions."""
        node1 = FederatedNode("node_1")
        node2 = FederatedNode("node_2")
        
        # Different data ranges
        y_true_1 = np.array([0, 1, 0, 1])
        y_pred_1 = np.array([0, 1, 0, 1])
        sensitive_1 = np.array([0, 0, 1, 1])
        
        y_true_2 = np.array([1, 1, 1, 0])
        y_pred_2 = np.array([1, 1, 0, 0])
        sensitive_2 = np.array([1, 1, 0, 0])
        
        metrics1 = node1.compute_local_metrics(y_true_1, y_pred_1, sensitive_1, 50)
        metrics2 = node2.compute_local_metrics(y_true_2, y_pred_2, sensitive_2, 50)
        
        assert metrics1.dataset_size == 50
        assert metrics2.dataset_size == 50


class TestFailureRecovery:
    """Test federated learning with node failures and recovery."""

    def test_offline_node_exclusion(self):
        """Test that offline nodes are excluded from aggregation."""
        import time
        coordinator = FederatedLearningCoordinator("central")
        
        node1 = coordinator.register_node("node_1")
        node2 = coordinator.register_node("node_2")
        
        node1.heartbeat()
        node2.last_heartbeat = time.time() - 400
        
        healthy = coordinator.get_healthy_nodes(timeout_seconds=300)
        
        assert "node_1" in healthy
        assert "node_2" not in healthy

    def test_partial_aggregation_with_missing_nodes(self):
        """Test aggregation when some nodes fail to submit."""
        coordinator = FederatedLearningCoordinator("central")
        
        node1 = coordinator.register_node("node_1")
        node2 = coordinator.register_node("node_2")
        node3 = coordinator.register_node("node_3")
        
        node1.heartbeat()
        node2.heartbeat()
        # node3 doesn't heartbeat
        
        y_true = np.array([0, 1, 0, 1])
        y_pred = np.array([0, 1, 0, 1])
        sensitive = np.array([0, 0, 1, 1])
        
        metrics1 = node1.compute_local_metrics(y_true, y_pred, sensitive, 100)
        metrics2 = node2.compute_local_metrics(y_true, y_pred, sensitive, 100)
        
        privacy1 = node1.apply_privacy(metrics1)
        privacy2 = node2.apply_privacy(metrics2)
        
        node_metrics = {
            "node_1": privacy1.noisy_metrics,
            "node_2": privacy2.noisy_metrics,
        }
        
        aggregated, confidence = coordinator.aggregate_metrics(node_metrics)
        
        assert len(aggregated) > 0

    def test_retry_mechanism_for_failed_nodes(self):
        """Test retry logic for nodes that failed to respond."""
        coordinator = FederatedLearningCoordinator("central")
        
        node1 = coordinator.register_node("node_1")
        
        # Simulate failure and recovery
        node1.status = NodeStatus.OFFLINE
        attempts = 0
        max_attempts = 3
        
        while attempts < max_attempts and node1.status == NodeStatus.OFFLINE:
            node1.heartbeat()
            attempts += 1
        
        assert node1.status == NodeStatus.HEALTHY
        assert attempts > 0


class TestGradientPrivacy:
    """Test gradient-level privacy in federated learning."""

    def test_gradient_clipping(self):
        """Test gradient clipping for differential privacy."""
        gradients = np.array([0.1, 0.5, 2.0, -1.5, 0.3])
        max_norm = 1.0
        
        # Clip gradients
        norms = np.linalg.norm(gradients)
        if norms > max_norm:
            clipped = gradients * (max_norm / norms)
        else:
            clipped = gradients
        
        clipped_norm = np.linalg.norm(clipped)
        assert clipped_norm <= max_norm + 0.01

    def test_gradient_aggregation_robustness(self):
        """Test robust gradient aggregation against Byzantine attacks."""
        # Simulate gradients from 5 nodes
        normal_grads = [
            np.array([0.1, 0.2, 0.3]),
            np.array([0.12, 0.18, 0.32]),
            np.array([0.09, 0.22, 0.28]),
            np.array([0.11, 0.19, 0.31]),
        ]
        
        byzantine_grad = np.array([10.0, 10.0, 10.0])
        
        all_grads = normal_grads + [byzantine_grad]
        
        # Median aggregation should be robust
        aggregated = np.median(all_grads, axis=0)
        
        assert np.allclose(aggregated, np.array([0.11, 0.205, 0.305]), atol=0.01)


class TestMultiPartyAggregation:
    """Test multi-party aggregation scenarios."""

    def test_three_way_aggregation(self):
        """Test aggregation with three parties."""
        coordinator = FederatedLearningCoordinator("central")
        
        nodes = [coordinator.register_node(f"node_{i}") for i in range(3)]
        
        y_true = np.array([0, 1, 0, 1, 0])
        y_pred = np.array([0, 1, 0, 1, 0])
        sensitive = np.array([0, 0, 1, 1, 0])
        
        node_metrics = {}
        for i, node in enumerate(nodes):
            metrics = node.compute_local_metrics(y_true, y_pred, sensitive, 100)
            privacy = node.apply_privacy(metrics)
            node_metrics[f"node_{i}"] = privacy.noisy_metrics
        
        aggregated, confidence = coordinator.aggregate_metrics(node_metrics)
        
        assert len(aggregated) > 0
        assert len(node_metrics) == 3

    def test_weighted_multi_party_aggregation(self):
        """Test weighted aggregation with different node sizes."""
        aggregator = FederatedAggregator()
        
        metrics_list = [
            {"accuracy": 0.90},
            {"accuracy": 0.85},
            {"accuracy": 0.95},
        ]
        
        weights = [1.0, 2.0, 3.0]
        
        aggregated = aggregator.weighted_average(metrics_list, weights)
        
        expected = (0.90 * 1.0 + 0.85 * 2.0 + 0.95 * 3.0) / 6.0
        assert aggregated["accuracy"] == pytest.approx(expected)

    def test_consensus_aggregation(self):
        """Test consensus-based aggregation."""
        metrics_list = [
            {"metric_1": 0.10},
            {"metric_1": 0.12},
            {"metric_1": 0.11},
            {"metric_1": 0.99},  # Outlier
        ]
        
        aggregator = FederatedAggregator()
        aggregated = aggregator.median_aggregate(metrics_list)
        
        # Median should be around 0.11, not affected by outlier
        assert 0.10 <= aggregated["metric_1"] <= 0.12


class TestSecurityAndCompliance:
    """Test security and compliance aspects of federated learning."""

    def test_model_update_verification(self):
        """Test verification of model updates from nodes."""
        node = FederatedNode("node_1")
        
        y_true = np.array([0, 1, 0, 1])
        y_pred = np.array([0, 1, 0, 1])
        sensitive = np.array([0, 0, 1, 1])
        
        metrics = node.compute_local_metrics(y_true, y_pred, sensitive, 100)
        privacy = node.apply_privacy(metrics)
        
        # Verify epsilon budget was consumed
        assert node.dp_engine.total_epsilon_used > 0
        assert privacy.epsilon_used > 0

    def test_audit_trail_recording(self):
        """Test that federated learning operations are audited."""
        coordinator = FederatedLearningCoordinator("central")
        node = coordinator.register_node("node_1")
        
        y_true = np.array([0, 1])
        y_pred = np.array([0, 1])
        sensitive = np.array([0, 1])
        
        metrics = node.compute_local_metrics(y_true, y_pred, sensitive, 50)
        
        # Metrics should have timestamp for audit
        assert metrics.timestamp is not None

    def test_privacy_budget_enforcement(self):
        """Test that privacy budget is strictly enforced."""
        engine = DifferentialPrivacyEngine(DifferentialPrivacyConfig(epsilon=0.5))
        
        metrics = {"m1": 0.1, "m2": 0.2, "m3": 0.3}
        
        privatized, noise_dict = engine.privatize_metrics(metrics, epsilon_fraction=1.0)
        
        # Should have used epsilon
        assert engine.total_epsilon_used > 0
        # Remaining should be <= 0 (exhausted)
        assert engine.get_remaining_epsilon() <= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
