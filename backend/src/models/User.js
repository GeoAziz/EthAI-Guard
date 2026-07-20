const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password_hash: String,
  firebase_uid: { type: String, unique: true, sparse: true },
  role: { type: String, default: 'user' },
  tenantId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },

  // Enterprise SSO support
  ssoProvider: { type: String, enum: ['firebase', 'saml', 'oidc', 'ldap', null], default: null },
  ssoIdentifier: { type: String, sparse: true, unique: true }, // Subject ID from SSO
  ssoAttributes: { type: mongoose.Schema.Types.Mixed, default: {} }, // Raw SSO attributes

  // SAML specific
  samlNameId: { type: String, sparse: true },
  samlSessionIndex: String,

  // OIDC specific
  oidcSubject: { type: String, sparse: true },

  // LDAP specific
  ldapDn: { type: String, sparse: true },

  lastLogin: Date,
  ssoMetadata: {
    ipAddress: String,
    userAgent: String,
    provider: String,
  },
});

UserSchema.plugin(tenantScopePlugin);

module.exports = mongoose.models?.User || mongoose.model('User', UserSchema);
