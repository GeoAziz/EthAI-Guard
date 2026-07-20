const { Strategy: SamlStrategy } = require('passport-saml');
const logger = require('../logger');
const passport = require('passport');

class SAMLAuthManager {
  constructor() {
    this.strategies = new Map();
    this.initialized = false;
  }

  async initializeSAML(tenantId, samlConfig) {
    if (!samlConfig || !samlConfig.entryPoint || !samlConfig.issuer) {
      logger.warn({ tenantId }, 'SAML config incomplete');
      return false;
    }

    try {
      const strategyName = `saml-${tenantId}`;

      const strategy = new SamlStrategy(
        {
          path: `/auth/saml/callback/${tenantId}`,
          entryPoint: samlConfig.entryPoint,
          issuer: samlConfig.issuer,
          cert: samlConfig.cert,
          privateCert: samlConfig.privateCert,
          identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          authnContext: ['urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'],
          signatureAlgorithm: 'sha256',
          digestAlgorithm: 'sha256',
          wantAssertionsSigned: samlConfig.wantAssertionsSigned !== false,
          acceptedClockSkewMs: 5000,
          // Validates that a SAML response corresponds to an AuthnRequest this SP
          // actually issued (via passport-saml's built-in request-ID cache), which
          // is the primary defense against SAML response replay attacks. Disabling
          // this would allow a captured/leaked signed assertion to be replayed.
          validateInResponseTo: true,
          requestIdExpirationPeriodMs: 3600000,
        },
        (profile, done) => {
          return done(null, {
            nameId: profile.nameID,
            sessionIndex: profile.sessionIndex,
            email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
            name: profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
            attributes: profile,
          });
        }
      );

      passport.use(strategyName, strategy);
      this.strategies.set(tenantId, strategy);
      logger.info({ tenantId, issuer: samlConfig.issuer }, 'SAML strategy initialized');
      return true;
    } catch (e) {
      logger.error({ err: e, tenantId }, 'SAML initialization failed');
      return false;
    }
  }

  getStrategy(tenantId) {
    return this.strategies.get(tenantId);
  }

  getSAMLMetadata(tenantId, baseUrl) {
    const strategy = this.getStrategy(tenantId);
    if (!strategy) {
      return null;
    }
    try {
      return strategy.generateServiceProviderMetadata(null, {
        entityID: `${baseUrl}/metadata/${tenantId}`,
        location: `${baseUrl}/auth/saml/callback/${tenantId}`,
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to generate SP metadata');
      return null;
    }
  }
}

const samlAuthManager = new SAMLAuthManager();

async function samlAuth(req, res, next) {
  const { tenantId } = req.params;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id_required' });
  }

  const strategy = samlAuthManager.getStrategy(tenantId);
  if (!strategy) {
    return res.status(404).json({ error: 'saml_not_configured' });
  }

  passport.authenticate(`saml-${tenantId}`, {
    failureRedirect: '/auth/error',
    failureMessage: true,
  })(req, res, next);
}

async function samlCallback(req, res, next) {
  const { tenantId } = req.params;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id_required' });
  }

  const strategy = samlAuthManager.getStrategy(tenantId);
  if (!strategy) {
    return res.status(404).json({ error: 'saml_not_configured' });
  }

  passport.authenticate(`saml-${tenantId}`, {
    failureRedirect: '/auth/error',
    failureMessage: true,
  })(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'authentication_failed' });
    }

    next();
  });
}

async function samlLogout(req, res, next) {
  const { tenantId } = req.params;
  const strategy = samlAuthManager.getStrategy(tenantId);

  if (!strategy) {
    return res.status(404).json({ error: 'saml_not_configured' });
  }

  const sessionIndex = req.user?.sessionIndex;
  const nameId = req.user?.nameId;

  if (sessionIndex && nameId) {
    try {
      strategy.logout(req, (err, url) => {
        if (err) {
          logger.error({ err }, 'SAML logout failed');
          return res.status(500).json({ error: 'logout_failed' });
        }
        res.json({ logoutUrl: url });
      });
    } catch (e) {
      logger.error({ err: e }, 'SAML logout error');
      res.status(500).json({ error: 'logout_error' });
    }
  } else {
    res.json({ message: 'logout_initiated' });
  }
}

module.exports = {
  samlAuth,
  samlCallback,
  samlLogout,
  samlAuthManager,
};
