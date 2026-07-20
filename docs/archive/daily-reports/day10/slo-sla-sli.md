# SLI / SLO / SLA (Day 10)

Definitions
- SLI (Service Level Indicator): What we measure
- SLO (Service Level Objective): What we target internally
- SLA (Service Level Agreement): What we promise externally (post-SLO maturity)

SLIs (measurements)
- API latency (overall by route): histogram percentiles (P50/P90/P95/P99)
- ai_core analysis latency: histogram percentiles
- Error rate: % requests with 4xx and 5xx
- Uptime/availability: time service is healthy and responding
- Queue wait time (optional in future queue-based architecture)
- Login success rate: ratio of successful logins
- Model availability: ability to load and score

SLOs (initial targets)
- Performance
  - P95 API latency < 1.0s
  - P99 API latency < 2.5s
  - ai_core explain P95 < 800ms
  - Error rate < 0.5%
- Reliability
  - Uptime 99.5% (v1 target); 99.9% (v2 stretch)
- Availability
  - Token refresh success 99.99%
  - Report retrieval success 99.5%

SLA (suggested v1; publish after 4–6 weeks of data)
- Incident response within 1 hour
- Issue resolution within 48 hours
- Guaranteed uptime: 99.5%
- Data retention: 30 days (operational)
- Logs retention: 14 days
- Model history retention: 12 months

Measurement methods
- Prometheus metrics from backend and ai_core
- Synthetic probes for /health and critical endpoints
- Outage minutes tracked per service
- Exported dashboards with percentile panels

Compliance notes
- Use JSON-structured logs with request_id and analysis_id for audits
- Avoid logging PII; redact fields in logs
- Keep a post-incident report template (who/what/when/why/next)
