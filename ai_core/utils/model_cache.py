import hashlib
import time
import pickle
import pandas as pd
from typing import Optional, Tuple, Any
import logging

logger = logging.getLogger("ai_core.model_cache")

class ModelCache:
    """In-memory model cache with TTL. Stores trained models by data hash to avoid retraining."""

    def __init__(self, max_models: int = 10, ttl_seconds: int = 900):
        self.max_models = max_models
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, dict[str, Any]] = {}

    def _make_key(self, X: pd.DataFrame, y: Optional[pd.Series]) -> str:
        """Generate a deterministic hash key from data."""
        try:
            X_csv = X.to_csv(index=False)
            y_csv = y.to_csv(index=False) if y is not None else ""
            payload = X_csv + y_csv
            return hashlib.sha256(payload.encode()).hexdigest()
        except Exception:
            return ""

    def get(self, X: pd.DataFrame, y: Optional[pd.Series]) -> Optional[Any]:
        """Retrieve cached model if it exists and hasn't expired."""
        key = self._make_key(X, y)
        if not key or key not in self._cache:
            return None

        entry = self._cache[key]
        if time.time() - entry["created_at"] > self.ttl_seconds:
            del self._cache[key]
            return None

        logger.info({"msg": "model_cache_hit", "key": key})
        return entry["model"]

    def set(self, X: pd.DataFrame, y: Optional[pd.Series], model: Any) -> None:
        """Store a trained model in cache."""
        key = self._make_key(X, y)
        if not key:
            return

        if len(self._cache) >= self.max_models:
            oldest_key = min(self._cache, key=lambda k: self._cache[k]["created_at"])
            del self._cache[oldest_key]
            logger.debug({"msg": "model_cache_eviction", "key": oldest_key})

        self._cache[key] = {"model": model, "created_at": time.time()}
        logger.info({"msg": "model_cache_set", "key": key, "cache_size": len(self._cache)})

    def clear(self) -> None:
        """Clear all cached models."""
        self._cache.clear()


_global_cache = ModelCache(max_models=10, ttl_seconds=900)


def get_cached_model(X: pd.DataFrame, y: Optional[pd.Series]) -> Optional[Any]:
    """Try to retrieve a cached model."""
    return _global_cache.get(X, y)


def cache_model(X: pd.DataFrame, y: Optional[pd.Series], model: Any) -> None:
    """Cache a trained model."""
    _global_cache.set(X, y, model)


def clear_model_cache() -> None:
    """Clear the model cache."""
    _global_cache.clear()
