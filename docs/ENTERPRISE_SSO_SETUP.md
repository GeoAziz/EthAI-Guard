# Enterprise SSO Setup Guide

Step-by-step guides for configuring SAML 2.0, OIDC, and LDAP authentication.

## Prerequisites

- Admin access to your identity provider
- Admin role in EthixAI
- Network connectivity to identity provider
- For LDAP: LDAP server with user directory

---

## SAML 2.0 Setup

### Step 1: Obtain Service Provider Metadata

Get your SP metadata from EthixAI:

```bash
curl https://api.ethixai.example.com/auth/sso/saml/metadata/tenant-123 \
  -H "Accept: application/xml" > sp-metadata.xml
```

### Step 2: Configure Identity Provider

In your SAML IdP (Okta, Ping, Shibboleth, etc.):

1. Add new SAML application
2. Upload SP metadata from Step 1
3. Configure attribute mappings:
   - `email` → User email
   - `displayName` → User full name
   - `groups` → User groups/roles

4. Get IdP metadata URL from your IdP

### Step 3: Create SAML Configuration in EthixAI

```bash
curl -X POST https://api.ethixai.example.com/auth/sso/admin/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "provider": "saml",
    "config": {
      "name": "Corporate SAML",
      "saml": {
        "entryPoint": "https://idp.example.com/app/123/sso/saml",
        "issuer": "https://ethixai.example.com",
        "cert": "-----BEGIN CERTIFICATE-----\nMIIDXTC... (from IdP metadata)\n-----END CERTIFICATE-----"
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
          "ethixai-analysts": "analyst",
          "ethixai-reviewers": "reviewer"
        },
        "defaultRole": "user"
      }
    }
  }'
```

### Step 4: Test SAML Login

```javascript
// In your browser console
window.location.href = 'https://api.ethixai.example.com/auth/sso/saml/login/tenant-123';
```

Expected flow:
1. Redirected to SAML IdP login page
2. Enter credentials
3. Redirected back to EthixAI with token
4. Logged in as authenticated user

### SAML Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid assertion signature" | Certificate mismatch | Verify IdP certificate in configuration |
| "Assertion has expired" | Clock skew | Sync server time (NTP) |
| "Invalid assertion consumer URL" | URL mismatch | Check `entryPoint` matches IdP config |
| "Missing NameID" | Assertion format | Configure IdP to include NameID in assertions |

---

## OIDC Setup

### Step 1: Register EthixAI as OIDC Client

In your OIDC provider (Azure AD, Okta, Google Workspace, Keycloak):

1. Create new application/client
2. Configuration:
   - **Redirect URI:** `https://api.ethixai.example.com/auth/sso/oidc/callback`
   - **Response Type:** Authorization Code
   - **Scopes:** openid, email, profile
   - **Grant Type:** Authorization Code

3. Copy `Client ID` and `Client Secret`
4. Get `Discovery URL` (usually `/.well-known/openid-configuration`)

### Step 2: Create OIDC Configuration in EthixAI

```bash
curl -X POST https://api.ethixai.example.com/auth/sso/admin/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "provider": "oidc",
    "config": {
      "name": "Azure AD",
      "oidc": {
        "discoveryUrl": "https://login.microsoftonline.com/common/.well-known/openid-configuration",
        "clientId": "your-client-id-here",
        "clientSecret": "your-client-secret-here",
        "redirectUri": "https://api.ethixai.example.com/auth/sso/oidc/callback"
      },
      "attributeMapping": {
        "emailAttribute": "email",
        "nameAttribute": "name",
        "roleAttribute": "roles",
        "groupAttribute": "groups"
      },
      "authorization": {
        "requireGroups": [],
        "groupRoleMapping": {
          "ethixai-admin": "admin",
          "ethixai-analyst": "analyst"
        },
        "defaultRole": "user"
      }
    }
  }'
```

### Step 3: Implement Frontend Integration

```javascript
// Get authorization URL
async function startOIDCLogin(tenantId) {
  const response = await fetch(
    `https://api.ethixai.example.com/auth/sso/oidc/authorize/${tenantId}`
  );
  const { authorizationUrl } = await response.json();
  
  // Redirect user to OIDC provider
  window.location.href = authorizationUrl;
}

// Handle callback
function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    localStorage.setItem('authToken', token);
    window.location.href = '/dashboard';
  }
}
```

### OIDC Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid client credentials" | Wrong client secret | Verify credentials in config |
| "Redirect URI mismatch" | Wrong redirect URI | Check config matches provider |
| "Invalid issuer" | Discovery URL incorrect | Use correct `.well-known` endpoint |
| "Token signature invalid" | Certificate mismatch | Restart service to refresh keys |

---

## LDAP Setup

### Step 1: Verify LDAP Connectivity

Test connection to LDAP server:

```bash
ldapsearch -x -H ldap://ad.example.com:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w password \
  -b "cn=users,dc=example,dc=com" \
  "(uid=testuser)"
```

### Step 2: Determine LDAP Parameters

Required information:
- **LDAP URL:** `ldap://ad.example.com:389` or `ldaps://ad.example.com:636`
- **Base DN:** `cn=users,dc=example,dc=com`
- **Search Filter:** `(uid={0})` or `(sAMAccountName={0})`
- **Bind DN:** `cn=ldap-service,dc=example,dc=com` (service account)
- **Bind Password:** Service account password

### Step 3: Create LDAP Configuration in EthixAI

```bash
curl -X POST https://api.ethixai.example.com/auth/sso/admin/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "provider": "ldap",
    "config": {
      "name": "Active Directory",
      "ldap": {
        "url": "ldap://ad.example.com:389",
        "baseDn": "cn=users,dc=example,dc=com",
        "searchFilter": "(uid={0})",
        "bindDn": "cn=ldap-service,dc=example,dc=com",
        "bindPassword": "service-password",
        "attributes": ["mail", "cn", "uid", "displayName", "memberOf"],
        "timeout": 5000,
        "connectTimeout": 10000
      },
      "attributeMapping": {
        "emailAttribute": "mail",
        "nameAttribute": "displayName",
        "roleAttribute": "cn",
        "groupAttribute": "memberOf"
      },
      "authorization": {
        "requireGroups": ["cn=ethixai-users,dc=example,dc=com"],
        "groupRoleMapping": {
          "cn=ethixai-admins,dc=example,dc=com": "admin",
          "cn=ethixai-analysts,dc=example,dc=com": "analyst"
        },
        "defaultRole": "user"
      }
    }
  }'
```

### Step 4: Test LDAP Authentication

```bash
curl -X POST https://api.ethixai.example.com/auth/sso/ldap/authenticate/tenant-123 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cn=testuser,cn=users,dc=example,dc=com",
    "email": "testuser@example.com",
    "name": "Test User",
    "role": "user"
  }
}
```

### LDAP Search Filter Reference

| Directory Type | Search Filter |
|---|---|
| OpenLDAP | `(uid={0})` |
| Active Directory | `(sAMAccountName={0})` |
| FreeIPA | `(uid={0})` |
| 389 Directory Server | `(uid={0})` |

### LDAP Attribute Mapping Reference

| Directory | Email | Name | Groups |
|---|---|---|---|
| OpenLDAP | mail | displayName | memberOf |
| Active Directory | mail / userPrincipalName | displayName | memberOf |
| FreeIPA | mail | displayName | memberOf |

### LDAP Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Connection refused" | Server unreachable | Check URL, firewall, LDAP running |
| "Invalid credentials" | Bind DN/password wrong | Verify service account exists and works |
| "User not found" | Wrong search filter/baseDn | Test filter with `ldapsearch` command |
| "Timeout" | Slow network/server | Increase timeout values in config |
| "TLS error" | Certificate validation | Set `rejectUnauthorized: false` for self-signed |

---

## Group-Based Authorization

### Understanding Group Mapping

Groups from your identity provider are mapped to application roles:

```json
{
  "authorization": {
    "requireGroups": ["ethixai-users"],
    "groupRoleMapping": {
      "ethixai-admins": "admin",
      "ethixai-analysts": "analyst",
      "ethixai-reviewers": "reviewer"
    },
    "defaultRole": "user"
  }
}
```

**Flow:**
1. User authenticates
2. Groups extracted from SSO response
3. First matching group determines role
4. If no match, defaultRole assigned
5. If user not in requireGroups, authorization fails

### Example: Active Directory Groups

Group membership in AD:

```
User: john.smith
  └─ memberOf:
      ├─ cn=ethixai-analysts,cn=groups,dc=example,dc=com
      └─ cn=sales-team,cn=groups,dc=example,dc=com
```

Configuration:

```json
{
  "authorization": {
    "requireGroups": [
      "cn=ethixai-analysts,cn=groups,dc=example,dc=com"
    ],
    "groupRoleMapping": {
      "cn=ethixai-admins,cn=groups,dc=example,dc=com": "admin",
      "cn=ethixai-analysts,cn=groups,dc=example,dc=com": "analyst"
    },
    "defaultRole": "user"
  }
}
```

Result: `john.smith` → Role: `analyst`

---

## Multi-Provider Configuration

Support multiple SSO methods for same tenant:

```bash
# First provider (SAML)
curl -X POST https://api.ethixai.example.com/auth/sso/admin/config \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-123", "provider": "saml", "config": {...}}'

# Second provider (OIDC)
curl -X POST https://api.ethixai.example.com/auth/sso/admin/config \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-123", "provider": "oidc", "config": {...}}'

# Third provider (LDAP)
curl -X POST https://api.ethixai.example.com/auth/sso/admin/config \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-123", "provider": "ldap", "config": {...}}'
```

Users can choose their authentication method from login page:

```
┌─────────────────────────────────┐
│      EthixAI Login              │
├─────────────────────────────────┤
│                                 │
│  [Sign in with SAML]            │
│  [Sign in with Azure AD]        │
│  [Sign in with LDAP]            │
│  [Email/Password]               │
│                                 │
└─────────────────────────────────┘
```

---

## Security Best Practices

### SAML

- [ ] Use HTTPS everywhere
- [ ] Enable assertion signing in IdP
- [ ] Validate certificate chain
- [ ] Set reasonable assertion lifetime (e.g., 5 minutes)
- [ ] Enable RequestID to prevent replay attacks
- [ ] Log all SAML assertion details for audit

### OIDC

- [ ] Never expose client secret in frontend code
- [ ] Use authorization code flow (not implicit)
- [ ] Validate ID token signature
- [ ] Check token issuer matches configuration
- [ ] Verify audience (aud) claim equals client_id
- [ ] Use HTTPS for all endpoints
- [ ] Store tokens securely (HTTPOnly cookies preferred)

### LDAP

- [ ] Use LDAPS (LDAP over TLS) in production
- [ ] Store bind password in secrets manager
- [ ] Use least-privilege service account
- [ ] Implement rate limiting (prevent brute force)
- [ ] Log all authentication attempts
- [ ] Validate LDAP certificate if using LDAPS
- [ ] Monitor for unusual authentication patterns

---

## Monitoring & Logging

### Key Metrics

Monitor these metrics in your observability system:

```
- auth.sso.saml.login_attempts
- auth.sso.saml.login_failures
- auth.sso.oidc.token_exchanges
- auth.sso.oidc.token_exchange_failures
- auth.sso.ldap.authentication_attempts
- auth.sso.ldap.authentication_failures
- auth.sso.user_provisioning_duration
- auth.sso.group_authorization_duration
```

### Log Examples

Successful SAML authentication:
```json
{
  "level": "info",
  "timestamp": "2026-07-05T10:30:00Z",
  "event": "saml_authentication_success",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "email": "user@example.com",
  "role": "analyst",
  "duration_ms": 145
}
```

Failed OIDC authentication:
```json
{
  "level": "warn",
  "timestamp": "2026-07-05T10:31:00Z",
  "event": "oidc_authentication_failed",
  "tenantId": "tenant-123",
  "reason": "id_token_verification_failed",
  "error": "Token signature invalid"
}
```

---

## Migration & Rollout

### Phase 1: Testing
- [ ] Configure SSO for test tenant
- [ ] Test all three providers
- [ ] Test group-based authorization
- [ ] Load test authentication flows

### Phase 2: Pilot
- [ ] Enable for subset of users
- [ ] Monitor for issues
- [ ] Gather feedback
- [ ] Adjust group mappings if needed

### Phase 3: Full Rollout
- [ ] Enable for all users
- [ ] Migrate from legacy auth
- [ ] Decommission old auth system
- [ ] Update documentation

### Rollback Plan
- [ ] Keep legacy auth active for 30 days
- [ ] Monitor for issues
- [ ] Have admin manual user creation available
- [ ] Document rollback steps

---

## Support & Troubleshooting

### Common Issues

**Q: Users can't authenticate via SAML**
A: Verify IdP certificate is current and matches configuration

**Q: "group_authorization_failed" errors**
A: Check group DN format matches user directory structure

**Q: LDAP connection times out**
A: Increase timeout, check firewall, verify LDAP server is running

**Q: Users getting wrong roles**
A: Verify groupRoleMapping is correct and groups are assigned in IdP

### Debugging Steps

1. Enable debug logging: `LOG_LEVEL=debug`
2. Check backend logs for detailed error messages
3. Use IdP test tools to verify assertions/tokens
4. Use LDAP tools like `ldapsearch` to verify directory access
5. Check network connectivity with `curl` or `telnet`

### Getting Help

- Review API documentation: `docs/ENTERPRISE_SSO_API.md`
- Check example configurations: `backend/src/config/ssoConfig.example.js`
- View backend logs: `docker compose logs -f system_api`
- Contact support team with:
  - Tenant ID
  - SSO provider type
  - Full error message
  - Backend logs
  - Network topology diagram
