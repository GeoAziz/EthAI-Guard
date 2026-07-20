# Federated Learning Tools

Tools for testing and demonstrating federated learning capabilities in EthixAI.

## Scripts

### `demo.sh` - Interactive Demo

Demonstrates the complete federated learning workflow with curl requests.

**Usage:**
```bash
./demo.sh
```

**What it does:**
1. Registers 3 regional edge nodes
2. Lists all registered nodes
3. Checks network health
4. Aggregates fairness metrics from all nodes
5. Validates edge model predictions
6. Retrieves aggregation history
7. Gets network analytics

**Requirements:**
- Backend running on `http://localhost:5000`
- Authorization token (can be customized via `AUTH_TOKEN` env var)
- `jq` for JSON formatting (optional)

**Environment Variables:**
```bash
BACKEND_URL=http://localhost:5000        # Backend URL
AUTH_TOKEN=demo-token                    # Authorization token
```

### `integration_test.py` - Automated Test Suite

Python-based integration test that validates the complete federated learning pipeline.

**Usage:**
```bash
python3 integration_test.py
```

**What it tests:**
1. Backend connectivity and health
2. AI Core connectivity and health
3. Node registration
4. Listing nodes
5. Local metric computation
6. Differential privacy application
7. Metric aggregation
8. Model validation
9. Network health monitoring
10. Aggregation history retrieval

**Requirements:**
- Python 3.7+
- Backend running on `http://localhost:5000`
- AI Core running on `http://localhost:8100`
- `requests` library: `pip install requests`

**Exit Codes:**
- `0` - All tests passed
- `1` - Test failure
- `130` - Interrupted by user

## Quick Start

### 1. Start the Services

```bash
# Terminal 1: Start backend and AI Core
make up
```

### 2. Run the Demo

```bash
# Terminal 2: Run interactive demo
cd tools/federated
chmod +x demo.sh
./demo.sh
```

### 3. Run Integration Tests

```bash
# Terminal 3: Run automated tests
cd tools/federated
python3 integration_test.py
```

## Federated Learning Workflow

```
┌─────────────────────────────────────────────────────┐
│ Edge Node 1 (US West)                               │
│ ├─ Local Data                                       │
│ └─ Compute Fairness Metrics                         │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│ Edge Node 2 (US East)                               │
│ ├─ Local Data                                       │
│ └─ Compute Fairness Metrics                         │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│ Edge Node 3 (EU West)                               │
│ ├─ Local Data                                       │
│ └─ Compute Fairness Metrics                         │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│ Apply Differential Privacy                          │
│ ├─ Laplace/Gaussian noise injection                 │
│ ├─ Epsilon budget tracking                          │
│ └─ Metric obfuscation                               │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│ Central Aggregation                                 │
│ ├─ Weighted average aggregation                     │
│ ├─ Byzantine-robust aggregation (Krum)             │
│ ├─ Median aggregation                               │
│ └─ Confidence scoring                               │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│ Compliance Report                                   │
│ ├─ Aggregated fairness metrics                      │
│ ├─ Violation detection                              │
│ ├─ Confidence scores                                │
│ └─ Compliance status                                │
└─────────────────────────────────────────────────────┘
```

## API Endpoints Tested

### Backend (`/api/federated/`)

- `POST /register-node` - Register a new edge node
- `GET /nodes` - List all nodes
- `GET /nodes/{nodeId}` - Get node details
- `PUT /nodes/{nodeId}` - Update node configuration
- `POST /aggregate` - Aggregate metrics from nodes
- `GET /aggregations` - Retrieve aggregation history
- `GET /aggregations/{aggregationId}` - Get aggregation details
- `POST /validate-model` - Validate edge model fairness
- `GET /health` - Network health status
- `GET /analytics` - Network analytics

### AI Core (`/federated/`)

- `POST /register-node` - Register node with AI Core
- `POST /compute-local-metrics` - Compute fairness metrics
- `POST /apply-privacy` - Apply differential privacy
- `POST /aggregate-metrics` - Aggregate from multiple nodes
- `POST /validate-edge-model` - Validate model predictions
- `GET /node-status/{node_id}` - Get node status
- `POST /node-heartbeat/{node_id}` - Record heartbeat
- `GET /health/nodes` - Health status of all nodes
- `GET /coordinator-status` - Coordinator status

## Example Output

### Node Registration
```
[INFO] Registering node: region_us_west...
{
  "nodeId": "region_us_west",
  "status": "registered",
  "message": "Node region_us_west registered successfully"
}
```

### Metric Aggregation
```
[INFO] Aggregating metrics via backend...
{
  "aggregationId": "agg-abc123",
  "aggregatedMetrics": {
    "demographic_parity_difference": 0.087,
    "equal_opportunity_difference": 0.062,
    "equalized_odds_difference": 0.071,
    "disparate_impact_ratio": 0.85
  },
  "confidenceScores": {
    "demographic_parity_difference": 0.98,
    "equal_opportunity_difference": 0.97,
    "equalized_odds_difference": 0.96
  },
  "violations": [],
  "complianceStatus": "compliant",
  "numNodes": 3,
  "aggregationMethod": "weighted_average"
}
```

### Privacy Application
```
[INFO] Applying differential privacy to edge_node_1 metrics...
{
  "node_id": "edge_node_1",
  "noisy_metrics": {
    "demographic_parity_difference": 0.082,
    "equal_opportunity_difference": 0.051
  },
  "noise_added": {
    "demographic_parity_difference": 0.0023,
    "equal_opportunity_difference": -0.0012
  },
  "epsilon_used": 0.33,
  "timestamp": 1625097600.0
}
```

## Troubleshooting

### Backend Connection Refused
```
[FAIL] Backend check failed: Connection refused
```

**Solution:** Start the backend service
```bash
make up
```

### AI Core Connection Refused
```
[FAIL] AI Core check failed: Connection refused
```

**Solution:** Start the AI Core service
```bash
make up
```

### Authorization Errors
```
[FAIL] List nodes failed: 401 Unauthorized
```

**Solution:** Check AUTH_TOKEN is set correctly
```bash
export AUTH_TOKEN="your-actual-token"
./demo.sh
```

### Missing Dependencies
```
ModuleNotFoundError: No module named 'requests'
```

**Solution:** Install required packages
```bash
pip install requests
```

## Performance Testing

Run aggregations with timing:

```python
import time

start = time.time()
# Run aggregation
elapsed = time.time() - start
print(f"Aggregation took {elapsed*1000:.1f}ms")
```

Typical timings:
- Register node: ~50-100ms
- Compute local metrics: ~30-50ms
- Apply privacy: ~10-20ms
- Aggregation (3 nodes): ~5-10ms
- Total (end-to-end): <200ms

## Load Testing

For load testing with k6:

```javascript
// k6 script
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
};

export default function() {
  let payload = JSON.stringify({
    nodeMetrics: {
      node1: { metric: 0.1 },
      node2: { metric: 0.2 },
    }
  });

  let res = http.post(
    'http://localhost:5000/api/federated/aggregate',
    payload
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'compliance is compliant': (r) => JSON.parse(r.body).complianceStatus === 'compliant'
  });
}
```

## Security Considerations

When testing in production-like environments:

1. Use actual bearer tokens instead of demo-token
2. Enable TLS/HTTPS for all requests
3. Validate node certificates before aggregation
4. Implement request signing for audit trails
5. Use Byzantine aggregation if nodes are untrusted
6. Monitor aggregation patterns for anomalies

## More Information

- [Federated Learning Documentation](../../docs/FEDERATED_LEARNING.md)
- [Architecture](../../docs/ARCHITECTURE.md)
- [Security Practices](../../docs/security/SECURITY.md)
