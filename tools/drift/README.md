# Drift Monitoring Utilities

Compute basic drift metrics (PSI and KL) between a baseline dataset and a current dataset.

Usage

```bash
python tools/drift/drift_check.py --baseline baseline.csv --current current.csv --columns feature1,feature2 --output drift.json
```

Notes
- PSI thresholds: <0.1 no drift, 0.1–0.25 moderate, >0.25 significant.
- Use alongside Prometheus/Grafana by exporting JSON artifacts or integrating into a batch job.
- For numeric columns only. Extend as needed for categorical encoding.