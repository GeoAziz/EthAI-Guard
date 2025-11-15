# Audit Logging & Tamper Evidence

## Overview

Comprehensive, tamper-evident audit trails for compliance, security investigations, and operational visibility.

## 1. Audit Log Schema

### Required Fields

```javascript
{
  "timestamp": "2025-11-15T14:30:22.123Z",      // ISO 8601
  "request_id": "uuid-1234-5678",                // Correlation ID
  "user_id": "507f1f77bcf86cd799439011",         // Actor
  "session_id": "uuid-session-5678",             // Session identifier
  "action": "user.login",                        // Event type
  "resource_type": "user",                       // Resource affected
  "resource_id": "507f1f77bcf86cd799439011",     // Resource ID
  "endpoint": "/auth/login",                     // API endpoint
  "method": "POST",                              // HTTP method
  "status": 200,                                 // Response status
  "ip_address": "203.0.113.42",                  // Client IP
  "user_agent": "Mozilla/5.0...",                // Client UA
  "duration_ms": 245,                            // Request duration
  "service": "backend",                          // Service name
  "environment": "production",                   // Environment
  "model_version": "v1.2.3",                     // AI model version (if applicable)
  "analysis_id": "uuid-analysis-9012",           // Analysis correlation (if applicable)
  "changes": {                                    // Before/after for mutations
    "before": {"role": "viewer"},
    "after": {"role": "analyst"}
  },
  "metadata": {                                  // Additional context
    "dataset_size": 1024,
    "fair_ness_score": 0.85
  }
}
```

### Event Categories

| Category | Action Examples |
|----------|-----------------|
| Authentication | `user.login`, `user.logout`, `user.mfa_enabled`, `token.refresh`, `token.revoke` |
| Authorization | `authz.denied`, `authz.granted`, `role.changed` |
| Data Access | `dataset.upload`, `dataset.delete`, `report.view`, `report.export` |
| Analysis | `analysis.start`, `analysis.complete`, `analysis.failed` |
| System | `service.start`, `service.stop`, `config.change`, `key.rotate` |
| Security | `suspicious.login`, `rate_limit.exceeded`, `secret.accessed` |

## 2. Backend Audit Implementation

### Enhanced Logger

```javascript
// backend/src/audit_logger.js
const { createLogger, format, transports } = require('winston');
const { JsonFormatter } = require('pythonjsonlogger').jsonlogger;

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  defaultMeta: { 
    service: 'backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console for development
    new transports.Console(),
    
    // File for append-only audit trail
    new transports.File({ 
      filename: '/var/log/ethixai/audit.log',
      maxsize: 100 * 1024 * 1024,  // 100MB
      maxFiles: 365,  // 1 year retention
      tailable: true
    }),
    
    // Separate file for security events
    new transports.File({
      filename: '/var/log/ethixai/security.log',
      level: 'warn',
      maxsize: 50 * 1024 * 1024,
      maxFiles: 730  // 2 years for security
    })
  ]
});

function logAuditEvent(event) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...event
  };
  
  auditLogger.info(entry);
  
  // Also persist to MongoDB for queryability
  if (process.env.AUDIT_DB_ENABLED === '1') {
    AuditLog.create(entry).catch(err => 
      console.error('Failed to persist audit log:', err)
    );
  }
}

module.exports = { logAuditEvent };
```

### Audit Middleware

```javascript
// backend/src/middleware/audit.js
const { logAuditEvent } = require('../audit_logger');

function auditMiddleware(req, res, next) {
  const start = Date.now();
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    
    const duration = Date.now() - start;
    
    // Log audit event
    logAuditEvent({
      request_id: req.request_id,
      user_id: req.userId || null,
      session_id: req.session?.id || null,
      action: `${req.method.toLowerCase()}.${req.path.replace(/\//g, '.')}`,
      resource_type: extractResourceType(req.path),
      resource_id: req.params.id || null,
      endpoint: req.path,
      method: req.method,
      status: res.statusCode,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent'),
      duration_ms: duration
    });
    
    return originalSend.call(this, data);
  };
  
  next();
}

function extractResourceType(path) {
  // Extract resource from path: /api/datasets/123 -> dataset
  const match = path.match(/\/([a-z]+)\//);
  return match ? match[1] : 'unknown';
}

module.exports = { auditMiddleware };
```

### Critical Event Logging

```javascript
// backend/src/server.js additions
const { logAuditEvent } = require('./audit_logger');

// Login
app.post('/auth/login', async (req, res) => {
  // ... existing login logic
  
  logAuditEvent({
    request_id: req.request_id,
    user_id: user._id,
    action: 'user.login',
    resource_type: 'user',
    resource_id: user._id,
    endpoint: '/auth/login',
    method: 'POST',
    status: 200,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    metadata: {
      device_name: req.body.deviceName || 'unknown',
      login_method: user.mfaEnabled ? 'mfa' : 'password'
    }
  });
});

// Role change
app.patch('/admin/users/:id/role', authMiddleware, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  const oldRole = user.role;
  const newRole = req.body.role;
  
  user.role = newRole;
  await user.save();
  
  logAuditEvent({
    request_id: req.request_id,
    user_id: req.userId,  // Admin who made the change
    action: 'role.changed',
    resource_type: 'user',
    resource_id: user._id,
    endpoint: req.path,
    method: 'PATCH',
    status: 200,
    ip_address: req.ip,
    changes: {
      before: { role: oldRole },
      after: { role: newRole }
    },
    metadata: {
      changed_by: req.userId,
      changed_user: user._id
    }
  });
  
  res.json({ status: 'role updated' });
});
```

## 3. AI Core Audit Implementation

```python
# ai_core/audit_logger.py
import logging
import json
from datetime import datetime
from typing import Optional, Dict, Any

audit_logger = logging.getLogger('audit')
handler = logging.FileHandler('/var/log/ethixai/ai_core_audit.log')
handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.addHandler(handler)
audit_logger.setLevel(logging.INFO)

def log_audit_event(
    request_id: str,
    action: str,
    user_id: Optional[str] = None,
    analysis_id: Optional[str] = None,
    model_version: Optional[str] = None,
    duration_ms: Optional[float] = None,
    status: int = 200,
    metadata: Optional[Dict[str, Any]] = None
):
    """Log structured audit event."""
    event = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'request_id': request_id,
        'user_id': user_id,
        'action': action,
        'service': 'ai_core',
        'analysis_id': analysis_id,
        'model_version': model_version,
        'status': status,
        'duration_ms': duration_ms,
        'metadata': metadata or {}
    }
    
    audit_logger.info(json.dumps(event))

# Usage in analyze endpoint
@router.post("/analyze")
async def analyze_endpoint(request: Request, data: dict):
    start = time.time()
    request_id = request.headers.get('x-request-id', str(uuid.uuid4()))
    analysis_id = str(uuid.uuid4())
    
    try:
        result = run_analysis(data, analysis_id)
        duration_ms = (time.time() - start) * 1000
        
        log_audit_event(
            request_id=request_id,
            action='analysis.complete',
            analysis_id=analysis_id,
            model_version='v1.2.3',
            duration_ms=duration_ms,
            status=200,
            metadata={
                'dataset_size': len(data.get('features', [])),
                'fairness_score': result.get('fairness_score')
            }
        )
        
        return result
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        log_audit_event(
            request_id=request_id,
            action='analysis.failed',
            analysis_id=analysis_id,
            duration_ms=duration_ms,
            status=500,
            metadata={'error': str(e)}
        )
        raise
```

## 4. Append-Only Storage

### AWS S3 Object Lock

```bash
# Enable Object Lock on bucket (must be at bucket creation)
aws s3api create-bucket \
  --bucket ethixai-audit-logs \
  --object-lock-enabled-for-bucket

# Configure retention
aws s3api put-object-lock-configuration \
  --bucket ethixai-audit-logs \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Years": 1
      }
    }
  }'
```

### Log Rotation & Upload

```bash
#!/bin/bash
# tools/security/rotate_audit_logs.sh

LOG_DIR="/var/log/ethixai"
S3_BUCKET="s3://ethixai-audit-logs"
DATE=$(date +%Y%m%d)

# Compress and upload yesterday's logs
gzip ${LOG_DIR}/audit.log.1
gzip ${LOG_DIR}/security.log.1

aws s3 cp ${LOG_DIR}/audit.log.1.gz ${S3_BUCKET}/audit/${DATE}.log.gz \
  --object-lock-mode GOVERNANCE \
  --object-lock-retain-until-date $(date -d "+1 year" --iso-8601)

aws s3 cp ${LOG_DIR}/security.log.1.gz ${S3_BUCKET}/security/${DATE}.log.gz \
  --object-lock-mode GOVERNANCE \
  --object-lock-retain-until-date $(date -d "+2 years" --iso-8601)

# Verify upload
aws s3api head-object --bucket ethixai-audit-logs --key audit/${DATE}.log.gz \
  --query 'ObjectLockMode'
```

### Cron Schedule

```cron
# /etc/cron.d/audit-log-rotation
0 1 * * * root /usr/local/bin/rotate_audit_logs.sh
```

## 5. Integrity Verification

### Checksum Generation

```bash
#!/bin/bash
# tools/security/audit_integrity_check.sh

LOG_FILE="/var/log/ethixai/audit.log"
CHECKSUM_FILE="/var/log/ethixai/audit.log.sha256"

# Generate checksum
sha256sum ${LOG_FILE} > ${CHECKSUM_FILE}

# Sign checksum with GPG
gpg --detach-sign --armor ${CHECKSUM_FILE}

echo "Checksum: $(cat ${CHECKSUM_FILE})"
echo "Signature: ${CHECKSUM_FILE}.asc"
```

### Periodic Verification

```python
# tools/security/verify_audit_logs.py
import hashlib
import gnupg

def verify_audit_log(log_file, checksum_file, sig_file):
    """Verify audit log integrity."""
    # Verify signature
    gpg = gnupg.GPG()
    with open(sig_file, 'rb') as f:
        verified = gpg.verify_file(f, checksum_file)
    
    if not verified:
        raise ValueError("Signature verification failed")
    
    # Verify checksum
    with open(checksum_file) as f:
        expected_hash = f.read().split()[0]
    
    with open(log_file, 'rb') as f:
        actual_hash = hashlib.sha256(f.read()).hexdigest()
    
    if expected_hash != actual_hash:
        raise ValueError(f"Checksum mismatch: {expected_hash} != {actual_hash}")
    
    print("✓ Audit log integrity verified")

if __name__ == '__main__':
    import sys
    verify_audit_log(sys.argv[1], sys.argv[2], sys.argv[3])
```

## 6. Access Controls

### MongoDB Audit Collection

```javascript
// backend/src/models/AuditLog.js
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, index: true },
  request_id: { type: String, index: true },
  user_id: { type: String, index: true },
  action: { type: String, required: true, index: true },
  resource_type: String,
  resource_id: String,
  endpoint: String,
  method: String,
  status: Number,
  ip_address: String,
  user_agent: String,
  duration_ms: Number,
  changes: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed
}, {
  capped: { size: 10_000_000_000, max: 50_000_000 },  // 10GB, 50M docs
  strict: true
});

// Prevent updates/deletes
AuditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    throw new Error('Audit logs are immutable');
  }
  next();
});

AuditLogSchema.index({ timestamp: -1, user_id: 1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
```

### Read-Only Access

```javascript
// Create read-only MongoDB user for auditors
db.createUser({
  user: "auditor",
  pwd: "...",
  roles: [
    { role: "read", db: "ethixai", collection: "audit_logs" }
  ]
});
```

## 7. Retention & Compliance

| Log Type | Retention | Storage | Access |
|----------|-----------|---------|--------|
| Audit Logs | 1 year | S3 Object Lock | Auditor, Admin |
| Security Logs | 2 years | S3 Object Lock | Security Team |
| Application Logs | 90 days | ELK/CloudWatch | Dev, Ops |
| Access Logs | 6 months | S3 Standard | Ops |

## 8. Acceptance Criteria

- [ ] Structured audit logs with all required fields
- [ ] Audit middleware captures all API requests
- [ ] Critical events (login, role change, data export) explicitly logged
- [ ] Append-only storage configured (S3 Object Lock or equivalent)
- [ ] Log rotation uploads to immutable storage daily
- [ ] Checksum + signature verification implemented
- [ ] MongoDB audit collection is capped and immutable
- [ ] Access controls restrict log modification
- [ ] Retention policies documented and enforced

## 9. Query Examples

```javascript
// Find all login attempts by user
db.audit_logs.find({
  action: 'user.login',
  user_id: ObjectId('...')
}).sort({ timestamp: -1 }).limit(100);

// Find all authorization failures
db.audit_logs.find({
  action: 'authz.denied'
}).sort({ timestamp: -1 });

// Find all exports by date range
db.audit_logs.find({
  action: 'report.export',
  timestamp: {
    $gte: ISODate('2025-11-01T00:00:00Z'),
    $lt: ISODate('2025-11-15T00:00:00Z')
  }
});

// Aggregate by action type
db.audit_logs.aggregate([
  { $group: { _id: '$action', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

## References

- NIST SP 800-92: Guide to Computer Security Log Management
- PCI DSS Requirement 10: Track and Monitor All Access
- SOC 2 CC7.2: System monitoring and logging
