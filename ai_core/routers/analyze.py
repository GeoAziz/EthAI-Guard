"""Shim module that re-exports the real implementation kept in analyze_impl.

This small shim makes it safe to replace a corrupted file atomically: we
create a new implementation file and point this module at it.
"""

from importlib import import_module as _import_module

# Attempt to import implementation module whether package layout is nested (ai_core/routers)
# or flat (routers/ directly in container working directory). This improves resilience
# inside the Docker image where the source is copied at /app without the parent folder.
try:
    _impl = _import_module("ai_core.routers.analyze_impl")
except ModuleNotFoundError:
    _impl = _import_module("routers.analyze_impl")

# re-export names the rest of the codebase expects
__all__ = [
    "router",
    "AnalyzeRequest",
    "AnalyzeResponse",
    "run_analysis_core",
    "analyze",
    "validate_dataset_mapping",
    "store_analysis",
    "get_db",
]

router = getattr(_impl, "router")
AnalyzeRequest = getattr(_impl, "AnalyzeRequest")
AnalyzeResponse = getattr(_impl, "AnalyzeResponse")
run_analysis_core = getattr(_impl, "run_analysis_core")
analyze = getattr(_impl, "analyze")
validate_dataset_mapping = getattr(_impl, "validate_dataset_mapping")

# store_analysis is imported from persistence at runtime, but we need to allow
# tests to monkeypatch it on this module. Provide a stub that re-exports from persistence.
def store_analysis(db, dataset_name, doc):
    """Delegate to persistence.store_analysis for tests to override."""
    try:
        import importlib
        try:
            p = importlib.import_module("ai_core.utils.persistence")
        except Exception:
            p = importlib.import_module("utils.persistence")
        if hasattr(p, "store_analysis"):
            return p.store_analysis(db, dataset_name, doc)
    except Exception:
        pass
    return None

# get_db is imported from persistence at runtime, but we need to allow
# tests to monkeypatch it on this module. Provide a stub that re-exports from persistence.
def get_db():
    """Delegate to persistence.get_db for tests to override."""
    try:
        import importlib
        try:
            p = importlib.import_module("ai_core.utils.persistence")
        except Exception:
            p = importlib.import_module("utils.persistence")
        if hasattr(p, "get_db"):
            return p.get_db()
    except Exception:
        pass
    return None
