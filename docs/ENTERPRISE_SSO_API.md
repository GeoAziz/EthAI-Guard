# Enterprise SSO Integration API

Complete API reference for SAML 2.0, OIDC, and LDAP single sign-on integration.

## Overview

The Enterprise SSO system supports three authentication methods:
- **SAML 2.0**: Enterprise identity federation
- **OIDC**: OpenID Connect (Azure AD, Okta, Google Workspace)
- **LDAP**: Active Directory / OpenLDAP

## Base URL
```
https://api.ethixai.example.com/auth/sso
```

---

## SAML 2.0 Authentication

### Get SP Metadata
Returns Service Provider metadata for configuring your SAML IdP.

```http
GET /saml/metadata/{tenantId}
Content-Type: application/xml
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="https://ethixai.example.com/metadata/tenant-123">
  <SPSSODescriptor ...>
    ...
  </SPSSODescriptor>
</EntityDescriptor>
```

### Initiate SAML Login
Redirect user to your SAML Identity Provider.

```http
GET /saml/login/{tenantId}
```

**Flow:**
1. User visits `/auth/sso/saml/login/tenant-123`
2. Redirected to SAML IdP login
3. User authenticates
4. IdP posts assertion to `/saml/callback/{tenantId}`
5. Backend validates and issues JWT token

### SAML Callback (POST from IdP)
Handled automatically by the backend.

```http
POST /saml/callback/{tenantId}
Content-Type: application/x-www-form-urlencoded

SAMLResponse=<base64-encoded-assertion>&RelayState=<state>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "john@example.com",
    "name": "John Smith",
    "role": "analyst"
  }
}
```

### SAML Logout
Initiate SAML Single Logout flow.

```http
POST /saml/logout/{tenantId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "logoutUrl": "https://idp.example.com/logout?SAMLRequest=..."
}
```

---

## OIDC Authentication

### Get Authorization URL
Retrieve the authorization endpoint to redirect users.

```http
GET /oidc/authorize/{tenantId}
```

**Response:**
```json
{
  "authorizationUrl": "https://login.microsoftonline.com/...?client_id=...&redirect_uri=..."
}
```

### OIDC Callback
Handles the redirect from your OIDC provider.

```http
GET /oidc/callback/{tenantId}?code={auth_code}&state={state}
```

**Flow:**
1. Frontend calls `/oidc/authorize/tenant-123` to get auth URL
2. Frontend redirects user to OIDC provider
3. User authenticates
4. Provider redirects to `/oidc/callback/tenant-123?code=...`
5. Backend exchanges code for tokens
6. Backend validates ID token and issues JWT

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-456",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "admin"
  }
}
```

---

## LDAP Authentication

### LDAP Login
Direct LDAP authentication with username and password.

```http
POST /ldap/authenticate/{tenantId}
Content-Type: application/json

{
  "username": "jsmith",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cn=jsmith,cn=users,dc=example,dc=com",
    "email": "jsmith@example.com",
    "name": "John Smith",
    "role": "analyst"
  }
}
```

**Error Responses:**
- `400`: Invalid credentials format
- `401`: Authentication failed
- `403`: User not in required groups
- `404`: LDAP not configured
- `500`: Server error

---

## Admin Configuration Endpoints

### List Available SSO Methods
Get all configured SSO methods for a tenant.

```http
GET /methods/{tenantId}
```

**Response:**
```json
{
  "methods": [
    {
      "provider": "saml",
      "name": "Corporate SAML",
      "enabled": true
    },
    {
      "provider": "oidc",
      "name": "Azure AD",
      "enabled": true
    },
    {
      "provider": "ldap",
      "name": "Active Directory",
      "enabled": true
    }
  ]
}
```

### Create SSO Configuration
Requires `admin` role.

```http
POST /admin/config
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "tenantId": "tenant-123",
  "provider": "saml",
  "config": {
    "name": "Corporate SAML",
    "saml": {
      "entryPoint": "https://idp.example.com/sso",
      "issuer": "https://ethixai.example.com",
      "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
    },
    "attributeMapping": {
      "emailAttribute": "email",
      "nameAttribute": "displayName",
      "roleAttribute": "role",
      "groupAttribute": "groups"
    },
    "authorization": {
      "requireGroups": ["ethixai-users"],
      "groupRoleMapping": {
        "ethixai-admins": "admin",
        "ethixai-analysts": "analyst"
      },
      "defaultRole": "user"
    }
  }
}
```

**Response:**
```json
{
  "_id": "config-123",
  "tenantId": "tenant-123",
  "provider": "saml",
  "name": "Corporate SAML",
  "enabled": true,
  "createdAt": "2026-07-05T10:30:00Z",
  "updatedAt": "2026-07-05T10:30:00Z"
}
```

### Get SSO Configurations
Requires `admin` role.

```http
GET /admin/config/{tenantId}
Authorization: Bearer {admin-token}
```

**Response:**
```json
{
  "configs": [
    { ... },
    { ... }
  ]
}
```

### Update SSO Configuration
Requires `admin` role.

```http
PUT /admin/config/{configId}
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "enabled": true,
  "authorization": {
    "requireGroups": ["ethixai-users"],
    "groupRoleMapping": {
      "ethixai-admins": "admin"
    }
  }
}
```

**Response:**
```json
{
  "_id": "config-123",
  "tenantId": "tenant-123",
  "provider": "saml",
  ...
}
```

### Delete SSO Configuration
Requires `admin` role.

```http
DELETE /admin/config/{configId}
Authorization: Bearer {admin-token}
```

**Response:**
```json
{
  "message": "config_deleted"
}
```

---

## User Provisioning

### Auto-Provisioning Flow

When a user authenticates via SSO for the first time:

1. **User Identity Extraction**
   - SAML: Extract from SAML assertion
   - OIDC: Extract from ID token and userinfo endpoint
   - LDAP: Extract from directory entry

2. **Local User Creation**
   ```
   - Email extracted from SSO
   - Name extracted from SSO attributes
   - Role determined from group mapping
   - SSO metadata stored with user record
   ```

3. **Tenant Association**
   - User linked to tenant from JWT claims
   - Tenant-scoped authentication maintained

4. **Attribute Sync**
   - User attributes updated on each login
   - Group membership refreshed
   - Role recalculated if group-based

---

## Attribute Mapping

Configure which SSO attributes map to application fields:

```json
{
  "attributeMapping": {
    "emailAttribute": "email",
    "nameAttribute": "displayName",
    "roleAttribute": "role",
    "groupAttribute": "memberOf"
  }
}
```

**SAML Examples:**
```
SAML Attribute              → Application Field
urn:oid:0.9.2342.19200300.100.1.3 (uid)  → username
urn:oid:0.9.2342.19200300.100.1.25 (mail) → email
displayName                 → name
```

**OIDC Examples:**
```
OIDC Claim                  → Application Field
sub                         → ssoIdentifier
email                       → email
name                        → name
groups                      → groups
roles                       → role
```

**LDAP Examples:**
```
LDAP Attribute              → Application Field
uid                         → username
mail                        → email
displayName                 → name
memberOf                    → groups
```

---

## Group-Based Authorization

### Configuration

```json
{
  "authorization": {
    "requireGroups": [
      "cn=ethixai-users,dc=example,dc=com"
    ],
    "groupRoleMapping": {
      "cn=ethixai-admins,dc=example,dc=com": "admin",
      "cn=ethixai-analysts,dc=example,dc=com": "analyst",
      "cn=ethixai-reviewers,dc=example,dc=com": "reviewer"
    },
    "defaultRole": "user"
  }
}
```

### Authorization Rules

1. **Require Groups**: User must be member of at least one group
2. **Group-to-Role Mapping**: First matching group determines role
3. **Default Role**: Applied if user not in any mapped groups

### Error Handling

If user fails authorization:
```json
{
  "status": 403,
  "error": "unauthorized_group",
  "message": "User is not a member of required groups"
}
```

---

## Token Management

### JWT Token Format

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "analyst",
  "tenantId": "tenant-123",
  "ssoProvider": "saml",
  "ssoIdentifier": "name-id-from-saml",
  "iat": 1688634600,
  "exp": 1688721000
}
```

### Token Refresh

Tokens are issued with 24-hour expiration. Implement token refresh in frontend:

```javascript
// Get token from SSO callback
const { token } = response;

// Store in localStorage or secure cookie
localStorage.setItem('authToken', token);

// Include in API requests
headers = {
  'Authorization': `Bearer ${token}`
};

// On expiration, re-authenticate via SSO
```

---

## Security Considerations

### SAML

- ✅ Always use signed assertions
- ✅ Verify certificate in production
- ✅ Use HTTPS for all endpoints
- ✅ Validate timestamps on assertions
- ✅ Prevent replay attacks with RequestID

### OIDC

- ✅ Use authorization code flow (not implicit)
- ✅ Store client secret securely (backend only)
- ✅ Validate ID token signature
- ✅ Verify audience claim matches client_id
- ✅ Use HTTPS for all endpoints

### LDAP

- ✅ Use LDAPS (LDAP over SSL) in production
- ✅ Store bind password in secrets manager
- ✅ Implement rate limiting on authentication
- ✅ Log failed attempts for security monitoring
- ✅ Use least-privilege service account

---

## Troubleshooting

### SAML Issues

| Issue | Solution |
|-------|----------|
| Invalid assertion signature | Verify IdP certificate is current |
| Metadata endpoint 404 | SSO not configured for tenant |
| Assertion expired | Check server time sync |
| Missing attributes | Configure attribute mapping |

### OIDC Issues

| Issue | Solution |
|-------|----------|
| Authorization URL redirect fails | Check discovery URL and client_id |
| Token exchange fails | Verify client secret and redirect_uri |
| ID token invalid | Check issuer and signature |
| User info retrieval fails | Verify access token scope |

### LDAP Issues

| Issue | Solution |
|-------|----------|
| Connection refused | Check LDAP server URL and firewall |
| Authentication fails | Verify username format and password |
| User not found | Check search filter and baseDn |
| Group membership check fails | Verify DN format in group requirements |

---

## Examples

### Frontend: OIDC Flow

```javascript
async function initiateOIDCLogin(tenantId) {
  const response = await fetch(
    `https://api.ethixai.example.com/auth/sso/oidc/authorize/${tenantId}`
  );
  const { authorizationUrl } = await response.json();
  window.location.href = authorizationUrl;
}

function handleOIDCCallback() {
  // Extract token from URL or redirect
  const token = new URLSearchParams(window.location.search).get('token');
  localStorage.setItem('authToken', token);
  window.location.href = '/dashboard';
}
```

### Backend: Token Validation

```javascript
const { authGuard } = require('./middleware/authGuard');

app.get('/protected', authGuard, (req, res) => {
  console.log(req.user);
  // {
  //   sub: 'user-123',
  //   email: 'user@example.com',
  //   role: 'analyst',
  //   ssoProvider: 'saml',
  //   ...
  // }
  res.json({ message: 'Authenticated!' });
});
```

---

## Support

For SSO configuration assistance:
1. Check `docs/ENTERPRISE_SSO_SETUP.md` for detailed setup guides
2. Review `backend/src/config/ssoConfig.example.js` for configuration examples
3. Check application logs for detailed error messages
4. Contact support@ethixai.example.com for assistance
