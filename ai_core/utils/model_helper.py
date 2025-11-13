from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

shap = None
try:
    import shap
    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False


def train_quick_model(X: pd.DataFrame, y: pd.Series):
    """Train a tiny model quickly and return a pipeline.

    Keep training light so this is safe to run during development.
    """
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
            # import shap dynamically to avoid static analyzers treating the top-level
            # 'shap = None' as the module and flagging 'Explainer' as unknown.
            import importlib
            shap_mod = importlib.import_module('shap')
            explainer = shap_mod.Explainer(model.predict_proba, X)
            shap_values = explainer(X)
            # shap_values for class 1
            vals = np.abs(shap_values.values[..., 1]).mean(axis=0)
            return {n: float(v) for n, v in zip(feature_names, vals)}
        except Exception:
            # fallback
            pass

    # fallback: use logistic regression coefficients if present
    try:
        # extract coef from pipeline
        lr = None
        for step in model.steps[::-1]:
            if hasattr(step, 'coef_'):
                lr = step
                break
        if lr is None:
            # sklearn pipeline: model.named_steps['logisticregression']
            lr = model.named_steps.get('logisticregression')
        coefs = np.abs(lr.coef_).flatten()
        # normalize
        coefs = coefs / (coefs.sum() + 1e-9)
        return {n: float(v) for n, v in zip(feature_names, coefs)}
    except Exception:
        # last resort: uniform small importances
        return {n: 1.0 / len(feature_names) for n in feature_names}
