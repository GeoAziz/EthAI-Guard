# Information Security Policy

**Document Version:** 1.0  
**Effective Date:** January 1, 2025  
**Last Updated:** July 8, 2026  
**Classification:** Internal Use Only  
**Approval Authority:** Chief Security Officer

---

## 1. Policy Overview

This Information Security Policy establishes the requirements for protecting EthixAI's information assets and ensuring the confidentiality, integrity, and availability of data across all systems, processes, and personnel.

### 1.1 Purpose

To define the security governance framework for:
- Protecting customer data and company assets
- Ensuring compliance with legal and regulatory requirements
- Preventing unauthorized access, use, or disclosure of information
- Establishing accountability and responsibility for security

### 1.2 Scope

This policy applies to:
- All employees, contractors, and third-party vendors
- All company systems, networks, and applications
- All data, both in transit and at rest
- All physical and digital assets

### 1.3 Policy Owner

**Chief Security Officer (CSO)** - responsible for policy maintenance, updates, and enforcement.

---

## 2. Information Classification

### 2.1 Classification Levels

Information is classified based on sensitivity and impact if disclosed:

#### **PUBLIC**
- Information safe for public disclosure
- Marketing materials, public documentation
- No security controls required beyond basic access

#### **INTERNAL**
- Internal use only; unauthorized disclosure could cause minimal harm
- General business communications, internal wikis
- Basic access controls (internal network access)

#### **CONFIDENTIAL**
- Sensitive business information; unauthorized disclosure could cause significant harm
- Pricing, contracts, technical specifications
- **Controls**: Encryption, access logging, need-to-know basis

#### **RESTRICTED**
- Highly sensitive; unauthorized disclosure could cause severe harm
- Customer data, encryption keys, financial records, PII
- **Controls**: Strongest encryption, least privilege access, audit trails

### 2.2 Classification Responsibilities

- **Data Owners**: Assign classification to data they create/manage
- **System Administrators**: Enforce controls based on classification
- **All Personnel**: Handle data according to its classification

---

## 3. Access Control

### 3.1 Principle of Least Privilege

All access is granted based on:
- **Need-to-Know**: User requires access to perform job function
- **Least Privilege**: Minimum access level necessary
- **Role-Based**: Access determined by organizational role
- **Time-Limited**: Access grants have expiration dates

### 3.2 Access Management Process

1. **Request**: User/manager submits access request with business justification
2. **Approval**: Data owner and manager approve
3. **Implementation**: System administrator grants access
4. **Documentation**: Access logged with timestamp, grantor, reason
5. **Review**: Quarterly access reviews (verify still needed)
6. **Revocation**: Immediate removal upon role change or termination

### 3.3 Privilege Escalation

- Privileged accounts (admin, root) require:
  - Multi-factor authentication
  - Audit trail of all actions
  - Approval for each escalation
  - Time-limited elevation (max 4 hours)

### 3.4 Third-Party Access

- All vendors sign Data Processing Agreement (DPA)
- Access limited to specific systems/data required
- Quarterly reviews of vendor access
- Immediate revocation when relationship ends

---

## 4. Authentication & Authorization

### 4.1 Authentication Requirements

All users must authenticate using:
- **Strong Passwords**: Min 12 characters, uppercase, lowercase, numbers, symbols
- **Multi-Factor Authentication (MFA)**: Required for:
  - Administrative accounts
  - Access to sensitive data
  - Remote access
  - All privileged escalations

### 4.2 MFA Methods (in preferred order)

1. Hardware security keys (FIDO2)
2. Authenticator apps (TOTP)
3. SMS/email (least preferred, high-risk)

### 4.3 Session Management

- Sessions timeout after 30 minutes of inactivity
- All sessions logged with user, IP, timestamp, duration
- Concurrent session limits enforced per user

### 4.4 Password Policy

| Requirement | Rule |
|---|---|
| Minimum Length | 12 characters |
| Complexity | Uppercase, lowercase, numbers, symbols |
| Expiration | Every 90 days |
| History | Cannot reuse last 5 passwords |
| Failed Attempts | Lock after 5 failed attempts (30-min timeout) |
| Default Passwords | Changed immediately on first login |

---

## 5. Data Protection

### 5.1 Encryption Standards

#### **In Transit**
- **Minimum**: TLS 1.2 for all network communication
- **Preferred**: TLS 1.3 for new implementations
- **Certificate Pinning**: For critical APIs

#### **At Rest**
- **PII/Customer Data**: AES-256 encryption
- **Encryption Keys**: Stored separately from encrypted data
- **Database Encryption**: Full-disk encryption + column-level for sensitive fields

### 5.2 Key Management

- Keys generated using cryptographically secure random source
- Keys stored in Hardware Security Module (HSM) or secure key management service
- Key rotation: every 90 days for symmetric, annually for asymmetric
- Key destruction documented and verified
- Access to keys logged and audited

### 5.3 Data Retention & Disposal

| Data Type | Retention Period | Disposal Method |
|---|---|---|
| Customer Analysis Data | Duration of contract + 90 days | Encrypted purge |
| Audit Logs | 7 years (per ECOA) | Secure archive in S3 |
| Temporary Files | 30 days | Overwritten with random data |
| Backups | 30 days | Encrypted, stored separately |
| PII (if collected) | 30 days post-termination | Cryptographic erasure |

---

## 6. System Security

### 6.1 Patching & Updates

- **Critical Patches**: Applied within 24 hours
- **Security Updates**: Within 7 days
- **Non-Security Updates**: Within 30 days
- **Patch Testing**: All patches tested in staging before production
- **Patch Verification**: Documented and audited

### 6.2 Vulnerability Management

- **Scanning**: Automated scans weekly (SAST, DAST, dependency scanning)
- **Response Time**:
  - Critical: 24 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days
- **Public Disclosure**: Coordinated with affected parties before publication
- **Annual Penetration Test**: Third-party assessment by certified firm

### 6.3 Secure Configuration

- **Hardening Standards**: CIS Benchmarks for all systems
- **Minimal Deployment**: Only necessary services/ports enabled
- **Default Accounts**: All removed or changed immediately
- **Banner Notices**: Warning banners on login screens
- **Configuration Baselines**: Documented and version-controlled

### 6.4 Logging & Monitoring

- **All events logged**: Authentication, authorization, data access, changes
- **Log retention**: 1 year minimum
- **Immutable logs**: Write-once, read-many (WORM) storage for audit logs
- **Log integrity**: Cryptographic hashing to detect tampering
- **SIEM integration**: Real-time alerting for security events

---

## 7. Network Security

### 7.1 Network Segmentation

- **DMZ**: Public-facing services isolated from internal systems
- **Internal Network**: Employee workstations, internal tools
- **Restricted Network**: Databases, sensitive systems (VPN only)
- **Management Network**: Infrastructure, security tools (MFA + VPN)

### 7.2 Firewalls & Access Control

- **Perimeter Firewall**: Deny by default, allow specific traffic
- **Segmentation Firewalls**: Between network zones
- **Egress Filtering**: Prevent data exfiltration
- **IDS/IPS**: Intrusion detection and prevention systems

### 7.3 Remote Access

- **VPN Required**: All remote access via encrypted VPN tunnel
- **MFA Required**: Multi-factor authentication for VPN
- **IP Whitelisting**: Restricted to known office IPs
- **Session Logging**: All remote access logged

### 7.4 Wireless Security

- **WPA3 Encryption**: Minimum for all wireless networks
- **Guest Network**: Isolated from company systems
- **AP Scanning**: Monthly for rogue access points
- **Authentication**: 802.1X for enterprise wireless

---

## 8. Incident Response

*See separate Incident Response Plan (incident-response-plan.md)*

---

## 9. Business Continuity & Disaster Recovery

### 9.1 Backup Policy

- **Frequency**: Daily incremental, weekly full backups
- **Retention**: 30-day minimum
- **Encryption**: All backups encrypted at rest
- **Offsite Storage**: Backup copies stored in separate geographic region
- **Restore Testing**: Quarterly restore drills documented

### 9.2 Recovery Objectives

| Component | RTO | RPO |
|---|---|---|
| Production API | 4 hours | 1 hour |
| Database | 2 hours | 30 minutes |
| Customer Portal | 4 hours | 1 hour |
| Email System | 12 hours | 4 hours |

**RTO** = Recovery Time Objective (maximum downtime)  
**RPO** = Recovery Point Objective (maximum data loss)

---

## 10. Compliance & Audit

### 10.1 Regulatory Compliance

This policy supports compliance with:
- **SOC 2 Type II**: Security, Availability, Confidentiality
- **GDPR**: Data protection and privacy
- **CCPA**: California Consumer Privacy Act
- **ECOA**: Fair lending and bias detection
- **Fair Housing Act**: Discrimination prevention

### 10.2 Internal Audits

- **Frequency**: Quarterly reviews
- **Scope**: Policy compliance, control effectiveness, incident review
- **Authority**: Performed by independent audit function
- **Remediation**: Issues tracked and verified resolved

### 10.3 External Audits

- **SOC 2 Type II**: Annual attestation audit
- **Penetration Testing**: Annual third-party assessment
- **Compliance Audit**: Per customer requests (HIPAA, etc.)

---

## 11. Security Awareness

### 11.1 Training Requirements

- **Annual Mandatory**: All employees complete security training
- **Role-Specific**: Developers, DBAs, security teams have specialized training
- **New Hires**: Security training within first 30 days
- **Incident Response**: Annual tabletop exercises
- **Phishing Simulations**: Monthly simulations with monthly metrics

### 11.2 Content

Training covers:
- Password security and MFA usage
- Phishing and social engineering recognition
- Data classification and handling
- Incident reporting procedures
- Clean desk and lock-screen practices
- VPN and remote access security
- Third-party security requirements

---

## 12. Policy Compliance & Enforcement

### 12.1 Non-Compliance

Violations are escalated:
1. **First Violation**: Verbal warning + mandatory retraining
2. **Second Violation**: Written warning, possible suspension of access
3. **Third+ Violation**: Potential termination

### 12.2 Exceptions

- **Formal Exception Process**: Documented, time-limited
- **Approval Required**: CSO + Data Owner
- **Risk Assessment**: Impact analysis required
- **Compensating Controls**: Required if risk-mitigation is needed
- **Review Period**: Exceptions reviewed quarterly

---

## 13. Policy Review & Updates

- **Annual Review**: This policy reviewed and updated yearly (minimum)
- **Trigger-Based Updates**: Major security incidents, new regulations, technology changes
- **Change Approval**: CSO approves changes before implementation
- **Communication**: All personnel notified of policy changes within 30 days

---

## 14. Contact & Questions

For questions or to report security concerns:

- **Email**: security@ethixai.com (confidential)
- **Hotline**: [INSERT HOTLINE NUMBER]
- **CSO Office**: [INSERT OFFICE CONTACT]

**Non-Retaliation**: All good-faith reports are protected from retaliation.

---

**Approved By**: [Chief Security Officer Name]  
**Date**: January 1, 2025

---

*This policy is subject to change at any time at management's discretion. Employees will be notified of changes.*
