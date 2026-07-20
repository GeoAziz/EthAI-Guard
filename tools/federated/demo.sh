#!/bin/bash

set -e

# Federated Learning Demo Script
# Demonstrates distributed fairness evaluation with privacy preservation

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AI_CORE_URL="${AI_CORE_URL:-http://localhost:8100}"
AUTH_TOKEN="${AUTH_TOKEN:-demo-token}"

echo "=========================================="
echo "Federated Learning Demonstration"
echo "=========================================="
echo ""

# Helper function for making authenticated requests
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "$BACKEND_URL$endpoint"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BACKEND_URL$endpoint"
  fi
}

# Step 1: Register federated nodes
echo "Step 1: Registering Federated Nodes..."
echo "======================================="

api_call POST "/api/federated/register-node" '{
  "nodeId": "region_us_west",
  "nodeName": "US West Regional Deployment",
  "nodeType": "edge",
  "endpoint": "http://region-west.local:8100",
  "location": {
    "region": "us-west-2",
    "latitude": 37.8,
    "longitude": -122.3
  }
}' | jq .

echo ""

api_call POST "/api/federated/register-node" '{
  "nodeId": "region_us_east",
  "nodeName": "US East Regional Deployment",
  "nodeType": "edge",
  "endpoint": "http://region-east.local:8100",
  "location": {
    "region": "us-east-1",
    "latitude": 40.7,
    "longitude": -74.0
  }
}' | jq .

echo ""

api_call POST "/api/federated/register-node" '{
  "nodeId": "region_eu_west",
  "nodeName": "EU West Regional Deployment",
  "nodeType": "edge",
  "endpoint": "http://region-eu.local:8100",
  "location": {
    "region": "eu-west-1",
    "latitude": 53.3,
    "longitude": -6.2
  }
}' | jq .

echo ""

# Step 2: Get node list
echo "Step 2: Listing All Federated Nodes..."
echo "========================================"

api_call GET "/api/federated/nodes" | jq .

echo ""

# Step 3: Get network health
echo "Step 3: Checking Network Health..."
echo "===================================="

api_call GET "/api/federated/health" | jq .

echo ""

# Step 4: Aggregate fairness metrics from nodes
echo "Step 4: Aggregating Fairness Metrics..."
echo "========================================="

api_call POST "/api/federated/aggregate" '{
  "nodeMetrics": {
    "region_us_west": {
      "demographic_parity_difference": 0.08,
      "equal_opportunity_difference": 0.05,
      "equalized_odds_difference": 0.06,
      "average_absolute_odds_difference": 0.055,
      "disparate_impact_ratio": 0.85
    },
    "region_us_east": {
      "demographic_parity_difference": 0.12,
      "equal_opportunity_difference": 0.09,
      "equalized_odds_difference": 0.10,
      "average_absolute_odds_difference": 0.095,
      "disparate_impact_ratio": 0.82
    },
    "region_eu_west": {
      "demographic_parity_difference": 0.06,
      "equal_opportunity_difference": 0.04,
      "equalized_odds_difference": 0.05,
      "average_absolute_odds_difference": 0.045,
      "disparate_impact_ratio": 0.88
    }
  },
  "aggregationMethod": "weighted_average",
  "weights": {
    "region_us_west": 500,
    "region_us_east": 750,
    "region_eu_west": 300
  },
  "byzantineNodes": 0
}' | jq .

echo ""

# Step 5: Validate edge model predictions
echo "Step 5: Validating Edge Model Predictions..."
echo "=============================================="

api_call POST "/api/federated/validate-model" '{
  "modelPredictions": [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
  "trueLabels":       [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
  "protectedAttribute": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
  "minConfidence": 0.8
}' | jq .

echo ""

# Step 6: Get aggregation history
echo "Step 6: Retrieving Aggregation History..."
echo "=========================================="

api_call GET "/api/federated/aggregations?limit=10" | jq .

echo ""

# Step 7: Get node status details
echo "Step 7: Getting Node Status Details..."
echo "======================================="

api_call GET "/api/federated/nodes/region_us_west" | jq .

echo ""

# Step 8: Get analytics
echo "Step 8: Getting Federated Analytics..."
echo "======================================="

api_call GET "/api/federated/analytics?days=30" | jq .

echo ""

echo "=========================================="
echo "Federated Learning Demo Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Registered 3 regional edge nodes"
echo "- Aggregated fairness metrics from all nodes"
echo "- Applied differential privacy to metrics"
echo "- Validated model predictions for fairness"
echo "- Tracked compliance status across network"
echo ""
