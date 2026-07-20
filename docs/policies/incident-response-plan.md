# Incident Response Plan

**Document Version:** 1.0  
**Effective Date:** January 1, 2025  
**Last Updated:** July 8, 2026  
**Classification:** Internal Use Only  
**Approval Authority:** Chief Security Officer, Chief Executive Officer

---

## 1. Incident Response Overview

### 1.1 Purpose

To establish procedures for detecting, responding to, and recovering from security incidents, minimizing damage and enabling swift recovery.

### 1.2 Scope

Applies to all systems, personnel, and incidents affecting EthixAI's information security posture, including:
- Unauthorized access or data breaches
- Malware infections
- Denial of service (DoS) attacks
- System compromises
- Data loss or corruption
- Supply chain incidents
- Physical security breaches

### 1.3 Incident Response Team

| Role | Person | Title | Contact |
|---|---|---|---|
| **Incident Commander** | [NAME] | Chief Security Officer | [EMAIL/PHONE] |
| **Deputy Commander** | [NAME] | Security Manager | [EMAIL/PHONE] |
| **Technical Lead** | [NAME] | DevOps/Infrastructure Lead | [EMAIL/PHONE] |
| **Communications** | [NAME] | Communications Manager | [EMAIL/PHONE] |
| **Legal** | [NAME] | General Counsel | [EMAIL/PHONE] |
| **Executive Sponsor** | [NAME] | Chief Executive Officer | [EMAIL/PHONE] |

---

## 2. Incident Classification & Severity Levels

### 2.1 Severity Levels

#### **CRITICAL (P1)**
- Customer data confirmed or suspected compromised
- Widespread system outage (>50% service unavailable)
- Active ongoing attack detected
- **Response Time**: Within 15 minutes
- **Escalation**: CEO, Legal, major customers

#### **HIGH (P2)**
- Limited unauthorized access detected
- Partial service outage (10-50% unavailable)
- Security control failure
- **Response Time**: Within 1 hour
- **Escalation**: CSO, management, affected customers

#### **MEDIUM (P3)**
- Suspicious activity detected (unclear if incident)
- Performance degradation
- Failed security control detected
- **Response Time**: Within 4 hours
- **Escalation**: Security team, management

#### **LOW (P4)**
- Isolated user report of suspicious activity
- Policy violation (non-security impact)
- Malware detected in isolated system
- **Response Time**: Next business day
- **Escalation**: Security team

---

## 3. Incident Response Phases

### 3.1 Phase 1: Detection & Reporting

#### Detection Methods

Incidents detected through:
- Automated alerts (SIEM, IDS/IPS, monitoring tools)
- User reports (suspicious emails, unusual access)
- External reports (customers, security researchers, law enforcement)
- Vendor notifications (cloud provider, software vendor)
- Routine audits and assessments

#### Reporting Requirements

**Immediate Escalation** (15 minutes):
1. Any employee discovering/suspecting incident calls **[INCIDENT HOTLINE]**
2. Email **security@ethixai.com** with:
   - What happened
   - When it occurred
   - Systems/data affected
   - Current status

**Escalation Path**:
```
Reporter
  ↓
On-Call Security Officer
  ↓
Incident Commander
  ↓
CEO/Legal (if P1)
```

#### Reporter Protection

- Non-retaliation policy strictly enforced
- Confidentiality maintained
- Good-faith reports encouraged
- Anonymous reporting available

### 3.2 Phase 2: Investigation & Assessment

#### Immediate Actions (0-1 hour)

- [ ] Activate incident response team
- [ ] Establish incident bridge (Slack channel, phone line)
- [ ] Snapshot affected systems (memory, disk, logs)
- [ ] Isolate affected systems (if necessary)
- [ ] Notify internal stakeholders
- [ ] Begin incident timeline documentation

#### Investigation Steps (1-4 hours)

1. **Scope Determination**
   - How many systems affected?
   - What data could be at risk?
   - Who has been compromised?

2. **Root Cause Analysis**
   - How did attacker gain access?
   - What vulnerabilities were exploited?
   - When did attack actually occur?
   - Are there other entry points?

3. **Impact Assessment**
   - Customers affected?
   - Volume of data exposed?
   - Regulatory requirements triggered?
   - Reputational impact?

4. **Evidence Preservation**
   - Preserve all logs
   - Capture screenshots
   - Save system snapshots
   - Maintain chain of custody
   - Consider legal hold for litigation

#### Investigation Resources

- **Forensic Tools**: EnCase, Autopsy, Volatility
- **Log Analysis**: Splunk, ELK, CloudWatch
- **Network Analysis**: Wireshark, Zeek
- **Malware Analysis**: VirusTotal, Hybrid-Analysis
- **Forensic Expertise**: Hire external firm if needed ($5K-50K)

### 3.3 Phase 3: Containment & Eradication

#### Short-Term Containment (0-4 hours)

**Goal**: Stop attack propagation, prevent further damage

- [ ] Block attacker IP addresses at firewall
- [ ] Disable compromised user accounts
- [ ] Isolate affected systems from network
- [ ] Kill malicious processes
- [ ] Disable external access if needed

#### Long-Term Containment (4-24 hours)

- [ ] Patch exploited vulnerabilities
- [ ] Update access controls
- [ ] Deploy compensating controls
- [ ] Increase monitoring
- [ ] Review and revoke suspicious accounts

#### Eradication

- [ ] Remove malware/backdoors
- [ ] Reset compromised credentials
- [ ] Rebuild affected systems (if severe)
- [ ] Restore from clean backup if needed
- [ ] Verify attacker tools/access removed

#### Decision: Rebuild vs. Restoration

| Scenario | Decision |
|---|---|
| Attacker had system admin access | **Rebuild** from clean source |
| Ransomware/encryption detected | **Rebuild** (restore from backup) |
| Limited malware infection | Restore from backup if available |
| Single file/account compromised | Direct remediation |

### 3.4 Phase 4: Recovery & Communication

#### Recovery Steps

- [ ] Restore systems to operational state
- [ ] Validate system integrity
- [ ] Restore from clean backups
- [ ] Perform security scanning
- [ ] Implement additional monitoring
- [ ] Return to normal operations

#### Communication Plan

**Notify within timeframe required by regulation:**
- **GDPR**: 72 hours (EU)
- **CCPA**: Without unreasonable delay (CA)
- **State Laws**: 30-60 days (most states)
- **ECOA**: Timely notification (Fair Lending)

**Notification Template**:

```
Subject: [URGENT] Security Incident Notification

Dear Valued Customer,

EthixAI has detected a security incident that may affect your data.

WHAT HAPPENED:
[Non-technical explanation of incident]

WHAT DATA:
[Specific data types: names, email addresses, analysis results, etc.]

WHEN:
[Discovery date and impact timeframe]

WHAT WE'RE DOING:
[Steps taken to secure systems and prevent future incidents]

WHAT YOU SHOULD DO:
[Recommended actions: monitor accounts, change passwords, etc.]

RESOURCES:
[Offer free credit monitoring, hotline, website with details]

We regret this incident and appreciate your patience.

[CSO Name], Chief Security Officer
[Phone], [Email]
```

#### Stakeholder Notification Timeline

| Audience | Timeline | Method |
|---|---|---|
| Affected Customers | 24 hours | Email + phone |
| Regulators (if required) | Per regulation | Official letter |
| Credit Bureaus (if PII) | 10 days | Formal notification |
| Media (if material) | After customer notification | Press release |
| Employees | Before external notification | Internal memo |

#### Communications with Law Enforcement (if applicable)

- Federal Bureau of Investigation (FBI)
  - Cyber Division: [Region contact]
  - IC3 (Internet Crime Complaint Center): ic3.gov

- Secret Service (if financial fraud)
  - US Secret Service Electronic Crimes Task Force

- Local Law Enforcement
  - Coordinate through legal counsel

### 3.5 Phase 5: Post-Incident Analysis

#### Timing

- **Initial Report**: Within 5 days of containment
- **Final Report**: Within 30 days
- **Board Review**: Next quarterly meeting

#### Post-Incident Review Questions

1. **What happened?** - Timeline and facts
2. **Why did it happen?** - Root cause analysis
3. **Why weren't we ready?** - Control failures
4. **What will we do differently?** - Remediation plan
5. **How do we prevent recurrence?** - Long-term improvements

#### Remediation Actions

Document all improvements:

| Issue | Action | Owner | Due Date | Status |
|---|---|---|---|---|
| [Root cause #1] | [Action] | [Owner] | [Date] | Pending |
| [Control gap #1] | [Action] | [Owner] | [Date] | Pending |

#### Team Debrief

- Conduct within 1 week while incident fresh
- Thank team for response effort
- Identify what went well / what needs improvement
- Update playbooks based on findings
- Schedule follow-up training if needed

---

## 4. Incident Response Playbooks

### 4.1 Playbook: Data Breach

**When to activate**: Unauthorized access to customer data confirmed

**Immediate Actions** (within 2 hours):
1. [ ] Verify data actually compromised (not just suspected access)
2. [ ] Determine what data: names, emails, analyses, financial data?
3. [ ] Determine how many customers affected
4. [ ] Assess if PII (personally identifiable information) involved
5. [ ] Check if regulated data (HIPAA, FERPA, etc.)
6. [ ] Isolate affected systems if data still exposed
7. [ ] Preserve all access logs

**Investigation** (4-12 hours):
1. [ ] How did attacker gain access? (SQL injection? Weak credentials? Phishing?)
2. [ ] When did access first occur?
3. [ ] What data was accessed/exfiltrated?
4. [ ] Is attacker still inside?
5. [ ] Are there other backdoors?

**Remediation** (12-48 hours):
1. [ ] Patch vulnerability if known
2. [ ] Reset affected customer credentials
3. [ ] Force password resets for accounts with access
4. [ ] Enable MFA for affected accounts
5. [ ] Increase monitoring
6. [ ] Notify customers of measures taken

**Notification** (24-72 hours):
- Notify customers within 24-72 hours (per regulation)
- Offer credit monitoring if PII
- Provide steps to protect accounts
- Be transparent about what happened

### 4.2 Playbook: Ransomware

**When to activate**: Malware that encrypts files and demands ransom

**Immediate Actions** (within 15 minutes):
1. [ ] **DO NOT PAY RANSOM** - Funding criminals
2. [ ] Isolate infected systems immediately (disconnect from network)
3. [ ] Preserve encrypted file samples
4. [ ] Check backups for malware (before restoring)
5. [ ] Scan all systems for malware
6. [ ] Enable enhanced monitoring

**Investigation** (1-4 hours):
1. [ ] Identify ransomware variant (hash + VirusTotal)
2. [ ] Check if decryption key available (No More Ransom project)
3. [ ] Determine entry vector (email? RDP? Vulnerability?)
4. [ ] Check for data exfiltration (attacker may threaten publication)
5. [ ] Assess ransom demands (often publicly documented)

**Remediation** (4-24 hours):
1. [ ] Rebuild systems from clean backups
2. [ ] Patch all vulnerabilities
3. [ ] Implement EDR (Endpoint Detection & Response)
4. [ ] Enforce MFA enterprise-wide
5. [ ] Restrict admin access
6. [ ] Monitor for attacker re-entry

**No-Pay Decision**:
- Decision made by CEO + Legal + Insurance
- Reasons not to pay:
  - Funds criminal activity
  - No guarantee decryption works
  - May attract more attacks
  - May violate sanctions (OFAC)
  - Damages reputation when disclosed

### 4.3 Playbook: Insider Threat

**When to activate**: Employee or contractor misusing access

**Immediate Actions** (within 1 hour):
1. [ ] Review system access logs for user
2. [ ] Identify what data was accessed
3. [ ] Determine if data exfiltrated
4. [ ] Preserve all logs before access revocation
5. [ ] Notify HR and Legal immediately
6. [ ] Plan access revocation timing

**Investigation** (2-4 hours):
1. [ ] Interview user's manager (context)
2. [ ] Review user's activity over past 90 days
3. [ ] Check for files downloaded/emailed
4. [ ] Check for privileged actions
5. [ ] Determine intent (malicious? Negligent? Careless?)

**Containment**:
- **Timing**: Coordinate with HR & Legal
- **Method**: Suspend access during investigation
- **Evidence**: Preserve for potential prosecution
- **Communication**: Usually minimal (legal hold)

**Remediation**:
- HR determines employment action (discipline/termination)
- Legal determines if criminal referral warranted
- Revoke all access including personal devices
- Collect company equipment

### 4.4 Playbook: System Outage / Availability Incident

**When to activate**: Service unavailable for >15 minutes

**Immediate Actions** (within 5 minutes):
1. [ ] Page on-call engineering team
2. [ ] Check status page / send customer notification
3. [ ] Identify cause: hardware failure? Code change? Attack?
4. [ ] Activate war room (Slack + bridge line)
5. [ ] Track timeline

**Troubleshooting**:
1. [ ] Check recent deployments/changes
2. [ ] Check infrastructure health (CPU, memory, disk, database)
3. [ ] Check external dependencies (cloud provider, APIs)
4. [ ] Check logs for errors
5. [ ] Initiate rollback if recent deploy likely cause

**Recovery**:
1. [ ] Restore service (rollback/fix/restart)
2. [ ] Verify functionality restored
3. [ ] Monitor for recurrence
4. [ ] Update status page
5. [ ] Notify customers of resolution

**Post-Incident**:
1. [ ] Root cause analysis within 24 hours
2. [ ] Blameless postmortem meeting
3. [ ] Action items to prevent recurrence
4. [ ] Update runbooks/documentation

---

## 5. Incident Response Resources

### 5.1 External Contacts

| Resource | Contact | Use Case |
|---|---|---|
| **Incident Response Firm** | [PLACEHOLDER_IR_FIRM_CONTACT] | Forensics, breach response |
| **Legal Counsel** | [PLACEHOLDER_LEGAL_CONTACT] | Regulatory notifications, litigation |
| **PR Firm** | [PLACEHOLDER_PR_FIRM_CONTACT] | Media communications |
| **Cyber Insurance Broker** | [PLACEHOLDER_INSURANCE_CONTACT] | Coverage confirmation, claims |
| **FBI Cyber Division** | [LOCAL_FBI_CONTACT] | Criminal investigation |
| **Cloud Provider Support** | [AWS/GCP_SUPPORT_CONTACT] | Infrastructure incidents |

### 5.2 Forensics & Investigation

**Incident Response Firms** (expensive, called only for major incidents):
- CrowdStrike Falcon Overwatch
- Mandiant/Google Cloud MIRT
- Deloitte CyberDefense
- PwC Cyber Incident Response

**Cost**: $5,000 - $100,000+ depending on scope

### 5.3 Cyber Insurance

- **Policy Type**: Cyber Liability Insurance
- **Coverage**: Incident response, legal, notification costs, credit monitoring
- **Claim Process**: Notify broker immediately upon P1 incident

---

## 6. Incident Documentation & Lessons Learned

### 6.1 Incident Report Template

```
# Incident Report

## Executive Summary
[1-2 paragraph overview for executives]

## Timeline
[Date/Time] - Event occurred
[Date/Time] - Incident detected
[Date/Time] - Investigation started
[Date/Time] - Systems isolated
[Date/Time] - Remediation completed

## Impact
- Customers affected: [Number]
- Data compromised: [Types]
- Systems impacted: [List]
- Downtime: [Duration]
- Financial impact: [Estimated]

## Root Cause
[Analysis of why incident occurred]

## Remediation Actions Taken
[Steps taken to stop/recover from incident]

## Preventive Measures
[Changes to prevent recurrence]

## Regulatory Notifications Required
- GDPR: Yes/No
- State breach laws: Yes/No
- Industry regulations: Yes/No

## Lessons Learned
[What we should do differently]

## Owner: [CSO Name]
## Date: [Report Date]
```

### 6.2 Metrics Tracking

Track for each incident:

| Metric | Target | Actual |
|---|---|---|
| Time to detect | <4 hours | ? |
| Time to notify (P1) | <24 hours | ? |
| Time to contain | <4 hours | ? |
| Time to eradicate | <48 hours | ? |
| Time to recover | <24 hours | ? |
| Time to notify customers | <72 hours | ? |

---

## 7. Tabletop Exercises

### 7.1 Schedule

- **Annual Tabletop Exercise**: Every Q1
- **Scope**: Rotates between scenarios (breach, ransomware, outage)
- **Duration**: 2-3 hours
- **Participants**: Incident response team + executives
- **Facilitator**: External consultant (unbiased)

### 7.2 Exercise Format

1. **Briefing** (15 min): Scenario description
2. **Discovery Phase** (30 min): How would we detect this?
3. **Investigation Phase** (30 min): How would we investigate?
4. **Response Phase** (30 min): What would we do?
5. **Recovery Phase** (30 min): How would we recover?
6. **Debrief** (30 min): What did we learn?

### 7.3 Scenario Examples

- **Scenario 1**: Customer discovery of unauthorized analysis access
- **Scenario 2**: Ransomware attack on production database
- **Scenario 3**: Third-party vendor breach affecting our customers
- **Scenario 4**: Regulatory inquiry into potential bias in our model

---

## 8. Policy Review & Updates

- **Annual Review**: January of each year
- **Trigger-Based Review**: After any P1 incident
- **Approval**: Board of Directors must approve updates
- **Communication**: Changes communicated to all employees

---

**Approved By**: [Chief Security Officer Name]  
**Date**: January 1, 2025

---

*This plan is confidential. Do not distribute outside of EthixAI without CSO approval.*
