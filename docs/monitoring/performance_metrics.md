# Performance metrics

This document summarizes quick performance observations collected during Day‑8 reliability work.

Summary (local, dev environment)
- ai_core analyze median latency: ~1.5–4s for small demo CSVs (single-threaded model training + SHAP explain). Latency varies with dataset size and model training settings.
- Backend system_api adds ~50–150ms network overhead when forwarding to ai_core locally.
- Memory: ai_core peak RSS observed ~200–400MB for typical small demo datasets (depends on scikit-learn model and SHAP internals).

Recommendations
- For production demos consider pre-building heavy wheels (shap, numpy) in the image or using manylinux wheels to avoid local compilation costs.
- Cache model artifacts for repeated runs of the same dataset to reduce repeated training latency.
- Add a lightweight async worker (Celery/RQ) if you want to keep HTTP responses fast and run long analyses in background.

How to reproduce (quick)
1) Start services via docker compose (from repo root):

```bash
docker compose up --build -d
# wait for services to be healthy, then run demo script
tools/e2e_demo.sh
```

2) Run a simple latency loop against the backend analyze endpoint (replace token and payload as appropriate):

```bash
for i in {1..10}; do curl -sS -X POST "http://localhost:5000/analyze" -H "Authorization: Bearer $TOKEN" -d '{"data": {...}}'; done
```

Record times using `time` or a small wrapper script.

