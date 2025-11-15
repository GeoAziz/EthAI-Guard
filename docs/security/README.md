# Security Quick Reference

## 🔒 Day 11 Security Implementation

### Quick Links

| Topic | Documentation |
|-------|---------------|
| **Encryption** | [encryption-guide.md](./encryption-guide.md) |
| **Secrets** | [secrets-management.md](./secrets-management.md) |
| **Access Control** | [rbac-zero-trust.md](./rbac-zero-trust.md) |
| **Audit Logs** | [audit-logging.md](./audit-logging.md) |
| **Supply Chain** | [supply-chain.md](./supply-chain.md) |
| **Incidents** | [incident-response.md](./incident-response.md) |
| **Compliance** | [soc2-readiness.md](./soc2-readiness.md) |

### Common Commands

**Encrypt PII**
```bash
python tools/security/field_encryption.py generate
export FIELD_ENCRYPTION_KEY="<generated-key>"
python -c "from tools.security.field_encryption import FieldEncryption; e=FieldEncryption(); print(e.encrypt('user@example.com'))"
```

**Scan for Secrets**
```bash
gitleaks detect --source . --verbose
```

**Container Scan**
```bash
trivy image ethixai/backend:latest --severity HIGH,CRITICAL
```

**Dependency Scan**
```bash
cd backend && npm audit --audit-level=high
cd ai_core && pip-audit -r requirements.txt
```

**RBAC Usage**
```javascript
// Protect endpoint
app.get('/admin/users', authMiddleware, requireRole('admin'), handler);
app.delete('/datasets/:id', authMiddleware, requirePermission('datasets:delete'), handler);
```

**Audit Event**
```javascript
logAuditEvent({
  request_id: req.request_id,
  user_id: req.userId,
  action: 'dataset.delete',
  resource_id: req.params.id,
  status: 200
});
```

### Emergency Procedures

**Revoke Compromised User**
```bash
mongo ethixai --eval "db.refresh_tokens.updateMany({userId: ObjectId('USER_ID')}, {\$set: {revokedAt: new Date(), revocationReason: 'incident_response'}})"
```

**Rotate JWT Secret**
```bash
vault kv patch ethixai/backend JWT_SECRET="$(openssl rand -base64 32)"
# Deploy with dual-key support, then remove old key after 24h
```

**Emergency Service Stop**
```bash
docker compose stop backend
iptables -A INPUT -s MALICIOUS_IP -j DROP
```

### Security Checklist (Production)

Pre-Deployment
- [ ] All secrets in Vault (not .env)
- [ ] TLS certificates valid (Let's Encrypt)
- [ ] MFA enabled for all admins
- [ ] RBAC enforced on sensitive endpoints
- [ ] Audit logging to immutable storage
- [ ] Container images scanned (Trivy)
- [ ] Dependencies scanned (Snyk/Dependabot)
- [ ] Incident response team briefed

Post-Deployment
- [ ] Monitor /metrics for anomalies
- [ ] Review audit logs daily
- [ ] Backup restore tested (quarterly)
- [ ] Vulnerability scans weekly
- [ ] Access reviews quarterly
- [ ] Policy reviews annually

### Compliance Timeline

| Phase | Duration | Milestones |
|-------|----------|------------|
| Foundation | Weeks 1-2 | Policies, MFA, TLS |
| Evidence | Weeks 3-6 | Access reviews, SBOM, vendor assessments |
| Testing | Weeks 7-10 | SAST/DAST, pentest, DR drill |
| Pre-Audit | Weeks 11-12 | Readiness assessment, final evidence |

### Key Metrics

| Metric | Target |
|--------|--------|
| High/Critical Vulns | 0 in production |
| MFA Coverage | 100% of admins |
| Backup Success Rate | 100% |
| Audit Log Availability | 99.9% |
| Incident MTTR (P0) | < 4 hours |
| Secret Rotation | On schedule |

### Contacts

| Role | Contact |
|------|---------|
| Security Lead | security@ethixai.com |
| Incident Commander | incidents@ethixai.com |
| On-Call Engineer | oncall@ethixai.com |
| Legal | legal@ethixai.com |

### References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- SOC 2 Trust Criteria: https://www.aicpa.org/soc
- Zero Trust Architecture: https://www.nist.gov/publications/zero-trust-architecture

---

**Last Updated**: Day 11 Implementation  
**Status**: ✅ Production-Ready Security Architecture
