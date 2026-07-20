# Federated Learning Quick Start Guide

Get started with federated learning in 5 minutes.

## Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for integration tests)
- Node.js 14+ (for backend)

## 1. Start Services

```bash
# Start all services (backend, AI core, MongoDB)
make up

# Wait for services to be ready (~30 seconds)
# Check health: curl http://localhost:5000/health
```

## 2. Run Interactive Demo

```bash
cd tools/federated
chmod +x demo.sh
./demo.sh
```

This will:
- Register 3 regional nodes
- Display network health
- Aggregate fairness metrics
- Validate model predictions
- Show compliance status

**Expected output:**
```json
{
  "aggregationId": "agg-12345",
  "aggregatedMetrics": {
    "demographic_parity_difference": 0.087,
    "equal_opportunity_difference": 0.062
  },
  "complianceStatus": "compliant"
}
```

## 3. Run Automated Tests

```bash
cd tools/federated
python3 integration_test.py
```

**Expected output:**
```
[INFO] Testing backend connectivity...
[PASS] ✓ Backend is healthy
[PASS] ✓ Found 3 nodes
[PASS] ✓ Network health: 3/3 nodes healthy
...
Test Pipeline Complete
```

## API Quick Reference

### Register a Node
```bash
curl -X POST http://localhost:5000/api/federated/register-node \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "region_us_west",
    "nodeName": "US West",
    "nodeType": "edge"
  }'
```

### Compute Local Metrics
```bash
curl -X POST http://localhost:8100/federated/compute-local-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "region_us_west",
    "y_true": [0, 1, 0, 1, 0, 1],
    "y_pred": [0, 1, 0, 1, 0, 1],
    "sensitive_attr": [0, 0, 1, 1, 0, 1],
    "dataset_size": 1000,
    "protected_attr_name": "gender"
  }'
```

### Aggregate Metrics
```bash
curl -X POST http://localhost:5000/api/federated/aggregate \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeMetrics": {
      "region_us_west": {"demographic_parity_difference": 0.08},
      "region_us_east": {"demographic_parity_difference": 0.12}
    },
    "aggregationMethod": "weighted_average",
    "weights": {"region_us_west": 500, "region_us_east": 750}
  }'
```

### Check Network Health
```bash
curl http://localhost:5000/api/federated/health \
  -H "Authorization: Bearer demo-token" | jq
```

## Python Example

```python
from ai_core.governance.federated_learning import (
    FederatedLearningCoordinator,
    DifferentialPrivacyConfig
)
import numpy as np

# Create coordinator
coordinator = FederatedLearningCoordinator(
    dp_config=DifferentialPrivacyConfig(epsilon=1.0)
)

# Register nodes
node1 = coordinator.register_node("region_a")
node2 = coordinator.register_node("region_b")

# Simulate local data
y_true = np.array([0, 1, 0, 1, 0, 1])
y_pred = np.array([0, 1, 0, 1, 0, 1])
sensitive = np.array([0, 0, 1, 1, 0, 1])

# Compute local metrics
local1 = node1.compute_local_metrics(
    y_true=y_true, y_pred=y_pred, sensitive_attr=sensitive,
    dataset_size=100, protected_attr_name="gender"
)
local2 = node2.compute_local_metrics(
    y_true=y_true, y_pred=y_pred, sensitive_attr=sensitive,
    dataset_size=200, protected_attr_name="gender"
)

# Apply privacy
privacy1 = node1.apply_privacy(local1)
privacy2 = node2.apply_privacy(local2)

# Aggregate
agg, conf = coordinator.aggregate_metrics(
    node_metrics={
        "region_a": privacy1.noisy_metrics,
        "region_b": privacy2.noisy_metrics
    },
    aggregation_method="weighted_average",
    weights={"region_a": 100, "region_b": 200}
)

print(f"Aggregated: {agg}")
print(f"Confidence: {conf}")
```

## Node.js Example

```javascript
const axios = require('axios');

// Register nodes
await axios.post('http://localhost:5000/api/federated/register-node', {
  nodeId: 'region_a',
  nodeName: 'Region A',
  nodeType: 'edge'
}, {
  headers: { 'Authorization': 'Bearer demo-token' }
});

// Aggregate metrics
const result = await axios.post(
  'http://localhost:5000/api/federated/aggregate',
  {
    nodeMetrics: {
      region_a: { demographic_parity_difference: 0.08 },
      region_b: { demographic_parity_difference: 0.12 }
    },
    aggregationMethod: 'weighted_average'
  },
  {
    headers: { 'Authorization': 'Bearer demo-token' }
  }
);

console.log('Aggregated metrics:', result.data.aggregatedMetrics);
console.log('Compliance:', result.data.complianceStatus);
```

## Key Concepts

### Differential Privacy
- Adds noise to metrics before sharing
- Provides mathematical privacy guarantees
- Epsilon (ε) = privacy budget (smaller = more private = more noise)

### Aggregation Methods
- **Weighted Average** (default) - Best for trusted nodes
- **Median** - Robust to outliers
- **Krum** - Byzantine-robust for untrusted nodes

### Compliance Status
- **compliant** - All metrics within thresholds
- **non_compliant** - One or more violations
- **warning** - Metrics near thresholds

## Troubleshooting

### Connection Refused
```bash
# Check services are running
make health
# Restart if needed
make down && make up
```

### Authorization Errors
```bash
# Use correct token
export AUTH_TOKEN="your-token"
./demo.sh
```

### Import Errors (Python)
```bash
# Install dependencies
cd ai_core
pip install -r requirements.txt
```

## Next Steps

1. **Read Full Documentation**
   - See `docs/FEDERATED_LEARNING.md`

2. **Explore Examples**
   - Backend: `backend/src/routes/federated.js`
   - AI Core: `ai_core/routers/federated.py`
   - Tests: `ai_core/tests/test_federated_learning.py`

3. **Configure for Production**
   - Set epsilon and delta based on privacy requirements
   - Enable Byzantine aggregation if nodes untrusted
   - Set up certificate-based node verification
   - Configure compliance thresholds

4. **Monitor and Maintain**
   - Track aggregation history
   - Monitor epsilon budget usage
   - Check node health status
   - Review violation reports

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Edge Nodes (Regional Deployments)                       │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ Region A     │  │ Region B     │  │ Region C     │   │
│ │ Compute      │  │ Compute      │  │ Compute      │   │
│ │ Fairness     │  │ Fairness     │  │ Fairness     │   │
│ └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└────────┼──────────────────┼──────────────────┼───────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│ Apply Differential Privacy                              │
│ (Laplace/Gaussian noise + epsilon tracking)             │
└────────┬──────────────────┬──────────────────┬──────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│ Central Aggregation (Backend)                           │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Aggregate Metrics                               │    │
│ │ - Weighted average (default)                    │    │
│ │ - Median (outlier-robust)                       │    │
│ │ - Krum (Byzantine-robust)                       │    │
│ └─────────────────────────────────────────────────┘    │
└────────┬───────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Compliance Report                                       │
│ ├─ Aggregated metrics                                  │
│ ├─ Confidence scores                                   │
│ ├─ Violation detection                                 │
│ └─ Compliance status                                   │
└─────────────────────────────────────────────────────────┘
```

## Performance Targets

- Local metric computation: <100ms
- Privacy application: <20ms
- Aggregation (3 nodes): <10ms
- **Total E2E latency: <200ms P95**

## Security Notes

✅ **Data Privacy**: Data never leaves edge nodes  
✅ **Metric Privacy**: Differential privacy prevents inference  
✅ **Byzantine Robustness**: Krum resists malicious nodes  
✅ **Audit Trail**: Full history for compliance  
✅ **Integrity**: Data hashing for verification  

## Support

- Documentation: `docs/FEDERATED_LEARNING.md`
- Tools: `tools/federated/`
- Tests: `ai_core/tests/test_federated_learning.py`
- Implementation: `FEDERATED_LEARNING_IMPLEMENTATION.md`

## Time Estimate

- Setup: 5 minutes
- Running demo: 2 minutes
- Running tests: 3 minutes
- Reading docs: 30 minutes

**Total: ~45 minutes to full understanding**
