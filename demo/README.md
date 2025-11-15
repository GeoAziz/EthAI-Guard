# EthAI-Guard End-to-End Demo

This directory contains the automated demo script that showcases the full capabilities of the EthAI-Guard system.

## Quick Start

```bash
# Make the demo script executable
chmod +x demo/run_demo.sh

# Run the demo
./demo/run_demo.sh
```

The script will:
1. ✅ Start all Docker Compose services (backend, frontend, AI Core, MongoDB)
2. ✅ Wait for services to become healthy
3. ✅ Register a demo user account
4. ✅ Perform user login (with device tracking)
5. ✅ List active device sessions
6. ✅ Run a fairness analysis on sample data
7. ✅ Retrieve and display the analysis report
8. ✅ Provide access URLs for manual exploration

## System Requirements

- **Docker & Docker Compose**: For running services
- **curl**: For HTTP requests
- **jq**: For JSON parsing
- **bash**: Shell environment

### Verify Prerequisites

```bash
# Check Docker
docker --version
docker compose version

# Check utilities
which curl jq bash
```

## Environment Configuration

The demo script respects these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:5000` | Backend API endpoint |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend application URL |

### Custom Configuration Example

```bash
BACKEND_URL=http://127.0.0.1:5000 FRONTEND_URL=http://127.0.0.1:3000 ./demo/run_demo.sh
```

## What the Demo Shows

### 1. **User Registration & Authentication**
- User management via JWT access tokens and refresh tokens
- Device tracking for multi-device sessions
- Secure password hashing (bcryptjs)

### 2. **Token Rotation & Device Management**
- View active devices for the current user
- Automatic token rotation during refresh
- Revoke specific devices/sessions

### 3. **Fairness Analysis**
- Binary classification model analysis
- Sensitive attribute evaluation (e.g., demographic group)
- Fairness metrics computation via AI Core

### 4. **Report Generation & Retrieval**
- Store analysis results in MongoDB
- Retrieve results with full metrics and visualizations
- Access historical reports

### 5. **Monitoring & Observability**
- Prometheus metrics endpoint
- Structured JSON logging
- Request tracing via correlation IDs

## After the Demo Completes

Once the demo script finishes, you have a few options:

### Option 1: Manual Exploration
Services remain running. Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs** (if Swagger enabled): http://localhost:5000/api-docs
- **Metrics**: http://localhost:5000/metrics

### Option 2: Run Additional Tests

```bash
# Run all test suites
make test

# Run just backend tests
cd backend && npm test

# Run just AI Core tests
cd ai_core && python -m pytest tests/ -v
```

### Option 3: Inspect Logs

```bash
# View service logs
docker compose logs -f

# View backend logs
docker compose logs backend

# View AI Core logs
docker compose logs ai_core
```

### Option 4: Stop Services

```bash
# Stop all services
docker compose down

# Stop and clean up volumes
docker compose down -v
```

## Using the Makefile

The Makefile provides convenient shortcuts:

```bash
# Install dependencies
make install

# Run all tests
make test

# Start services
make up

# View logs
make logs

# Stop services
make down

# Full cleanup
make clean
```

## Troubleshooting

### Issue: Services fail to start
**Solution**: Check Docker is running
```bash
docker ps
docker compose logs
```

### Issue: Backend not responding
**Solution**: Wait longer or check health endpoint
```bash
curl http://localhost:5000/health
```

### Issue: Analysis request fails
**Solution**: Verify MongoDB is running
```bash
docker compose logs mongo
```

### Issue: Token validation fails
**Solution**: Ensure JWT_SECRET is set in backend
```bash
docker compose logs backend | grep -i secret
```

## Demo Data

The demo uses synthetic data for fairness analysis:
- **Features**: 2 numerical features
- **Labels**: Binary classification (0/1)
- **Sensitive Attributes**: 2 demographic groups

This is sufficient to demonstrate the system's fairness evaluation capabilities.

## Performance Notes

- **First run**: ~30-60 seconds (Docker build + startup)
- **Subsequent runs**: ~15-30 seconds (services cached)
- **Analysis computation**: 2-5 seconds (depends on AI Core processing)

## Advanced: Custom Analysis

After the demo completes, you can run your own analysis:

```bash
# Get your access token from the demo output
TOKEN="your_token_here"

# Run a custom analysis
curl -X POST http://localhost:5000/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "x": [[1,2], [3,4], [5,6]],
      "y": [0, 1, 0],
      "sensitive_attributes": [0, 1, 0]
    },
    "parameters": {
      "model_type": "logistic_regression"
    }
  }'
```

## Documentation

- **Architecture**: See `docs/ARCHITECTURE.md`
- **API Endpoints**: See `docs/backend-refresh-tokens.md`
- **Observability**: See `docs/observability.md`
- **Contributing**: See `CONTRIBUTING.md`

## Support

For issues or questions about the demo:
1. Check `troubleshooting` section above
2. Review `docker compose logs`
3. Inspect application logs in `/tmp/chaos_logs.txt` (if chaos test was run)
4. Open an issue in the repository

---

**Happy demoing! 🚀**
