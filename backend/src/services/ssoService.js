const mongoose = require('mongoose');
const logger = require('../logger');
const { samlAuthManager } = require('../middleware/samlAuth');
const { oidcAuthManager } = require('../middleware/oidcAuth');
const { ldapAuthManager } = require('../middleware/ldapAuth');

const SSOConfigSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  provider: { type: String, enum: ['saml', 'oidc', 'ldap'], required: true },
  name: String,
  enabled: { type: Boolean, default: true },

  // SAML config
  saml: {
    entryPoint: String,
    issuer: String,
    cert: String,
    privateCert: String,
    wantAssertionsSigned: { type: Boolean, default: true },
  },

  // OIDC config
  oidc: {
    discoveryUrl: String,
    clientId: String,
    clientSecret: String,
    redirectUri: String,
  },

  // LDAP config
  ldap: {
    url: String,
    baseDn: String,
    searchFilter: String,
    bindDn: String,
    bindPassword: String,
    attributes: [String],
    timeout: Number,
    connectTimeout: Number,
    tlsOptions: mongoose.Schema.Types.Mixed,
  },

  // Attribute mapping
  attributeMapping: {
    emailAttribute: String,
    nameAttribute: String,
    roleAttribute: String,
    groupAttribute: String,
  },

  // Authorization rules
  authorization: {
    requireGroups: [String],
    groupRoleMapping: mongoose.Schema.Types.Mixed,
    defaultRole: { type: String, default: 'user' },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

let SSOConfig;

try {
  SSOConfig = mongoose.models?.SSOConfig || mongoose.model('SSOConfig', SSOConfigSchema);
} catch (e) {
  logger.warn('SSO config model initialization deferred');
}

class SSOService {
  async createConfig(tenantId, provider, config) {
    try {
      const ssoConfig = new SSOConfig({
        tenantId,
        provider,
        ...config,
      });

      await ssoConfig.save();

      // Initialize the provider
      await this.initializeProvider(tenantId, provider, config);

      logger.info({ tenantId, provider }, 'SSO config created');
      return ssoConfig;
    } catch (e) {
      logger.error({ err: e, tenantId, provider }, 'SSO config creation failed');
      throw e;
    }
  }

  async updateConfig(configId, updates) {
    try {
      const ssoConfig = await SSOConfig.findByIdAndUpdate(configId, updates, { new: true });

      if (ssoConfig) {
        await this.initializeProvider(
          ssoConfig.tenantId,
          ssoConfig.provider,
          updates
        );
      }

      logger.info({ configId }, 'SSO config updated');
      return ssoConfig;
    } catch (e) {
      logger.error({ err: e, configId }, 'SSO config update failed');
      throw e;
    }
  }

  async getConfig(tenantId, provider) {
    try {
      return await SSOConfig.findOne({ tenantId, provider, enabled: true });
    } catch (e) {
      logger.error({ err: e, tenantId, provider }, 'SSO config retrieval failed');
      return null;
    }
  }

  async getAllConfigs(tenantId) {
    try {
      return await SSOConfig.find({ tenantId, enabled: true });
    } catch (e) {
      logger.error({ err: e, tenantId }, 'SSO configs retrieval failed');
      return [];
    }
  }

  async initializeProvider(tenantId, provider, config) {
    try {
      switch (provider) {
        case 'saml':
          return await samlAuthManager.initializeSAML(tenantId, config.saml);
        case 'oidc':
          return await oidcAuthManager.initializeOIDC(tenantId, config.oidc);
        case 'ldap':
          return await ldapAuthManager.initializeLDAP(tenantId, config.ldap);
        default:
          logger.warn({ provider }, 'Unknown SSO provider');
          return false;
      }
    } catch (e) {
      logger.error({ err: e, tenantId, provider }, 'Provider initialization failed');
      return false;
    }
  }

  async provisionUserFromSSO(tenantId, ssoUser, ssoProvider) {
    const User = require('../models/User');

    try {
      let user = await User.findOne({
        $or: [
          { email: ssoUser.email },
          { ssoIdentifier: ssoUser.ssoIdentifier },
        ],
        tenantId,
      });

      if (!user) {
        user = new User({
          email: ssoUser.email,
          name: ssoUser.name,
          tenantId,
          ssoProvider,
          ssoIdentifier: ssoUser.ssoIdentifier,
          ssoAttributes: ssoUser.ssoAttributes || {},
          role: ssoUser.role || 'user',
        });

        if (ssoProvider === 'saml') {
          user.samlNameId = ssoUser.nameId;
          user.samlSessionIndex = ssoUser.sessionIndex;
        } else if (ssoProvider === 'oidc') {
          user.oidcSubject = ssoUser.oidcSubject;
        } else if (ssoProvider === 'ldap') {
          user.ldapDn = ssoUser.ldapDn;
        }

        await user.save();
        logger.info({ userId: user._id, ssoProvider }, 'User provisioned from SSO');
      } else {
        // Update existing user with SSO attributes
        user.ssoProvider = ssoProvider;
        user.ssoIdentifier = ssoUser.ssoIdentifier;
        user.ssoAttributes = { ...user.ssoAttributes, ...ssoUser.ssoAttributes };
        user.lastLogin = new Date();

        if (ssoProvider === 'saml' && ssoUser.nameId) {
          user.samlNameId = ssoUser.nameId;
          user.samlSessionIndex = ssoUser.sessionIndex;
        }

        await user.save();
        logger.info({ userId: user._id, ssoProvider }, 'User updated from SSO');
      }

      return user;
    } catch (e) {
      logger.error({ err: e, tenantId, ssoProvider }, 'User provisioning failed');
      throw e;
    }
  }

  mapSSOAttributesToRole(ssoConfig, ssoAttributes) {
    if (!ssoConfig?.authorization?.groupRoleMapping) {
      return ssoConfig?.authorization?.defaultRole || 'user';
    }

    const groupAttribute = ssoConfig.attributeMapping?.groupAttribute || 'groups';
    const userGroups = ssoAttributes[groupAttribute] || [];

    for (const [group, role] of Object.entries(ssoConfig.authorization.groupRoleMapping)) {
      if (userGroups.includes(group)) {
        return role;
      }
    }

    return ssoConfig.authorization.defaultRole || 'user';
  }

  async validateGroupRequirements(ssoConfig, ssoAttributes) {
    const requiredGroups = ssoConfig?.authorization?.requireGroups || [];
    if (requiredGroups.length === 0) {
      return true;
    }

    const groupAttribute = ssoConfig.attributeMapping?.groupAttribute || 'groups';
    const userGroups = ssoAttributes[groupAttribute] || [];

    return requiredGroups.some((group) => userGroups.includes(group));
  }
}

module.exports = {
  SSOService: new SSOService(),
  SSOConfig,
};
