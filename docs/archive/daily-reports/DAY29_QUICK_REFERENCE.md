# EthixAI Day 29 — Quick Reference Card

## 🚀 Service URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:3000 | ✅ Running |
| **Backend API** | http://localhost:5000 | ✅ Running |
| **AI Core** | http://localhost:8100 | ✅ Running |
| **MongoDB** | localhost:27018 | ✅ Running |
| **PostgreSQL** | localhost:5432 | ✅ Running |

## 🧪 Quick Test Commands

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# AI Core health
curl http://localhost:8100/health

# Frontend (returns HTML)
curl http://localhost:3000 | head -20
```

### Full Smoke Test
```bash
cd /mnt/devmandrive/EthAI
./tools/smoke_tests/full_integration.sh
```

### Metrics Validation
```bash
./tools/smoke_tests/validate_metrics.sh
```

### Full Stack Orchestrator
```bash
./tools/smoke_tests/run_full_stack.sh
```

## 📊 Metrics Endpoints

```bash
# Backend metrics
curl http://localhost:5000/metrics

# AI Core metrics (follows redirect)
curl -L http://localhost:8100/metrics
```

## 🐳 Docker Commands

```bash
# View running containers
docker ps

# View logs
docker-compose logs --tail=50 system_api
docker-compose logs --tail=50 ai_core
docker-compose logs --tail=50 frontend

# Restart a service
docker-compose restart system_api

# Rebuild and restart
docker-compose build system_api && docker-compose up -d system_api

# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 🔍 Common Issues

### Port Conflicts
- **MongoDB**: Changed to 27018 (if 27017 in use)
- **Prometheus**: Excluded from compose (if 9090 in use)

### Solution
```bash
# Check what's using a port
sudo lsof -i :9090

# Remap Prometheus in docker-compose.yml
ports:
  - "9091:9090"  # Use 9091 on host
```

### Service Not Starting
```bash
# Check logs
docker-compose logs [service_name]

# Rebuild
docker-compose build [service_name]

# Force recreate
docker-compose up -d --force-recreate [service_name]
```

## ✅ Day 29 Checklist

- [x] Docker Compose verified
- [x] All images built successfully
- [x] Services running and healthy
- [x] Smoke tests passing
- [x] Metrics endpoints functional
- [x] Cross-service communication working
- [x] Documentation updated
- [ ] Manual UI validation (FairLens, ExplainBoard, Compliance)

## 📝 Test Results Summary

**Smoke Test**: ✅ PASSED (10 checks, 3 warnings)  
**Metrics Validation**: ✅ PASSED (8 checks, 1 warning)  
**Service Health**: ✅ ALL OPERATIONAL (5/5 services)

## 🎯 Demo Readiness

1. ✅ Infrastructure operational
2. ✅ Automated tests passing
3. ✅ Observability validated
4. ⏳ Manual UI validation pending
5. ⏳ Demo rehearsal pending

## 📚 Key Documentation

- **DAY29_COMPLETION.md** — Detailed completion report with runbook
- **DAY29_FINAL_SUMMARY.md** — Executive summary and next steps
- **README.md** — Updated with Day 29 integration instructions
- **tools/smoke_tests/** — All smoke test scripts

---

**Status**: ✅ Day 29 Complete — Demo Ready  
**Date**: November 19, 2025  
**Version**: EthixAI v0.1.0
