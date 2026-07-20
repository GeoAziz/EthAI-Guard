# Day 10 — Load Testing, Stress Testing, Scaling, and SLO/SLA

This package contains the reliability engineering plan to make EthAI production-ready. No code here — only strategy, what to do, how, and why.

Contents
- load-testing-strategy.md — Load testing scenarios, goals, SLIs, and execution guidance
- stress-chaos-testing.md — Stress tests (break the system) and chaos experiments (resiliency)
- slo-sla-sli.md — Service indicators, objectives, and client-facing SLAs
- scaling-blueprint.md — Horizontal/vertical scaling and queue-based roadmap
- model-drift-monitoring.md — Drift metrics, thresholds, and data hooks
- grafana-dashboards.md — Dashboard layout and PromQL examples
- checklist.md — End-of-day checklist with PR instructions

How to use
1) Read load-testing-strategy.md and schedule tests on a non-prod environment
2) Run chaos tests during low-traffic windows, capture metrics
3) Fill in SLI/SLO spreadsheet from measured data
4) Align infra team on scaling blueprint and sizing
5) Review dashboards with stakeholders and iterate

Tools (codebase additions)
- tools/load/ — Locust harness for baseline/spike/sustained loads (make load-*)
- tools/chaos/ — Day 10 chaos suite (make chaos-suite)
- tools/drift/ — PSI/KL utilities and CLI (drift_check.py)
- grafana/dashboards/day10.json — Import into Grafana and bind to Prometheus
- ai_core/main.py — Added lightweight Prometheus middleware for request metrics
