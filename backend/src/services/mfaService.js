/**
 * MFA (Multi-Factor Authentication) Service
 *
 * Handles TOTP (Time-based One-Time Password) generation and verification
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

class MFAService {
  /**
   * Generate new MFA secret for user
   * Returns QR code and secret for setup
   */
  static async generateMFASecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `EthixAI (${userEmail})`,
        issuer: 'EthixAI',
        length: 32,
      });

      // Generate QR code as data URL
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      logger.info({ userId }, 'mfa_secret_generated');

      return {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url,
        qrCode,
      };
    } catch (err) {
      logger.error({ err, userId }, 'mfa_secret_generation_failed');
      throw err;
    }
  }

  /**
   * Verify MFA token
   * Returns true if valid, false otherwise
   */
  static verifyMFAToken(secret, token) {
    try {
      // Token can be 6 or 7 digits
      if (!token || token.length < 6 || token.length > 7) {
        return false;
      }

      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 windows (30 seconds before/after)
      });

      return verified;
    } catch (err) {
      logger.warn({ err }, 'mfa_token_verification_failed');
      return false;
    }
  }

  /**
   * Generate backup codes for account recovery
   * User should store these securely
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify backup code and mark as used
   */
  static verifyBackupCode(backupCodes, code) {
    const index = backupCodes.findIndex(
      (bc) => bc.code === code && !bc.used
    );
    if (index === -1) {
      return false;
    }
    backupCodes[index].used = true;
    return true;
  }

  /**
   * Format backup codes for display
   */
  static formatBackupCodes(codes) {
    return codes.map((code) => ({
      code,
      used: false,
    }));
  }
}

module.exports = MFAService;
