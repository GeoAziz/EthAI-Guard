# Load Testing (Locust)

This harness uses Locust to generate realistic load against the backend API.

Scenarios
- Health checks (low cost)
- Auth register/login (first run)
- Analyze flow with synthetic payloads

Usage

- Host: set BACKEND_HOST (default http://localhost:5000)
- Install: pip install -r tools/load/requirements.txt
- Headless runs:
  - Baseline: locust -f tools/load/locustfile.py --headless -u 50 -r 10 -t 2m --host $BACKEND_HOST
  - Spike:    locust -f tools/load/locustfile.py --headless -u 300 -r 300 -t 2m --host $BACKEND_HOST
  - Sustained:locust -f tools/load/locustfile.py --headless -u 100 -r 20 -t 10m --host $BACKEND_HOST

Artifacts
- Locust console output shows RPS, latency percentiles, and failures.
- Pair with Prometheus/Grafana for service-side metrics.

Notes
- The test will self-register a unique user per virtual user (email randomization).
- The analyze payload is synthetic and sized randomly to mimic variable load.
