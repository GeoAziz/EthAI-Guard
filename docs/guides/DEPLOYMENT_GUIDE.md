# 🚀 EthixAI Deployment Guide

## Overview

This guide covers deploying EthixAI to production environments including Docker, Kubernetes, and cloud platforms (AWS, GCP, Azure).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platform Deployment](#cloud-platform-deployment)
6. [Database Setup](#database-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security Hardening](#security-hardening)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Docker**: 20.10+ and Docker Compose 2.0+
- **Node.js**: 20.x LTS
- **Python**: 3.11+
- **MongoDB**: 6.0+
- **PostgreSQL**: 15+

### Required Resources (Minimum)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 100 Mbps

### Required Resources (Recommended for Production)
- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 200GB SSD
- **Network**: 1 Gbps

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/GeoAziz/EthAI-Guard.git
cd EthAI-Guard
```

### 2. Configure Environment Variables

```bash
# Copy production template
cp .env.production.template .env.production

# Edit with production values
nano .env.production
```

**Critical Variables to Set:**
- `JWT_SECRET` - Strong random string (32+ characters)
- `JWT_REFRESH_SECRET` - Different strong random string
- `MONGODB_URI` - Production MongoDB connection string
- `POSTGRES_*` - PostgreSQL credentials
- `CORS_ORIGIN` - Your production domain(s)

### 3. Generate Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For SESSION_SECRET
```

---

## Docker Deployment

### Option A: Docker Compose (Simple Deployment)

#### 1. Build Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Tag images for registry
docker tag ethixai-frontend:latest your-registry.com/ethixai-frontend:v1.0.0
docker tag ethixai-backend:latest your-registry.com/ethixai-backend:v1.0.0
docker tag ethixai-ai-core:latest your-registry.com/ethixai-ai-core:v1.0.0
```

#### 2. Push to Registry

```bash
# Login to registry
docker login your-registry.com

# Push images
docker push your-registry.com/ethixai-frontend:v1.0.0
docker push your-registry.com/ethixai-backend:v1.0.0
docker push your-registry.com/ethixai-ai-core:v1.0.0
```

#### 3. Deploy

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

#### 4. Health Check

```bash
# Check backend health
curl http://localhost:5000/health

# Check AI core health
curl http://localhost:8100/health

# Check frontend
curl http://localhost:3000

# Check Prometheus metrics
curl http://localhost:5000/metrics
```

### Option B: Standalone Docker Containers

#### 1. Create Docker Network

```bash
docker network create ethixai-network
```

#### 2. Start Databases

```bash
# MongoDB
docker run -d \
  --name ethixai-mongo \
  --network ethixai-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your-password \
  -v ethixai-mongo-data:/data/db \
  mongo:6.0

# PostgreSQL
docker run -d \
  --name ethixai-postgres \
  --network ethixai-network \
  -p 5432:5432 \
  -e POSTGRES_USER=ethixai_user \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=ethixai \
  -v ethixai-postgres-data:/var/lib/postgresql/data \
  postgres:15
```

#### 3. Start Application Services

```bash
# AI Core
docker run -d \
  --name ethixai-ai-core \
  --network ethixai-network \
  -p 8100:8100 \
  -e MONGODB_URI=mongodb://admin:your-password@ethixai-mongo:27017 \
  your-registry.com/ethixai-ai-core:v1.0.0

# Backend
docker run -d \
  --name ethixai-backend \
  --network ethixai-network \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://admin:your-password@ethixai-mongo:27017 \
  -e AI_CORE_URL=http://ethixai-ai-core:8100 \
  -e JWT_SECRET=your-jwt-secret \
  your-registry.com/ethixai-backend:v1.0.0

# Frontend
docker run -d \
  --name ethixai-frontend \
  --network ethixai-network \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://ethixai-backend:5000 \
  your-registry.com/ethixai-frontend:v1.0.0
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace ethixai-production
```

### 2. Create Secrets

```bash
# Create secret for environment variables
kubectl create secret generic ethixai-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=mongodb-password=your-password \
  --from-literal=postgres-password=your-password \
  --namespace=ethixai-production
```

### 3. Apply Kubernetes Manifests

```bash
# Deploy databases
kubectl apply -f k8s/mongodb-deployment.yaml -n ethixai-production
kubectl apply -f k8s/postgres-deployment.yaml -n ethixai-production

# Deploy application services
kubectl apply -f k8s/ai-core-deployment.yaml -n ethixai-production
kubectl apply -f k8s/backend-deployment.yaml -n ethixai-production
kubectl apply -f k8s/frontend-deployment.yaml -n ethixai-production

# Deploy monitoring
kubectl apply -f k8s/prometheus-deployment.yaml -n ethixai-production
kubectl apply -f k8s/grafana-deployment.yaml -n ethixai-production

# Deploy ingress
kubectl apply -f k8s/ingress.yaml -n ethixai-production
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n ethixai-production

# Check services
kubectl get svc -n ethixai-production

# Check logs
kubectl logs -f deployment/ethixai-backend -n ethixai-production
```

---

## Cloud Platform Deployment

### AWS Deployment

#### Using AWS ECS (Elastic Container Service)

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create ECS cluster
aws ecs create-cluster --cluster-name ethixai-production

# Register task definitions
aws ecs register-task-definition --cli-input-json file://aws/backend-task-definition.json
aws ecs register-task-definition --cli-input-json file://aws/ai-core-task-definition.json
aws ecs register-task-definition --cli-input-json file://aws/frontend-task-definition.json

# Create services
aws ecs create-service \
  --cluster ethixai-production \
  --service-name ethixai-backend \
  --task-definition ethixai-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### GCP Deployment (Cloud Run)

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and push images
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ethixai-backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ethixai-ai-core
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ethixai-frontend

# Deploy to Cloud Run
gcloud run deploy ethixai-backend \
  --image gcr.io/YOUR_PROJECT_ID/ethixai-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,MONGODB_URI=your-uri"
```

### Azure Deployment (Azure Container Instances)

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Create resource group
az group create --name ethixai-production --location eastus

# Create container instances
az container create \
  --resource-group ethixai-production \
  --name ethixai-backend \
  --image your-registry.com/ethixai-backend:v1.0.0 \
  --dns-name-label ethixai-backend \
  --ports 5000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables JWT_SECRET=xxx MONGODB_URI=xxx
```

---

## Database Setup

### MongoDB Production Configuration

#### 1. Create Indexes

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/ethixai" --username admin

# Run index creation
use ethixai
load('backend/src/db/indexes.js')
```

#### 2. Enable Authentication

```bash
# Create admin user
db.createUser({
  user: "admin",
  pwd: "strong-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create application user
db.createUser({
  user: "ethixai_app",
  pwd: "strong-password",
  roles: [{ role: "readWrite", db: "ethixai" }]
})
```

#### 3. Configure Replica Set (for production)

```bash
# Initialize replica set
rs.initiate({
  _id: "ethixai-rs",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})
```

### PostgreSQL Production Configuration

```sql
-- Create database
CREATE DATABASE ethixai;

-- Create user
CREATE USER ethixai_app WITH ENCRYPTED PASSWORD 'strong-password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ethixai TO ethixai_app;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configure connection pooling (in postgresql.conf)
-- max_connections = 200
-- shared_buffers = 4GB
-- effective_cache_size = 12GB
```

---

## Monitoring & Observability

### 1. Prometheus Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ethixai-backend'
    static_configs:
      - targets: ['backend:5000']
  
  - job_name: 'ethixai-ai-core'
    static_configs:
      - targets: ['ai-core:8100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'prometheus/alerts.yml'
```

### 2. Grafana Setup

```bash
# Start Grafana
docker run -d \
  --name=grafana \
  -p 3001:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana

# Access Grafana at http://localhost:3001
# Default credentials: admin/admin
```

### 3. Import Dashboards

1. Login to Grafana
2. Go to Dashboards → Import
3. Upload JSON files from `grafana/dashboards/`

---

## Security Hardening

### 1. Enable HTTPS

```bash
# Using Let's Encrypt with Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 2. Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. Enable Security Headers

Already configured in `backend/src/middleware/security.js`:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### 4. Rate Limiting

Already configured:
- General: 100 requests per 60 seconds
- Auth endpoints: 5 requests per 15 minutes
- Strict endpoints: 5 requests per 60 seconds

---

## Backup & Disaster Recovery

### 1. MongoDB Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://admin:password@localhost:27017/ethixai" \
  --out=/backups/mongo_${DATE}

# Compress backup
tar -czf /backups/mongo_${DATE}.tar.gz /backups/mongo_${DATE}
rm -rf /backups/mongo_${DATE}

# Upload to S3
aws s3 cp /backups/mongo_${DATE}.tar.gz s3://ethixai-backups/mongo/

# Keep only last 30 days
find /backups -name "mongo_*.tar.gz" -mtime +30 -delete
```

### 2. PostgreSQL Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U ethixai_app ethixai > /backups/postgres_${DATE}.sql

# Compress backup
gzip /backups/postgres_${DATE}.sql

# Upload to S3
aws s3 cp /backups/postgres_${DATE}.sql.gz s3://ethixai-backups/postgres/

# Keep only last 30 days
find /backups -name "postgres_*.sql.gz" -mtime +30 -delete
```

### 3. Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 4 hours  
**RPO (Recovery Point Objective)**: 24 hours

#### Recovery Steps:

1. **Restore from Backup**
   ```bash
   # Restore MongoDB
   mongorestore --uri="mongodb://admin:password@localhost:27017" \
     --archive=/backups/mongo_latest.tar.gz --gzip
   
   # Restore PostgreSQL
   gunzip -c /backups/postgres_latest.sql.gz | psql -U ethixai_app ethixai
   ```

2. **Rebuild Containers**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify Services**
   ```bash
   ./tools/e2e/run_e2e_tests.py
   ```

---

## Troubleshooting

### Common Issues

#### 1. Backend Won't Start

```bash
# Check logs
docker logs ethixai-backend

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Port already in use

# Solution: Verify .env and database connectivity
curl http://localhost:27017  # MongoDB
curl http://localhost:5432  # PostgreSQL
```

#### 2. AI Core Timeout

```bash
# Check AI core logs
docker logs ethixai-ai-core

# Increase timeout in backend .env
AI_CORE_TIMEOUT=180000  # 3 minutes

# Check AI core health
curl http://localhost:8100/health
```

#### 3. High Memory Usage

```bash
# Check container stats
docker stats

# Increase container limits in docker-compose.yml
services:
  backend:
    mem_limit: 2g
    mem_reservation: 1g
```

#### 4. Database Connection Pool Exhausted

```bash
# Increase pool size in .env
MONGODB_MAX_POOL_SIZE=100

# Monitor connections
mongosh --eval "db.serverStatus().connections"
```

### Performance Optimization

#### 1. Enable Caching

Already configured in `backend/src/middleware/cache.js`:
- Default TTL: 5 minutes
- Automatic cache invalidation
- Pattern-based cache clearing

#### 2. Database Indexes

Already configured with 7 optimized indexes:
- Reports: `user_id + created_at` compound index
- Analysis: Unique `analysis_id` index
- TTL indexes for automatic cleanup

#### 3. Connection Pooling

Already configured:
- MongoDB: 50 max connections
- PostgreSQL: pgBouncer recommended for production

---

## Health Checks

### Automated Monitoring

```bash
# Run health check script
#!/bin/bash

# Backend health
if curl -sf http://localhost:5000/health > /dev/null; then
  echo "✅ Backend: Healthy"
else
  echo "❌ Backend: Down"
fi

# AI Core health
if curl -sf http://localhost:8100/health > /dev/null; then
  echo "✅ AI Core: Healthy"
else
  echo "❌ AI Core: Down"
fi

# MongoDB health
if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  echo "✅ MongoDB: Healthy"
else
  echo "❌ MongoDB: Down"
fi

# PostgreSQL health
if pg_isready -h localhost -p 5432; then
  echo "✅ PostgreSQL: Healthy"
else
  echo "❌ PostgreSQL: Down"
fi
```

---

## Next Steps

1. **Test Deployment**: Run E2E tests on production environment
2. **Load Testing**: Use Artillery to validate performance
3. **Security Audit**: Run penetration tests
4. **Monitor Metrics**: Set up Grafana dashboards
5. **Documentation**: Update with actual production URLs

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/GeoAziz/EthAI-Guard/issues
- **Documentation**: https://github.com/GeoAziz/EthAI-Guard/docs
- **Email**: support@ethixai.com (replace with actual)

---

**Last Updated**: January 18, 2025  
**Version**: 1.0.0  
**Status**: Production-Ready ✅
