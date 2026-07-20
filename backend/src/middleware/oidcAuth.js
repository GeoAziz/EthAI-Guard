const { Issuer } = require('openid-client');
const logger = require('../logger');
const jwt = require('jsonwebtoken');

class OIDCAuthManager {
  constructor() {
    this.clients = new Map();
    this.issuers = new Map();
  }

  async initializeOIDC(tenantId, oidcConfig) {
    if (!oidcConfig || !oidcConfig.discoveryUrl || !oidcConfig.clientId || !oidcConfig.clientSecret) {
      logger.warn({ tenantId }, 'OIDC config incomplete');
      return false;
    }

    try {
      const issuer = await Issuer.discover(oidcConfig.discoveryUrl);
      this.issuers.set(tenantId, issuer);

      const client = new issuer.Client({
        client_id: oidcConfig.clientId,
        client_secret: oidcConfig.clientSecret,
        redirect_uris: [oidcConfig.redirectUri || 'http://localhost:5000/auth/oidc/callback'],
        response_types: ['code'],
      });

      this.clients.set(tenantId, client);
      logger.info({ tenantId, issuer: oidcConfig.discoveryUrl }, 'OIDC client initialized');
      return true;
    } catch (e) {
      logger.error({ err: e, tenantId }, 'OIDC initialization failed');
      return false;
    }
  }

  getClient(tenantId) {
    return this.clients.get(tenantId);
  }

  getIssuer(tenantId) {
    return this.issuers.get(tenantId);
  }

  generateAuthorizationUrl(tenantId, state, nonce) {
    const client = this.getClient(tenantId);
    if (!client) {
      return null;
    }

    try {
      return client.authorizationUrl({
        scope: 'openid email profile',
        state,
        nonce,
        response_type: 'code',
      });
    } catch (e) {
      logger.error({ err: e }, 'Failed to generate authorization URL');
      return null;
    }
  }

  async exchangeCodeForToken(tenantId, code, checks) {
    const client = this.getClient(tenantId);
    if (!client) {
      return null;
    }

    try {
      const tokenSet = await client.callback(undefined, { code }, checks);
      return {
        accessToken: tokenSet.access_token,
        idToken: tokenSet.id_token,
        refreshToken: tokenSet.refresh_token,
        expiresIn: tokenSet.expires_in,
      };
    } catch (e) {
      logger.error({ err: e }, 'Token exchange failed');
      return null;
    }
  }

  // NOTE: this only decodes the ID token payload; it does not verify its
  // signature. That's fine as used today because `client.callback()` (in
  // exchangeCodeForToken) already verifies the ID token's signature and
  // claims as part of the OIDC code exchange. Do not use this as a
  // standalone verification step for a token from an untrusted source.
  decodeIdTokenPayload(idToken, tenantId) {
    try {
      const issuer = this.getIssuer(tenantId);
      if (!issuer) {
        return null;
      }

      const decoded = jwt.decode(idToken, { complete: true });
      return decoded?.payload;
    } catch (e) {
      logger.error({ err: e }, 'ID token decoding failed');
      return null;
    }
  }

  async getUserInfo(tenantId, accessToken) {
    const client = this.getClient(tenantId);
    if (!client) {
      return null;
    }

    try {
      const userInfo = await client.userinfo(accessToken);
      return userInfo;
    } catch (e) {
      logger.error({ err: e }, 'UserInfo retrieval failed');
      return null;
    }
  }
}

const oidcAuthManager = new OIDCAuthManager();

async function oidcAuthorize(req, res) {
  const { tenantId } = req.params;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id_required' });
  }

  const client = oidcAuthManager.getClient(tenantId);
  if (!client) {
    return res.status(404).json({ error: 'oidc_not_configured' });
  }

  try {
    const state = require('crypto').randomBytes(16).toString('hex');
    const nonce = require('crypto').randomBytes(16).toString('hex');

    req.session = req.session || {};
    req.session.oidcState = state;
    req.session.oidcNonce = nonce;

    const authUrl = oidcAuthManager.generateAuthorizationUrl(tenantId, state, nonce);
    if (!authUrl) {
      return res.status(500).json({ error: 'authorization_url_generation_failed' });
    }

    res.json({ authorizationUrl: authUrl });
  } catch (e) {
    logger.error({ err: e }, 'OIDC authorization failed');
    res.status(500).json({ error: 'authorization_failed' });
  }
}

async function oidcCallback(req, res) {
  const { tenantId } = req.params;
  const { code, state } = req.query;

  if (!tenantId || !code) {
    return res.status(400).json({ error: 'invalid_callback_parameters' });
  }

  const expectedState = req.session?.oidcState || '';
  if (state !== expectedState) {
    return res.status(403).json({ error: 'state_mismatch' });
  }
  const expectedNonce = req.session?.oidcNonce;

  try {
    // openid-client validates state/nonce against the ID token's claims as
    // part of the code exchange (in addition to the manual state check
    // above), which is what actually protects against OIDC replay.
    const tokens = await oidcAuthManager.exchangeCodeForToken(tenantId, code, {
      state: expectedState,
      nonce: expectedNonce,
    });
    if (!tokens) {
      return res.status(401).json({ error: 'token_exchange_failed' });
    }

    const idTokenPayload = oidcAuthManager.decodeIdTokenPayload(tokens.idToken, tenantId);
    if (!idTokenPayload) {
      return res.status(401).json({ error: 'id_token_verification_failed' });
    }

    const userInfo = await oidcAuthManager.getUserInfo(tenantId, tokens.accessToken);

    req.user = {
      sub: idTokenPayload.sub,
      email: idTokenPayload.email || userInfo?.email,
      name: idTokenPayload.name || userInfo?.name,
      oidcSubject: idTokenPayload.sub,
      ssoProvider: 'oidc',
      ssoIdentifier: idTokenPayload.sub,
      ssoAttributes: userInfo || {},
    };
    // Note: oidcCallback is called directly (`await oidcCallback(req, res)`)
    // by its route handler in enterpriseSSO.js, not mounted as Express
    // middleware — it must not call next(). The caller checks `req.user`
    // after this resolves to continue processing.
  } catch (e) {
    logger.error({ err: e }, 'OIDC callback processing failed');
    res.status(500).json({ error: 'callback_processing_failed' });
  }
}

async function oidcRefreshToken(tenantId, refreshToken) {
  const client = oidcAuthManager.getClient(tenantId);
  if (!client) {
    return null;
  }

  try {
    const newTokenSet = await client.refresh(refreshToken);
    return {
      accessToken: newTokenSet.access_token,
      idToken: newTokenSet.id_token,
      refreshToken: newTokenSet.refresh_token,
      expiresIn: newTokenSet.expires_in,
    };
  } catch (e) {
    logger.error({ err: e }, 'Token refresh failed');
    return null;
  }
}

module.exports = {
  oidcAuthorize,
  oidcCallback,
  oidcRefreshToken,
  oidcAuthManager,
};
