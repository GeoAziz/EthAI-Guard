# Profiling Guide (Day 14)

## Backend (Node.js)
### CPU Flamegraph (0x)
```
npm install -g 0x
0x -- node src/server.js
# Run load; after capture, see flamegraph in ./flamegraph.html
```
### Inspector / Heap Snapshot
```
node --inspect=0.0.0.0:9229 src/server.js
# Use Chrome DevTools > Memory > Heap Snapshot
```
### Node Clinic (optional)
```
npm install -g clinic
clinic doctor -- node src/server.js
```

## ai_core (Python)
### py-spy (sampling profiler)
```
pip install py-spy
py-spy record -o ai_core_flame.svg --pid $(pgrep -f 'uvicorn') --duration 60
```
### Memory / Heap
Use `tracemalloc` snapshot code injection:
```python
import tracemalloc, time
tracemalloc.start()
# after warmup
time.sleep(60)
current, peak = tracemalloc.get_traced_memory()
print('memory_current_bytes', current, 'memory_peak_bytes', peak)
```

### Perf (Linux)
```
sudo perf record -F 99 -p $(pgrep -f 'uvicorn') -g -- sleep 60
sudo perf script | flamegraph.pl > ai_core_perf.svg
```

## MongoDB Profiling
Enable slow query log:
```
db.setProfilingLevel(1, { slowms: 50 })
```
Query stats:
```
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

## Postgres Slow Queries
Add to config:
```
log_min_duration_statement=50
```
Inspect logs for bottlenecks.

## Correlating With Load
- Always tag load test runs with a unique RUN_ID (env var) and set X-Request-Id header.
- Capture Prometheus metrics snapshot at start/end of each phase.

## Artifact Storage
Store flamegraphs in `docs/perf/day14/artifacts/flamegraphs/`.
Store snapshots (heap, tracemalloc) in `docs/perf/day14/artifacts/memory/`.
