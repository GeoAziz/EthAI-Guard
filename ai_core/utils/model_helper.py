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

# Prometheus metrics for SHAP cache (singletons, created once at module level)
# Guard the optional import so Pylance doesn't flag calling a possibly-None symbol.
if Counter is not None:  # type: ignore[truthy-bool]
    try:
        # Do not use the runtime 'Counter' variable in type annotations (it may be None),
        # so assign the metric objects without inline type hints.
        SHAP_CACHE_HITS = Counter("ai_core_shap_cache_hits_total", "Total SHAP cache hits")
        SHAP_CACHE_MISSES = Counter("ai_core_shap_cache_misses_total", "Total SHAP cache misses")
        SHAP_CACHE_WRITES = Counter("ai_core_shap_cache_writes_total", "Total SHAP cache writes")
    except Exception:  # pragma: no cover
        # If metrics already registered (multiple imports/reloads) or prometheus disabled, use None
        SHAP_CACHE_HITS = SHAP_CACHE_MISSES = SHAP_CACHE_WRITES = None
else:
    SHAP_CACHE_HITS = SHAP_CACHE_MISSES = SHAP_CACHE_WRITES = None


def train_quick_model(X: pd.DataFrame, y: pd.Series):
    """Train a tiny model quickly and return a pipeline.

    Keep training light so this is safe to run during development.
    If y is None, create a synthetic binary target for demonstration.
    """
    # If no target, create a synthetic one for demo purposes
    if y is None:
        # Create a simple synthetic target that alternates (ensures both classes present)
        # This ensures we have samples of both classes for binary classification
        y = pd.Series(np.arange(len(X)) % 2, index=X.index)
    
    # Prefer a lightweight tree ensemble if available for faster SHAP TreeExplainer
    try:
        if LIGHTGBM_AVAILABLE:
            lgb = importlib.import_module("lightgbm")

            lgbm = lgb.LGBMClassifier(n_estimators=100, max_depth=4, learning_rate=0.1)
            lgbm.fit(X, y)
            return lgbm
        if XGBOOST_AVAILABLE:
            xgb = importlib.import_module("xgboost")

            xgbm = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss')
            xgbm.fit(X, y)
            return xgbm
    except Exception:
        # fall back to logistic regression pipeline
        pass

    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=200))
    model.fit(X, y)
    return model


def explain_model(model, X: pd.DataFrame) -> Dict[str, float]:
    """Return feature importances/explanations.

    If SHAP is available, compute SHAP mean absolute values. Otherwise
    fall back to model coefficients.
    """
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
            return cached["shap_summary"]
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

        if is_tree:
            explainer = shap_mod.TreeExplainer(model, data=bg if bg is not None else None)
        else:
            explainer = shap_mod.Explainer(model.predict_proba, X)

        shap_values = explainer(X)
        # shap_values for class 1 if multi-class
        vals = np.abs(shap_values.values[..., 1]).mean(axis=0) if shap_values.values.ndim == 3 else np.abs(shap_values.values).mean(axis=0)
        result = {n: float(v) for n, v in zip(feature_names, vals)}

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
    except Exception:
        # shap import or explanation failed; fall back to coefficients
        pass

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
    except Exception:
        # last resort: uniform small importances
        result = {n: 1.0 / len(feature_names) for n in feature_names}
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
