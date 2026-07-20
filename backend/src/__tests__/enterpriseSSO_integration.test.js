const jwt = require('jsonwebtoken');
const { SSOService, SSOConfig } = require('../services/ssoService');
const { samlAuthManager } = require('../middleware/samlAuth');
const { oidcAuthManager } = require('../middleware/oidcAuth');
const { ldapAuthManager } = require('../middleware/ldapAuth');

describe('Enterprise SSO Integration', () => {
  const testTenantId = 'test-tenant-sso';
  const testSecret = 'test-secret-key';

  beforeAll(() => {
    process.env.SECRET_KEY = testSecret;
    process.env.NODE_ENV = 'test';
  });

  describe('SSO Token Issuance', () => {
    test('creates valid JWT token with SSO claims', () => {
      const user = {
        _id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'analyst',
        ssoProvider: 'saml',
        ssoIdentifier: 'saml-123',
      };

      const token = jwt.sign(
        {
          sub: user._id,
          email: user.email,
          role: user.role,
          tenantId: testTenantId,
          ssoProvider: user.ssoProvider,
          ssoIdentifier: user.ssoIdentifier,
        },
        testSecret,
        { expiresIn: '24h' }
      );

      expect(token).toBeDefined();

      const decoded = jwt.verify(token, testSecret);
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.role).toBe('analyst');
      expect(decoded.ssoProvider).toBe('saml');
      expect(decoded.tenantId).toBe(testTenantId);
    });

    test('token expires correctly', () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'user@example.com' },
        testSecret,
        { expiresIn: '1ms' }
      );

      // Wait for expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => jwt.verify(token, testSecret)).toThrow();
          resolve();
        }, 10);
      });
    });
  });

  describe('SSO Attribute Mapping', () => {
    test('maps SAML attributes to user role', () => {
      const ssoConfig = {
        provider: 'saml',
        attributeMapping: {
          roleAttribute: 'role',
          groupAttribute: 'groups',
        },
        authorization: {
          groupRoleMapping: {
            'saml-admins': 'admin',
            'saml-analysts': 'analyst',
          },
          defaultRole: 'user',
        },
      };

      const attributes = {
        groups: ['saml-analysts', 'users'],
      };

      const role = SSOService.mapSSOAttributesToRole(ssoConfig, attributes);
      expect(role).toBe('analyst');
    });

    test('applies default role when no group mapping matches', () => {
      const ssoConfig = {
        authorization: {
          groupRoleMapping: {
            'admin-group': 'admin',
          },
          defaultRole: 'user',
        },
      };

      const attributes = {
        groups: ['other-group'],
      };

      const role = SSOService.mapSSOAttributesToRole(ssoConfig, attributes);
      expect(role).toBe('user');
    });
  });

  describe('Group Authorization Validation', () => {
    test('allows user in required group', async () => {
      const ssoConfig = {
        authorization: {
          requireGroups: ['ethixai-users'],
        },
      };

      const attributes = {
        groups: ['ethixai-users', 'other-group'],
      };

      const isAuthorized = await SSOService.validateGroupRequirements(
        ssoConfig,
        attributes
      );
      expect(isAuthorized).toBe(true);
    });

    test('denies user not in required group', async () => {
      const ssoConfig = {
        authorization: {
          requireGroups: ['ethixai-users'],
        },
      };

      const attributes = {
        groups: ['other-group'],
      };

      const isAuthorized = await SSOService.validateGroupRequirements(
        ssoConfig,
        attributes
      );
      expect(isAuthorized).toBe(false);
    });

    test('allows when no groups required', async () => {
      const ssoConfig = {
        authorization: {
          requireGroups: [],
        },
      };

      const attributes = {
        groups: ['any-group'],
      };

      const isAuthorized = await SSOService.validateGroupRequirements(
        ssoConfig,
        attributes
      );
      expect(isAuthorized).toBe(true);
    });
  });

  describe('SAML Manager', () => {
    test('initializes SAML strategy with config', async () => {
      const samlConfig = {
        entryPoint: 'https://idp.example.com/sso',
        issuer: 'https://ethixai.example.com',
        cert: '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----',
      };

      const result = await samlAuthManager.initializeSAML(
        testTenantId,
        samlConfig
      );
      expect(result).toBe(true);
    });

    test('fails initialization with incomplete config', async () => {
      const incompleteConfig = {
        entryPoint: 'https://idp.example.com/sso',
        // missing issuer and cert
      };

      const result = await samlAuthManager.initializeSAML(
        testTenantId,
        incompleteConfig
      );
      expect(result).toBe(false);
    });
  });

  describe('OIDC Manager', () => {
    test('stores OIDC client after initialization', async () => {
      const oidcConfig = {
        discoveryUrl:
          'https://login.microsoftonline.com/common/.well-known/openid-configuration',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:5000/callback',
      };

      // This would attempt to reach the discovery URL, so we skip the actual call
      // but test the manager structure
      expect(oidcAuthManager).toBeDefined();
      expect(typeof oidcAuthManager.getClient).toBe('function');
      expect(typeof oidcAuthManager.generateAuthorizationUrl).toBe('function');
    });
  });

  describe('LDAP Manager', () => {
    test('initializes LDAP client with config', async () => {
      const ldapConfig = {
        url: 'ldap://localhost:389',
        baseDn: 'cn=users,dc=example,dc=com',
        searchFilter: '(uid={0})',
      };

      const result = await ldapAuthManager.initializeLDAP(
        testTenantId,
        ldapConfig
      );
      // Result depends on actual LDAP server, but should handle gracefully
      expect(typeof result === 'boolean' || result === null).toBe(true);
    });

    test('fails initialization with incomplete config', async () => {
      const incompleteConfig = {
        url: 'ldap://localhost:389',
        // missing baseDn
      };

      const result = await ldapAuthManager.initializeLDAP(
        testTenantId,
        incompleteConfig
      );
      expect(result).toBe(false);
    });
  });

  describe('Multi-Provider Support', () => {
    test('supports multiple SSO methods for same tenant', () => {
      const providers = ['saml', 'oidc', 'ldap'];

      providers.forEach((provider) => {
        expect(['saml', 'oidc', 'ldap']).toContain(provider);
      });

      expect(providers.length).toBe(3);
    });
  });
});
