const ldapjs = require('ldapjs');
const logger = require('../logger');

// RFC 4515 filter escaping: any value interpolated into an LDAP search
// filter must have these characters escaped, or an attacker can widen/
// redirect the filter (e.g. `*)(uid=*))(|(uid=*`) to match unintended
// entries.
function escapeLdapFilterValue(value) {
  return String(value).replace(/[\\*()\0]/g, (char) => {
    switch (char) {
      case '\\': return '\\5c';
      case '*': return '\\2a';
      case '(': return '\\28';
      case ')': return '\\29';
      case '\0': return '\\00';
      default: return char;
    }
  });
}

class LDAPAuthManager {
  constructor() {
    this.clients = new Map();
    this.configs = new Map();
  }

  async initializeLDAP(tenantId, ldapConfig) {
    if (!ldapConfig || !ldapConfig.url || !ldapConfig.baseDn) {
      logger.warn({ tenantId }, 'LDAP config incomplete');
      return false;
    }

    try {
      const client = ldapjs.createClient({
        url: ldapConfig.url,
        timeout: ldapConfig.timeout || 5000,
        connectTimeout: ldapConfig.connectTimeout || 10000,
        tlsOptions: ldapConfig.tlsOptions || {},
        reconnect: ldapConfig.reconnect !== false,
      });

      client.on('error', (err) => {
        logger.error({ err, tenantId }, 'LDAP client error');
      });

      this.clients.set(tenantId, client);
      this.configs.set(tenantId, ldapConfig);

      logger.info({ tenantId, url: ldapConfig.url }, 'LDAP client initialized');
      return true;
    } catch (e) {
      logger.error({ err: e, tenantId }, 'LDAP initialization failed');
      return false;
    }
  }

  getClient(tenantId) {
    return this.clients.get(tenantId);
  }

  getConfig(tenantId) {
    return this.configs.get(tenantId);
  }

  async authenticate(tenantId, username, password) {
    const client = this.getClient(tenantId);
    const config = this.getConfig(tenantId);

    if (!client || !config) {
      return null;
    }

    return new Promise((resolve) => {
      const escapedUsername = escapeLdapFilterValue(username);
      const searchFilter = config.searchFilter || `(uid=${escapedUsername})`;
      const opts = {
        filter: searchFilter.replace(/\{0\}/g, escapedUsername),
        scope: 'sub',
        attributes: config.attributes || ['mail', 'cn', 'uid', 'displayName', 'memberOf'],
      };

      client.search(config.baseDn, opts, (err, res) => {
        if (err) {
          logger.error({ err, tenantId }, 'LDAP search failed');
          return resolve(null);
        }

        const entries = [];

        res.on('searchEntry', (entry) => {
          entries.push({ dn: entry.dn, object: entry.object });
        });

        res.on('error', (err) => {
          logger.error({ err, tenantId }, 'LDAP search error');
          resolve(null);
        });

        res.on('end', () => {
          if (entries.length === 0) {
            logger.warn({ tenantId, username }, 'LDAP user not found');
            return resolve(null);
          }
          if (entries.length > 1) {
            logger.warn({ tenantId, username, count: entries.length }, 'LDAP search matched multiple entries; refusing ambiguous match');
            return resolve(null);
          }

          const userDn = entries[0].dn;

          client.bind(userDn, password, (bindErr) => {
            if (bindErr) {
              logger.warn({ tenantId, username, bindErr }, 'LDAP authentication failed');
              return resolve(null);
            }

            const user = entries[0].object;
            resolve({
              dn: userDn,
              email: user.mail || user.email,
              name: user.displayName || user.cn,
              uid: user.uid,
              groups: Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf].filter(Boolean),
              attributes: user,
            });
          });
        });
      });
    });
  }

  // CAUTION: searchFilter is passed through verbatim (it's meant to be a
  // full LDAP filter expression, not a single value). Only call this with
  // filters built server-side from trusted/validated input — never forward
  // a filter string taken directly from an unauthenticated or low-trust
  // caller, since that reintroduces the injection risk `escapeLdapFilterValue`
  // exists to prevent elsewhere in this file.
  async searchUser(tenantId, searchFilter) {
    const client = this.getClient(tenantId);
    const config = this.getConfig(tenantId);

    if (!client || !config) {
      return [];
    }

    return new Promise((resolve) => {
      const opts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: config.attributes || ['mail', 'cn', 'uid', 'displayName'],
      };

      const results = [];

      client.search(config.baseDn, opts, (err, res) => {
        if (err) {
          logger.error({ err, tenantId }, 'LDAP search failed');
          return resolve(results);
        }

        res.on('searchEntry', (entry) => {
          results.push({
            dn: entry.dn,
            ...entry.object,
          });
        });

        res.on('error', (err) => {
          logger.error({ err, tenantId }, 'LDAP search error');
          resolve(results);
        });

        res.on('end', () => {
          resolve(results);
        });
      });
    });
  }

  async validateGroupMembership(tenantId, userDn, requiredGroup) {
    const client = this.getClient(tenantId);
    const config = this.getConfig(tenantId);

    if (!client || !config) {
      return false;
    }

    return new Promise((resolve) => {
      const opts = {
        filter: `(uniqueMember=${escapeLdapFilterValue(userDn)})`,
        scope: 'sub',
        attributes: ['cn'],
      };

      let isMember = false;

      client.search(requiredGroup, opts, (err, res) => {
        if (err) {
          logger.error({ err, tenantId }, 'Group membership check failed');
          return resolve(false);
        }

        res.on('searchEntry', () => {
          isMember = true;
        });

        res.on('end', () => {
          resolve(isMember);
        });

        res.on('error', () => {
          resolve(false);
        });
      });
    });
  }
}

const ldapAuthManager = new LDAPAuthManager();

async function ldapAuth(req, res, next) {
  const { tenantId } = req.params;
  const { username, password } = req.body;

  if (!tenantId || !username || !password) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }

  try {
    const user = await ldapAuthManager.authenticate(tenantId, username, password);
    if (!user) {
      return res.status(401).json({ error: 'authentication_failed' });
    }

    req.user = {
      sub: user.dn,
      email: user.email,
      name: user.name,
      ldapDn: user.dn,
      ssoProvider: 'ldap',
      ssoIdentifier: user.dn,
      ssoAttributes: user.attributes,
      ldapGroups: user.groups,
    };

    next();
  } catch (e) {
    logger.error({ err: e, tenantId }, 'LDAP authentication error');
    res.status(500).json({ error: 'authentication_error' });
  }
}

async function ldapSearch(req, res) {
  const { tenantId } = req.params;
  const { filter } = req.query;

  if (!tenantId || !filter) {
    return res.status(400).json({ error: 'filter_required' });
  }

  try {
    const results = await ldapAuthManager.searchUser(tenantId, filter);
    res.json({ results });
  } catch (e) {
    logger.error({ err: e, tenantId }, 'LDAP search error');
    res.status(500).json({ error: 'search_failed' });
  }
}

async function ldapValidateGroupMembership(req, res) {
  const { tenantId } = req.params;
  const { userDn, groupDn } = req.body;

  if (!tenantId || !userDn || !groupDn) {
    return res.status(400).json({ error: 'invalid_parameters' });
  }

  try {
    const isMember = await ldapAuthManager.validateGroupMembership(tenantId, userDn, groupDn);
    res.json({ isMember });
  } catch (e) {
    logger.error({ err: e, tenantId }, 'Group membership validation error');
    res.status(500).json({ error: 'validation_failed' });
  }
}

module.exports = {
  ldapAuth,
  ldapSearch,
  ldapValidateGroupMembership,
  ldapAuthManager,
};
