const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const logger = require('../logger');
const { SSOService } = require('../services/ssoService');
const { samlAuthManager, samlAuth, samlCallback, samlLogout } = require('../middleware/samlAuth');
const { oidcAuthorize, oidcCallback, oidcAuthManager } = require('../middleware/oidcAuth');
const { ldapAuth } = require('../middleware/ldapAuth');
const { authGuard, requireRole } = require('../middleware/authGuard');
const { getSecret } = require('../config/secrets');

const issueSSOToken = (user, tenantId) => {
  const payload = {
    sub: user._id || user.sub,
    email: user.email,
    role: user.role || 'user',
    tenantId,
    ssoProvider: user.ssoProvider,
    ssoIdentifier: user.ssoIdentifier,
  };

  return jwt.sign(payload, getSecret('SECRET_KEY'), { expiresIn: '24h' });
};

// Get available SSO methods for tenant
router.get('/methods/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const configs = await SSOService.getAllConfigs(tenantId);

    const methods = configs.map((config) => ({
      provider: config.provider,
      name: config.name,
      enabled: config.enabled,
    }));

    res.json({ methods });
  } catch (e) {
    logger.error({ err: e }, 'Failed to get SSO methods');
    res.status(500).json({ error: 'failed_to_get_methods' });
  }
});

// ===== SAML Routes =====
router.get('/saml/metadata/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const metadata = samlAuthManager.getSAMLMetadata(tenantId, baseUrl);
    if (!metadata) {
      return res.status(404).json({ error: 'saml_not_configured' });
    }

    res.type('application/xml').send(metadata);
  } catch (e) {
    logger.error({ err: e }, 'Failed to generate SAML metadata');
    res.status(500).json({ error: 'metadata_generation_failed' });
  }
});

router.get('/saml/login/:tenantId', samlAuth);

router.post('/saml/callback/:tenantId', samlCallback, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const samlUser = req.user;

    const ssoConfig = await SSOService.getConfig(tenantId, 'saml');
    if (!ssoConfig) {
      return res.status(404).json({ error: 'saml_not_configured' });
    }

    const user = await SSOService.provisionUserFromSSO(
      tenantId,
      {
        email: samlUser.email,
        name: samlUser.name,
        ssoIdentifier: samlUser.nameId,
        nameId: samlUser.nameId,
        sessionIndex: samlUser.sessionIndex,
        ssoAttributes: samlUser.attributes,
      },
      'saml'
    );

    const role = SSOService.mapSSOAttributesToRole(ssoConfig, samlUser.attributes);
    user.role = role;
    await user.save();

    const isAuthorized = await SSOService.validateGroupRequirements(
      ssoConfig,
      samlUser.attributes
    );

    if (!isAuthorized) {
      return res.status(403).json({ error: 'unauthorized_group' });
    }

    const token = issueSSOToken(user, tenantId);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    logger.error({ err: e }, 'SAML callback processing failed');
    res.status(500).json({ error: 'callback_processing_failed' });
  }
});

router.post('/saml/logout/:tenantId', authGuard, samlLogout);

// ===== OIDC Routes =====
router.get('/oidc/authorize/:tenantId', oidcAuthorize);

router.get('/oidc/callback/:tenantId', async (req, res, next) => {
  const { tenantId } = req.params;

  // Pass to callback handler
  await oidcCallback(req, res);

  // If successful, process user
  if (req.user) {
    try {
      const ssoConfig = await SSOService.getConfig(tenantId, 'oidc');
      if (!ssoConfig) {
        return res.status(404).json({ error: 'oidc_not_configured' });
      }

      const user = await SSOService.provisionUserFromSSO(
        tenantId,
        {
          email: req.user.email,
          name: req.user.name,
          ssoIdentifier: req.user.sub,
          oidcSubject: req.user.sub,
          ssoAttributes: req.user.ssoAttributes,
        },
        'oidc'
      );

      const role = SSOService.mapSSOAttributesToRole(ssoConfig, req.user.ssoAttributes || {});
      user.role = role;
      await user.save();

      const isAuthorized = await SSOService.validateGroupRequirements(
        ssoConfig,
        req.user.ssoAttributes || {}
      );

      if (!isAuthorized) {
        return res.status(403).json({ error: 'unauthorized_group' });
      }

      const token = issueSSOToken(user, tenantId);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (e) {
      logger.error({ err: e }, 'OIDC user provisioning failed');
      res.status(500).json({ error: 'user_provisioning_failed' });
    }
  }
});

// ===== LDAP Routes =====
router.post('/ldap/authenticate/:tenantId', ldapAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const ldapUser = req.user;

    const ssoConfig = await SSOService.getConfig(tenantId, 'ldap');
    if (!ssoConfig) {
      return res.status(404).json({ error: 'ldap_not_configured' });
    }

    const user = await SSOService.provisionUserFromSSO(
      tenantId,
      {
        email: ldapUser.email,
        name: ldapUser.name,
        ssoIdentifier: ldapUser.ldapDn,
        ldapDn: ldapUser.ldapDn,
        ssoAttributes: ldapUser.ssoAttributes,
      },
      'ldap'
    );

    const role = SSOService.mapSSOAttributesToRole(ssoConfig, ldapUser.ssoAttributes || {});
    user.role = role;
    await user.save();

    const isAuthorized = await SSOService.validateGroupRequirements(
      ssoConfig,
      ldapUser.ssoAttributes || {}
    );

    if (!isAuthorized) {
      return res.status(403).json({ error: 'unauthorized_group' });
    }

    const token = issueSSOToken(user, tenantId);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    logger.error({ err: e }, 'LDAP authentication failed');
    res.status(500).json({ error: 'authentication_failed' });
  }
});

// ===== Admin Routes for SSO Configuration =====
router.post('/admin/config', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { tenantId, provider, config } = req.body;

    if (!tenantId || !provider || !config) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const ssoConfig = await SSOService.createConfig(tenantId, provider, {
      name: config.name,
      [provider]: config,
      attributeMapping: config.attributeMapping,
      authorization: config.authorization,
    });

    res.status(201).json(ssoConfig);
  } catch (e) {
    logger.error({ err: e }, 'SSO config creation failed');
    res.status(500).json({ error: 'config_creation_failed' });
  }
});

router.get('/admin/config/:tenantId', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const configs = await SSOService.getAllConfigs(tenantId);

    res.json({ configs });
  } catch (e) {
    logger.error({ err: e }, 'Failed to retrieve SSO configs');
    res.status(500).json({ error: 'retrieval_failed' });
  }
});

router.put('/admin/config/:configId', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { configId } = req.params;
    const updates = req.body;

    const ssoConfig = await SSOService.updateConfig(configId, updates);

    res.json(ssoConfig);
  } catch (e) {
    logger.error({ err: e }, 'SSO config update failed');
    res.status(500).json({ error: 'update_failed' });
  }
});

router.delete('/admin/config/:configId', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { configId } = req.params;
    const SSOConfig = require('../services/ssoService').SSOConfig;

    await SSOConfig.findByIdAndDelete(configId);

    res.json({ message: 'config_deleted' });
  } catch (e) {
    logger.error({ err: e }, 'SSO config deletion failed');
    res.status(500).json({ error: 'deletion_failed' });
  }
});

module.exports = router;
