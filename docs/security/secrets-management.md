# Secrets Management & Key Rotation

## Overview

This guide establishes secrets management practices to eliminate hardcoded credentials and enable secure, auditable key rotation.

## 1. Secrets Manager Selection

### Recommended Options

**Production (Cloud)**
- **AWS Secrets Manager**: Integrated rotation, audit logs, fine-grained IAM
- **GCP Secret Manager**: Native GKE integration, versioning
- **Azure Key Vault**: Managed HSM option for high-security keys

**Production (Self-Hosted)**
- **HashiCorp Vault**: Dynamic secrets, audit logs, multi-cloud
- **CyberArk**: Enterprise-grade, compliance-friendly

**Development/CI**
- **GitHub Secrets**: For CI/CD workflows
- **Doppler**: Developer-friendly, branch-based secrets

### Selection Criteria

| Feature | AWS | GCP | Vault | GitHub |
|---------|-----|-----|-------|--------|
| Auto-rotation | ✅ | ✅ | ✅ | ❌ |
| Audit logs | ✅ | ✅ | ✅ | ✅ |
| Dynamic secrets | ❌ | ❌ | ✅ | ❌ |
| Cost (small scale) | $$ | $$ | Free/OSS | Free |

**Recommendation**: Start with **HashiCorp Vault** (OSS) for flexibility + **GitHub Secrets** for CI.

## 2. Vault Setup & Integration

### Installation

```bash
# Docker Compose addition
vault:
  image: vault:1.15
  ports:
    - "8200:8200"
  environment:
    VAULT_DEV_ROOT_TOKEN_ID: "dev-only-token"
    VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
  cap_add:
    - IPC_LOCK
```

### Initialize Vault

```bash
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='dev-only-token'

# Enable KV secrets engine
vault secrets enable -path=ethixai kv-v2

# Store secrets
vault kv put ethixai/backend \
  JWT_SECRET="$(openssl rand -base64 32)" \
  REFRESH_SECRET="$(openssl rand -base64 32)" \
  MONGO_PASSWORD="secure-password"

vault kv put ethixai/ai_core \
  FIELD_ENCRYPTION_KEY="$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
```

### Backend Integration

```javascript
// backend/src/vault.js
const axios = require('axios');

async function getSecret(path) {
  const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
  const vaultToken = process.env.VAULT_TOKEN;
  
  if (!vaultToken) {
    throw new Error('VAULT_TOKEN required');
  }
  
  const url = `${vaultAddr}/v1/ethixai/data/${path}`;
  const resp = await axios.get(url, {
    headers: { 'X-Vault-Token': vaultToken }
  });
  
  return resp.data.data.data;
}

module.exports = { getSecret };

// Usage in server.js
const { getSecret } = require('./vault');

async function initSecrets() {
  const secrets = await getSecret('backend');
  process.env.SECRET_KEY = secrets.JWT_SECRET;
  process.env.REFRESH_SECRET = secrets.REFRESH_SECRET;
  process.env.MONGO_PASSWORD = secrets.MONGO_PASSWORD;
}

// Call before server start
initSecrets().then(() => {
  app.listen(port, () => logger.info({ port }, 'Backend ready'));
}).catch(err => {
  logger.error({ err }, 'Failed to load secrets');
  process.exit(1);
});
```

### AI Core Integration

```python
# ai_core/vault_client.py
import os
import requests
from typing import Dict

def get_secret(path: str) -> Dict[str, str]:
    """Retrieve secrets from Vault."""
    vault_addr = os.environ.get('VAULT_ADDR', 'http://vault:8200')
    vault_token = os.environ.get('VAULT_TOKEN')
    
    if not vault_token:
        raise ValueError('VAULT_TOKEN required')
    
    url = f'{vault_addr}/v1/ethixai/data/{path}'
    headers = {'X-Vault-Token': vault_token}
    
    resp = requests.get(url, headers=headers, timeout=5)
    resp.raise_for_status()
    
    return resp.json()['data']['data']

# Usage in main.py startup
try:
    from ai_core.vault_client import get_secret
    secrets = get_secret('ai_core')
    os.environ['FIELD_ENCRYPTION_KEY'] = secrets['FIELD_ENCRYPTION_KEY']
except Exception as e:
    logger.warning(f"Vault unavailable, using env vars: {e}")
```

## 3. Secrets Rotation Policy

### Rotation Schedule

| Secret Type | Frequency | Method | Owner |
|-------------|-----------|--------|-------|
| JWT Signing Key | Quarterly | Manual + Vault API | Backend Team |
| Refresh Token Secret | Quarterly | Manual + Vault API | Backend Team |
| MongoDB Password | Annually | Vault dynamic secrets | DBA |
| Field Encryption Key | Quarterly | Manual migration | Security Lead |
| TLS Certificates | 90 days | Let's Encrypt auto | DevOps |
| API Keys (3rd party) | Per vendor policy | Manual | Backend Team |
| Service Account Tokens | 30 days | OIDC/dynamic | DevOps |

### JWT Key Rotation Procedure

**Step 1: Generate new key**
```bash
vault kv patch ethixai/backend JWT_SECRET_NEW="$(openssl rand -base64 32)"
```

**Step 2: Deploy dual-key verification**
```javascript
// backend/src/auth.js - verify with old OR new key
function verifyToken(token) {
  const keys = [process.env.SECRET_KEY, process.env.SECRET_KEY_NEW];
  
  for (const key of keys) {
    try {
      return jwt.verify(token, key);
    } catch (e) {
      continue;
    }
  }
  throw new Error('Invalid token');
}
```

**Step 3: Issue new tokens with new key**
```javascript
const accessToken = jwt.sign(payload, process.env.SECRET_KEY_NEW, { expiresIn: '15m' });
```

**Step 4: After grace period (24h), remove old key**
```bash
vault kv patch ethixai/backend JWT_SECRET="$(vault kv get -field=JWT_SECRET_NEW ethixai/backend)"
vault kv delete ethixai/backend JWT_SECRET_NEW
```

### Field Encryption Key Rotation

**Migration script** (run during low-traffic window):
```python
# tools/security/rotate_field_encryption.py
import sys
from pymongo import MongoClient
from field_encryption import FieldEncryption

def rotate_encryption(old_key: str, new_key: str):
    """Re-encrypt all PII fields with new key."""
    client = MongoClient(os.environ['MONGO_URL'])
    db = client.ethixai
    
    old_cipher = FieldEncryption(old_key)
    new_cipher = FieldEncryption(new_key)
    
    users = db.users.find({'email_encrypted': {'$exists': True}})
    
    for user in users:
        try:
            plaintext = old_cipher.decrypt(user['email_encrypted'])
            new_ciphertext = new_cipher.encrypt(plaintext)
            
            db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'email_encrypted': new_ciphertext}}
            )
            print(f"Rotated user {user['_id']}")
        except Exception as e:
            print(f"Failed user {user['_id']}: {e}")

if __name__ == '__main__':
    old_key = sys.argv[1]
    new_key = sys.argv[2]
    rotate_encryption(old_key, new_key)
```

## 4. Removing Secrets from Repo

### Secret Scanning

```bash
# Install gitleaks
brew install gitleaks  # or download binary

# Scan repo history
gitleaks detect --source . --verbose

# Scan for specific patterns
gitleaks detect --source . --config .gitleaks.toml
```

### .gitleaks.toml Configuration

```toml
title = "EthixAI Secret Scan"

[[rules]]
id = "generic-api-key"
description = "Generic API Key"
regex = '''(?i)(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]'''
tags = ["key", "API"]

[[rules]]
id = "jwt-secret"
description = "JWT Secret"
regex = '''(?i)(jwt[_-]?secret|secret[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9+/=]{32,})['"]'''
tags = ["jwt", "secret"]

[[rules]]
id = "private-key"
description = "Private Key"
regex = '''-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----'''
tags = ["key", "private"]

[allowlist]
paths = [
  ".env.example",
  "docs/"
]
```

### History Cleanup (if secrets found)

```bash
# Use BFG Repo-Cleaner
brew install bfg

# Remove passwords.txt from history
bfg --delete-files passwords.txt

# Replace strings
bfg --replace-text secrets.txt  # File with: SECRET_KEY==>***REMOVED***

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (coordinate with team!)
git push --force
```

### Pre-commit Hook for Secret Prevention

```bash
# .git/hooks/pre-commit
#!/bin/bash
gitleaks protect --staged --verbose
if [ $? -ne 0 ]; then
  echo "❌ Secret detected! Commit blocked."
  exit 1
fi
```

## 5. CI/CD Secrets (GitHub Actions)

### Using GitHub Secrets

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure secrets
        env:
          VAULT_TOKEN: ${{ secrets.VAULT_TOKEN }}
          MONGO_PASSWORD: ${{ secrets.MONGO_PASSWORD }}
        run: |
          echo "Secrets loaded from GitHub"
          
      - name: Deploy
        run: ./deploy.sh
```

### OIDC for Cloud Access (Preferred)

```yaml
# No long-lived credentials!
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS via OIDC
    uses: aws-actions/configure-aws-credentials@v2
    with:
      role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
      aws-region: us-east-1
```

## 6. Audit & Access Control

### Vault Audit Logging

```bash
# Enable file audit
vault audit enable file file_path=/vault/logs/audit.log

# Log format: JSON with request_id, operation, path, auth method
```

### Access Policies

```hcl
# policies/backend-policy.hcl
path "ethixai/data/backend" {
  capabilities = ["read"]
}

path "ethixai/data/ai_core" {
  capabilities = ["read"]
}

# Apply policy
vault policy write backend-policy policies/backend-policy.hcl
vault token create -policy=backend-policy
```

## 7. Acceptance Criteria

- [ ] Secrets manager deployed (Vault or cloud equivalent)
- [ ] All secrets moved from .env to secrets manager
- [ ] Repo history scanned with gitleaks (0 findings or cleaned)
- [ ] .env.example exists with placeholders only
- [ ] Rotation schedule documented and calendar reminders set
- [ ] Pre-commit hook prevents secret commits
- [ ] CI uses GitHub Secrets or OIDC (no hardcoded credentials)
- [ ] Vault audit logging enabled
- [ ] At least one key rotation successfully tested

## 8. Testing

```bash
# Test Vault integration
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-only-token

# Store test secret
vault kv put ethixai/test key1=value1

# Retrieve from backend
node -e "
const { getSecret } = require('./backend/src/vault');
getSecret('test').then(s => console.log(s));
"

# Expected: { key1: 'value1' }
```

## References

- HashiCorp Vault: https://www.vaultproject.io/docs
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Gitleaks: https://github.com/gitleaks/gitleaks
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
