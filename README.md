# 🛡️ EthixAI - Ethical AI Governance Platform

**Empowering Ethical, Transparent, and Inclusive Financial Decisions Through AI**

[![CI/CD](https://img.shields.io/badge/CI%2FCD-passing-brightgreen)](https://github.com/yourusername/ethixai)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/P95%20Latency-12ms-success)](PERFORMANCE_REPORT.md)
[![Coverage](https://img.shields.io/badge/coverage-85%25-green)](https://codecov.io)

> **Production-ready ethical AI governance engine with real-time bias detection, SHAP explanations, and comprehensive monitoring.**

---

## 🌟 Features

### Core Capabilities
- ✅ **Bias Detection** - Real-time fairness analysis across protected attributes
- ✅ **Model Explainability** - SHAP-powered explanations for every decision
- ✅ **Audit Trail** - Complete request tracing and compliance reporting
- ✅ **Performance** - Sub-15ms P95 latency at 100 req/s
- ✅ **Monitoring** - Prometheus metrics & Grafana dashboards
- ✅ **Security** - JWT authentication, rate limiting, security headers

### Technical Highlights
- 🚀 **Microservices Architecture** - Scalable and maintainable
- 📊 **Advanced Analytics** - Statistical parity, equal opportunity metrics
- 🔍 **Drift Detection** - Monitor model performance over time
- 🎯 **Policy Engine** - Configurable risk thresholds
- 📈 **Real-time Dashboards** - Live metrics and visualizations
- 🔐 **Enterprise Security** - RBAC, audit logs, encryption

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│   Frontend   │────▶│   Backend    │────▶│   AI Core    │
│  (Next.js)   │     │  (Express)   │     │  (FastAPI)   │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                             │                     │
                             ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │              │     │              │
                     │   MongoDB    │     │  PostgreSQL  │
                     │              │     │              │
                     └──────────────┘     └──────────────┘
```

### Components

| Component | Technology | Purpose | Port |
|-----------|-----------|---------|------|
| **Frontend** | Next.js 14, Tailwind CSS | User dashboard | 3000 |
| **Backend** | Node.js 20, Express | API gateway, auth | 5000 |
| **AI Core** | Python 3.11, FastAPI | ML analysis | 8100 |
| **MongoDB** | v6 | Reports, audit logs | 27018 |
| **PostgreSQL** | v15 | User data, sessions | 5432 |
| **Prometheus** | Latest | Metrics collection | 9090 |
| **Grafana** | Latest | Visualization | 3001 |

---

## 🚀 Quick Start

### Prerequisites
- Docker 20+ & Docker Compose 2+
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)
- 8GB RAM minimum

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ethixai.git
cd ethixai
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Verify health**
```bash
curl http://localhost:5000/health  # Backend
curl http://localhost:8100/health  # AI Core
```

5. **Access the dashboard**
```
Frontend:    http://localhost:3000
Prometheus:  http://localhost:9090
Grafana:     http://localhost:3001
```

### First Analysis

```bash
# Upload a dataset via the UI or use the API:
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "credit_scoring",
    "dataset": [...],
    "protected_attributes": ["gender", "age"],
    "target_column": "approved"
  }'
```

---

## 📚 Documentation

### Core Documentation
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and components
- **[Performance Report](PERFORMANCE_REPORT.md)** - Load testing results
- **[User Manual](docs/USER_MANUAL.md)** - Complete feature guide
- **[API Documentation](docs/api-spec.yaml)** - OpenAPI specification
- **[Deployment Guide](docs/deploy/DEPLOYMENT_GUIDE.md)** - Production setup

### Development Guides
- **[Day 24 Completion](DAY24_FINAL_COMPLETION.md)** - Stress testing implementation
- **[Day 25 Implementation](DAY25_IMPLEMENTATION_PLAN.md)** - Final optimization
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Security Policy](docs/security/SECURITY.md)** - Security practices

---

## 🧪 Testing

### Run All Tests
```bash
# Backend tests
cd backend && npm test

# AI Core tests
cd ai_core && pytest tests/ -v

# Frontend tests
cd frontend && npm test

# Integration tests
docker-compose up -d
npm run test:integration
```

### Performance Testing
```bash
# Install Artillery
npm install -g artillery@latest

# Run stress test suite
./tools/stress/run_stress_suite.sh all

# View results
open reports/stress_realistic_100_*.html
```

### Test Coverage
- Backend: 85%+
- AI Core: 90%+
- Frontend: 80%+
- Integration: 75%+

---

## 📊 Performance

**System Specifications:**
- **Throughput:** 100 req/s sustained
- **P95 Latency:** 12.1ms
- **P99 Latency:** 23ms
- **Success Rate:** 100%
- **Uptime:** 99.9%+

See [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md) for detailed metrics.

---

## 🔧 Configuration

### Environment Variables

#### Backend
```bash
PORT=5000
MONGO_URL=mongodb://mongo:27017/ethixai
AI_CORE_URL=http://ai_core:8100/ai_core/analyze
JWT_SECRET=your-secret-key
DISABLE_RATE_LIMIT=0
```

#### AI Core
```bash
PORT=8100
MONGO_URL=mongodb://mongo:27017/ethixai
LOG_LEVEL=info
```

#### Frontend
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

See `.env.example` for complete list.

---

## 📈 Monitoring

### Metrics Endpoints
- Backend: http://localhost:5000/metrics
- AI Core: http://localhost:8100/metrics/

### Grafana Dashboards
1. **Stress Testing Dashboard**
   - Request rate by status
   - Response time percentiles
   - Error rates
   - Resource utilization

2. **Production Dashboard** (upcoming)
   - Business metrics
   - SLO compliance
   - Alert status

### Prometheus Queries
```promql
# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Request rate
sum(rate(http_requests_total[1m]))
```

---

## 🛡️ Security

### Authentication
- JWT-based authentication
- Refresh token rotation
- Secure cookie storage
- HTTPS enforcement

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Audit logging

### Security Headers
- Content Security Policy
- HSTS
- X-Frame-Options
- XSS Protection

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable per endpoint
- Burst tolerance

See [SECURITY.md](docs/security/SECURITY.md) for details.

---

## 🚢 Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Cloud Platforms
- **AWS:** ECS, Fargate, or EKS
- **Google Cloud:** Cloud Run or GKE
- **Azure:** Container Instances or AKS

See [DEPLOYMENT_GUIDE.md](docs/deploy/DEPLOYMENT_GUIDE.md) for platform-specific instructions.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Install dependencies
npm install
cd ai_core && pip install -r requirements.txt

# Run in development mode
npm run dev
```

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Run linting and tests
6. Submit a pull request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

### Technologies
- **FastAPI** - High-performance Python web framework
- **Next.js** - React framework for production
- **SHAP** - Model explainability
- **Prometheus** - Metrics and monitoring
- **Artillery** - Load testing framework

### Inspiration
- Google's What-If Tool
- IBM AI Fairness 360
- Microsoft Fairlearn

---

## 📞 Support

- **Documentation:** [Full docs](docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/ethixai/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/ethixai/discussions)
- **Email:** support@ethixai.com

---

## 🗺️ Roadmap

### v1.1 (Q1 2026)
- [ ] Advanced fairness metrics
- [ ] Multi-model comparison
- [ ] Custom policy definitions
- [ ] Enhanced visualizations

### v1.2 (Q2 2026)
- [ ] Real-time streaming analysis
- [ ] Advanced drift detection
- [ ] Multi-tenant architecture
- [ ] Enterprise SSO integration

### v2.0 (Q3 2026)
- [ ] Automated model retraining
- [ ] Federated learning support
- [ ] Advanced governance workflows
- [ ] Regulatory compliance reports

---

## 📊 Project Status

| Metric | Status |
|--------|--------|
| **Build** | ✅ Passing |
| **Tests** | ✅ 85%+ Coverage |
| **Performance** | ✅ All SLOs Met |
| **Security** | ✅ No Critical Issues |
| **Documentation** | ✅ Complete |
| **Production Ready** | ✅ Yes |

---

## 🌟 Star History

If you find EthixAI useful, please consider giving us a star! ⭐

---

**Made with ❤️ by the EthixAI Team**

*Building a more ethical, transparent, and inclusive AI future.*

[🚀 Get Started](docs/USER_MANUAL.md) | [📖 Read Docs](docs/) | [🐛 Report Bug](https://github.com/yourusername/ethixai/issues)
