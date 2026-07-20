# Monitoring & Prometheus

This document explains the current Prometheus instrumentation in the project and provides quick scrape and Grafana Cloud guidance.

Summary
- The Node backend exposes a `/metrics` endpoint (prom-client). Default port is the backend service PORT (usually 5000).
- The Python `ai_core` service exposes `/metrics` using `prometheus_client` and mounts metrics at `/metrics` (default port 8100).

Prometheus scrape config (local / self-hosted Prometheus)

Example `prometheus.yml` snippet:

```
scrape_configs:
  - job_name: 'backend'
    metrics_path: /metrics
    static_configs:
      - targets: ['backend:5000']

  - job_name: 'ai_core'
    metrics_path: /metrics
    static_configs:
      - targets: ['ai_core:8100']

  # Optional: scrape the status worker if you expose metrics from it
  - job_name: 'status_worker'
    metrics_path: /metrics
    static_configs:
      - targets: ['status_worker:9200']
```

Grafana Cloud / remote_write

If you want to use Grafana Cloud's managed storage (remote_write):
1. Sign up for Grafana Cloud and get the `remote_write` URL and an API key.
2. Add the `remote_write` block to your `prometheus.yml` and configure `basic_auth` with the API key.

Security notes
- Protect your `/metrics` endpoints at the network level in production (VPCs / security groups) or behind auth if they contain sensitive labels.
- When using Grafana Cloud, use the provided push/remote_write credentials and rotate keys when needed.

Next steps / Recommendations
1. Alerting rules: create alerts for service unavailability and high error rate (e.g. `http_requests_total` spike, `http_request_duration_seconds` P95 latency threshold).
2. Alertmanager (or Grafana Cloud alerting) configuration: configure webhooks to the backend incident creation API to automatically open incidents when alerts fire.
3. Long-term storage: consider VictoriaMetrics or Grafana Cloud for retention beyond the default Prometheus retention window.
4. Add application-specific metrics: business KPIs, queue depths, model latency histograms, memory pressure gauges.

Notes about this repo
- The backend instrumentation is in `backend/src/server.js` (prom-client + `/metrics`).
- `ai_core` contains a mounted `/metrics` ASGI app in `ai_core/main.py` (prometheus_client.make_asgi_app()).

If you'd like, I can:
- Add example alerting rules for downtime and latency.
- Add an Alertmanager webhook receiver in the backend that creates incidents automatically.
- Add a tiny exporter in the worker (optional) to expose worker-specific metrics for scraping or Pushgateway usage.
