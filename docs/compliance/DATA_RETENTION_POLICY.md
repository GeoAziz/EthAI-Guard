# Data Retention and Compliance Policy

**Version:** 1.0  
**Effective Date:** 2024-07-20  
**Last Review:** 2024-07-20  
**Next Review:** 2024-10-20

---

## Executive Summary

EthixAI retains customer data based on regulatory requirements, contractual obligations, and business necessity. This policy ensures compliance with ECOA (7-year retention for credit decisions), GDPR (right to deletion), CCPA (12-month retention), and industry best practices.

---

## 1. Data Classification & Retention Periods

### 1.1 Customer Account Data

| Data Type | Retention Period | Reason | Secure Deletion |
|---|---|---|---|
| User profile (name, email) | Subscription duration + 30 days | Contract termination notice period | Soft delete + hard delete after 30 days |
| Passwords | Subscription duration | Authentication | Hashed, overwritten on logout |
| MFA tokens | 1 year | Audit trail for account access | Purged after 1 year |
| Login history | 1 year | Security auditing | Archive to S3, delete after 1 year |
| API keys/tokens | Until revoked | Active credentials | Immediate purge on revocation |

### 1.2 Analysis & Fairness Decision Data

| Data Type | Retention Period | Reason | Secure Deletion |
|---|---|---|---|
| Analysis results (for credit decisions) | 7 years | ECOA § 1691 requires records of credit decisions | Archive to S3, encrypted, MFA-Delete enabled |
| Fairness metrics | 7 years | Compliance documentation for fairness analysis | Same as analysis results |
| Model predictions | 7 years | Adverse action notice requirements (ECOA) | Same as analysis results |
| SHAP explanations | 7 years | Rationale for decision explanation | Same as analysis results |
| Analysis for non-credit decisions | 90 days (free tier), indefinite (paid) | Business necessity, no regulatory requirement | Purge after retention window |

### 1.3 Compliance Reports

| Data Type | Retention Period | Reason | Secure Deletion |
|---|---|---|---|
| Generated compliance reports (PDF) | 7 years | Regulatory audit trail (ECOA, Fair Housing) | Archive to S3 with glacier transition |
| Audit logs (all actions) | 7 years | Compliance demonstration, incident investigation | Immutable S3 storage with MFA-Delete |
| Payment records | 7 years | Tax + legal compliance (IRS, state law) | Encrypted in database, archived to S3 |
| Signed compliance attestations | 7 years | Contract proof of compliance | S3 + legal document storage |

### 1.4 Payment & Billing Data

| Data Type | Retention Period | Reason | Secure Deletion |
|---|---|---|---|
| Invoice records | 7 years | Tax requirement (IRS), accounting | Encrypted, S3 archive |
| Subscription history | Subscription duration + 1 year | Business analytics + chargeback defense | Soft delete after 1 year |
| Payment method tokens | 90 days | PCI-DSS—never store full card data | Stripe-managed; deleted after 90 days |
| Refund/dispute records | 7 years | Tax + legal compliance | Same as invoices |
| Usage metrics for billing | Billing cycle + 1 year | Calculate overage, audit trail | Purge after 1 year |

### 1.5 Communications

| Data Type | Retention Period | Reason | Secure Deletion |
|---|---|---|---|
| Emails (support, account notifications) | 1 year | Customer service audit trail | Purge after 1 year |
| Error reports / support tickets | 1 year | Issue resolution, incident analysis | Archive, purge after 1 year |
| Slack messages (internal) | 90 days | Operational communication | Slack workspace policy |
| Chat history (customer-facing) | 1 year | Support history | Purge after 1 year |

---

## 2. Regulatory Compliance by Jurisdiction

### 2.1 ECOA (Equal Credit Opportunity Act)

**Applicability:** AI systems making credit decisions (lending, credit card approvals, loan pricing)

**Retention Requirements:**
- Credit decision records: 7 years from date of decision
- Includes: applicant data, credit score, decision rationale, fairness metrics
- Adverse action notices: Must be provided to applicant explaining reasons for denial
- No deletion during 7-year period (even if customer requests)

**EthixAI Implementation:**
- Compliance reports auto-generated and retained in `compliance_reports` table
- `expires_at` field set to 7 years from generation
- S3 archive with Glacier transition (cheaper storage after 1 year)
- Immutable audit logs in PostgreSQL with row-level security

**Evidence:**
```sql
-- compliance_reports table in 0002_stripe_tables.sql
CREATE TABLE IF NOT EXISTS compliance_reports (
  ...
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 years'),
  ...
);
```

### 2.2 GDPR (General Data Protection Regulation)

**Applicability:** If serving EU customers (GDPR applies even if company is US-based)

**Rights:**
- Right to access: Users can request export of personal data (48-hour SLA)
- Right to deletion: "Right to be forgotten"—delete all personal data except legal holds
- Right to portability: Export data in machine-readable format (JSON/CSV)
- Legitimate interest: Process must be "necessary" (not just "nice to have")

**EthixAI Implementation:**
- Data subject access request (DSAR) endpoint: `GET /api/users/me/export`
- Account deletion cascades to all user data (except 7-year compliance holds)
- Consent management: Explicit opt-in before processing
- DPA with data processors (Stripe, Firebase, AWS)

**Exceptions to Deletion:**
- Compliance reports (ECOA 7-year hold)
- Audit logs (1 year for incident investigation)
- Payment records (7 years for tax)
- Legal holds (litigation, regulatory investigation)

**Evidence:**
- `backend/src/routes/auth.js` — Account deletion endpoint
- `backend/migrations/postgres/0002_stripe_tables.sql` — Legal hold fields
- Data Processing Addendum (DPA) — in legal/contracts

### 2.3 CCPA (California Consumer Privacy Act)

**Applicability:** California residents (scope expanded to all states similar to CCPA)

**Requirements:**
- Do Not Sell My Personal Information (CCPA § 1798.120)
- Opt-in consent for sale of personal information
- 12-month retention limit (unless exception applies)
- Annual review of personal information necessity

**EthixAI Implementation:**
- Do not sell personal data (privacy policy states this explicitly)
- Third-party sharing limited to: Stripe (payments), Firebase (auth), AWS (infrastructure)
- 12-month retention for non-credit decisions (exceeds only for 7-year ECOA holds)

**Evidence:**
- Privacy Policy: `frontend/src/app/privacy/page.tsx`
- Third-party integrations: listed in `docs/ARCHITECTURE.md`

### 2.4 SEC AI Governance Guidelines (2024)

**Applicability:** If serving financial institutions subject to SEC regulation

**Requirements:**
- Governance framework for AI systems
- Model risk management (validation, monitoring)
- Conflict of interest mitigation
- Record retention and audit trail

**EthixAI Implementation:**
- AI model governance: Model versioning, change log
- Risk assessment: Fairness metrics, drift detection, SHAP explanations
- Audit trail: All decisions logged with decision inputs/outputs
- Compliance reporting: PDF reports with methodology + results

---

## 3. Data Deletion Procedures

### 3.1 Customer-Initiated Deletion

**Timeline:** Delete within 30 days of account termination request

**Process:**
1. User requests deletion: `DELETE /api/users/me` (requires password confirmation)
2. Soft delete: Set `deleted_at` timestamp, mark as inactive
3. 30-day grace period: Customer can undo deletion via password reset
4. Hard delete (after 30 days):
   - Delete from `users` table
   - Delete from `analyses`, `datasets` (user's data only)
   - Delete from `subscriptions` (not invoices—keep for 7 years)
   - Archive to S3 before deletion
   - Log deletion event in audit trail

**Exceptions:**
- Do NOT delete compliance reports (ECOA 7-year hold)
- Do NOT delete audit logs (1-year retention)
- Do NOT delete payment/invoice records (7-year tax hold)

**Implementation:**
```javascript
// backend/src/routes/auth.js
async function deleteUserAccount(userId, tenantId) {
  // 1. Soft delete
  await User.findByIdAndUpdate(userId, { deleted_at: new Date() });

  // 2. Archive to S3 (for legal holds)
  const userData = await User.findById(userId);
  await archiveToS3(`user-archive/${userId}`, userData);

  // 3. Schedule hard delete after 30 days
  await scheduleHardDelete(userId, tenantId, Date.now() + 30*24*60*60*1000);
}
```

### 3.2 Automated Deletion (Scheduled)

**Free tier:** Delete analyses after 90 days of inactivity

**Process:**
1. Identify analyses not accessed in 90+ days
2. Log deletion event
3. Delete from MongoDB: `db.analyses.deleteMany({ lastAccessedAt: { $lt: Date.now() - 90d } })`
4. Archive to S3 before deletion (for audit trail)

**Paid tier:** Indefinite retention (covered by subscription)

**Implementation:**
```javascript
// scripts/scheduled-cleanup.js
async function cleanupInactiveAnalyses() {
  const cutoffDate = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const toDelete = await Report.find({
    createdAt: { $lt: cutoffDate },
    plan: 'free',
  });

  for (const report of toDelete) {
    await archiveToS3(`analysis-archive/${report._id}`, report.toObject());
    await Report.findByIdAndDelete(report._id);
    logger.info({ reportId: report._id }, 'auto_delete_analysis');
  }
}
```

### 3.3 Legal Hold Deletion (Regulatory Exceptions)

**Scenarios:**
- Ongoing litigation: Preserve all data related to dispute
- Regulatory investigation: Government agency requests data preservation
- Compliance audit: Retain data until audit complete

**Process:**
1. Place legal hold: Set `legal_hold: true` on affected records
2. Notify customer: "Your data is subject to legal hold"
3. Preserve indefinitely: Override normal deletion schedules
4. Lift hold: Remove flag once investigation complete
5. Resume normal deletion: Start retention clock from hold lift date

**Implementation:**
```sql
ALTER TABLE users ADD COLUMN legal_hold BOOLEAN DEFAULT false;
ALTER TABLE analyses ADD COLUMN legal_hold BOOLEAN DEFAULT false;

-- Query to find all records on hold
SELECT * FROM users WHERE legal_hold = true;
```

---

## 4. Data Archive & Tier Strategy

### 4.1 Hot Storage (Frequent Access)

**Duration:** 0–30 days

**Location:** PostgreSQL (transactional) + MongoDB (documents)

**Purpose:** Real-time access, analysis, reporting

**Backup:** Daily snapshots to S3 (Standard class)

### 4.2 Warm Storage (Occasional Access)

**Duration:** 30 days – 1 year

**Location:** S3 (Standard class) with lifecycle rules

**Purpose:** Audit trail, compliance review, customer requests

**Backup:** Replicated to secondary region

**Retrieval Time:** <1 minute (on-demand)

### 4.3 Cold Storage (Rare Access, Long-Term Retention)

**Duration:** 1–7 years

**Location:** S3 Glacier Flexible Retrieval (cheaper storage, ~3-5 hour retrieval)

**Purpose:** ECOA compliance (7-year credit decision records), legal holds

**Backup:** Cross-region replication for disaster recovery

**Retrieval Time:** 3–5 hours (bulk retrieval), 12 hours (expedited)

### 4.4 Archive (Permanent/Legal Hold)

**Duration:** Indefinite (legal holds, litigation)

**Location:** S3 Glacier Deep Archive or corporate data warehouse

**Purpose:** Legal compliance, litigation support

**Retrieval Time:** 12+ hours (not for operational use)

**Cost:** ~$1/TB/month (very cheap storage)

**Implementation:**
```json
{
  "Rules": [
    {
      "Id": "archive-compliance-reports",
      "Filter": { "Prefix": "compliance-reports/" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555  // 7 years
      }
    }
  ]
}
```

---

## 5. Data Subject Rights Procedures

### 5.1 Right to Access (DSAR – Data Subject Access Request)

**Timeline:** Respond within 30 days (45 days for complex requests)

**Process:**
1. User initiates: `POST /api/users/me/request-data-export`
2. System generates: JSON dump of all personal data
3. S3 link provided: Pre-signed URL, 7-day expiry
4. Log event: `audit_logs` → "data_access_request"

**What to Include:**
- Profile: name, email, phone, organization
- Analyses: all data uploaded + results
- Compliance reports: all reports generated
- Audit logs: all actions by this user (read-only)
- Payments: all invoices + subscription history

**What to Exclude:**
- Hashed passwords (cannot be recovered)
- Internal system data (logs, traces not related to user action)

**Implementation:**
```javascript
// backend/src/routes/auth.js
app.post('/api/users/me/request-data-export', authGuard, async (req, res) => {
  const userId = req.user._id;

  // Gather all data
  const user = await User.findById(userId);
  const analyses = await Report.find({ userId });
  const invoices = await Invoice.find({ userId });
  const auditLogs = await AuditLog.find({ userId });

  // Package as JSON
  const exportData = {
    user,
    analyses,
    invoices,
    auditLogs,
    exportDate: new Date(),
  };

  // Upload to S3
  const fileName = `user-exports/${userId}-${Date.now()}.json`;
  await s3.putObject({
    Bucket: process.env.AUDIT_BUCKET,
    Key: fileName,
    Body: JSON.stringify(exportData),
    ServerSideEncryption: 'AES256',
  });

  // Generate pre-signed URL (7-day expiry)
  const url = s3.getSignedUrl('getObject', {
    Bucket: process.env.AUDIT_BUCKET,
    Key: fileName,
    Expires: 7 * 24 * 60 * 60,
  });

  res.json({ url, expiresAt: Date.now() + 7*24*60*60*1000 });
});
```

### 5.2 Right to Deletion ("Right to Be Forgotten")

**Timeline:** Delete within 30 days (can deny if legal/compliance hold)

**Exceptions to Deletion:**
- Compliance reports (ECOA 7-year hold)
- Audit logs (1-year retention minimum)
- Payment records (7-year tax hold)
- Active litigation/government investigation (legal hold)

**Process:**
1. User initiates: `DELETE /api/users/me` (requires password)
2. Soft delete: Mark account as `deleted_at = now()`
3. Grace period: 30 days for undo (requires password reset)
4. Hard delete:
   - Delete user profile, datasets, analyses (except legal holds)
   - Retain: compliance reports, audit logs, payment records
   - Archive deleted data to S3 (for disaster recovery)
   - Log deletion event

**Implementation:** (See section 3.1 above)

### 5.3 Right to Portability

**Timeline:** Deliver within 30 days in machine-readable format

**Deliverables:**
- JSON export of all user data (structured format)
- CSV exports of analyses, reports, invoices
- Bulk download with data dictionary

**Process:**
1. User requests: `POST /api/users/me/export` with format (json/csv)
2. System generates: Zipped archive of all data
3. S3 link provided: Pre-signed URL (14-day expiry)
4. Includes: Data dictionary explaining field meanings

**Implementation:**
```javascript
// Similar to DSAR above, but also generates CSV files
app.post('/api/users/me/export', authGuard, async (req, res) => {
  const { format = 'json' } = req.body;

  if (format === 'csv') {
    // Convert to CSV, zip, upload to S3
  } else if (format === 'json') {
    // JSON export (DSAR flow)
  }

  res.json({ downloadUrl, expiresAt });
});
```

### 5.4 Right to Opt-Out of Processing

**Timeline:** Opt-out effective immediately

**Scope:** Fair processing, legitimate interest processing

**What user can opt out of:**
- Email marketing (unsubscribe anytime)
- Usage analytics (opt-out of Segment/Amplitude tracking)
- Automated decision-making (opt out of algorithmic recommendations)

**What user CANNOT opt out of:**
- Essential services (authentication, billing, compliance)
- Legal obligations (audit logs, compliance reporting)

**Implementation:**
```javascript
// Track user preferences
const userPreferences = {
  marketing_emails: false,  // user can opt out
  analytics_tracking: false,  // user can opt out
  automated_decisions: false,  // user can opt out
  compliance_processing: true,  // cannot opt out
};
```

---

## 6. Vendor Data Sharing & Processing

### 6.1 Third-Party Vendors

| Vendor | Data Shared | Retention | DPA Signed |
|---|---|---|---|
| Stripe | Email, payment method, invoice data | Stripe's policy (7 years billing) | ✅ Yes |
| Firebase Auth | Email, phone, auth tokens | Duration of account + 30 days | ✅ Yes |
| AWS S3 | Analysis data, backup snapshots | Per customer retention policy | ✅ Yes |
| Sendgrid (email) | Email address only | While subscribed + 30 days | ✅ Yes |
| Segment/Amplitude (optional) | Session data, non-PII events | Configurable (default 1 year) | ✅ Yes |

### 6.2 Data Processing Agreement (DPA)

**Requirement:** All vendors handling PII must sign Data Processing Agreement

**Covers:**
- Data security: Encryption in transit/at rest
- Sub-processors: List any vendors they use
- Incident notification: Breach notification within 72 hours
- Audit rights: Right to audit their security practices
- Termination: Data deletion upon contract end

**Template:** `legal/DPA_TEMPLATE.md`

### 6.3 International Data Transfer

**Applicability:** GDPR restricts data transfer outside EEA

**Methods (from most to least preferred):**
1. **Standard Contractual Clauses (SCC):** Pre-approved by EU (Stripe, Firebase use SCCs)
2. **Adequacy Decisions:** EU deems country has adequate privacy (UK, Canada, Japan)
3. **Binding Corporate Rules:** Internal groups with data processing policies

**EthixAI Implementation:**
- All vendors (Stripe, Firebase, AWS) signed SCCs with customers
- Data resides in US data centers (permitted under SCC + GDPR adequacy)
- Customers notified of international transfer in privacy policy

---

## 7. Incident & Data Breach Procedures

### 7.1 Breach Detection

**What qualifies as breach:**
- Unauthorized access to PII (passwords, credit cards, SSNs)
- Ransomware encrypting databases
- Accidental deletion/corruption of data
- Insider threat (employee unauthorized access)

**What does NOT qualify:**
- Failed login attempt (auth system working as designed)
- User forgets password (user data not accessed)
- Service outage without data loss (availability, not confidentiality)

### 7.2 Breach Response Timeline

| Action | Timeline | Owner |
|---|---|---|
| Detect breach | Immediate (alert triggered) | Security monitoring |
| Isolate system | <15 min | Incident commander |
| Investigation begins | <1 hour | Security + engineering |
| Scope determined | <4 hours | Investigation team |
| Affected users notified | <72 hours | Legal + communications |
| Regulators notified | <72 hours (GDPR) or per law | Legal |
| Root cause analysis | <2 weeks | Security + engineering |
| Post-incident review | <30 days | All stakeholders |

### 7.3 Notification Requirements

**GDPR Notification:**
- Notify authority (DPA) within 72 hours of discovery
- Include: nature of breach, likely consequences, security measures taken

**CCPA Notification:**
- Notify residents "without unreasonable delay" (best practices: <30 days)
- Include: description of breach, data compromised, available assistance

**ECOA Notification (credit decisions):**
- Notify affected individuals (ECOA § 1681e)
- Timing: within timeframe specified by rule (typically 60 days)

**Notification Template:**
```
To: [User Name]
Date: [Breach Discovery Date]

We are writing to inform you that [Company] experienced a data breach on [Date].
During this incident, the following data may have been accessed: [list types].

What we are doing:
- We immediately secured the system
- We are investigating the cause
- We are monitoring for misuse of your information

What you can do:
- Check your financial accounts for unauthorized activity
- Consider placing a credit freeze
- Visit [www.identitytheft.gov](http://www.identitytheft.gov) for resources

Contact us at [security@ethixai.com] with questions.
```

---

## 8. Compliance Audit Trail

### 8.1 Audit Log Requirements

**What to log (every event):**
- Timestamp (ISO 8601 UTC)
- User ID + email
- Action (create, read, update, delete, export)
- Resource (analysis, report, user, payment)
- Result (success/failure + error code)
- IP address + user agent
- Request ID (for tracing)

**Sensitive actions requiring detailed logging:**
- Login/logout (especially via SSO)
- Permission changes (role grant/revoke)
- Data exports/downloads
- Report generation (especially compliance reports)
- Payment events (charge, refund, subscription change)
- Configuration changes (SSO settings, billing)

**Example audit log entry:**
```json
{
  "timestamp": "2024-07-20T14:32:00Z",
  "userId": "user_123",
  "userEmail": "alice@acme.com",
  "action": "export_data",
  "resource": "analysis_456",
  "resourceType": "analysis",
  "result": "success",
  "details": {
    "format": "json",
    "fileSize": 2048576,
    "s3Key": "user-exports/user_123-20240720.json"
  },
  "ipAddress": "192.0.2.1",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req_789abc"
}
```

### 8.2 Audit Log Retention & Access Control

- **Storage:** PostgreSQL `audit_logs` table + S3 archive
- **Retention:** 1 year (database) + 7 years (S3 Glacier)
- **Access:** Read-only to audit team + compliance officer
- **Immutability:** Row-level security prevents modification
- **Encryption:** S3 encryption enabled (AES-256)
- **Review:** Monthly audit log review by compliance officer

---

## 9. Data Minimization & Purpose Limitation

### 9.1 Data Minimization

**Principle:** Collect only data necessary for stated purpose

**Examples:**
- **Do NOT collect:**
  - Full credit card numbers (Stripe handles this)
  - Social security numbers (can use Stripe verification)
  - Income (if not needed for fairness analysis)
  - Health data (unless explicitly for health ML model)

- **OK to collect:**
  - Email (authentication + communication)
  - Payment method (billing only)
  - Dataset features (for analysis)
  - Decision outcome (for audit trail)

**Annual Review:**
- Q4: Audit collected data against stated purposes
- Identify unused fields
- Delete unnecessary data (e.g., "middleName" rarely used → delete field + existing values)

### 9.2 Purpose Limitation

**Rule:** Use data only for the purpose disclosed to user

**Violations to avoid:**
- Selling user data to third parties (privacy policy says "we don't sell")
- Using analysis data for other projects without consent
- Sharing payment data with vendors beyond necessary (Stripe only)
- Using audio/video from support calls for training ML (requires separate consent)

**Implementation:**
```javascript
// Only use data for stated purpose
async function generateComplianceReport(analysisId) {
  const analysis = await Report.findById(analysisId);

  // OK: Use analysis data for compliance report (stated purpose)
  const report = await generateReport(analysis);

  // NOT OK: Send analysis data to external vendor for "research"
  // await sendToResearchPartner(analysis);  ❌ Purpose violation

  return report;
}
```

---

## 10. Compliance Testing & Validation

### 10.1 Annual Retention Audit

- [ ] Verify all data past retention date deleted (or legal hold applied)
- [ ] Check S3 lifecycle rules configured correctly
- [ ] Test data restoration from archive (can retrieve old data?)
- [ ] Review audit logs for deletion events
- [ ] Verify DPAs signed with all vendors

### 10.2 Data Subject Rights Testing

- [ ] Test DSAR: Export user data, verify completeness
- [ ] Test deletion: Delete account, verify hard delete after 30 days
- [ ] Test portability: Download in JSON + CSV formats
- [ ] Test breach notification: Simulate breach, verify notification sent <72h

### 10.3 Compliance Incident Tests

- [ ] Simulate data breach: Can we detect and respond in <4 hours?
- [ ] Simulate legal hold: Apply hold, verify data retained indefinitely
- [ ] Simulate GDPR request: Can legal team fulfill DSAR in <30 days?

---

## 11. Document History & Approvals

| Version | Date | Author | Changes | Approved By |
|---|---|---|---|---|
| 1.0 | 2024-07-20 | Security Team | Initial policy | CEO, Legal, Compliance |
| | | | | |

---

## 12. Questions & Escalation

- **Data retention question?** → Contact: compliance@ethixai.com
- **GDPR/CCPA request?** → Contact: legal@ethixai.com + compliance@ethixai.com
- **Audit trail access?** → Contact: security@ethixai.com (security clearance required)
- **Incident/breach?** → Contact: security@ethixai.com immediately

---

**Policy Owner:** Chief Compliance Officer  
**Review Frequency:** Annually (or when regulations change)  
**Last Updated:** 2024-07-20  
**Next Review:** 2024-10-20
