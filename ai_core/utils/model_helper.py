from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
import hashlib
import pickle
import importlib
import importlib.util
from sklearn.cluster import KMeans
import logging
from typing import Optional, TYPE_CHECKING
try:
    from prometheus_client import Counter  # type: ignore
except Exception:  # pragma: no cover
    # Fallback when prometheus_client is not installed in minimal environments.
    Counter = None  # type: ignore


def _build_shap_background(X: pd.DataFrame, n_clusters: int = 10) -> pd.DataFrame:
    """Build a small background dataset for TreeExplainer using KMeans cluster centers.

    Returns a DataFrame with cluster centers (n_clusters x n_features).
    """
    n_samples = min(len(X), 1000)
    sample = X.sample(n=n_samples, random_state=0)
    k = min(n_clusters, len(sample))
    if k <= 0:
        return sample
    kmeans = KMeans(n_clusters=k, random_state=0).fit(sample.values)
    centers = pd.DataFrame(kmeans.cluster_centers_, columns=sample.columns)
    return centers

# Defer importing shap until explain_model is called to avoid pulling heavy
# native dependencies at module import time (helps tests and CI where
# SHAP/numpy versions may not be compatible).

# Try optional tree model backends
LIGHTGBM_AVAILABLE = importlib.util.find_spec('lightgbm') is not None
XGBOOST_AVAILABLE = importlib.util.find_spec('xgboost') is not None

# Prometheus metrics for SHAP cache and operation timing (singletons, created once at module level)
# Guard the optional import so Pylance doesn't flag calling a possibly-None symbol.
if Counter is not None:  # type: ignore[truthy-bool]
    try:
        from prometheus_client import Histogram
        # Do not use the runtime 'Counter' variable in type annotations (it may be None),
        # so assign the metric objects without inline type hints.
        SHAP_CACHE_HITS = Counter("ai_core_shap_cache_hits_total", "Total SHAP cache hits")
        SHAP_CACHE_MISSES = Counter("ai_core_shap_cache_misses_total", "Total SHAP cache misses")
        SHAP_CACHE_WRITES = Counter("ai_core_shap_cache_writes_total", "Total SHAP cache writes")
        MODEL_TRAIN_DURATION = Histogram("ai_core_model_training_seconds", "Model training duration in seconds", buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0))
        SHAP_EXPLAIN_DURATION = Histogram("ai_core_shap_explanation_seconds", "SHAP explanation duration in seconds", buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0))
        EXPLAIN_ERRORS = Counter("ai_core_explain_errors_total", "Total explanation generation errors", labelnames=["fallback_type"])
    except Exception:  # pragma: no cover
        # If metrics already registered (multiple imports/reloads) or prometheus disabled, use None
        SHAP_CACHE_HITS = SHAP_CACHE_MISSES = SHAP_CACHE_WRITES = None
        MODEL_TRAIN_DURATION = SHAP_EXPLAIN_DURATION = EXPLAIN_ERRORS = None
else:
    SHAP_CACHE_HITS = SHAP_CACHE_MISSES = SHAP_CACHE_WRITES = None
    MODEL_TRAIN_DURATION = SHAP_EXPLAIN_DURATION = EXPLAIN_ERRORS = None


def train_quick_model(X: pd.DataFrame, y: pd.Series):
    """Train a tiny model quickly and return a pipeline.

    Keep training light so this is safe to run during development.
    If y is None, create a synthetic binary target for demonstration.
    Checks cache first to avoid retraining on duplicate data.
    """
    import time
    # Check cache first
    try:
        try:
            model_cache = importlib.import_module("ai_core.utils.model_cache")
        except Exception:
            model_cache = importlib.import_module("utils.model_cache")

        cached_model = model_cache.get_cached_model(X, y)
        if cached_model is not None:
            return cached_model
    except Exception:
        pass

    # If no target, create a synthetic one for demo purposes
    if y is None:
        # Create a simple synthetic target that alternates (ensures both classes present)
        # This ensures we have samples of both classes for binary classification
        y = pd.Series(np.arange(len(X)) % 2, index=X.index)

    start = time.perf_counter()
    # Prefer a lightweight tree ensemble if available for faster SHAP TreeExplainer
    try:
        if LIGHTGBM_AVAILABLE:
            lgb = importlib.import_module("lightgbm")

            lgbm = lgb.LGBMClassifier(n_estimators=100, max_depth=4, learning_rate=0.1)
            lgbm.fit(X, y)
            duration = time.perf_counter() - start
            try:
                if MODEL_TRAIN_DURATION is not None:
                    MODEL_TRAIN_DURATION.observe(duration)
            except Exception:
                pass
            try:
                model_cache.cache_model(X, y, lgbm)
            except Exception:
                pass
            return lgbm
        if XGBOOST_AVAILABLE:
            xgb = importlib.import_module("xgboost")

            xgbm = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss')
            xgbm.fit(X, y)
            duration = time.perf_counter() - start
            try:
                if MODEL_TRAIN_DURATION is not None:
                    MODEL_TRAIN_DURATION.observe(duration)
            except Exception:
                pass
            try:
                model_cache.cache_model(X, y, xgbm)
            except Exception:
                pass
            return xgbm
    except Exception:
        # fall back to logistic regression pipeline
        pass

    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=200))
    model.fit(X, y)
    duration = time.perf_counter() - start
    try:
        if MODEL_TRAIN_DURATION is not None:
            MODEL_TRAIN_DURATION.observe(duration)
    except Exception:
        pass
    try:
        model_cache.cache_model(X, y, model)
    except Exception:
        pass
    return model


def explain_model(model, X: pd.DataFrame) -> Dict[str, Any]:
    """Return feature importances/explanations.

    If SHAP is available, compute SHAP mean absolute values. Otherwise
    fall back to model coefficients. Includes _degraded flag when fallback is used.
    """
    import time
    feature_names = list(X.columns)
    # compute model hash for caching (best-effort) so fallback paths can write cache
    try:
        mh = hashlib.sha256(pickle.dumps(model)).hexdigest()
    except Exception:
        mh = hashlib.sha256(repr(model).encode()).hexdigest()

    # build a small background: kmeans centers (10 clusters)
    try:
        bg = _build_shap_background(X, n_clusters=10)
        baseline_hash = hashlib.sha256(bg.to_csv(index=False).encode()).hexdigest()
    except Exception:
        bg = None
        baseline_hash = ""

    logger = logging.getLogger("ai_core.model_helper")

    # Try to load cached summary from DB if persistence is available.
    # Do this before attempting to import shap so a cached result is returned
    # even when shap is not installed in the test/CI environment.
    try:
        # Import the persistence module fresh each time so tests that inject
        # a fake persistence into sys.modules are honored.
        try:
            persistence = importlib.import_module("ai_core.utils.persistence")
        except Exception:
            persistence = importlib.import_module("utils.persistence")

        cached = None
        if hasattr(persistence, "get_db") and hasattr(persistence, "get_shap_cache"):
            db = persistence.get_db()
            cached = persistence.get_shap_cache(db, mh, baseline_hash)

        if cached and "shap_summary" in cached:
            try:
                if SHAP_CACHE_HITS is not None:
                    SHAP_CACHE_HITS.inc()
            except Exception:
                pass
            logger.info({"msg": "shap_cache_hit", "model_hash": mh, "baseline_hash": baseline_hash})
            result = dict(cached["shap_summary"])
            result["_degraded"] = result.get("_degraded", False)
            return result
        else:
            try:
                if SHAP_CACHE_MISSES is not None:
                    SHAP_CACHE_MISSES.inc()
            except Exception:
                pass
            logger.info({"msg": "shap_cache_miss", "model_hash": mh, "baseline_hash": baseline_hash})
    except Exception:
        cached = None

    # Try to import shap on-demand. If it's not available or fails (e.g. ABI
    # mismatch with numpy), fall back to coefficient-based explanations.
    try:
        shap_mod = importlib.import_module("shap")
        # If model is tree-based, use TreeExplainer (much faster)
        is_tree = any(name in type(model).__name__.lower() for name in ("lgbm", "xgb", "xgboost", "lightgbm", "gbm", "tree", "randomforest"))

        start_shap = time.perf_counter()
        if is_tree:
            explainer = shap_mod.TreeExplainer(model, data=bg if bg is not None else None)
        else:
            explainer = shap_mod.Explainer(model.predict_proba, X)

        shap_values = explainer(X)
        # shap_values for class 1 if multi-class
        vals = np.abs(shap_values.values[..., 1]).mean(axis=0) if shap_values.values.ndim == 3 else np.abs(shap_values.values).mean(axis=0)
        result = {n: float(v) for n, v in zip(feature_names, vals)}
        result["_degraded"] = False
        duration_shap = time.perf_counter() - start_shap
        try:
            if SHAP_EXPLAIN_DURATION is not None:
                SHAP_EXPLAIN_DURATION.observe(duration_shap)
        except Exception:
            pass

        # store cache if possible (use persistence module at write time to honor fakes)
        try:
            try:
                persistence = importlib.import_module("ai_core.utils.persistence")
            except Exception:
                persistence = importlib.import_module("utils.persistence")
            if hasattr(persistence, "set_shap_cache") and hasattr(persistence, "get_db"):
                db = persistence.get_db()
                persistence.set_shap_cache(db, mh, baseline_hash, result)
        except Exception:
            pass

        return result
    except Exception as e:
        try:
            if EXPLAIN_ERRORS is not None:
                EXPLAIN_ERRORS.labels(fallback_type="shap").inc()
        except Exception:
            pass
        logger.warning({"msg": "shap_explanation_failed", "error": str(e)})

    # fallback: use logistic regression coefficients if present
    try:
        # extract coef from pipeline
        lr = None
        for step in model.steps[::-1]:
            if hasattr(step, "coef_"):
                lr = step
                break
        if lr is None:
            # sklearn pipeline: model.named_steps['logisticregression']
            lr = model.named_steps.get("logisticregression")
        coefs = np.abs(lr.coef_).flatten()
        # normalize
        coefs = coefs / (coefs.sum() + 1e-9)
        result = {n: float(v) for n, v in zip(feature_names, coefs)}
        result["_degraded"] = True
        logger.warning({"msg": "using_coefficient_fallback"})
        try:
            if EXPLAIN_ERRORS is not None:
                EXPLAIN_ERRORS.labels(fallback_type="coefficient").inc()
        except Exception:
            pass
        try:
            try:
                persistence = importlib.import_module("ai_core.utils.persistence")
            except Exception:
                persistence = importlib.import_module("utils.persistence")
            if hasattr(persistence, "set_shap_cache") and hasattr(persistence, "get_db"):
                db = persistence.get_db()
                persistence.set_shap_cache(db, mh, baseline_hash, result)
        except Exception:
            pass
        return result
    except Exception as e:
        logger.warning({"msg": "coefficient_fallback_failed", "error": str(e)})
        try:
            if EXPLAIN_ERRORS is not None:
                EXPLAIN_ERRORS.labels(fallback_type="coefficient_failed").inc()
        except Exception:
            pass

    # last resort: uniform small importances
    result = {n: 1.0 / len(feature_names) for n in feature_names}
    result["_degraded"] = True
    logger.warning({"msg": "using_uniform_fallback"})
    try:
        if EXPLAIN_ERRORS is not None:
            EXPLAIN_ERRORS.labels(fallback_type="uniform").inc()
    except Exception:
        pass
    try:
        try:
            persistence = importlib.import_module("ai_core.utils.persistence")
        except Exception:
            persistence = importlib.import_module("utils.persistence")
        if hasattr(persistence, "set_shap_cache") and hasattr(persistence, "get_db"):
            db = persistence.get_db()
            persistence.set_shap_cache(db, mh, baseline_hash, result)
    except Exception:
        pass
    return result
