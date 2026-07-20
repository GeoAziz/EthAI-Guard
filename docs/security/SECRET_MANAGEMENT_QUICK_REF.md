# 🔐 Secret Management Quick Reference

**EthixAI-Guard Security Team**  
*Last Updated: December 2, 2025*

---

## 🚨 Emergency Contacts

- **Security Lead**: Check internal docs
- **On-Call**: PagerDuty/OpsGenie
- **Emergency**: See `docs/INCIDENT_RESPONSE.md`

---

## ⚡ Quick Commands

### Scan for Secrets

```bash
# Full repository scan
gitleaks detect --source . --config .gitleaks.toml --verbose

# Specific directory
gitleaks detect --source ./backend --config .gitleaks.toml

# Generate report
gitleaks detect --source . --config .gitleaks.toml \
  --report-format json --report-path report.json
```

### Run Security Audit

```bash
# Full audit with score
./scripts/audit-secrets.sh

# Output: JSON report in /tmp/
```

### Rotate Secrets

```bash
# Dry-run (safe - shows what would happen)
./scripts/rotate-secrets.sh jwt production --dry-run

# Actual rotation
./scripts/rotate-secrets.sh jwt production --backup

# Rotate all secrets
./scripts/rotate-secrets.sh all production --backup --force
```

### Generate Strong Secrets

```bash
# 32-byte base64 (JWT, sessions)
openssl rand -base64 32

# 64-char hex (Ethereum keys)
openssl rand -hex 32

# Python method
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Pre-commit Checks

```bash
# Install hooks
pre-commit install

# Run all hooks
pre-commit run --all-files

# Run specific hook
pre-commit run detect-secrets --all-files
```

---

## 🔑 Secret Priority & Rotation

| Priority | Examples | Rotation | Impact |
|----------|----------|----------|--------|
| 🔴 **CRITICAL** | Firebase keys, DB master passwords, ETH keys, AI API keys | 30 days | Breach, data loss |
| 🟠 **HIGH** | JWT secrets, session secrets, DB connection strings | 60 days | Auth bypass |
| 🟡 **MEDIUM** | Docker tokens, GitHub PATs, webhooks | 90 days | Service abuse |
| 🟢 **LOW** | Dev API keys, test credentials, monitoring tokens | Annual | Limited |

---

## ✅ Secret Storage (Approved)

- ✅ Environment variables (production)
- ✅ Docker Secrets
- ✅ Kubernetes Secrets
- ✅ Cloud Secret Managers (AWS, GCP, Azure)
- ✅ GitHub Secrets (CI/CD only)

## ❌ Secret Storage (Prohibited)

- ❌ Git repositories
- ❌ Config files (unencrypted)
- ❌ Container images
- ❌ Log files
- ❌ Client-side code
- ❌ Email/chat
- ❌ Shared drives

---

## 🚨 Emergency: Secret Exposed in Git

### Immediate (< 15 min)

1. **Generate new secret**
   ```bash
   NEW_SECRET=$(openssl rand -base64 32)
   ```

2. **Update production immediately**
   ```bash
   # Set new secret in your deployment
   kubectl set env deployment/backend JWT_SECRET=$NEW_SECRET
   # OR
   docker service update --env-add JWT_SECRET=$NEW_SECRET backend
   ```

3. **Revoke old secret**
   - Disable API key in provider console
   - Delete service account
   - Reset database password

### Within 1 Hour

4. **Clean Git history**
   ```bash
   # Using BFG Repo-Cleaner
   java -jar bfg.jar --delete-files secret-file.json
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push origin --force --all
   ```

5. **Notify team** via Slack/email

### Within 24 Hours

6. **Document incident** in `reports/incidents/`
7. **Update procedures** if needed
8. **Complete post-mortem**

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] No secrets in code (run: `gitleaks detect`)
- [ ] All secrets in secret manager
- [ ] `.env` files not committed
- [ ] Service accounts have minimum permissions
- [ ] Secrets rotated within schedule
- [ ] Backup/rollback plan ready
- [ ] Monitoring alerts configured

---

## 🛠️ Common Issues

### "Gitleaks found secrets"

1. Review the finding
2. If real secret:
   - Rotate immediately
   - Clean from history
3. If false positive:
   - Add to `.gitleaks.toml` allowlist
   - Or add to `.gitleaks.ignore`

### "Pre-commit hook failed"

```bash
# See what failed
pre-commit run --all-files --verbose

# Skip once (emergency only)
git commit --no-verify -m "message"

# Fix and re-run
pre-commit run --all-files
```

### "Service can't read secret"

1. Check secret exists:
   ```bash
   # Docker
   docker secret ls
   
   # Kubernetes
   kubectl get secrets
   ```

2. Check permissions
3. Check environment variable name
4. Restart service

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `.gitleaks.toml` | Custom secret detection rules |
| `.github/workflows/secret-scan.yml` | CI/CD scanning |
| `docs/SECRETS_MANAGEMENT.md` | Full documentation |
| `scripts/rotate-secrets.sh` | Rotation automation |
| `scripts/audit-secrets.sh` | Security audit tool |
| `.pre-commit-config.yaml` | Pre-commit hooks |

---

## 🔍 Detection Patterns

Our custom rules detect:

- ✅ EthixAI API keys
- ✅ Firebase service accounts & private keys
- ✅ JWT & session secrets
- ✅ MongoDB/PostgreSQL connection strings
- ✅ OpenAI API keys (`sk-...`)
- ✅ Anthropic API keys (`sk-ant-...`)
- ✅ Ethereum private keys (`0x...`)
- ✅ Docker registry tokens
- ✅ GitHub PATs
- ✅ AWS access keys
- ✅ Generic high-entropy strings

---

## 📞 Getting Help

1. **Documentation**: `docs/SECRETS_MANAGEMENT.md`
2. **Runbooks**: `docs/INCIDENT_RESPONSE.md`
3. **Security Team**: Slack #security channel
4. **On-Call**: PagerDuty

---

## 🎓 Training Resources

- [OWASP Secrets Management](https://owasp.org/www-community/Secrets_Management_Cheat_Sheet)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

## 📊 Monitoring

- **Grafana**: http://localhost:3000/grafana
- **Prometheus**: http://localhost:9090
- **GitHub Security**: https://github.com/GeoAziz/EthAI-Guard/security

---

## 💡 Best Practices

1. **Never** commit secrets (use scanners)
2. **Always** use strong, randomly generated secrets
3. **Rotate** on schedule (see priority table)
4. **Encrypt** at rest
5. **Audit** regularly
6. **Monitor** access logs
7. **Document** exceptions
8. **Test** rotation procedures
9. **Have** rollback plans
10. **Train** team members

---

## 🎯 Success Metrics

- **0** secrets in Git history
- **0** exposed API keys
- **100%** rotation compliance
- **< 15 min** emergency response time
- **< 5%** false positive rate

---

**Need more detail? See `docs/SECRETS_MANAGEMENT.md`**

---

*Keep this card handy! Print or bookmark.*  
*Updated: December 2, 2025*
