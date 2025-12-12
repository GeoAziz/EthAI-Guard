# Thin shim to expose the ai_core FastAPI application at top-level import
# Some test environments import `main` directly instead of `ai_core.main`.
try:
    # Prefer package import
    from ai_core.main import app
except Exception:
    # Fallback: attempt relative import if package isn't discoverable
    # This mirrors how the Docker runtime expects to run uvicorn: "main:app".
    from ai_core import main as _main
    app = getattr(_main, "app")

__all__ = ["app"]
