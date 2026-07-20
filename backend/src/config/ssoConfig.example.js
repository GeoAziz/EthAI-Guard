// Enterprise SSO Configuration Examples

// ===== SAML 2.0 Configuration =====
const samlConfig = {
  provider: 'saml',
  name: 'Corporate SAML',
  saml: {
    // SAML Identity Provider Metadata
    entryPoint: 'https://idp.example.com/sso/saml',
    issuer: 'https://ethixai.example.com',

    // Certificates (PEM format)
    cert: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAK... (identity provider certificate)
-----END CERTIFICATE-----`,

    // Optional: Private key for signing requests
    privateCert: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC... (optional)
-----END PRIVATE KEY-----`,

    // Security settings
    wantAssertionsSigned: true,
  },

  attributeMapping: {
    emailAttribute: 'email',
    nameAttribute: 'displayName',
    roleAttribute: 'role',
    groupAttribute: 'groups',
  },

  authorization: {
    // Require user to be in these LDAP groups
    requireGroups: ['ethixai-users'],

    // Map SAML groups to application roles
    groupRoleMapping: {
      'ethixai-admins': 'admin',
      'ethixai-analysts': 'analyst',
      'ethixai-reviewers': 'reviewer',
      'ethixai-users': 'user',
    },

    defaultRole: 'user',
  },
};

// ===== OIDC Configuration =====
const oidcConfig = {
  provider: 'oidc',
  name: 'Azure AD',
  oidc: {
    // OpenID Connect Discovery endpoint
    discoveryUrl: 'https://login.microsoftonline.com/common/.well-known/openid-configuration',

    // OAuth 2.0 client credentials
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',

    // Redirect URI (must be registered in your OIDC provider)
    redirectUri: 'https://ethixai.example.com/auth/sso/oidc/callback',
  },

  attributeMapping: {
    emailAttribute: 'email',
    nameAttribute: 'name',
    roleAttribute: 'roles',
    groupAttribute: 'groups',
  },

  authorization: {
    requireGroups: [],
    groupRoleMapping: {
      'ethixai-admin': 'admin',
      'ethixai-analyst': 'analyst',
    },
    defaultRole: 'user',
  },
};

// ===== LDAP Configuration =====
const ldapConfig = {
  provider: 'ldap',
  name: 'Active Directory',
  ldap: {
    // LDAP server URL
    url: 'ldap://ad.example.com:389',

    // Base DN for user searches
    baseDn: 'cn=users,dc=example,dc=com',

    // Search filter template (use {0} for username)
    searchFilter: '(uid={0})',

    // Optional: Bind credentials for admin search
    bindDn: 'cn=ldap-service,cn=users,dc=example,dc=com',
    bindPassword: 'service-account-password',

    // LDAP attributes to retrieve
    attributes: [
      'mail',
      'cn',
      'uid',
      'displayName',
      'memberOf',
    ],

    // Connection options
    timeout: 5000,
    connectTimeout: 10000,

    // TLS/SSL options (optional)
    tlsOptions: {
      rejectUnauthorized: false, // Set to true in production
    },
  },

  attributeMapping: {
    emailAttribute: 'mail',
    nameAttribute: 'displayName',
    roleAttribute: 'cn',
    groupAttribute: 'memberOf',
  },

  authorization: {
    // Require membership in DN groups
    requireGroups: [
      'cn=ethixai-users,cn=groups,dc=example,dc=com',
    ],

    // Map LDAP groups to roles
    groupRoleMapping: {
      'cn=ethixai-admins,cn=groups,dc=example,dc=com': 'admin',
      'cn=ethixai-analysts,cn=groups,dc=example,dc=com': 'analyst',
    },

    defaultRole: 'user',
  },
};

module.exports = {
  samlConfig,
  oidcConfig,
  ldapConfig,
};
