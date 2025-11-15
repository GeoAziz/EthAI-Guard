# Grafana Dashboards Spec (Day 10)

Dashboard 1 — API Health
- Panels
  - Request rate: rate(http_requests_total[5m]) by route
  - Error rate %: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100
  - Latency P50/P90/P95/P99: histogram_quantile() on http_request_duration_seconds_bucket
  - Uptime (synthetic): probe_success or % 200/OK responses

Dashboard 2 — ai_core Model Analytics
- Panels
  - Analysis duration P50/P95/P99: histogram_quantile() on ai_core_analysis_seconds_bucket
  - SHAP cache hit/miss: ai_core_shap_cache_hits_total vs misses_total
  - Error counters: rate(starlette_requests_total{status=~"5.."}[5m])
  - Request breakdown by path

Dashboard 3 — Security
- Panels
  - Login failures: rate(http_requests_total{route="/auth/login",status="401"}[5m])
  - Rate limiting: rate(http_requests_total{status="429"}[5m])
  - Refresh failures: rate(http_requests_total{route="/auth/refresh",status=~"4..|5.."}[5m])
  - Suspicious IP volume (if labeled)

Dashboard 4 — Fairness
- Panels
  - Weekly fairness drift metrics (DP/EO/DI/FPR)
  - Sensitive attribute distribution over time
  - Analysis volume by cohort

Annotations & links
- Add annotations for deploys and model version changes
- Link to logs (Loki/ELK): filter by request_id or analysis_id

Export/Import
- Store dashboards as JSON in repo (future)
- Parameterize datasource names for portability
