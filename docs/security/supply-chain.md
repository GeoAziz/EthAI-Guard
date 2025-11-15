# CI/CD Supply Chain Security

## Overview

Protect the build and release pipeline from tampering, dependency attacks, and malicious code injection.

## 1. Dependency Scanning

### GitHub Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    
  - package-ecosystem: "pip"
    directory: "/ai_core"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Snyk Integration

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk (npm)
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --fail-on=upgradable
      
      - name: Run Snyk (Python)
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### npm audit

```bash
# Run in CI
cd backend && npm audit --audit-level=high
# Fail build on high/critical vulnerabilities
```

## 2. SBOM Generation

```yaml
# .github/workflows/sbom.yml
name: Generate SBOM
on:
  release:
    types: [published]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate SBOM (backend)
        run: |
          cd backend
          npx @cyclonedx/cyclonedx-npm --output-file=sbom.json
      
      - name: Generate SBOM (ai_core)
        run: |
          cd ai_core
          pip install cyclonedx-bom
          cyclonedx-py -o sbom.json
      
      - name: Upload SBOMs
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: |
            backend/sbom.json
            ai_core/sbom.json
```

## 3. Container Security

### Image Scanning

```yaml
# .github/workflows/container-scan.yml
name: Container Scan
on: [push]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: docker build -t ethixai/backend:${{ github.sha }} backend/
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ethixai/backend:${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: 1
```

### Minimal Base Images

```dockerfile
# backend/Dockerfile (secure)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### Image Signing

```bash
# Install Cosign
curl -O -L https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
chmod +x cosign-linux-amd64
mv cosign-linux-amd64 /usr/local/bin/cosign

# Generate key pair
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key ghcr.io/geoaziz/ethixai:v1.0.0

# Verify
cosign verify --key cosign.pub ghcr.io/geoaziz/ethixai:v1.0.0
```

## 4. OIDC for CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS via OIDC
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster ethixai --service backend --force-new-deployment
```

## 5. Secrets Protection

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on:
  pull_request_target:  # Safer for PRs from forks

jobs:
  test:
    runs-on: ubuntu-latest
    environment: testing  # Requires approval for forks
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      
      - name: Run tests
        run: npm test
        env:
          # Only expose non-sensitive vars on PRs
          NODE_ENV: test
          # NO PRODUCTION SECRETS HERE
```

## 6. Signed Commits

```bash
# Generate GPG key
gpg --full-generate-key

# Configure Git
git config --global user.signingkey YOUR_GPG_KEY_ID
git config --global commit.gpgsign true

# Sign commits
git commit -S -m "feat: add security feature"

# Verify
git log --show-signature
```

## 7. Acceptance Criteria

- [ ] Dependabot or Snyk configured and scans weekly
- [ ] High/critical vulnerabilities fail CI
- [ ] SBOM generated for each release
- [ ] Container images scanned (Trivy/Snyk)
- [ ] Base images are minimal (alpine/distroless)
- [ ] Images signed with Cosign
- [ ] CI uses OIDC for cloud access (no long-lived secrets)
- [ ] PR builds don't expose production secrets
- [ ] Signed commits enforced for protected branches

## References

- SLSA Framework: https://slsa.dev
- Sigstore: https://www.sigstore.dev
- OWASP Dependency Check: https://owasp.org/www-project-dependency-check/
