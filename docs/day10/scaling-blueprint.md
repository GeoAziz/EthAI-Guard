# Scaling Blueprint (Day 10)

Goal: Define scalable deployment patterns for backend, ai_core, and MongoDB.

1) Horizontal scaling
- Backend: 2–5 replicas behind a load balancer (sticky not required)
- ai_core: 2–10 replicas (CPU-bound); ensure model load-on-start
- MongoDB: replica set (3-node recommended) for HA
- Routing
  - /analyze → ai_core service
  - /reports and auth → backend service

2) Vertical scaling
- ai_core: 2–4 vCPU and 4–8 GB RAM for SHAP-heavy loads
  - Enable multi-threaded TreeExplainer if available
- backend: increase Node.js heap to ~2 GB if memory pressure
  - Monitor event-loop delay; scale out before saturating

3) Queue-based architecture (future evolution)
- Add queue (Redis/RabbitMQ) to decouple request ingress from model execution
- Flow: backend → queue → ai_core workers → MongoDB
- Benefits: smoother spikes, easier autoscaling, backpressure
- Consider idempotency keys for report creation

4) Autoscaling signals
- CPU > 70% for 5 minutes → scale out
- P95 latency > 1.5s → scale out
- Queue depth (if present) > threshold → scale workers

5) Capacity planning
- Start at 2 replicas each (backend/ai_core); run load tests; increase gradually
- Keep headroom ~30% during peaks
- Use canaries when deploying model changes

6) Deployment targets
- Docker Compose (local/demo), Kubernetes (staging/prod) as next step
- Add HPA (CPU + latency custom metric) for ai_core
