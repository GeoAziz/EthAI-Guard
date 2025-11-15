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

shap = None
try:
    import shap

    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False

# Try optional tree model backends
LIGHTGBM_AVAILABLE = importlib.util.find_spec('lightgbm') is not None
XGBOOST_AVAILABLE = importlib.util.find_spec('xgboost') is not None


def train_quick_model(X: pd.DataFrame, y: pd.Series):
    """Train a tiny model quickly and return a pipeline.

    Keep training light so this is safe to run during development.
    """
    # Prefer a lightweight tree ensemble if available for faster SHAP TreeExplainer
    try:
        if LIGHTGBM_AVAILABLE:
            import lightgbm as lgb

            lgbm = lgb.LGBMClassifier(n_estimators=100, max_depth=4, learning_rate=0.1)
            lgbm.fit(X, y)
            return lgbm
        if XGBOOST_AVAILABLE:
            import xgboost as xgb

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
    if SHAP_AVAILABLE:
        try:
            shap_mod = importlib.import_module("shap")
            # If model is tree-based, use TreeExplainer (much faster)
            is_tree = any(name in type(model).__name__.lower() for name in ("lgbm", "xgb", "xgboost", "lightgbm", "gbm", "tree", "randomforest"))

            # compute model hash for caching
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

            # try to load cached summary from DB if persistence is available
            try:
                from ai_core.utils.persistence import get_db, get_shap_cache, set_shap_cache

                db = get_db()
                cached = get_shap_cache(db, mh, baseline_hash)
                if cached and "shap_summary" in cached:
                    return cached["shap_summary"]
            except Exception:
                cached = None

            if is_tree:
                explainer = shap_mod.TreeExplainer(model, data=bg if bg is not None else None)
            else:
                explainer = shap_mod.Explainer(model.predict_proba, X)

            shap_values = explainer(X)
            # shap_values for class 1 if multi-class
            vals = np.abs(shap_values.values[..., 1]).mean(axis=0) if shap_values.values.ndim == 3 else np.abs(shap_values.values).mean(axis=0)
            result = {n: float(v) for n, v in zip(feature_names, vals)}

            # store cache if possible
            try:
                if 'db' in locals():
                    set_shap_cache(db, mh, baseline_hash, result)
            except Exception:
                pass

            return result
        except Exception:
            # fallback
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
        return {n: float(v) for n, v in zip(feature_names, coefs)}
    except Exception:
        # last resort: uniform small importances
        return {n: 1.0 / len(feature_names) for n in feature_names}
