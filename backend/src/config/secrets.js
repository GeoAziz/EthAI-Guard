/**
 * Centralized secrets configuration.
 *
 * All JWT / session / cookie secrets MUST be supplied via environment
 * variables in production.  Hardcoded fallbacks are intentionally removed
 * so a misconfigured deployment fails loudly at boot instead of silently
 * signing tokens with a guessable key.
 */

const logger = require('../logger');

const IS_TEST = process.env.NODE_ENV === 'test';
const IS_PROD = process.env.NODE_ENV === 'production';

function requireEnv(name, { allowEmpty = false } = {}) {
  const val = process.env[name];
  if (val === undefined || val === null || (!allowEmpty && val === '')) {
    return null;
  }
  return val;
}

function requireSecret(name) {
  const val = process.env[name];
  if (!val) {
    return null;
  }
  return val;
}

/**
 * Validate that all required secrets are present.
 * Returns { valid, secrets, missing }.
 * In test mode, generated fallbacks are used so CI is not blocked.
 */
function validateSecrets() {
  const missing = [];

  const secretKey = requireSecret('SECRET_KEY');
  const refreshSecret = requireSecret('REFRESH_SECRET');
  const sessionSecret = requireSecret('SESSION_SECRET');

  if (!secretKey) missing.push('SECRET_KEY');
  if (!refreshSecret) missing.push('REFRESH_SECRET');
  if (!sessionSecret) missing.push('SESSION_SECRET');

  // In test mode, generate random fallbacks so tests work without env setup
  if (IS_TEST && missing.length > 0) {
    const crypto = require('crypto');
    if (!secretKey) {
      process.env.SECRET_KEY = crypto.randomBytes(32).toString('hex');
      logger.warn('SECRET_KEY not set — generated random key for test mode');
    }
    if (!refreshSecret) {
      process.env.REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
      logger.warn('REFRESH_SECRET not set — generated random key for test mode');
    }
    if (!sessionSecret) {
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
      logger.warn('SESSION_SECRET not set — generated random key for test mode');
    }
    // Re-read after setting
    return validateSecrets();
  }

  if (missing.length > 0) {
    logger.fatal({ missing }, 'Required secrets are not configured — refusing to start');
    return { valid: false, secrets: {}, missing };
  }

  return {
    valid: true,
    missing: [],
    secrets: {
      secretKey,
      refreshSecret,
      sessionSecret,
    },
  };
}

/**
 * Get the secret value.  Throws if not configured (no fallback).
 */
function getSecret(name) {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Required secret ${name} is not configured. Set the ${name} environment variable.`);
  }
  return val;
}

module.exports = { validateSecrets, getSecret, requireSecret };
