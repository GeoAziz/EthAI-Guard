# 🔒 API Contract v1.0 - FROZEN

**Last Updated**: Day 12  
**Status**: FROZEN - Breaking changes require version bump  
**Versioning**: `/v1/api` (stable), `/v1/internal` (internal use only)

---

## Purpose

This document defines the **frozen API contract** for EthixAI. After Day 12:
- **No changes to request/response schemas** without formal versioning
- **All endpoints documented** with examples
- **All error codes listed** with descriptions
- **Backward compatibility** guaranteed for v1

---

## Base URLs

| Environment | Base URL | Status |
|-------------|----------|--------|
| **Development** | `http://localhost:5000` | Active |
| **Staging** | `https://staging-api.ethixai.com` | TBD |
| **Production** | `https://api.ethixai.com` | TBD |

---

## Authentication

All protected endpoints require JWT access token in Authorization header:

```http
Authorization: Bearer <access_token>
```

**Token Lifecycle**:
- Access token expires in **15 minutes**
- Refresh token expires in **7 days**
- Refresh tokens rotate on each use

---

## Common Headers

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <access_token>
X-Request-ID: <optional-uuid>  # For tracing
```

### Response Headers
```http
Content-Type: application/json
X-Request-ID: <uuid>  # Always returned for tracing
X-Rate-Limit-Remaining: <integer>
X-Rate-Limit-Reset: <timestamp>
```

---

## Error Response Schema

**ALL errors use this consistent format**:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field_name",
      "value": "invalid_value"
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input (missing/malformed fields) |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `TOKEN_EXPIRED` | 401 | Access token expired, refresh needed |
| `INVALID_CREDENTIALS` | 401 | Login failed (wrong email/password) |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate email) |
| `TOO_MANY_ATTEMPTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error (not user's fault) |
| `SERVICE_UNAVAILABLE` | 503 | Temporary outage (AI Core down, DB unavailable) |

---

## Public Endpoints (No Auth Required)

### GET /health
**Status**: Stable  
**Description**: Health check endpoint

**Response 200**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00Z",
  "version": "1.0.0"
}
```

---

### GET /metrics
**Status**: Stable (Internal Only)  
**Description**: Prometheus metrics endpoint  
**Access**: Internal network only (not public)

**Response 200**:
```
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/dashboard",status="200"} 1234

# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",route="/api/auth/login",status="200",le="0.1"} 890
...
```

---

## Authentication Endpoints

### POST /v1/api/auth/register
**Status**: Stable  
**Description**: Register new user account

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "ValidP@ssw0rd123"
}
```

**Validation**:
- `name`: 2-100 characters
- `email`: Valid email format, unique
- `password`: ≥12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char

**Response 201**:
```json
{
  "status": "success",
  "data": {
    "user_id": "user-uuid-123",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "viewer",
    "created_at": "2025-11-15T10:00:00Z"
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: Invalid email/password format
- `409 CONFLICT`: Email already exists
- `500 INTERNAL_ERROR`: Database error

---

### POST /v1/api/auth/login
**Status**: Stable  
**Description**: Authenticate user, return tokens

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "ValidP@ssw0rd123"
}
```

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh-uuid-456",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "user_id": "user-uuid-123",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "analyst"
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: Missing email/password
- `401 INVALID_CREDENTIALS`: Wrong email/password
- `429 TOO_MANY_ATTEMPTS`: 5 failed attempts, locked for 15 minutes
- `500 INTERNAL_ERROR`: Server error

---

### POST /v1/api/auth/refresh
**Status**: Stable  
**Description**: Refresh access token using refresh token

**Request Body**:
```json
{
  "refresh_token": "refresh-uuid-456"
}
```

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh-uuid-789",
    "expires_in": 900,
    "token_type": "Bearer"
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: Missing refresh_token
- `401 UNAUTHORIZED`: Invalid/expired/revoked refresh token
- `500 INTERNAL_ERROR`: Server error

---

### POST /v1/api/auth/logout
**Status**: Stable  
**Description**: Logout user, revoke refresh token  
**Auth**: Required

**Request Body**:
```json
{
  "refresh_token": "refresh-uuid-789"
}
```

**Response 200**:
```json
{
  "status": "success",
  "message": "Logged out successfully",
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid access token
- `500 INTERNAL_ERROR`: Server error

---

### POST /v1/api/auth/change-password
**Status**: Experimental  
**Description**: Change user password (revokes all refresh tokens)  
**Auth**: Required

**Request Body**:
```json
{
  "old_password": "OldP@ssw0rd123",
  "new_password": "NewP@ssw0rd456"
}
```

**Response 200**:
```json
{
  "status": "success",
  "message": "Password changed successfully. Please login again.",
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: New password doesn't meet policy
- `401 UNAUTHORIZED`: Old password incorrect
- `500 INTERNAL_ERROR`: Server error

---

### GET /v1/api/auth/devices
**Status**: Experimental  
**Description**: List active refresh tokens (devices/sessions)  
**Auth**: Required

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "devices": [
      {
        "device_id": "device-uuid-123",
        "created_at": "2025-11-15T10:00:00Z",
        "last_used": "2025-11-15T12:00:00Z",
        "ip": "192.168.1.100",
        "user_agent": "Mozilla/5.0 ...",
        "is_current": true
      },
      {
        "device_id": "device-uuid-456",
        "created_at": "2025-11-14T08:00:00Z",
        "last_used": "2025-11-14T18:00:00Z",
        "ip": "192.168.1.50",
        "user_agent": "Mozilla/5.0 ...",
        "is_current": false
      }
    ]
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid access token
- `500 INTERNAL_ERROR`: Server error

---

### DELETE /v1/api/auth/devices/:deviceId
**Status**: Experimental  
**Description**: Revoke specific refresh token (device/session)  
**Auth**: Required

**Response 200**:
```json
{
  "status": "success",
  "message": "Device revoked successfully",
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid access token
- `404 NOT_FOUND`: Device not found or not owned by user
- `500 INTERNAL_ERROR`: Server error

---

## Analysis Endpoints

### POST /v1/api/analysis/submit
**Status**: Stable  
**Description**: Submit analysis job  
**Auth**: Required (roles: admin, analyst)

**Request Body**:
```json
{
  "report_url": "https://example.com/report.pdf",
  "parameters": {
    "model_type": "logistic_regression",
    "sensitive_attribute_name": "gender",
    "group_0_name": "Male",
    "group_1_name": "Female"
  }
}
```

**Validation**:
- `report_url`: Valid URL, accessible
- `parameters.model_type`: One of: `logistic_regression`, `random_forest`, `gradient_boosting`

**Response 202**:
```json
{
  "status": "success",
  "data": {
    "analysis_id": "analysis-uuid-123",
    "status": "pending",
    "submitted_at": "2025-11-15T10:00:00Z",
    "estimated_completion": "2025-11-15T10:02:00Z"
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: Invalid report_url or parameters
- `401 UNAUTHORIZED`: Invalid/expired token
- `403 FORBIDDEN`: User role not authorized (viewer, auditor)
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded (10 analyses/hour)
- `500 INTERNAL_ERROR`: Server error
- `503 SERVICE_UNAVAILABLE`: AI Core unavailable

---

### GET /v1/api/analysis/:analysisId/status
**Status**: Stable  
**Description**: Get analysis status  
**Auth**: Required (owner or admin)

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "analysis_id": "analysis-uuid-123",
    "status": "completed",
    "progress": 100,
    "submitted_at": "2025-11-15T10:00:00Z",
    "completed_at": "2025-11-15T10:01:45Z",
    "duration_seconds": 105
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Status Values**:
- `pending`: Queued, not started
- `processing`: In progress
- `completed`: Finished successfully
- `failed`: Error occurred
- `cancelled`: User cancelled

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `403 FORBIDDEN`: Not owner or admin
- `404 NOT_FOUND`: Analysis not found
- `500 INTERNAL_ERROR`: Server error

---

### GET /v1/api/analysis/:analysisId/results
**Status**: Stable  
**Description**: Get analysis results  
**Auth**: Required (owner or admin)

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "analysis_id": "analysis-uuid-123",
    "summary": {
      "risk_score": 72.5,
      "fairness_score": 88.2,
      "n_rows": 1000,
      "n_features": 15
    },
    "anomalies": [
      {
        "type": "demographic_parity",
        "severity": "high",
        "description": "Significant disparity detected between groups",
        "metric_value": 0.15,
        "threshold": 0.10,
        "affected_group": "Group A"
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "action": "Review model training data for bias",
        "rationale": "Demographic parity violation exceeds threshold"
      }
    ],
    "metadata": {
      "model_type": "logistic_regression",
      "completed_at": "2025-11-15T10:01:45Z"
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `403 FORBIDDEN`: Not owner or admin
- `404 NOT_FOUND`: Analysis not found or not completed
- `500 INTERNAL_ERROR`: Server error

---

### POST /v1/api/analysis/:analysisId/cancel
**Status**: Experimental  
**Description**: Cancel running analysis  
**Auth**: Required (owner or admin)

**Response 200**:
```json
{
  "status": "success",
  "message": "Analysis cancelled successfully",
  "data": {
    "analysis_id": "analysis-uuid-123",
    "status": "cancelled"
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `403 FORBIDDEN`: Not owner or admin
- `404 NOT_FOUND`: Analysis not found
- `409 CONFLICT`: Analysis already completed/failed/cancelled
- `500 INTERNAL_ERROR`: Server error

---

## User Management Endpoints

### GET /v1/api/users/me
**Status**: Stable  
**Description**: Get current user profile  
**Auth**: Required

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "user_id": "user-uuid-123",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "analyst",
    "created_at": "2025-11-01T10:00:00Z",
    "last_login": "2025-11-15T09:00:00Z",
    "preferences": {
      "notifications_enabled": true,
      "theme": "dark"
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `500 INTERNAL_ERROR`: Server error

---

### PUT /v1/api/users/me
**Status**: Experimental  
**Description**: Update current user profile  
**Auth**: Required

**Request Body**:
```json
{
  "name": "John A. Doe",
  "preferences": {
    "notifications_enabled": false,
    "theme": "light"
  }
}
```

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "user_id": "user-uuid-123",
    "email": "john@example.com",
    "name": "John A. Doe",
    "role": "analyst",
    "preferences": {
      "notifications_enabled": false,
      "theme": "light"
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: Invalid name format
- `401 UNAUTHORIZED`: Invalid token
- `500 INTERNAL_ERROR`: Server error

---

## Dashboard Endpoints

### GET /v1/api/dashboard
**Status**: Stable  
**Description**: Get user dashboard data  
**Auth**: Required

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total_analyses": 42,
      "completed_analyses": 38,
      "failed_analyses": 2,
      "pending_analyses": 2,
      "avg_risk_score": 68.5
    },
    "recent_analyses": [
      {
        "analysis_id": "analysis-uuid-123",
        "submitted_at": "2025-11-15T10:00:00Z",
        "status": "completed",
        "risk_score": 72.5
      }
    ]
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `500 INTERNAL_ERROR`: Server error

---

## Admin Endpoints (Internal)

### GET /v1/internal/admin/users
**Status**: Experimental  
**Description**: List all users  
**Auth**: Required (role: admin)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `role`: Filter by role (optional)

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "user_id": "user-uuid-123",
        "email": "john@example.com",
        "name": "John Doe",
        "role": "analyst",
        "created_at": "2025-11-01T10:00:00Z",
        "last_login": "2025-11-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `403 FORBIDDEN`: Not admin role
- `500 INTERNAL_ERROR`: Server error

---

### PUT /v1/internal/admin/users/:userId/role
**Status**: Experimental  
**Description**: Update user role  
**Auth**: Required (role: admin)

**Request Body**:
```json
{
  "role": "auditor"
}
```

**Response 200**:
```json
{
  "status": "success",
  "data": {
    "user_id": "user-uuid-123",
    "email": "john@example.com",
    "role": "auditor"
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `400 VALIDATION_ERROR`: Invalid role
- `401 UNAUTHORIZED`: Invalid token
- `403 FORBIDDEN`: Not admin role
- `404 NOT_FOUND`: User not found
- `500 INTERNAL_ERROR`: Server error

---

### DELETE /v1/internal/admin/users/:userId/tokens
**Status**: Experimental  
**Description**: Revoke all user tokens (force logout)  
**Auth**: Required (role: admin)

**Response 200**:
```json
{
  "status": "success",
  "message": "All tokens revoked for user",
  "data": {
    "user_id": "user-uuid-123",
    "revoked_count": 3
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid token
- `403 FORBIDDEN`: Not admin role
- `404 NOT_FOUND`: User not found
- `500 INTERNAL_ERROR`: Server error

---

## Rate Limiting

### Global Rate Limits

| Endpoint Pattern | Limit | Window | Scope |
|------------------|-------|--------|-------|
| `/v1/api/auth/login` | 5 attempts | 15 minutes | Per email |
| `/v1/api/auth/register` | 3 accounts | 1 hour | Per IP |
| `/v1/api/analysis/submit` | 10 submissions | 1 hour | Per user |
| `/v1/api/*` (all other) | 100 requests | 1 minute | Per IP |
| `/v1/internal/*` | 1000 requests | 1 minute | Per IP |

### Rate Limit Headers

```http
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 87
X-Rate-Limit-Reset: 1699963200
```

### Rate Limit Exceeded Response

```json
{
  "status": "error",
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Try again in 42 seconds.",
    "details": {
      "retry_after": 42,
      "limit": 100,
      "window": "1 minute"
    }
  },
  "metadata": {
    "request_id": "req-uuid-123",
    "timestamp": "2025-11-15T10:02:00Z"
  }
}
```

---

## Versioning Policy

### Current Version: v1.0

**Stable endpoints** (`/v1/api/*`):
- No breaking changes allowed
- Additive changes only (new optional fields, new endpoints)
- Deprecation warnings 6 months before removal

**Experimental endpoints** (marked above):
- May change without notice
- Use at own risk in production
- Will be promoted to stable or removed within 3 months

### Breaking Changes

Breaking changes require new version:
- Removing fields from responses
- Changing field types
- Removing endpoints
- Changing error codes

**Process**:
1. Announce deprecation in API response headers: `Deprecation: true`
2. 6-month grace period
3. Release new version (`/v2/api/*`)
4. Support both versions for 6 months
5. Retire old version

---

## OpenAPI Specification

Full OpenAPI 3.0 spec available at:
```
GET /v1/api/openapi.json
```

**Tools**:
- Swagger UI: `GET /v1/api/docs`
- Redoc: `GET /v1/api/redoc`

---

## Changelog

### v1.0.0 (Day 12)
- Initial API freeze
- Documented all endpoints
- Defined error schema
- Established versioning policy

---

## Support

**API Issues**: api-support@ethixai.com  
**Documentation**: https://docs.ethixai.com/api  
**Status Page**: https://status.ethixai.com

---

**Status**: FROZEN (v1.0.0)  
**Last Updated**: Day 12  
**Next Review**: Breaking changes only  
**Owner**: API Team + Product
