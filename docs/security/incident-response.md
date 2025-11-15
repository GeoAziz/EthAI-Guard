# Incident Response Playbook

## Overview

Structured procedures for detecting, responding to, and recovering from security incidents.

## 1. Incident Response Team

### Roles

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Incident Commander** | Lead response, make decisions, coordinate | On-call rotation |
| **Security Lead** | Investigate, contain threat, forensics | security@ethixai.com |
| **Engineering Lead** | Deploy fixes, restore services | engineering@ethixai.com |
| **Communications** | Internal/external comms, customer notifications | comms@ethixai.com |
| **Legal** | Regulatory compliance, breach notification | legal@ethixai.com |
| **Executive Sponsor** | Authorize major decisions, budget | CTO/CISO |

### Escalation Path

```
Level 1: On-call Engineer
  ↓ (if security incident)
Level 2: Security Lead + Incident Commander
  ↓ (if critical/data breach)
Level 3: Executive Sponsor + Legal
```

## 2. Incident Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P0 - Critical** | Active breach, data exfiltration, service down | 15 min | Ransomware, DB compromise, credential leak |
| **P1 - High** | Imminent threat, limited impact | 1 hour | Unpatched critical vuln, suspicious activity |
| **P2 - Medium** | Potential threat, no immediate impact | 4 hours | Failed auth attempts, minor vuln |
| **P3 - Low** | Policy violation, informational | 24 hours | Compliance gap, audit finding |

## 3. Response Phases

### Phase 1: Detection & Triage (0-15 min)

**Actions**
1. Alert received (monitoring, user report, external notification)
2. Assign Incident Commander
3. Create incident ticket: `INC-2025-001`
4. Initial assessment: severity, scope, affected systems
5. Activate war room (Slack channel, video call)

**Checklist**
- [ ] Incident ticket created
- [ ] Severity assigned
- [ ] War room activated
- [ ] Key stakeholders notified
- [ ] Timeline tracking started

### Phase 2: Containment (15 min - 2 hours)

**Actions**
1. Isolate affected systems (network segmentation, firewall rules)
2. Revoke compromised credentials immediately
3. Block malicious IPs/domains
4. Preserve evidence (logs, disk images, memory dumps)
5. Assess lateral movement risk

**Containment Procedures**

**Compromised User Account**
```bash
# Revoke all refresh tokens
mongo ethixai --eval "db.refresh_tokens.updateMany({userId: ObjectId('USERID')}, {\$set: {revokedAt: new Date(), revocationReason: 'incident_response'}})"

# Force password reset
mongo ethixai --eval "db.users.updateOne({_id: ObjectId('USERID')}, {\$set: {passwordResetRequired: true}})"

# Disable account
mongo ethixai --eval "db.users.updateOne({_id: ObjectId('USERID')}, {\$set: {disabled: true}})"
```

**Compromised Service**
```bash
# Stop service
docker compose stop backend

# Isolate network
iptables -A INPUT -s MALICIOUS_IP -j DROP

# Rotate service credentials
vault kv patch ethixai/backend JWT_SECRET="$(openssl rand -base64 32)"
```

**Database Compromise**
```bash
# Take snapshot
mongodump --uri=$MONGO_URL --out=/forensics/snapshot_$(date +%s)

# Revoke compromised user
mongo admin --eval "db.dropUser('compromised_user')"

# Enable IP whitelist
mongo --eval "db.adminCommand({setParameter: 1, net.ipv6: false})"
```

**Checklist**
- [ ] Affected systems isolated
- [ ] Compromised credentials revoked
- [ ] Evidence preserved
- [ ] Containment confirmed by Security Lead

### Phase 3: Eradication (2 hours - 2 days)

**Actions**
1. Identify root cause (vulnerability, misconfiguration, phishing)
2. Remove malware/backdoors
3. Patch vulnerabilities
4. Reset all affected credentials
5. Verify no persistence mechanisms remain

**Eradication Steps**

**Malware Removal**
```bash
# Scan with ClamAV
clamscan -r /var/www --remove

# Check for suspicious cron jobs
crontab -l
grep -r "* * * * *" /etc/cron.*

# Check for modified system files
rpm -Va | grep '^..5'  # RedHat/CentOS
debsums -c  # Debian/Ubuntu
```

**Vulnerability Patching**
```bash
# Emergency patch process
git checkout -b hotfix/security-CVE-2025-1234
# Apply fix
git commit -m "fix: patch CVE-2025-1234 (P0 incident)"
# Deploy immediately
./deploy.sh --environment production --force
```

**Checklist**
- [ ] Root cause identified
- [ ] Malware/backdoors removed
- [ ] Vulnerabilities patched
- [ ] Credentials rotated
- [ ] No persistence confirmed

### Phase 4: Recovery (2 days - 1 week)

**Actions**
1. Restore services from clean backups (if needed)
2. Monitor for re-infection (24-48 hours)
3. Validate system integrity
4. Re-enable affected accounts
5. Return to normal operations

**Recovery Procedures**

**Service Restoration**
```bash
# Restore from backup
aws s3 cp s3://ethixai-backups/mongodb_20251114.enc - | \
  openssl enc -aes-256-cbc -d -pbkdf2 -pass file:/run/secrets/backup_key | \
  mongorestore --archive --drop

# Verify integrity
mongo --eval "db.users.count()"
mongo --eval "db.reports.count()"

# Start services
docker compose up -d

# Health checks
curl http://localhost:5000/health
curl http://localhost:8100/health
```

**Monitoring**
```bash
# Watch for suspicious activity (24-48h)
tail -f /var/log/ethixai/security.log | grep -E "(401|403|suspicious)"

# Check for unusual connections
netstat -an | grep ESTABLISHED

# Monitor resource usage
top -b -n 1 | head -20
```

**Checklist**
- [ ] Services restored
- [ ] Integrity verified
- [ ] Enhanced monitoring active
- [ ] No re-infection detected (48h)
- [ ] Normal operations resumed

### Phase 5: Post-Mortem (1 week after)

**Actions**
1. Blameless post-mortem meeting
2. Document timeline and root cause
3. Identify improvements (technical, process, training)
4. Update playbooks and runbooks
5. Share learnings with team

**Post-Mortem Template**

```markdown
# Incident Post-Mortem: INC-2025-001

**Date**: 2025-11-15
**Severity**: P0 - Critical
**Duration**: 4 hours
**Impact**: 1,200 users, backend service unavailable

## Timeline

| Time | Event |
|------|-------|
| 14:00 | Alert: High error rate on backend |
| 14:05 | Incident Commander assigned |
| 14:10 | Root cause identified: SQL injection in /api/search |
| 14:15 | Service isolated, database restored from backup |
| 14:45 | Patch deployed |
| 18:00 | All services restored, monitoring normal |

## Root Cause

SQL injection vulnerability in search endpoint due to unsanitized user input.

## Impact

- 1,200 users unable to access reports for 4 hours
- Potential data exposure: 500 user records (names, emails)

## What Went Well

- Fast detection (5 min from alert to action)
- Clean backups available
- Team coordination effective

## What Went Wrong

- SQL injection not caught in code review
- No input validation on search endpoint
- Monitoring didn't catch initial exploit attempts

## Action Items

| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| Add parameterized queries to all endpoints | Backend Team | 2025-11-20 | Open |
| Implement WAF rules for SQL injection | DevOps | 2025-11-18 | In Progress |
| Add SAST check for SQL injection | Security | 2025-11-17 | Done |
| Security training for engineers | HR | 2025-12-01 | Open |
| Update incident playbook | Security Lead | 2025-11-16 | Open |

## Learnings

- Input validation is critical; automate checks
- WAF would have blocked initial exploit
- Need better monitoring for unusual DB queries
```

## 4. Communication Templates

### Internal Notification

```
Subject: [P0 INCIDENT] EthixAI Backend Service Disruption

Team,

We are experiencing a P0 security incident affecting backend services.

Status: CONTAINED
Impact: Backend API unavailable since 14:00 UTC
ETA: Services expected to be restored by 18:00 UTC

War Room: #incident-2025-001
Updates: Every 30 minutes

Incident Commander: [Name]
Next Update: 15:00 UTC

Do not discuss publicly. Direct questions to #incident-2025-001.
```

### Customer Notification

```
Subject: EthixAI Service Disruption - Update

Dear EthixAI Users,

We are currently experiencing a service disruption affecting access to our analysis platform. Our team is actively working to resolve the issue.

Status: In Progress
Expected Resolution: Within 4 hours

We apologize for the inconvenience and will provide updates every hour.

For urgent support: support@ethixai.com

Thank you for your patience.

The EthixAI Team
```

### Breach Notification (if required)

```
Subject: Important Security Notice - EthixAI Data Incident

Dear [Name],

We are writing to inform you of a security incident that may have affected your personal information stored on EthixAI.

What Happened:
On November 15, 2025, we discovered unauthorized access to our database. The incident was contained within 4 hours.

What Information Was Involved:
- Name
- Email address
- Last login date

What We Are Doing:
- Implemented additional security measures
- Notified law enforcement
- Engaging external security firm for forensic review

What You Can Do:
- Change your password immediately
- Enable multi-factor authentication
- Monitor your accounts for suspicious activity

We take your privacy seriously and sincerely apologize for this incident.

For questions: security@ethixai.com or call 1-800-XXX-XXXX

Sincerely,
[Executive]
CEO, EthixAI
```

## 5. Common Incident Scenarios

### Scenario A: Key Leakage (GitHub)

**Indicators**
- GitHub secret scan alert
- GitGuardian notification
- Manual discovery in commit history

**Response**
1. Revoke leaked key immediately (GitHub token, API key, JWT secret)
2. Rotate replacement key in secrets manager
3. Review audit logs for unauthorized use
4. Remove key from Git history (BFG)
5. Force password reset for affected users (if JWT secret)

### Scenario B: MongoDB Compromise

**Indicators**
- Unusual DB queries in logs
- Ransom note in DB
- External alert from security researcher

**Response**
1. Snapshot DB immediately (forensics)
2. Revoke compromised DB credentials
3. Restore from clean backup
4. Enable authentication if disabled
5. Apply IP whitelist
6. Audit for data exfiltration

### Scenario C: DDoS Attack

**Indicators**
- High request rate from single/multiple IPs
- Service degradation
- Elevated error rates

**Response**
1. Enable rate limiting (aggressive)
2. Block attacker IPs/ranges at firewall
3. Enable CDN/WAF (Cloudflare, AWS Shield)
4. Scale infrastructure (if volumetric)
5. Contact ISP for upstream mitigation

## 6. Patch Management SLAs

| Severity | SLA | Examples |
|----------|-----|----------|
| **Critical (CVSS 9-10)** | 24-48 hours | RCE, authentication bypass |
| **High (CVSS 7-8.9)** | 3-7 days | Privilege escalation, SQL injection |
| **Medium (CVSS 4-6.9)** | 14 days | XSS, information disclosure |
| **Low (CVSS 0-3.9)** | 30 days | Low-impact issues |

## 7. Acceptance Criteria

- [ ] Incident response team roles assigned
- [ ] Playbook reviewed by team (tabletop exercise)
- [ ] War room templates created (Slack, Zoom)
- [ ] Containment scripts tested
- [ ] Communication templates ready
- [ ] Post-mortem template exists
- [ ] Patch SLAs documented
- [ ] At least one tabletop exercise completed

## 8. Annual Testing

- **Q1**: Tabletop exercise (credential leak scenario)
- **Q2**: Live drill (simulate DB compromise)
- **Q3**: Update playbook based on lessons learned
- **Q4**: Executive briefing on incident readiness

## References

- NIST SP 800-61: Incident Handling Guide
- SANS Incident Handler's Handbook
- PCI DSS Requirement 12.10: Incident Response Plan
