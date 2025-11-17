from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from prometheus_client import Histogram, Counter, Gauge
import logging
import os
import time

# Use package-relative imports so tests and runtime can import this module whether
# the package is loaded as `ai_core` or the module is executed directly.
try:
    # Prefer package-relative import when running as a package
    from .routers import analyze, reports, validation
except Exception:
    # Fallback to top-level import when module is executed directly in Docker
    from routers import analyze, reports, validation

app = FastAPI(title="EthixAI AI Core")
_STARTUP_COMPLETE = False
_STARTUP_AT = time.perf_counter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(reports.router)
app.include_router(validation.router, prefix="/validation", tags=["validation"])

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Basic request metrics for SLI/SLO tracking
AI_CORE_HTTP_DURATION = Histogram(
    'ai_core_http_request_duration_seconds',
    'AI Core HTTP request duration in seconds',
    labelnames=['method', 'route', 'status'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10)
)
AI_CORE_HTTP_REQUESTS = Counter(
    'ai_core_http_requests_total',
    'Total AI Core HTTP requests',
    labelnames=['method', 'route', 'status']
)
AI_CORE_INPROGRESS = Gauge(
    'ai_core_http_requests_in_progress',
    'Number of AI Core HTTP requests in progress'
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    # Derive a low-cardinality route label; fall back to raw path
    route_obj = request.scope.get('route')
    try:
        route_label = getattr(route_obj, 'path', None) or request.url.path
    except Exception:
        route_label = request.url.path

    method = request.method
    AI_CORE_INPROGRESS.inc()
    start = time.perf_counter()
    try:
        response = await call_next(request)
        status = str(getattr(response, 'status_code', 200))
        duration = time.perf_counter() - start
        AI_CORE_HTTP_DURATION.labels(method=method, route=route_label, status=status).observe(duration)
        AI_CORE_HTTP_REQUESTS.labels(method=method, route=route_label, status=status).inc()
        return response
    finally:
        AI_CORE_INPROGRESS.dec()


# Basic structured logger for ai_core (initialized before use)
logger = logging.getLogger('ai_core')
if not logger.handlers:
    handler = logging.StreamHandler()
    from pythonjsonlogger import jsonlogger as json_logger_module
    fmt = json_logger_module.JsonFormatter('%(asctime)s %(name)s %(levelname)s %(request_id)s %(analysis_id)s %(message)s')  # type: ignore
    handler.setFormatter(fmt)
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if ("DEV" in (os.environ.get('ENV','')) or os.environ.get('PYTEST_CURRENT_TEST')) else logging.INFO)


# Best-effort: ensure SHAP cache TTL index on startup when a real DB is configured.
# This avoids unbounded growth of the `shap_cache` collection in production while
# remaining a no-op in tests (where persistence.get_db() returns None or a fake DB).
try:
    from ai_core.utils.persistence import get_db, ensure_shap_cache_index

    try:
        db = get_db()
        if db is not None:
            ensure_shap_cache_index(db)
            logger.info({"msg": "ensured_shap_cache_index"})
        _STARTUP_COMPLETE = True
    except Exception:
        # best-effort; don't crash the app on index creation errors
        logger.exception("shap_cache index creation failed (continuing)")
except Exception:
    # persistence module not available in minimal test environments
    pass


@app.get("/health")
def health():
    return {"status": "ai_core ok"}


@app.get("/health/liveness")
def liveness():
    """Basic liveness: process responding; memory from resource module (portable)."""
    import resource
    try:
        rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        # On Linux ru_maxrss is in KB; on macOS it's bytes. Normalize assuming > 10^7 implies bytes.
        if rss_kb > 10_000_000:  # heuristic for macOS bytes value
            rss_mb = rss_kb / 1024 / 1024
        else:
            rss_mb = rss_kb / 1024  # KB -> MB
    except Exception:
        rss_mb = None
    return {"status": "ok", "uptime_seconds": round(time.perf_counter() - _STARTUP_AT, 2), "rss_mb": rss_mb}


@app.get("/health/startup")
def startup():
    status = "started" if _STARTUP_COMPLETE else "starting"
    code = 200 if _STARTUP_COMPLETE else 202
    return {"status": status, "uptime_seconds": round(time.perf_counter() - _STARTUP_AT, 2)}


@app.get("/health/readiness")
def readiness():
    db_ready = True
    try:
        from ai_core.utils.persistence import get_db
        db_ready = get_db() is not None
    except Exception:
        db_ready = False
    ready = db_ready and _STARTUP_COMPLETE
    if ready:
        return {"status": "ready", "db": db_ready}
    return {"status": "not_ready", "db": db_ready, "startup_complete": _STARTUP_COMPLETE}
