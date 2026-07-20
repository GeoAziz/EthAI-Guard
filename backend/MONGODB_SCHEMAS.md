# MongoDB Schemas Documentation

This document defines all MongoDB collections used in EthixAI backend.

## Collection: `users`

Stores user account information and authentication credentials.

**Fields:**
- `_id` (ObjectId): Primary key
- `name` (String, required): User display name
- `email` (String, unique, required): User email address
- `password_hash` (String, required): Bcrypt or Argon2 hashed password
- `firebase_uid` (String, unique, sparse): Firebase authentication UID
- `role` (String, default: 'user'): User role (user, analyst, reviewer, admin)
- `tenantId` (String, indexed): Tenant ID for multi-tenancy isolation
- `createdAt` (Date, default: now): Account creation timestamp
- `lastLogin` (Date, optional): Last login time
- `ssoProvider` (String, enum: firebase|saml|oidc|ldap|null): SSO provider
- `ssoIdentifier` (String, sparse, unique): Subject ID from SSO provider
- `ssoAttributes` (Mixed, default: {}): Raw SSO provider attributes
- `samlNameId` (String, sparse): SAML NameID
- `samlSessionIndex` (String, optional): SAML session index
- `oidcSubject` (String, sparse): OIDC subject
- `ldapDn` (String, sparse): LDAP distinguished name
- `ssoMetadata` (Object): SSO login metadata
  - `ipAddress` (String): Login IP address
  - `userAgent` (String): User agent string
  - `provider` (String): SSO provider name
- `mfaEnabled` (Boolean, default: false): Multi-factor authentication enabled
- `mfaSecret` (String, optional): MFA secret for TOTP
- `mfaBackupCodes` (Array, optional): Used/unused backup codes

**Indexes:**
- `email` (unique)
- `firebase_uid` (unique, sparse)
- `ssoIdentifier` (unique, sparse)
- `tenantId` (indexed)

---

## Collection: `datasets`

Stores metadata for uploaded datasets and their versions.

**Fields:**
- `_id` (ObjectId): Primary key
- `name` (String, required): Dataset name
- `type` (String, optional): Dataset type (e.g., 'fairness_test', 'training')
- `ownerId` (String/ObjectId, required): ID of user who uploaded dataset
- `uploadDate` (Date, default: now): Upload timestamp
- `tenantId` (String, indexed): Tenant ID for multi-tenancy
- `versions` (Array): Dataset version history
  - `versionId` (String): Unique version identifier (UUID)
  - `filename` (String): Original filename
  - `rows` (Number): Number of data rows
  - `totalRows` (Number): Total row count
  - `header` (Array): CSV column names
  - `rowsPreview` (Array): First N rows for preview (objects)
  - `uploadedAt` (Date): When this version was uploaded
  - `blob` (BinData, optional): Full CSV file binary data (if STORE_FULL_CSV_IN_DB=1)

**Indexes:**
- `ownerId` (indexed)
- `tenantId` (indexed)

---

## Collection: `reports`

Stores analysis reports generated from fairness evaluations.

**Fields:**
- `_id` (ObjectId): Primary key
- `analysisId` (String): ID of the analysis from AI Core
- `summary` (Object): Analysis results summary
  - `n_rows` (Number): Number of rows analyzed
  - `fairness_score` (Number): Fairness score (0-100)
  - Additional fairness metrics per analysis
- `userId` (String/ObjectId, required): User who requested analysis
- `createdAt` (Date, default: now): Report creation timestamp
- `datasetName` (String, optional): Name of dataset analyzed
- `tenantId` (String, indexed): Tenant ID for multi-tenancy

**Indexes:**
- `userId` (indexed)
- `tenantId` (indexed)
- `analysisId` (indexed)

---

## Collection: `refreshTokens`

Stores refresh tokens for JWT token rotation and device tracking.

**Fields:**
- `_id` (ObjectId): Primary key
- `userId` (String/ObjectId, required): Token owner
- `tokenHash` (String, required): Argon2 hash of refresh token
- `expiresAt` (Date, required): Token expiration time
- `createdAt` (Date, default: now): Token creation timestamp
- `lastUsedAt` (Date, optional): Last time token was used to refresh
- `revokedAt` (Date, optional, indexed): Revocation timestamp (null if active)
- `device` (Object): Device information
  - `userAgent` (String): Browser/client user agent
  - `ipAddress` (String): Request IP address
  - `deviceId` (String, optional): Device identifier
- `name` (String): Device name (e.g., 'Chrome on MacOS')
- `rotationId` (String, indexed): Token rotation chain ID for detecting reuse
- `parentTokenHash` (String, optional): Parent token hash for rotation chain

**Indexes:**
- `userId` (indexed)
- `revokedAt` (indexed)
- `rotationId` (indexed)

---

## Collection: `incidents`

Stores incident records from Prometheus alert webhook.

**Fields:**
- `_id` (ObjectId): Primary key
- `id` (String): Incident ID
- `title` (String): Alert name + instance
- `description` (String): Alert description/annotations
- `resolved` (Boolean, indexed): Whether incident is resolved
- `severity` (String): Alert severity (minor, major, critical)
- `services` (Array[String]): Affected services/instances
- `occurrences` (Number, default: 1): Number of times this incident fired
- `createdAt` (Date): When first detected
- `updatedAt` (Date): Last update timestamp
- `resolvedAt` (Date, optional): When resolved

**Indexes:**
- `resolved` (indexed)
- `title` (indexed)

---

## Collection: `passwordResets`

Stores temporary password reset tokens.

**Fields:**
- `_id` (ObjectId): Primary key
- `userId` (String/ObjectId, required): User requesting reset
- `email` (String, required): User email address
- `token` (String, required, unique): Reset token
- `expiresAt` (Date, required): Token expiration (usually 1 hour)
- `createdAt` (Date, default: now): Request timestamp
- `usedAt` (Date, optional): When reset was used
- `used` (Boolean, default: false): Whether token has been used

**Indexes:**
- `token` (unique)
- `expiresAt` (indexed for TTL cleanup)
- `used` (indexed)

---

## Collection: `tenants`

Stores tenant information for multi-tenancy support.

**Fields:**
- `_id` (ObjectId): Primary key
- `tenantId` (String, unique, required): Tenant UUID
- `name` (String, required): Organization name
- `slug` (String, unique): URL-friendly name
- `status` (String, enum: trial|active|suspended): Tenant status
- `plan` (String, enum: free|pro|enterprise): Billing plan
- `billingEmail` (String, required): Billing contact email
- `createdAt` (Date, default: now): Tenant creation timestamp
- `updatedAt` (Date): Last update timestamp
- `metadata` (Object, optional): Custom tenant metadata

**Indexes:**
- `tenantId` (unique)
- `slug` (unique)
- `status` (indexed)

---

## Collection: `notifications`

Stores user notifications and alerts.

**Fields:**
- `_id` (ObjectId): Primary key
- `userId` (String/ObjectId, required): Notification recipient
- `tenantId` (String, indexed): Tenant ID
- `title` (String, required): Notification title
- `body` (String, required): Notification message
- `type` (String, enum: success|error|warning|info): Notification type
- `link` (String, optional): Clickable link URL
- `read` (Boolean, default: false, indexed): Read status
- `createdAt` (Date, default: now): Timestamp
- `metadata` (Object, optional):
  - `entityType` (String): Entity type (analysis, report, etc.)
  - `entityId` (String): Related entity ID
  - `source` (String): Notification source

**Indexes:**
- `userId` (indexed)
- `tenantId` (indexed)
- `read` (indexed)

---

## Query Patterns & Performance Notes

### High-Frequency Queries
- `db.reports.find({ userId: X })` — use index on userId + tenantId
- `db.users.findOne({ email: X })` — unique index on email
- `db.refreshTokens.find({ userId: X, revokedAt: null })` — composite index recommended

### TTL Cleanup
- `refreshTokens`: Set TTL index on `expiresAt` to auto-delete expired tokens
- `passwordResets`: Set TTL index on `expiresAt` to auto-delete expired reset tokens

### Tenancy Isolation
All queries must include `tenantId` filter in production for data isolation:
```javascript
db.reports.find({ userId: uid, tenantId: tid })
db.datasets.find({ ownerId: oid, tenantId: tid })
```

### Indexing Strategy
- Create compound indexes for frequently filtered queries (userId + tenantId)
- Use sparse indexes for optional fields (firebase_uid, ssoIdentifier, etc.)
- Monitor slow queries with MongoDB profiler

---

## Migration Notes

**Current State (as of latest schema evolution):**
- User SSO fields added for enterprise authentication
- MFA fields added for admin security
- Tenant collection added for multi-tenancy
- Notification collection added for real-time updates
- All collections include tenantId for data isolation

**No breaking changes** — all new fields are optional with sensible defaults.
