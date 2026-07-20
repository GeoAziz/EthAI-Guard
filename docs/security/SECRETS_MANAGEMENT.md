# Secrets Management Playbook

**Version**: 1.0.0  
**Last Updated**: December 2, 2025  
**Owner**: Security Team  
**Status**: 🔐 Production

---

## Table of Contents

1. [Overview](#overview)
2. [Secret Types and Classification](#secret-types-and-classification)
3. [Secret Storage Guidelines](#secret-storage-guidelines)
4. [Secret Scanning](#secret-scanning)
5. [Secret Rotation Procedures](#secret-rotation-procedures)
6. [Emergency Response](#emergency-response)
7. [Audit and Compliance](#audit-and-compliance)
8. [Tools and Automation](#tools-and-automation)

---

## Overview

This playbook defines EthixAI-Guard's approach to managing secrets, credentials, and sensitive configuration data across development, staging, and production environments.

### Principles

1. **Never Commit Secrets**: Secrets must never be committed to version control
2. **Least Privilege**: Grant minimum necessary access
3. **Regular Rotation**: Rotate secrets on a defined schedule
4. **Audit Trail**: Maintain logs of all secret access and modifications
5. **Encryption at Rest**: All secrets must be encrypted when stored
6. **Separation**: Different secrets for dev, staging, and production

---

## Secret Types and Classification

### Critical (Priority: 🔴 CRITICAL)

**Rotation Schedule**: Every 30 days  
**Access**: Restricted to ops team

- **Firebase Service Account Keys**
  - Location: Environment variables, secret managers
  - Format: JSON file
  - Impact: Full database and auth access
  
- **Ethereum Private Keys**
  - Location: Hardware security modules preferred
  - Format: 0x + 64 hex characters
  - Impact: Financial loss, transaction signing
  
- **Database Master Passwords**
  - Location: Secret managers only
  - Format: String
  - Impact: Data breach, data loss
  
- **AI API Keys (OpenAI, Anthropic)**
  - Location: Environment variables, secret managers
  - Format: sk-* prefixed strings
  - Impact: Cost, data exposure

### High (Priority: 🟠 HIGH)

**Rotation Schedule**: Every 60 days  
**Access**: Dev team with approval

- **JWT Signing Secrets**
  - Location: Environment variables
  - Minimum Length: 32 characters
  - Impact: Authentication bypass
  
- **Session Secrets**
  - Location: Environment variables
  - Minimum Length: 32 characters
  - Impact: Session hijacking
  
- **API Keys (Third-party services)**
  - Location: Environment variables
  - Format: Service-specific
  - Impact: Service abuse, cost
  
- **Database Connection Strings**
  - Location: Environment variables
  - Format: mongodb://, postgresql://
  - Impact: Data access

### Medium (Priority: 🟡 MEDIUM)

**Rotation Schedule**: Every 90 days  
**Access**: Dev team

- **Docker Registry Tokens**
- **GitHub Personal Access Tokens**
- **Webhook Secrets**
- **Encryption Keys (non-critical data)**

### Low (Priority: 🟢 LOW)

**Rotation Schedule**: Annually or on compromise  
**Access**: All developers

- **Development API Keys**
- **Test Credentials**
- **Monitoring Tokens (read-only)**

---

## Secret Storage Guidelines

### ✅ Approved Storage Locations

#### 1. Environment Variables (Production)

```bash
# In production deployment configuration
FIREBASE_PROJECT_ID=ethixai-guard-prod
JWT_SECRET=$(cat /run/secrets/jwt_secret)
MONGODB_URI=$(cat /run/secrets/mongodb_uri)
```

#### 2. Docker Secrets (Docker Swarm/Compose)

```yaml
# docker-compose.prod.yml
services:
  backend:
    secrets:
      - firebase_credentials
      - jwt_secret
      
secrets:
  firebase_credentials:
    external: true
  jwt_secret:
    external: true
```

#### 3. Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ethixai-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded>
  mongodb-uri: <base64-encoded>
```

#### 4. Cloud Secret Managers

- **AWS Secrets Manager**
- **Google Secret Manager**
- **Azure Key Vault**
- **HashiCorp Vault**

```python
# Example: Google Secret Manager
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
response = client.access_secret_version(request={"name": name})
secret_value = response.payload.data.decode("UTF-8")
```

#### 5. GitHub Secrets (CI/CD Only)

```yaml
# .github/workflows/deploy.yml
env:
  FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

### ❌ Prohibited Storage Locations

- ❌ Version control (Git repositories)
- ❌ Unencrypted configuration files
- ❌ Container images
- ❌ Log files
- ❌ Client-side code
- ❌ Email or messaging apps
- ❌ Shared drives or wikis
- ❌ Code comments

---

## Secret Scanning

### Automated Scanning

#### 1. Pre-commit Hooks (Local)

```bash
# Install pre-commit hooks
pre-commit install

# Manual run
pre-commit run --all-files
```

Hooks configured in `.pre-commit-config.yaml`:
- `detect-secrets`: Baseline secret detection
- `gitleaks` (via security gate): Advanced pattern matching

#### 2. CI/CD Pipeline (GitHub Actions)

Runs on every push and PR:
- **Workflow**: `.github/workflows/secret-scan.yml`
- **Tool**: Gitleaks v8+
- **Configuration**: `.gitleaks.toml`
- **Reporting**: SARIF format to GitHub Security

#### 3. Scheduled Scans

- **Frequency**: Daily at 5:00 AM UTC
- **Scope**: Full repository history
- **Alerts**: GitHub Security Advisories

### Manual Scanning

```bash
# Scan entire repository
gitleaks detect --source . --config .gitleaks.toml --verbose

# Scan specific directory
gitleaks detect --source ./backend --config .gitleaks.toml

# Scan with JSON report
gitleaks detect --source . --config .gitleaks.toml \
  --report-format json --report-path gitleaks-report.json

# Scan specific commits
gitleaks detect --source . --config .gitleaks.toml \
  --log-opts="--since=2025-01-01"
```

### False Positive Management

#### Update Allowlist in `.gitleaks.toml`

```toml
[allowlist]
paths = [
  '''docs/examples/.*''',  # Documentation examples
  '''tests/fixtures/.*'''  # Test data
]

regexes = [
  '''example-api-key-.*''',  # Example placeholders
  '''test-secret-.*'''       # Test credentials
]
```

#### Create `.gitleaks.ignore`

```bash
# Format: <commit>:<file>:<secret>
abc123def456:backend/.env.example:example-key
```

---

## Secret Rotation Procedures

### 1. JWT Secret Rotation

#### Prerequisites
- Maintenance window scheduled
- Backup of current configuration
- Rollback plan ready

#### Steps

```bash
# 1. Generate new secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# 2. Update environment variable (dual-key period)
# Keep old key active during transition
JWT_SECRET=$NEW_JWT_SECRET
JWT_SECRET_OLD=$OLD_JWT_SECRET

# 3. Deploy updated configuration
docker-compose up -d backend

# 4. Verify service health
curl http://localhost:5000/health

# 5. Invalidate old sessions (optional)
# Run migration script to invalidate tokens signed with old key

# 6. After 24 hours, remove old secret
unset JWT_SECRET_OLD
```

#### Verification

```bash
# Test authentication with new JWT
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Verify new token works
TOKEN="<new-jwt-token>"
curl http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Firebase Service Account Rotation

```bash
# 1. Create new service account in Firebase Console
# https://console.firebase.google.com/project/{project-id}/settings/serviceaccounts

# 2. Download new JSON key file
# Save to secure location (NOT in repository)

# 3. Update GOOGLE_APPLICATION_CREDENTIALS
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/new-key.json"

# 4. Restart services
docker-compose restart backend

# 5. Verify Firebase connectivity
curl http://localhost:5000/api/health/firebase

# 6. Delete old service account in Firebase Console
# After 24-48 hour grace period
```

### 3. Database Password Rotation

```bash
# 1. Create new user with same permissions
docker exec -it mongodb mongo admin
> db.createUser({
  user: "ethixai_new",
  pwd: "new-secure-password",
  roles: [{role: "readWrite", db: "ethixai"}]
})

# 2. Update connection string
MONGODB_URI="mongodb://ethixai_new:new-secure-password@mongodb:27017/ethixai"

# 3. Test connection
mongosh "$MONGODB_URI" --eval "db.runCommand({ping: 1})"

# 4. Deploy updated configuration
docker-compose up -d backend

# 5. Verify application connectivity
curl http://localhost:5000/health

# 6. Drop old user (after verification)
> db.dropUser("ethixai_old")
```

### 4. API Key Rotation (OpenAI, Anthropic)

```bash
# 1. Generate new API key in provider console

# 2. Update environment variable
AI_API_KEY="sk-new-key-here"

# 3. Restart AI core service
docker-compose restart ai_core

# 4. Verify AI functionality
curl -X POST http://localhost:8100/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}'

# 5. Revoke old key in provider console
# After 24 hour grace period
```

---

## Emergency Response

### Scenario 1: Secret Exposed in Git

#### Immediate Actions (Within 15 minutes)

1. **Rotate Compromised Secret**
   ```bash
   # Generate new secret immediately
   NEW_SECRET=$(openssl rand -base64 32)
   
   # Update in production
   # Method depends on deployment (K8s, Docker, etc.)
   ```

2. **Revoke Old Secret**
   - Disable API keys in provider console
   - Delete service accounts
   - Invalidate JWT tokens
   - Reset database passwords

3. **Verify No Active Usage**
   ```bash
   # Check logs for unauthorized access
   grep "old-secret-pattern" /var/log/*.log
   
   # Monitor for suspicious activity
   # Check metrics dashboards
   ```

#### Git History Cleanup (Within 1 hour)

```bash
# Option 1: BFG Repo-Cleaner (Recommended)
java -jar bfg.jar --delete-files serviceAccountKey.json
java -jar bfg.jar --replace-text passwords.txt  # File with secrets to redact

git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: Coordinated with team)
git push origin --force --all
git push origin --force --tags

# Option 2: git-filter-repo
git filter-repo --path serviceAccountKey.json --invert-paths
git push origin --force --all

# Option 3: GitHub Secret Scanning alert
# GitHub can help remove cached data
```

#### Communication (Within 2 hours)

1. **Notify Security Team**: Immediate email/Slack
2. **Document Incident**: Create incident report
3. **Notify Affected Parties**: If customer data exposed
4. **Update Status Page**: If service impacted

### Scenario 2: Unauthorized Secret Access

#### Detection

```bash
# Monitor secret access logs
# AWS Secrets Manager example
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=ethixai-secrets \
  --start-time 2025-12-01 \
  --end-time 2025-12-02

# Check for unusual access patterns
grep "secret-access" /var/log/audit.log | grep -v "expected-service-account"
```

#### Response

1. **Verify Legitimate Access**: Check with team
2. **Rotate Secrets**: If unauthorized confirmed
3. **Review Access Policies**: Tighten permissions
4. **Enable MFA**: For secret management interfaces
5. **Audit Trail Review**: Full access log analysis

### Scenario 3: Production Secret Failure

#### Symptoms

- Authentication failures
- Database connection errors
- Third-party API errors

#### Diagnosis

```bash
# Check secret availability
kubectl get secrets ethixai-secrets -o yaml

# Verify environment variables
docker exec backend env | grep -i secret

# Test secret values (be careful with logging)
python -c "import os; print('JWT_SECRET' in os.environ)"
```

#### Recovery

```bash
# Option 1: Rollback to previous secret
# Restore from backup

# Option 2: Emergency rotation
# Follow rotation procedures with expedited timeline

# Option 3: Use backup secrets
# Switch to secondary/backup secret set
```

---

## Audit and Compliance

### Audit Checklist

#### Weekly
- [ ] Review secret scanning reports
- [ ] Check for new security advisories
- [ ] Verify pre-commit hooks active
- [ ] Monitor secret access logs

#### Monthly
- [ ] Rotate high-priority secrets
- [ ] Review and update allowlists
- [ ] Audit user access permissions
- [ ] Test emergency procedures

#### Quarterly
- [ ] Comprehensive security audit
- [ ] Review and update documentation
- [ ] Secret inventory verification
- [ ] Penetration testing

#### Annually
- [ ] Full secret rotation cycle
- [ ] Compliance certification renewal
- [ ] Security policy review
- [ ] Team training and drills

### Compliance Requirements

#### SOC 2 Type II

- [ ] Encryption at rest for all secrets
- [ ] Access logs for 1 year minimum
- [ ] MFA for secret management access
- [ ] Regular rotation schedule documented
- [ ] Incident response procedures tested

#### GDPR

- [ ] Data retention policies defined
- [ ] Right to erasure procedures
- [ ] Breach notification process (<72 hours)
- [ ] Privacy by design in secret management

#### PCI DSS (if applicable)

- [ ] Strong cryptography (AES-256)
- [ ] Quarterly key rotation
- [ ] Split knowledge procedures
- [ ] Dual control for critical operations

---

## Tools and Automation

### Secret Generation

```bash
# Strong random string (32 bytes, base64)
openssl rand -base64 32

# Hex format (64 characters)
openssl rand -hex 32

# UUID format
uuidgen

# Custom charset (alphanumeric only)
< /dev/urandom tr -dc A-Za-z0-9 | head -c32

# Python script
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Secret Validation

```python
# secrets_validator.py
import re

def validate_jwt_secret(secret: str) -> bool:
    """Validate JWT secret meets security requirements"""
    if len(secret) < 32:
        return False
    if not re.search(r'[A-Z]', secret):
        return False
    if not re.search(r'[a-z]', secret):
        return False
    if not re.search(r'[0-9]', secret):
        return False
    return True

def validate_api_key(key: str, pattern: str) -> bool:
    """Validate API key matches expected pattern"""
    return bool(re.match(pattern, key))
```

### Rotation Automation Script

```bash
#!/bin/bash
# scripts/rotate-secrets.sh

SECRET_TYPE=$1
ENVIRONMENT=$2

case "$SECRET_TYPE" in
  jwt)
    NEW_SECRET=$(openssl rand -base64 32)
    # Update in secret manager
    aws secretsmanager update-secret \
      --secret-id "ethixai/${ENVIRONMENT}/jwt-secret" \
      --secret-string "$NEW_SECRET"
    ;;
  database)
    # Implement database rotation
    ;;
  *)
    echo "Unknown secret type: $SECRET_TYPE"
    exit 1
    ;;
esac

echo "Secret rotated successfully"
```

### Monitoring and Alerting

```python
# monitoring/secret_metrics.py
from prometheus_client import Counter, Gauge

secret_access_counter = Counter(
    'secret_access_total',
    'Total secret accesses',
    ['secret_type', 'result']
)

secret_age_gauge = Gauge(
    'secret_age_days',
    'Age of secret in days',
    ['secret_name']
)

def record_secret_access(secret_type: str, success: bool):
    result = 'success' if success else 'failure'
    secret_access_counter.labels(
        secret_type=secret_type,
        result=result
    ).inc()
```

---

## Quick Reference

### Emergency Contacts

- **Security Team Lead**: [Contact Info]
- **On-Call Engineer**: [PagerDuty/OpsGenie]
- **Management Escalation**: [Contact Info]

### Key Links

- [Firebase Console](https://console.firebase.google.com)
- [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager)
- [GitHub Security Advisories](https://github.com/GeoAziz/EthAI-Guard/security)
- [Monitoring Dashboard](http://localhost:3000/grafana)

### Common Commands

```bash
# Scan for secrets
gitleaks detect --source . --config .gitleaks.toml

# Generate strong secret
openssl rand -base64 32

# Test secret in environment
echo $JWT_SECRET | wc -c  # Should be 32+

# Check service health
curl http://localhost:5000/health

# View secret age
kubectl get secret ethixai-secrets -o yaml | grep creationTimestamp
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Dec 2, 2025 | Security Team | Initial release |

---

**For questions or updates to this playbook, contact the Security Team.**

*Last Review: December 2, 2025*
