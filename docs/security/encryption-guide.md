# Encryption & Data Protection Guide

## Overview

This document defines encryption requirements and implementation guidance for EthixAI to protect data in transit, at rest, and during processing.

## 1. TLS Everywhere

### Production Requirements

**External Traffic**
- All public endpoints MUST use HTTPS (TLS 1.2 minimum, TLS 1.3 preferred)
- Certificate acquisition: Let's Encrypt (auto-renewal via certbot)
- HSTS headers enforced: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

**Internal Service-to-Service**
- Backend ↔ AI Core: mTLS with short-lived certificates (24h validity)
- Backend ↔ MongoDB: TLS with certificate validation
- Use service mesh (Istio/Linkerd) or native TLS support

### Configuration

**Backend (Express)**
```javascript
// server.js production mode
if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  const fs = require('fs');
  const options = {
    key: fs.readFileSync(process.env.TLS_KEY_PATH),
    cert: fs.readFileSync(process.env.TLS_CERT_PATH),
    minVersion: 'TLSv1.2',
    ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
  };
  https.createServer(options, app).listen(port);
}
```

**AI Core (FastAPI/Uvicorn)**
```bash
uvicorn main:app --host 0.0.0.0 --port 8100 \
  --ssl-keyfile=/certs/key.pem \
  --ssl-certfile=/certs/cert.pem \
  --ssl-version=3  # TLS 1.2+
```

**MongoDB**
```yaml
# mongod.conf
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /certs/mongodb.pem
    CAFile: /certs/ca.pem
```

### Let's Encrypt Automation

```bash
# Install certbot
apt-get install certbot

# Generate cert
certbot certonly --standalone -d api.ethixai.com

# Auto-renewal cron
0 0 * * * certbot renew --quiet --post-hook "systemctl restart backend"
```

## 2. Data at Rest Encryption

### MongoDB Encryption

**Option A: Managed Database (Recommended)**
- Use MongoDB Atlas with encryption at rest enabled
- Provides automatic key rotation
- FIPS 140-2 validated encryption

**Option B: Self-Hosted**
```yaml
# mongod.conf
security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/keyfile
```

Key generation:
```bash
openssl rand -base64 32 > /etc/mongodb/keyfile
chmod 600 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

### File System Encryption

For SHAP artifacts and model storage:
```bash
# LUKS encrypted volume (Linux)
cryptsetup luksFormat /dev/sdb
cryptsetup luksOpen /dev/sdb ethixai_encrypted
mkfs.ext4 /dev/mapper/ethixai_encrypted
mount /dev/mapper/ethixai_encrypted /var/lib/ethixai
```

### Backup Encryption

```bash
# MongoDB backup with encryption
mongodump --archive | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -pass file:/secrets/backup.key | \
  aws s3 cp - s3://ethixai-backups/$(date +%Y%m%d).enc
```

## 3. Field-Level Encryption

### PII Protection Strategy

**Principle**: Store minimum PII; hash/tokenize identifiers

**Implementation**

```python
# tools/security/field_encryption.py
from cryptography.fernet import Fernet
import os
import base64

class FieldEncryption:
    def __init__(self):
        key = os.environ.get('FIELD_ENCRYPTION_KEY')
        if not key:
            raise ValueError("FIELD_ENCRYPTION_KEY required")
        self.cipher = Fernet(key.encode())
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt sensitive field"""
        if not plaintext:
            return ""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt sensitive field"""
        if not ciphertext:
            return ""
        return self.cipher.decrypt(ciphertext.encode()).decode()

# Usage: encrypt email, name before DB insert
encryptor = FieldEncryption()
user.email_encrypted = encryptor.encrypt(user.email)
user.email = None  # Don't store plaintext
```

**Key Generation**
```python
from cryptography.fernet import Fernet
key = Fernet.generate_key()
print(key.decode())  # Store in secrets manager
```

### PII Minimization Checklist

- [ ] Emails: Store bcrypt hash for uniqueness check; encrypt actual email
- [ ] Names: Encrypt or use display tokens
- [ ] IP Addresses: Hash with salt or truncate last octet
- [ ] User IDs: Use UUIDs instead of sequential integers
- [ ] Model outputs: Anonymize before persistence

## 4. Secure Backup Strategy

### Requirements

1. **Encryption**: AES-256-GCM or equivalent
2. **Access Control**: S3 bucket policy restricts to backup role only
3. **Versioning**: Enable S3 versioning for recovery
4. **Lifecycle**: Transition to Glacier after 30 days, delete after 1 year
5. **Replication**: Cross-region replication for DR

### S3 Bucket Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::ACCOUNT:role/BackupRole"},
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::ethixai-backups/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### Backup & Restore Procedures

**Backup**
```bash
#!/bin/bash
# tools/security/backup.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mongodump --uri=$MONGO_URL --archive | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -pass file:/run/secrets/backup_key | \
  aws s3 cp - s3://ethixai-backups/mongodb_${TIMESTAMP}.enc

echo "Backup completed: mongodb_${TIMESTAMP}.enc"
```

**Restore**
```bash
aws s3 cp s3://ethixai-backups/mongodb_20250115_120000.enc - | \
  openssl enc -aes-256-cbc -d -pbkdf2 -pass file:/run/secrets/backup_key | \
  mongorestore --archive --drop
```

## 5. Acceptance Criteria

- [ ] HTTPS enforced on all public endpoints (HSTS enabled)
- [ ] Internal mTLS configured between services
- [ ] MongoDB encryption at rest enabled and verified
- [ ] Field-level encryption utility implemented for PII
- [ ] Backup encryption tested (backup → restore cycle)
- [ ] S3 bucket policy restricts access to backup role only
- [ ] TLS cert renewal automation configured
- [ ] Encryption keys stored in secrets manager (not in repo)

## 6. Testing & Verification

**TLS Verification**
```bash
# Check TLS version
openssl s_client -connect api.ethixai.com:443 -tls1_2

# Verify certificate
curl -vI https://api.ethixai.com 2>&1 | grep "SSL certificate verify"
```

**MongoDB Encryption Check**
```javascript
// Connect and verify
db.serverStatus().security
// Should show: { "SSLServerSubjectName" : "CN=mongodb" }
```

**Backup Integrity**
```bash
# Verify encrypted backup can be decrypted
aws s3 cp s3://ethixai-backups/test.enc - | \
  openssl enc -aes-256-cbc -d -pbkdf2 -pass file:/run/secrets/backup_key | \
  tar -tzf - | head
```

## 7. Key Rotation Schedule

| Asset | Rotation Frequency | Owner |
|-------|-------------------|-------|
| TLS Certificates | 90 days (Let's Encrypt auto) | DevOps |
| MongoDB Encryption Key | Annually | DBA |
| Field Encryption Key | Quarterly | Security Lead |
| Backup Encryption Key | Semi-annually | DevOps |
| JWT Signing Key | Quarterly or on breach | Backend Team |

## References

- OWASP Transport Layer Protection: https://owasp.org/www-project-web-security-testing-guide/
- MongoDB Encryption: https://docs.mongodb.com/manual/core/security-encryption-at-rest/
- AWS S3 Encryption: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html
