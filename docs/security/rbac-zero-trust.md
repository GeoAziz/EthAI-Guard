# Role-Based Access Control (RBAC) & Zero-Trust Architecture

## Overview

This document defines role-based access controls, JWT hardening, and zero-trust patterns for EthixAI services.

## 1. Role Definitions

### Role Hierarchy

```
Admin (full access)
  ├── Analyst (read/write analysis, reports)
  ├── Auditor (read-only all, audit logs)
  └── Viewer (read-only reports)
```

### Role Permissions Matrix

| Resource | Admin | Analyst | Auditor | Viewer |
|----------|-------|---------|---------|--------|
| User Management | CRUD | - | R | - |
| Dataset Upload | CRUD | CRU | R | R |
| Run Analysis | ✅ | ✅ | - | - |
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | - |
| View Audit Logs | ✅ | - | ✅ | - |
| Manage API Keys | ✅ | - | - | - |
| System Config | ✅ | - | - | - |

### Role Assignment

```javascript
// backend/src/models/User.js
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password_hash: String,
  role: {
    type: String,
    enum: ['admin', 'analyst', 'auditor', 'viewer'],
    default: 'viewer'
  },
  permissions: [String],  // Granular permissions
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  mfaEnabled: { type: Boolean, default: false }
});
```

## 2. JWT Hardening

### Enhanced JWT Claims

```javascript
// backend/src/auth.js
function createAccessToken(user) {
  const payload = {
    sub: user._id,                    // Subject (user ID)
    role: user.role,                   // Role
    permissions: user.permissions,     // Granular permissions
    iss: 'https://api.ethixai.com',   // Issuer
    aud: 'ethixai-services',          // Audience
    iat: Math.floor(Date.now() / 1000),  // Issued at
    exp: Math.floor(Date.now() / 1000) + 900,  // Expires (15 min)
    jti: uuidv4()                      // JWT ID (unique)
  };
  
  return jwt.sign(payload, process.env.SECRET_KEY, {
    algorithm: 'RS256'  // Use asymmetric if possible
  });
}
```

### Token Validation Middleware

```javascript
// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { withRequest } = require('../logger');

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = auth.split(' ')[1];
  
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY, {
      algorithms: ['RS256', 'HS256'],
      issuer: 'https://api.ethixai.com',
      audience: 'ethixai-services',
      clockTolerance: 10  // 10s clock skew tolerance
    });
    
    // Attach user context
    req.user = payload;
    req.userId = payload.sub;
    req.role = payload.role;
    
    // Log authentication event
    const log = withRequest(req);
    log.info({
      user_id: req.userId,
      role: req.role,
      action: 'auth_success'
    }, 'authenticated');
    
    next();
  } catch (e) {
    const log = withRequest(req);
    log.warn({ error: e.message }, 'auth_failed');
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authMiddleware };
```

### Role-Based Authorization

```javascript
// backend/src/middleware/rbac.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!allowedRoles.includes(req.role)) {
      const log = withRequest(req);
      log.warn({
        user_id: req.userId,
        required_roles: allowedRoles,
        actual_role: req.role,
        action: 'authz_denied'
      }, 'authorization_failed');
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const hasPermission = permissions.some(p => 
      req.user.permissions.includes(p)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

module.exports = { requireRole, requirePermission };
```

### Usage Example

```javascript
// backend/src/server.js
const { authMiddleware } = require('./middleware/auth');
const { requireRole, requirePermission } = require('./middleware/rbac');

// Public endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Authenticated only
app.post('/analyze', authMiddleware, async (req, res) => {
  // All authenticated users can analyze
});

// Role-based
app.get('/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
  // Only admins
});

// Permission-based
app.delete('/datasets/:id', 
  authMiddleware, 
  requirePermission('datasets:delete'),
  async (req, res) => {
    // Only users with datasets:delete permission
  }
);

// Multi-role
app.get('/audit/logs', 
  authMiddleware, 
  requireRole('admin', 'auditor'),
  async (req, res) => {
    // Admins or auditors
  }
);
```

## 3. Refresh Token Security

### Revocation List

Already implemented in Day 8-9; enhance with:

```javascript
// backend/src/models/RefreshToken.js - add revocation reason
const RefreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  revocationReason: {
    type: String,
    enum: ['user_logout', 'suspicious_activity', 'token_rotation', 'admin_revoke', 'password_change'],
  },
  device: {
    userAgent: String,
    ipAddress: String,
    deviceId: String
  },
  name: String,
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: Date
});

RefreshTokenSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
```

### Suspicious Activity Detection

```javascript
// backend/src/auth/suspicious_activity.js
const maxLoginAttemptsPerHour = 10;
const maxDevicesPerUser = 5;

async function checkSuspiciousActivity(userId, req) {
  const oneHourAgo = new Date(Date.now() - 3600_000);
  
  // Check recent login attempts
  const recentLogins = await LoginAttempt.countDocuments({
    userId,
    timestamp: { $gte: oneHourAgo }
  });
  
  if (recentLogins > maxLoginAttemptsPerHour) {
    logger.warn({ userId, recentLogins }, 'suspicious_login_rate');
    // Revoke all refresh tokens
    await RefreshToken.updateMany(
      { userId, revokedAt: null },
      { 
        revokedAt: new Date(),
        revocationReason: 'suspicious_activity'
      }
    );
    throw new Error('Account locked due to suspicious activity');
  }
  
  // Check device count
  const activeDevices = await RefreshToken.countDocuments({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  
  if (activeDevices >= maxDevicesPerUser) {
    logger.warn({ userId, activeDevices }, 'too_many_devices');
    // Optional: revoke oldest device
  }
}
```

## 4. Zero-Trust Architecture

### Service-to-Service Authentication

#### Option A: mTLS (Mutual TLS)

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./certs/backend-cert.pem:/certs/cert.pem:ro
      - ./certs/backend-key.pem:/certs/key.pem:ro
      - ./certs/ca.pem:/certs/ca.pem:ro
    environment:
      - TLS_CERT_PATH=/certs/cert.pem
      - TLS_KEY_PATH=/certs/key.pem
      - TLS_CA_PATH=/certs/ca.pem
```

```javascript
// backend/src/ai_core_client.js
const https = require('https');
const fs = require('fs');

const httpsAgent = new https.Agent({
  cert: fs.readFileSync(process.env.TLS_CERT_PATH),
  key: fs.readFileSync(process.env.TLS_KEY_PATH),
  ca: fs.readFileSync(process.env.TLS_CA_PATH),
  rejectUnauthorized: true  // Verify peer certificate
});

// Use with axios
const aiResp = await axios.post(aiCoreUrl, payload, {
  httpsAgent,
  timeout: 60_000
});
```

#### Option B: Service Tokens

```javascript
// Generate service token with service-specific claims
function createServiceToken() {
  return jwt.sign({
    sub: 'backend-service',
    aud: 'ai-core-service',
    iss: 'ethixai-backend',
    service: true
  }, process.env.SERVICE_SECRET, {
    expiresIn: '5m'  // Short-lived
  });
}

// backend → ai_core
const serviceToken = createServiceToken();
await axios.post(aiCoreUrl, payload, {
  headers: {
    'Authorization': `Bearer ${serviceToken}`,
    'X-Service-ID': 'backend',
    'X-Request-Id': req.request_id
  }
});
```

```python
# ai_core/middleware/service_auth.py
from fastapi import Request, HTTPException
from jose import jwt, JWTError
import os

async def verify_service_token(request: Request):
    """Verify service-to-service JWT."""
    auth = request.headers.get('authorization')
    if not auth or not auth.startswith('Bearer '):
        raise HTTPException(401, "Missing service token")
    
    token = auth.split(' ')[1]
    
    try:
        payload = jwt.decode(
            token,
            os.environ['SERVICE_SECRET'],
            algorithms=['HS256'],
            audience='ai-core-service',
            issuer='ethixai-backend'
        )
        
        if not payload.get('service'):
            raise HTTPException(403, "Not a service token")
        
        request.state.service_id = payload['sub']
    except JWTError as e:
        raise HTTPException(401, f"Invalid service token: {e}")
```

### Network Segmentation

```yaml
# docker-compose.yml with networks
networks:
  frontend_net:
  backend_net:
  data_net:

services:
  frontend:
    networks:
      - frontend_net
      
  backend:
    networks:
      - frontend_net
      - backend_net
      
  ai_core:
    networks:
      - backend_net
      - data_net
      
  mongo:
    networks:
      - data_net  # Only accessible by backend/ai_core
```

### Principle of Least Privilege

**Database Roles**
```javascript
// MongoDB user roles
db.createUser({
  user: "backend_user",
  pwd: "...",
  roles: [
    { role: "readWrite", db: "ethixai" },
    { role: "read", db: "audit_logs" }  // Read-only audit
  ]
});

db.createUser({
  user: "ai_core_user",
  pwd: "...",
  roles: [
    { role: "read", db: "ethixai" },  // Read-only datasets
    { role: "readWrite", db: "shap_cache" }  // Write cache only
  ]
});
```

## 5. Multi-Factor Authentication (MFA)

### TOTP Implementation

```javascript
// backend/src/auth/mfa.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

async function enableMFA(user) {
  const secret = speakeasy.generateSecret({
    name: `EthixAI (${user.email})`,
    issuer: 'EthixAI'
  });
  
  // Store secret (encrypted)
  user.mfaSecret = encryptSecret(secret.base32);
  user.mfaEnabled = false;  // Will be true after verification
  await user.save();
  
  // Generate QR code for user to scan
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  return {
    secret: secret.base32,
    qrCode
  };
}

function verifyMFA(user, token) {
  const secret = decryptSecret(user.mfaSecret);
  
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1  // Allow 30s clock skew
  });
}

// Login flow with MFA
app.post('/auth/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);
  
  if (user.mfaEnabled) {
    // MFA required - return temp token
    const tempToken = jwt.sign({ userId: user._id, mfaRequired: true }, 
      process.env.MFA_TEMP_SECRET, { expiresIn: '5m' });
    
    return res.json({ 
      mfaRequired: true, 
      tempToken 
    });
  }
  
  // No MFA - issue full token
  return issueTokens(user, res);
});

app.post('/auth/mfa/verify', async (req, res) => {
  const { tempToken, mfaCode } = req.body;
  
  const payload = jwt.verify(tempToken, process.env.MFA_TEMP_SECRET);
  if (!payload.mfaRequired) {
    return res.status(400).json({ error: 'Invalid flow' });
  }
  
  const user = await User.findById(payload.userId);
  
  if (!verifyMFA(user, mfaCode)) {
    return res.status(401).json({ error: 'Invalid MFA code' });
  }
  
  // MFA verified - issue full tokens
  return issueTokens(user, res);
});
```

## 6. Acceptance Criteria

- [ ] RBAC middleware implemented with 4 roles (admin, analyst, auditor, viewer)
- [ ] JWT validation includes issuer, audience, and expiry checks
- [ ] Refresh token revocation includes reason tracking
- [ ] Suspicious activity detection triggers token revocation
- [ ] Service-to-service auth (mTLS or service tokens) configured
- [ ] Network segmentation applied in docker-compose
- [ ] MongoDB users follow least-privilege roles
- [ ] MFA (TOTP) implemented for admin accounts
- [ ] Authorization failures logged with user_id and action
- [ ] At least 3 endpoints protected with RBAC

## 7. Testing

```bash
# Test RBAC
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/admin/users
# Expected: 200 OK (list of users)

curl -H "Authorization: Bearer $VIEWER_TOKEN" \
  http://localhost:5000/admin/users
# Expected: 403 Forbidden

# Test service auth
curl -H "Authorization: Bearer $SERVICE_TOKEN" \
  http://localhost:8100/ai_core/analyze
# Expected: 200 OK (if service token valid)
```

## References

- OWASP RBAC: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- Zero Trust Architecture (NIST): https://www.nist.gov/publications/zero-trust-architecture
- JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc8725
- mTLS Guide: https://www.cloudflare.com/learning/access-management/what-is-mutual-tls/
