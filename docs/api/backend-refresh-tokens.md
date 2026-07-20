# DB-Backed Refresh Token Implementation

## Overview

The backend now implements a production-ready, database-backed refresh token system with the following features:

- **Argon2 Token Hashing**: All refresh tokens are hashed using Argon2 (memory-hard, secure) before storage
- **Device Tracking**: Each refresh token session includes device metadata (user agent, IP, device name)
- **Token Rotation**: Tokens are rotated on each refresh with automatic revocation of old tokens
- **Multi-Device Management**: Users can list and revoke tokens from specific devices
- **Secure Cookie Support**: Optional HttpOnly/SameSite cookie support for web clients
- **In-Memory Fallback**: Test mode uses in-memory storage for unit tests

## Architecture

### Models

#### RefreshToken (MongoDB)
```javascript
{
  userId: ObjectId,                    // Reference to User
  tokenHash: String,                   // Argon2-hashed token (secure storage)
  device: {
    userAgent: String,                 // Browser/client info
    ipAddress: String,                 // Client IP
    deviceId: String,                  // Optional client device ID
    deviceName: String                 // User-friendly name
  },
  createdAt: Date,
  expiresAt: Date,                     // 7 day TTL
  lastUsedAt: Date,                    // Track usage
  revokedAt: Date,                     // null = active, set = revoked
  rotationId: String,                  // Links tokens in chain
  parentTokenHash: String,             // Previous token reference
  name: String                         // Device display name
}
```

### Endpoints

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "status": "registered",
  "userId": "6475d3c9a1b2c3d4e5f6g7h8"
}
```

#### POST `/auth/login`
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "deviceName": "My Laptop"  // Optional
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Headers:**
- `Authorization: Bearer <accessToken>` (15m TTL)
- `Set-Cookie: refreshToken=<refreshToken>; HttpOnly; SameSite=Strict; Secure` (optional, if `USE_COOKIE_REFRESH=1`)

#### POST `/auth/refresh`
Obtain a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // rotated
}
```

**Features:**
- Issues a new access token (15m TTL)
- Rotates refresh token (old token automatically revoked)
- Returns new refresh token with unique jti
- Validates token hasn't expired or been revoked

#### POST `/auth/logout`
Logout and revoke current refresh token.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "status": "logged out"
}
```

#### GET `/auth/devices`
List all active devices/sessions for the user.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "devices": [
    {
      "_id": "6475d3c9a1b2c3d4e5f6g7h8",
      "name": "My Laptop",
      "device": {
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.100"
      },
      "createdAt": "2025-11-15T10:30:00Z",
      "lastUsedAt": "2025-11-15T12:00:00Z",
      "expiresAt": "2025-11-22T10:30:00Z"
    },
    {
      "_id": "6475d3c9a1b2c3d4e5f6g7h9",
      "name": "My Phone",
      "device": {
        "userAgent": "iPhone OS...",
        "ipAddress": "203.0.113.45"
      },
      "createdAt": "2025-11-14T15:20:00Z",
      "lastUsedAt": "2025-11-15T11:45:00Z",
      "expiresAt": "2025-11-21T15:20:00Z"
    }
  ]
}
```

#### DELETE `/auth/devices/:deviceId`
Revoke a specific device's refresh token.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "status": "device revoked"
}
```

**Note:** Only supported in MongoDB mode (not in-memory test mode).

## Security Features

### Token Storage
- **Access Tokens**: Stored in short-lived JWTs (15 minutes)
  - Claims: `{sub: userId, role: userRole}`
  - Signed with `SECRET_KEY` env var
  
- **Refresh Tokens**: Stored as Argon2-hashed JWTs (7 days)
  - JWT stored in database as hash only
  - Plain token only returned to client at login/refresh
  - Includes unique `jti` claim for deterministic rotation
  - Signed with `REFRESH_SECRET` env var

### Rotation Strategy
```
Login: Issue Token A, store Hash(A)
       ↓
Refresh with A: Validate Hash(A), revoke A, Issue Token B
                ↓
                Refresh with A: ❌ Token revoked
                ↓
                Refresh with B: Validate Hash(B), revoke B, Issue Token C
```

### Device Tracking
- Every token includes metadata:
  - User-Agent (browser/client version)
  - IP Address (geolocation indicator)
  - Device Name (user-friendly label)
- Users can monitor and revoke suspicious sessions

### Rate Limiting
- Login attempts limited to 10 per 5 minutes (configurable)
- Prevents brute-force attacks
- Global rate limit: 60 requests per minute by IP

### Password Security
- **Production**: Minimum 12 characters (configurable via `MIN_PASSWORD_LENGTH`)
- **Test mode**: Minimum 4 characters
- Hashed with bcryptjs (10 salt rounds)

## Environment Variables

```bash
# Secrets
SECRET_KEY=your-access-token-secret-min-32-chars
REFRESH_SECRET=your-refresh-token-secret-min-32-chars

# Database
MONGO_URL=mongodb://mongo:27017/ethixai

# Test mode
NODE_ENV=test                 # Triggers in-memory mode
USE_IN_MEMORY_DB=1           # Force in-memory (don't use Mongo)

# Security
MIN_PASSWORD_LENGTH=12        # Password policy
RATE_WINDOW_MS=60000         # Global rate limit window (ms)
RATE_MAX=60                  # Global rate limit count
LOGIN_RATE_WINDOW_MS=300000  # Login rate limit window (ms, default 5min)
LOGIN_RATE_MAX=10            # Login rate limit count

# Cookies (optional)
USE_COOKIE_REFRESH=1         # Set refresh token as HttpOnly cookie
```

## Implementation Details

### Token Hashing (MongoDB Mode)
```javascript
// Login: Generate and hash
const refreshTokenJwt = jwt.sign({ sub: userId, jti: uuidv4() }, ...);
const tokenHash = await argon2.hash(refreshTokenJwt);
await RefreshToken.create({ tokenHash, ... });

// Refresh: Validate hash
const tokens = await RefreshToken.find({ userId, revokedAt: null });
for (const doc of tokens) {
  const isValid = await argon2.verify(doc.tokenHash, rawToken);
  if (isValid) { /* use this token */ }
}
```

### In-Memory Mode (Testing)
```javascript
// Simpler for unit tests
const _refreshTokens = new Map();      // token -> userId
const _revokedTokens = new Set();      // revoked token strings

// Login
_refreshTokens.set(token, userId);

// Refresh
if (!_revokedTokens.has(token) && _refreshTokens.get(token) === userId) {
  _revokedTokens.add(token);           // Mark old as revoked
  _refreshTokens.set(newToken, userId);
}
```

## Usage Examples

### Client-Side (JavaScript)

```javascript
// Login
const login = await fetch('http://localhost:5000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    deviceName: 'Chrome on Windows'
  })
});
const { accessToken, refreshToken } = await login.json();
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Use access token
const response = await fetch('http://localhost:5000/api/v1/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: { ... } })
});

// Refresh token (when access token expires)
const refresh = await fetch('http://localhost:5000/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});
const { accessToken: newToken, refreshToken: newRefresh } = await refresh.json();
localStorage.setItem('accessToken', newToken);
localStorage.setItem('refreshToken', newRefresh);

// List devices
const devices = await fetch('http://localhost:5000/auth/devices', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
console.log(await devices.json());

// Logout
await fetch('http://localhost:5000/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});
```

## Testing

### Run Tests (In-Memory Mode)
```bash
cd backend
NODE_ENV=test npm test
```

### Test Coverage
- ✅ User registration
- ✅ Login with device tracking
- ✅ Token refresh and rotation
- ✅ Logout with token revocation
- ✅ Device listing
- ✅ Protected endpoints (requires auth)

## Migration from In-Memory to MongoDB

The system automatically switches based on environment:

1. **Test**: `NODE_ENV=test` or `USE_IN_MEMORY_DB=1` → In-memory
2. **Production**: MongoDB connection required

No code changes needed - same API works for both modes.

## Future Enhancements

- [ ] Redis cache for token blacklist (faster revocation checks)
- [ ] OAuth2/OIDC provider integration
- [ ] Social login (Google, GitHub)
- [ ] TOTP/2FA support
- [ ] Device fingerprinting (prevent token theft)
- [ ] Audit logging (track all auth events)
- [ ] Token expiration notifications
- [ ] Geographic anomaly detection
