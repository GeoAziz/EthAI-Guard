# Federated Learning Support

## Overview

EthixAI now supports **Federated Learning** - a distributed approach to fairness evaluation that enables:

1. **Distributed Fairness Evaluation** - Compute fairness metrics locally at edge nodes
2. **Privacy-Preserving Analytics** - Apply differential privacy before aggregating results
3. **Edge Model Validation** - Validate model predictions for fairness without centralizing data

This architecture enables organizations to evaluate AI fairness across multiple deployments while maintaining data locality and privacy guarantees.

## Architecture

### Components

```
Edge Nodes (e.g., regional deployments)
    ↓ (compute local metrics)
Local Fairness Metrics
    ↓ (apply differential privacy)
Privacy-Preserving Metrics
    ↓ (aggregate securely)
Central Coordinator
    ↓
Aggregated Fairness Report
```

### Federated Nodes

Each edge node:
- Computes fairness metrics locally on their data
- Applies differential privacy before sharing
- Maintains privacy budget tracking
- Supports Byzantine-robust aggregation

### Central Coordinator

The central coordinator:
- Registers and monitors federated nodes
- Aggregates metrics from multiple nodes
- Tracks aggregation history
- Provides compliance reporting

## API Reference

### Backend Routes (`/api/federated`)

#### Register Node
```bash
POST /api/federated/register-node
```

Register a new federated learning node.

**Request:**
```json
{
  "nodeId": "region_us_west",
  "nodeName": "US West Regional Deployment",
  "nodeType": "edge",
  "endpoint": "http://region-west.local:8100",
  "location": {
    "region": "us-west-2",
    "latitude": 37.8,
    "longitude": -122.3
  }
}
```

**Response:**
```json
{
  "nodeId": "region_us_west",
  "status": "registered",
  "message": "Node region_us_west registered successfully"
}
```

#### List Nodes
```bash
GET /api/federated/nodes
```

Get all federated nodes for the tenant.

#### Get Node Status
```bash
GET /api/federated/nodes/{nodeId}
```

Get detailed status of a specific node.

#### Aggregate Fairness Metrics
```bash
POST /api/federated/aggregate
```

Trigger aggregation from multiple nodes with optional privacy settings.

**Request:**
```json
{
  "nodeMetrics": {
    "region_us_west": {
      "demographic_parity_difference": 0.08,
      "equal_opportunity_difference": 0.05
    },
    "region_us_east": {
      "demographic_parity_difference": 0.12,
      "equal_opportunity_difference": 0.09
    }
  },
  "aggregationMethod": "weighted_average",
  "weights": {
    "region_us_west": 300,
    "region_us_east": 500
  },
  "byzantineNodes": 0
}
```

**Response:**
```json
{
  "aggregationId": "agg-12345",
  "aggregatedMetrics": {
    "demographic_parity_difference": 0.10,
    "equal_opportunity_difference": 0.07
  },
  "confidenceScores": {
    "demographic_parity_difference": 0.95,
    "equal_opportunity_difference": 0.92
  },
  "violations": [
    {
      "metricName": "equal_opportunity_difference",
      "value": 0.07,
      "threshold": 0.10,
      "severityLevel": "low"
    }
  ],
  "complianceStatus": "compliant",
  "numNodes": 2,
  "aggregationMethod": "weighted_average"
}
```

#### Get Aggregations
```bash
GET /api/federated/aggregations?limit=20&offset=0
```

Retrieve aggregation history.

#### Validate Edge Model
```bash
POST /api/federated/validate-model
```

Validate a model's fairness at an edge node.

**Request:**
```json
{
  "modelPredictions": [0, 1, 1, 0, 1, 0],
  "trueLabels": [0, 1, 1, 0, 1, 0],
  "protectedAttribute": [0, 0, 1, 1, 0, 1],
  "minConfidence": 0.8
}
```

**Response:**
```json
{
  "is_valid": true,
  "metrics": {
    "demographic_parity_difference": 0.05,
    "equal_opportunity_difference": 0.02
  },
  "violations": [],
  "timestamp": 1625097600.0
}
```

#### Network Health
```bash
GET /api/federated/health
```

Get overall federated network health status.

#### Analytics
```bash
GET /api/federated/analytics?days=30
```

Get analytics on federated learning activity.

### AI Core Routes (`/federated`)

#### Register Node with AI Core
```bash
POST /ai_core/federated/register-node
```

#### Compute Local Metrics
```bash
POST /ai_core/federated/compute-local-metrics
```

**Request:**
```json
{
  "node_id": "edge_1",
  "y_true": [0, 1, 0, 1],
  "y_pred": [0, 1, 0, 1],
  "sensitive_attr": [0, 0, 1, 1],
  "dataset_size": 1000,
  "protected_attr_name": "gender"
}
```

#### Apply Differential Privacy
```bash
POST /ai_core/federated/apply-privacy
```

**Request:**
```json
{
  "node_id": "edge_1",
  "metrics": {
    "demographic_parity_difference": 0.15
  },
  "epsilon": 1.0
}
```

#### Aggregate Metrics
```bash
POST /ai_core/federated/aggregate-metrics
```

**Request:**
```json
{
  "node_metrics": {
    "edge_1": {"metric": 0.1},
    "edge_2": {"metric": 0.2}
  },
  "aggregation_method": "weighted_average",
  "weights": {"edge_1": 1.0, "edge_2": 1.0},
  "byzantine_nodes": 0
}
```

#### Validate Edge Model
```bash
POST /ai_core/federated/validate-edge-model
```

#### Node Heartbeat
```bash
POST /ai_core/federated/node-heartbeat/{node_id}
```

Record a heartbeat from a node.

#### Node Health
```bash
GET /ai_core/federated/health/nodes
```

Get health status of all federated nodes.

## Differential Privacy

### Privacy Budget Management

Each node has an epsilon budget that controls the total privacy protection:

- **ε (Epsilon)**: Privacy budget. Smaller values = stronger privacy = more noise
- **δ (Delta)**: Failure probability (typically 1e-5 to 1e-6)
- **Sensitivity**: Maximum change in metric from single data point

### Configuration

```python
from ai_core.governance.federated_learning import DifferentialPrivacyConfig

config = DifferentialPrivacyConfig(
    epsilon=1.0,           # Privacy budget
    delta=1e-5,           # Failure probability
    sensitivity=1.0,      # Metric sensitivity
    noise_mechanism="laplace"  # or "gaussian"
)
```

### Noise Mechanisms

**Laplace Mechanism:**
- Adds Laplace-distributed noise
- Provides (ε, 0)-differential privacy
- Recommended for discrete metrics

**Gaussian Mechanism:**
- Adds Gaussian-distributed noise
- Provides (ε, δ)-differential privacy
- Better for continuous metrics

## Aggregation Methods

### 1. Weighted Average (Default)
```python
aggregated = FederatedAggregator.weighted_average(
    metrics_list=[node1_metrics, node2_metrics],
    weights=[300, 500]  # Based on dataset sizes
)
```

Best for: Known data distributions, equal trustworthiness

### 2. Median Aggregation
```python
aggregated = FederatedAggregator.median_aggregate(
    metrics_list=[node1_metrics, node2_metrics]
)
```

Best for: Outlier robustness, unknown distributions

### 3. Krum (Byzantine-Robust)
```python
aggregated = FederatedAggregator.krum_aggregate(
    metrics_list=[node1_metrics, node2_metrics],
    byzantine_nodes=1  # Number of potentially malicious nodes
)
```

Best for: Adversarial settings, untrusted nodes

## Usage Example

### Python (AI Core)

```python
from ai_core.governance.federated_learning import (
    FederatedLearningCoordinator,
    DifferentialPrivacyConfig
)
import numpy as np

# Initialize coordinator
coordinator = FederatedLearningCoordinator(
    dp_config=DifferentialPrivacyConfig(epsilon=1.0)
)

# Register nodes
node1 = coordinator.register_node("region_a")
node2 = coordinator.register_node("region_b")

# Simulate local data at nodes
y_true = np.array([0, 1, 0, 1, 0, 1])
y_pred = np.array([0, 1, 0, 1, 0, 1])
sensitive = np.array([0, 0, 1, 1, 0, 1])

# Compute local metrics
local_metrics1 = node1.compute_local_metrics(
    y_true=y_true,
    y_pred=y_pred,
    sensitive_attr=sensitive,
    dataset_size=1000,
    protected_attr_name="gender"
)

local_metrics2 = node2.compute_local_metrics(
    y_true=y_true,
    y_pred=y_pred,
    sensitive_attr=sensitive,
    dataset_size=2000,
    protected_attr_name="gender"
)

# Apply privacy
privacy1 = node1.apply_privacy(local_metrics1)
privacy2 = node2.apply_privacy(local_metrics2)

# Aggregate
node_metrics = {
    "region_a": privacy1.noisy_metrics,
    "region_b": privacy2.noisy_metrics,
}

aggregated, confidence = coordinator.aggregate_metrics(
    node_metrics=node_metrics,
    aggregation_method="weighted_average",
    weights={"region_a": 1000, "region_b": 2000}
)

print(f"Aggregated metrics: {aggregated}")
print(f"Confidence scores: {confidence}")
```

### Node.js Backend

```javascript
const axios = require('axios');

// Register a node
await axios.post('http://localhost:5000/api/federated/register-node', {
  nodeId: 'region_us_west',
  nodeName: 'US West Deployment',
  nodeType: 'edge',
  endpoint: 'http://region-west.local:8100'
});

// Get node list
const nodes = await axios.get('http://localhost:5000/api/federated/nodes');

// Aggregate metrics from nodes
const result = await axios.post(
  'http://localhost:5000/api/federated/aggregate',
  {
    nodeMetrics: {
      region_a: { demographic_parity_difference: 0.08 },
      region_b: { demographic_parity_difference: 0.12 }
    },
    aggregationMethod: 'weighted_average',
    weights: { region_a: 300, region_b: 500 }
  }
);

console.log('Aggregated:', result.data.aggregatedMetrics);
console.log('Compliance:', result.data.complianceStatus);
```

## Compliance Reporting

Aggregation results include compliance assessment:

```json
{
  "complianceStatus": "compliant",
  "violations": [
    {
      "metricName": "equal_opportunity_difference",
      "value": 0.05,
      "threshold": 0.10,
      "severityLevel": "low"
    }
  ]
}
```

### Status Values
- **compliant**: All metrics within thresholds
- **non_compliant**: One or more metric violations
- **warning**: Metrics near violation thresholds

### Severity Levels
- **low**: Minor violations (e.g., 1x threshold)
- **medium**: Moderate violations (e.g., 1-2x threshold)
- **high**: Severe violations (e.g., >2x threshold)

## Deployment Scenarios

### Scenario 1: Multi-Regional Fairness Monitoring

```
Region A Deployment
    ↓ compute metrics locally
Region B Deployment
    ↓ compute metrics locally
Region C Deployment
    ↓
Central Hub
    ↓ aggregates with differential privacy
Global Fairness Report
```

### Scenario 2: Edge Device Model Validation

```
Mobile App 1
    ↓ validate local model
Mobile App 2
    ↓ validate local model
Mobile App 3
    ↓
Edge Aggregator
    ↓ ensure fairness across devices
Quality Assurance Report
```

### Scenario 3: Vendor Compliance Monitoring

```
Vendor A (untrusted)
    ↓ provides metrics with privacy noise
Vendor B (untrusted)
    ↓ provides metrics with privacy noise
Vendor C (untrusted)
    ↓
Krum Aggregator (Byzantine-robust)
    ↓ outlier-resistant aggregation
Compliance Certificate
```

## Monitoring and Health

### Node Health Checking

```python
coordinator.get_healthy_nodes(timeout_seconds=300)
# Returns: ["region_a", "region_b"]
```

### Aggregation History

```python
history = coordinator.get_aggregation_history(limit=10)
# Returns: [
#   {
#     "timestamp": 1625097600.0,
#     "method": "weighted_average",
#     "num_nodes": 2,
#     "aggregated_metrics": {...},
#     "confidence_scores": {...}
#   }
# ]
```

### Privacy Budget Tracking

```python
node = coordinator.get_node("region_a")
remaining_epsilon = node.dp_engine.get_remaining_epsilon()
# Returns: 0.5 (out of initial 1.0)
```

## Security Considerations

1. **Transport Security**: Use TLS/HTTPS for all node communication
2. **Authentication**: Verify node identity before accepting metrics
3. **Data Signing**: Sign metrics with node certificates for integrity
4. **Rate Limiting**: Prevent aggregation attacks with request limits
5. **Access Control**: Restrict metric access to authorized users only

## Performance

- **Local Metric Computation**: ~50-100ms per node
- **Privacy Application**: ~10-20ms per node
- **Aggregation**: ~5-10ms (linear in number of nodes)
- **Total P95 Latency**: <200ms for 10 nodes

## Limitations

1. **Privacy-Accuracy Tradeoff**: Adding noise reduces metric precision
2. **Epsilon Budget**: Privacy budget is cumulative across aggregations
3. **Byzantine Robustness**: Krum requires n > 3f+1 (nodes > 3×malicious+1)
4. **Communication**: Network latency affects aggregation timing

## Future Enhancements

- Secure multiparty computation (SMC) for even stronger privacy
- Homomorphic encryption for encrypted metric aggregation
- Autonomous node discovery and dynamic registration
- Privacy-preserving model training across nodes
- Blockchain-based aggregation audit logs
