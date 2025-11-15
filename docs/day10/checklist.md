# Day 10 Checklist & PR Plan

Before running tests
- [ ] Non-production environment prepared
- [ ] Metrics retention temporarily increased
- [ ] Test data and credentials ready

Load tests
- [ ] Baseline (1–5 rps, 10m) executed, metrics captured
- [ ] Moderate (20–40 rps, 15m) executed, metrics captured
- [ ] Spike (50–100 rps, 5m) executed, metrics captured
- [ ] Sustained (10 rps, 60m) executed, memory tracked

Stress tests
- [ ] 1000 /analyze in 30s executed
- [ ] Model reload during heavy traffic executed
- [ ] MongoDB restart mid-operation executed
- [ ] Network delay injection (ai_core) executed
- [ ] Backend restart loop executed
- [ ] Invalid login burst executed

Chaos experiments
- [ ] Terminate ai_core mid-analysis
- [ ] Kill MongoDB / drop connections
- [ ] Drop packets between backend ↔ ai_core
- [ ] Random container restarts

SLO/SLA/SLI
- [ ] SLIs measured and recorded
- [ ] SLO targets reviewed with stakeholders
- [ ] SLA draft (v1) prepared for later publication

Scaling
- [ ] Replica counts agreed for baseline
- [ ] Autoscaling signals defined (CPU, latency, queue depth)
- [ ] Queue-based roadmap accepted (if applicable)

Model drift
- [ ] Weekly drift computation plan agreed
- [ ] Thresholds approved (0.15 warn / 0.25 retrain)

Dashboards
- [ ] Dashboard specs reviewed
- [ ] PromQL verified against current metrics

PR Workflow
```bash
git add docs/day10/
git commit -m "Day 10: Load testing, stress/chaos plans, SLO/SLA, scaling, drift, dashboards"
git push origin feature/day10-reliability
# Open PR and merge into main after approval
```
