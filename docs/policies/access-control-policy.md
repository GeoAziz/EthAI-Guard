# Access Control Policy

**Document Version:** 1.0  
**Effective Date:** January 1, 2025  
**Last Updated:** July 8, 2026  
**Classification:** Internal Use Only

---

## 1. Overview

This Access Control Policy defines how users obtain, maintain, and lose access to EthixAI systems and data.

## 2. Access Approval Process

### 2.1 Access Request Workflow

```
User/Manager
    ↓
Submit Request (Jira/Ticket)
    ↓
Data Owner Approval
    ↓
Manager Approval
    ↓
Admin Implementation
    ↓
Verification & Completion
    ↓
Quarterly Recertification
```

### 2.2 Access Types

| Access Type | Use Case | Duration | Approval |
|---|---|---|---|
| **User Access** | Employee job function | Indefinite until role change | Manager + Data Owner |
| **Admin Access** | System administration | Indefinite until role change | CSO + CTO |
| **Privileged Access** | root/sudo escalation | 4 hours per session | Admin + CSO |
| **Contractor Access** | Temporary staff | Duration of contract | Manager + Legal |
| **Vendor Access** | Third-party service | Duration of contract | Vendor Manager + CSO |
| **Emergency Access** | Security incident response | 2 hours max | CSO only |

### 2.3 Approval Authorities

| Role | Can Approve | Cannot Approve |
|---|---|---|
| **Manager** | Employee role access | Admin, privileged access |
| **Data Owner** | Access to their data | Cross-data access |
| **CTO** | System access | Vendor/external access |
| **CSO** | Security access, privileged | None (final authority) |
| **CEO** | All access (executive) | None |

## 3. Principle of Least Privilege (PoLP)

### 3.1 PoLP Requirements

Every access grant must answer:

1. **Need-to-Know**: Does this person NEED this access for their job?
2. **Least Privilege**: What is MINIMUM access level needed?
3. **Time-Limited**: How long should they have this access?
4. **Separation of Duties**: Does this prevent conflict of interest?

### 3.2 Conflicts of Interest

The following combinations are prohibited:

| Prohibited | Reason |
|---|---|
| Approval requester + approver | Conflict - can approve own access |
| Auditor + system admin | Conflict - can hide own audit trail |
| DBA + security officer | Conflict - can modify security logs |
| Payment processor + approver | Conflict - can approve fraudulent charges |

## 4. Role-Based Access Control (RBAC)

### 4.1 Standard Roles

#### **Guest**
- **Access**: Read-only public data
- **Systems**: Frontend (no auth)
- **Typical Users**: Prospective customers, partners

#### **Analyst**
- **Access**: Create analyses, upload datasets, view own results
- **Systems**: Frontend, API, AI Core
- **Typical Users**: Data scientists, compliance officers

#### **Admin**
- **Access**: User management, system configuration, billing
- **Systems**: All systems including database admin tools
- **Typical Users**: IT staff, executives

#### **Security**
- **Access**: Audit logs, security tools, incident response
- **Systems**: Logging, monitoring, forensics tools
- **Typical Users**: Security team, incident responders

#### **Vendor**
- **Access**: Limited to contracted services
- **Systems**: Specific APIs, contracted systems
- **Typical Users**: Third-party vendors, contractors

### 4.2 Custom Roles

Custom roles may be created for specific job functions:

- **Approval Required**: CSO + Data Owner
- **Documentation Required**: Purpose, duration, permissions
- **Review Period**: Quarterly minimum
- **Sunset Date**: Maximum 1 year, then re-approval required

## 5. Access Revocation

### 5.1 Automatic Revocation

Access is automatically revoked when:
- Employee is terminated
- Contractor/vendor relationship ends
- Role changes (within 24 hours)
- System requires deprovisioning (retirement)

### 5.2 Manual Revocation

Requested by:
- Manager (employee role change)
- CSO (security incident)
- Data Owner (no longer needed)
- Employee (self-revocation)

**Timeline**: Within 4 hours of request

### 5.3 Offboarding Checklist

Upon termination:

- [ ] Disable all user accounts (AD, email, application)
- [ ] Revoke API keys and tokens
- [ ] Revoke VPN access
- [ ] Collect company equipment (laptop, badge, keys)
- [ ] Remove from security mailing lists
- [ ] Review and remove file access permissions
- [ ] Archive email for compliance (7 years)
- [ ] Notify customers if account contact was user
- [ ] Document termination in security log

**Responsibility**: HR + IT + Security  
**Timeline**: Same day termination

## 6. Multi-Tenant Isolation

### 6.1 Tenant Verification

Every API request must verify:

1. User is authenticated (JWT token valid)
2. User's tenant_id matches request tenant_id
3. User has permission for requested resource

**Implementation**: Middleware in all routes

```javascript
// Example verification
if (req.user.tenant_id !== req.params.tenant_id) {
  return res.status(403).json({ error: 'forbidden' });
}
```

### 6.2 Database Isolation

PostgreSQL Row-Level Security (RLS) enforces isolation:

```sql
-- Only users from same tenant see their data
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON analyses
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 6.3 Isolation Testing

- **Monthly testing**: Attempt cross-tenant access (should fail)
- **Penetration testing**: Annual third-party assessment
- **Log review**: Audit any failed access attempts

## 7. Privileged Access Management (PAM)

### 7.1 Privileged Access Types

- **System Admin**: root/sudo on servers
- **Database Admin**: DBA role on databases
- **Network Admin**: Firewall/router configuration
- **Security Admin**: Audit log access

### 7.2 PAM Controls

Each privileged access requires:

1. **MFA**: Multi-factor authentication mandatory
2. **Session Recording**: All actions logged and replayed
3. **Time-Limited**: Maximum 4 hours per session
4. **Approval**: Must be approved each session
5. **Audit Trail**: Complete log of all commands

### 7.3 Privileged Access Approval

| Request Type | Approval | Escalation |
|---|---|---|
| Routine admin | CTO | None |
| Database changes | DBA lead + CSO | CTO if config change |
| Security access | CSO | CEO if breach response |
| Emergency access | On-call CSO | CSO director if unavailable |

### 7.4 Just-in-Time (JIT) Access

Privileged access is requested when needed:

1. User requests access via ticket system
2. Approver reviews justification
3. System grants access for limited time (4 hours)
4. Access automatically revokes after time expires
5. All actions logged to audit trail

## 8. Third-Party & Vendor Access

### 8.1 Access Requirements

All vendors/contractors must:

1. Sign Data Processing Agreement (DPA)
2. Comply with information security policy
3. Use MFA for any access
4. Have documented business justification
5. Receive annual security training

### 8.2 Vendor Access Levels

| Vendor Type | Access Level | Duration | Approval |
|---|---|---|---|
| **Cloud Hosting** (AWS/GCP) | Admin (limited to contract scope) | Duration of contract | CTO + CSO |
| **SaaS Providers** | API credentials only | Duration of contract | Vendor Manager |
| **Consultants** | Read-only + specific systems | Project duration | Manager + CSO |
| **Support Vendors** | Remote access + MFA | Support ticket duration | CSO approval per session |

### 8.3 Vendor Offboarding

Same as employee offboarding:
- Revoke all access within 24 hours
- Collect equipment/credentials
- Remove from systems
- Archive communications (per contract)

## 9. Access Review & Recertification

### 9.1 Quarterly Access Reviews

**Frequency**: Every 3 months  
**Participants**: Managers, data owners, audit function  
**Process**:

1. Generate access report (who has what access?)
2. Send to manager for review
3. Manager certifies access is still needed
4. Identify and revoke unnecessary access
5. Document exceptions
6. Report to Board/Audit Committee

### 9.2 Annual Recertification

**Scope**: All users with elevated access (admin, privileged, vendor)  
**Process**:

1. CSO generates privileged access report
2. Each approver signs off on their approvals
3. Non-responses = automatic revocation after 5 days
4. Board approval of recertification results
5. Exceptions documented

## 10. Monitoring & Alerting

### 10.1 Access Events to Log

Every access event is logged:
- User login
- Access to sensitive data
- API key usage
- Admin tool usage
- Failed access attempts
- Access approval/denial
- Access revocation

### 10.2 Alerting Triggers

Alert on:
- Repeated failed login attempts (5+ in 5 min)
- Access from unusual location/time
- Access to sensitive data outside job function
- Privileged access outside normal hours
- Unauthorized access attempts
- Changes to access rules

### 10.3 Monitoring Tools

- **SIEM**: Splunk/ELK for log aggregation
- **PAM Tool**: CyberArk/HashiCorp Vault for privileged access
- **Identity Provider**: Okta/Azure AD for user provisioning
- **Application Logs**: Custom audit logging in all systems

## 11. Exceptions & Deviations

### 11.1 Exception Process

Exceptions to this policy must be:

1. **Requested**: Documented business justification
2. **Approved**: CSO + Data Owner signature required
3. **Time-Limited**: Specific end date (maximum 90 days)
4. **Compensating**: Additional controls to mitigate risk
5. **Reviewed**: Monthly review and renewal if needed

### 11.2 Exception Documentation

Form includes:
- User and access requested
- Business justification
- Alternative controls implemented
- Risk assessment
- Expiration date
- Approver signatures
- Renewal date

### 11.3 Exception Examples

| Exception | Approval | Duration |
|---|---|---|
| Consultant needs temp admin access | CSO + CTO | Project end date |
| Employee job change mid-quarter | Manager + CSO | 30 days until review |
| Emergency incident response access | On-call CSO | 4 hours |

## 12. Policy Compliance

### 12.1 Violations

Non-compliance includes:
- Accessing data outside job function
- Sharing credentials
- Not using MFA when required
- Failing to report suspicious access
- Approving access for conflict of interest

### 12.2 Consequences

| Violation | Consequence |
|---|---|
| First | Verbal warning + mandatory training |
| Second | Written warning + access suspended 5 days |
| Third | Suspension pending investigation |
| Repeat | Termination |

### 12.3 Reporting Violations

Report violations to:
- **Email**: security@ethixai.com
- **Hotline**: [PLACEHOLDER_HOTLINE]
- **Anonymous**: [PLACEHOLDER_ANONYMOUS_CHANNEL]

**Non-retaliation**: All good-faith reports protected

## 13. Policy Review

- **Annual Review**: January of each year
- **Trigger-Based**: After access incidents
- **Board Approval**: Quarterly audit review
- **Communication**: All changes within 30 days

---

**Approved By**: Chief Security Officer  
**Date**: January 1, 2025
