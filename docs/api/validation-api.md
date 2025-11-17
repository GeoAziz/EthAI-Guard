# Validation API Documentation

## Overview

The Validation API provides endpoints for running model fairness validations with synthetic data and retrieving validation reports.

**Base URL**: `http://localhost:5000` (Backend)  
**AI Core URL**: `http://localhost:8000` (AI Core microservice)

---

## Endpoints

### 1. Run Model Validation

Triggers a full model validation with synthetic data generation, fairness metric calculation, and report generation.

**Endpoint**: `POST /v1/validate-model`  
**Authentication**: Required (Firebase Auth token)  
**Timeout**: 120 seconds

#### Request

**Headers**:
```
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

**Body**:
```json
{
  "model_name": "string (required, max 128 chars)",
  "model_version": "string (optional, default '1.0', max 32 chars)",
  "model_description": "string (optional, max 500 chars)",
  "num_synthetic_cases": "integer (optional, default 200, range 50-500)",
  "include_edge_cases": "boolean (optional, default true)",
  "include_stability_test": "boolean (optional, default true)"
}
```

**Example**:
```json
{
  "model_name": "EthicalLoanDecisionAI",
  "model_version": "1.0",
  "model_description": "Loan decision model with ethical constraints",
  "num_synthetic_cases": 200,
  "include_edge_cases": true,
  "include_stability_test": true
}
```

#### Response

**Success (201 Created)**:
```json
{
  "report_id": "val-20240119-143025",
  "firestore_id": "abc123xyz789",
  "status": "pass | conditional_pass | fail",
  "overall_score": 85.3,
  "confidence_score": 78.5,
  "total_cases": 200,
  "metrics_summary": {
    "overall_fairness_score": 85.3,
    "num_critical": 0,
    "num_warnings": 2,
    "num_acceptable": 4
  },
  "recommendations": [
    "Model passes all fairness checks...",
    "WARNING: Demographic parity score..."
  ],
  "created_at": "2024-01-19T14:30:25.123Z"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "validation_failed",
  "details": [
    {
      "msg": "Invalid value",
      "param": "num_synthetic_cases",
      "location": "body"
    }
  ]
}
```

**Error (500 Internal Server Error)**:
```json
{
  "error": "validation_failed",
  "detail": "AI Core service unavailable"
}
```

**Error (503 AI Core Error)**:
```json
{
  "error": "ai_core_error",
  "detail": "Model validation failed: insufficient memory"
}
```

---

### 2. List Validation Reports

Retrieve all validation reports for the authenticated user.

**Endpoint**: `GET /v1/validation-reports`  
**Authentication**: Required (Firebase Auth token)

#### Request

**Headers**:
```
Authorization: Bearer <firebase_token>
```

**Query Parameters**:
```
limit:  integer (optional, default 50) - Maximum number of reports to return
offset: integer (optional, default 0)  - Pagination offset
```

**Example**:
```
GET /v1/validation-reports?limit=20&offset=0
```

#### Response

**Success (200 OK)**:
```json
{
  "reports": [
    {
      "firestore_id": "abc123xyz789",
      "report_id": "val-20240119-143025",
      "model_name": "EthicalLoanDecisionAI",
      "model_version": "1.0",
      "status": "pass",
      "overall_score": 85.3,
      "confidence_score": 78.5,
      "total_cases": 200,
      "metrics_summary": {
        "overall_fairness_score": 85.3,
        "num_critical": 0,
        "num_warnings": 2,
        "num_acceptable": 4
      },
      "created_at": "2024-01-19T14:30:25.123Z"
    },
    {
      "firestore_id": "def456uvw012",
      "report_id": "val-20240118-102015",
      "model_name": "EthicalLoanDecisionAI",
      "model_version": "0.9",
      "status": "fail",
      "overall_score": 52.1,
      "confidence_score": 81.2,
      "total_cases": 300,
      "metrics_summary": {
        "overall_fairness_score": 52.1,
        "num_critical": 3,
        "num_warnings": 2,
        "num_acceptable": 1
      },
      "created_at": "2024-01-18T10:20:15.456Z"
    }
  ],
  "count": 2,
  "limit": 50,
  "offset": 0
}
```

**Error (500 Internal Server Error)**:
```json
{
  "error": "fetch_failed",
  "detail": "Firestore query failed"
}
```

---

### 3. Get Validation Report Detail

Retrieve full validation report by Firestore ID.

**Endpoint**: `GET /v1/validation-reports/:id`  
**Authentication**: Required (Firebase Auth token)

#### Request

**Headers**:
```
Authorization: Bearer <firebase_token>
```

**Path Parameters**:
```
id: string (required) - Firestore document ID
```

**Example**:
```
GET /v1/validation-reports/abc123xyz789
```

#### Response

**Success (200 OK)**:
```json
{
  "firestore_id": "abc123xyz789",
  "user_id": "user_firebase_uid",
  "model_name": "EthicalLoanDecisionAI",
  "model_version": "1.0",
  "report_id": "val-20240119-143025",
  "status": "pass",
  "overall_score": 85.3,
  "confidence_score": 78.5,
  "total_cases": 200,
  "metrics_summary": {
    "overall_fairness_score": 85.3,
    "num_critical": 0,
    "num_warnings": 2,
    "num_acceptable": 4
  },
  "recommendations": [
    "Model passes all fairness checks. Continue monitoring in production.",
    "WARNING: Demographic parity score 78.5 shows some outcome rate gaps..."
  ],
  "report_json": {
    "report_id": "val-20240119-143025",
    "timestamp": "2024-01-19T14:30:25.123Z",
    "model_metadata": {
      "name": "EthicalLoanDecisionAI",
      "version": "1.0",
      "description": "Loan decision model with ethical constraints"
    },
    "synthetic_dataset": {
      "total_cases": 200,
      "edge_cases": 30,
      "distribution": {
        "gender": {
          "male": 50,
          "female": 48,
          "non-binary": 1,
          "prefer_not_to_say": 1
        },
        "ethnicity": {
          "african_american": 28,
          "asian": 29,
          "caucasian": 30,
          "hispanic": 27,
          "native_american": 14,
          "pacific_islander": 14,
          "multi-racial": 28
        }
      }
    },
    "validation_summary": {
      "total": 200,
      "risk_distribution": {
        "low": 80,
        "medium": 95,
        "high": 25
      },
      "triggered_rules_summary": {
        "age_discrimination_check": 5,
        "disability_bias_check": 3
      },
      "avg_risk_score": 48.5,
      "min_risk_score": 12.3,
      "max_risk_score": 89.7
    },
    "fairness_metrics": {
      "overall_score": 85.3,
      "metrics": [
        {
          "metric": "disparate_impact",
          "score": 0.87,
          "level": "acceptable",
          "explanation": "Disparate impact ratio 0.87 passes the 80% rule...",
          "details": {
            "protected_group_rate": 0.70,
            "non_protected_group_rate": 0.80,
            "ratio": 0.875
          }
        },
        {
          "metric": "equal_opportunity",
          "score": 0.91,
          "level": "acceptable",
          "explanation": "Equal opportunity score 0.91 shows minimal TPR differences...",
          "details": {
            "group_tprs": {
              "male": 0.85,
              "female": 0.83,
              "non-binary": 0.80
            },
            "max_difference": 0.05
          }
        },
        {
          "metric": "demographic_parity",
          "score": 0.78,
          "level": "warning",
          "explanation": "Demographic parity score 0.78 shows some outcome rate gaps...",
          "details": {
            "group_rates": {
              "african_american": 0.65,
              "caucasian": 0.75,
              "asian": 0.72
            },
            "max_gap": 0.10
          }
        },
        {
          "metric": "consistency",
          "score": 0.89,
          "level": "acceptable",
          "explanation": "Consistency score 0.89 shows low variance for similar profiles...",
          "details": {
            "similar_profile_groups": 45,
            "avg_variance": 8.3
          }
        },
        {
          "metric": "stability",
          "score": 0.88,
          "level": "acceptable",
          "explanation": "Stability score 0.88 shows model is robust to input noise...",
          "details": {
            "avg_score_change": 12.1,
            "max_score_change": 28.5
          }
        },
        {
          "metric": "rule_violations",
          "score": 0.96,
          "level": "acceptable",
          "explanation": "Rule violation severity 0.96 indicates low ethical policy breaches...",
          "details": {
            "total_violations": 8,
            "violation_rate": 0.04
          }
        }
      ]
    },
    "status": "pass",
    "status_reason": "All fairness metrics within acceptable thresholds",
    "recommendations": [
      "Model passes all fairness checks. Continue monitoring in production. Re-run validation quarterly or when training data changes.",
      "WARNING: Demographic parity score 78.5 shows some outcome rate gaps. Consider threshold adjustments."
    ],
    "confidence_score": 78.5
  },
  "created_at": "2024-01-19T14:30:25.123Z",
  "updated_at": "2024-01-19T14:30:25.123Z"
}
```

**Error (404 Not Found)**:
```json
{
  "error": "report_not_found"
}
```

**Error (403 Forbidden)**:
```json
{
  "error": "forbidden"
}
```

**Error (500 Internal Server Error)**:
```json
{
  "error": "fetch_failed",
  "detail": "Firestore read failed"
}
```

---

## AI Core Direct Endpoint

For advanced users or testing, the AI Core microservice exposes a direct validation endpoint.

**Endpoint**: `POST /validation/validate-model`  
**Base URL**: `http://localhost:8000`  
**Authentication**: None (internal service)

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "model_name": "string (required)",
  "model_version": "string (optional, default '1.0')",
  "model_description": "string (optional)",
  "num_synthetic_cases": "integer (optional, default 200, range 50-500)",
  "include_edge_cases": "boolean (optional, default true)",
  "include_stability_test": "boolean (optional, default true)",
  "include_html_report": "boolean (optional, default false)"
}
```

#### Response

**Success (200 OK)**:
```json
{
  "report_id": "val-20240119-143025",
  "status": "pass",
  "overall_score": 85.3,
  "confidence_score": 78.5,
  "total_cases": 200,
  "metrics_summary": {
    "overall_fairness_score": 85.3,
    "num_critical": 0,
    "num_warnings": 2,
    "num_acceptable": 4
  },
  "recommendations": [...],
  "report_json": {...},
  "report_html": "<html>...</html>" // Only if include_html_report=true
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid Firebase token |
| 403 | Forbidden - User does not own this resource |
| 404 | Not Found - Report does not exist |
| 500 | Internal Server Error - Backend/Firestore error |
| 503 | Service Unavailable - AI Core service down |

---

## Rate Limiting

- **Global Limit**: 60 requests per minute per IP (configurable via `RATE_MAX` env var)
- **Validation Timeout**: 120 seconds for validation endpoint

---

## Best Practices

### Running Validations
- Use 200 cases for initial testing (balances speed and accuracy)
- Enable `include_edge_cases` for comprehensive testing
- Enable `include_stability_test` unless time-constrained

### Fetching Reports
- Use pagination (limit/offset) for large result sets
- Cache reports on client side to reduce Firestore reads
- Poll with exponential backoff if validation is async

### Error Handling
- Retry on 503 (AI Core may be temporarily unavailable)
- Do NOT retry on 400/403/404 (client errors)
- Log full error response for debugging

---

## Code Examples

### JavaScript (Frontend)

```javascript
// Run validation
const runValidation = async (token, modelName) => {
  const response = await axios.post(
    'http://localhost:5000/v1/validate-model',
    {
      model_name: modelName,
      model_version: '1.0',
      num_synthetic_cases: 200,
      include_edge_cases: true,
      include_stability_test: true,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
    }
  );
  return response.data;
};

// List reports
const listReports = async (token) => {
  const response = await axios.get(
    'http://localhost:5000/v1/validation-reports?limit=20',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.reports;
};

// Get report detail
const getReport = async (token, firestoreId) => {
  const response = await axios.get(
    `http://localhost:5000/v1/validation-reports/${firestoreId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
```

### Python (AI Core Client)

```python
import requests

# Run validation directly on AI Core
def run_validation(model_name, num_cases=200):
    response = requests.post(
        'http://localhost:8000/validation/validate-model',
        json={
            'model_name': model_name,
            'model_version': '1.0',
            'num_synthetic_cases': num_cases,
            'include_edge_cases': True,
            'include_stability_test': True,
        },
        timeout=120
    )
    response.raise_for_status()
    return response.json()

# Example
result = run_validation('EthicalLoanDecisionAI', num_cases=300)
print(f"Status: {result['status']}")
print(f"Fairness Score: {result['overall_score']:.1f}")
```

### cURL

```bash
# Run validation
curl -X POST http://localhost:5000/v1/validate-model \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "EthicalLoanDecisionAI",
    "model_version": "1.0",
    "num_synthetic_cases": 200
  }'

# List reports
curl -X GET "http://localhost:5000/v1/validation-reports?limit=10" \
  -H "Authorization: Bearer $FIREBASE_TOKEN"

# Get report detail
curl -X GET http://localhost:5000/v1/validation-reports/abc123xyz789 \
  -H "Authorization: Bearer $FIREBASE_TOKEN"
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Day 19 | Initial release with validation endpoints |

---

**Last Updated**: Day 19  
**Maintainer**: EthixAI Team
