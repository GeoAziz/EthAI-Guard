from typing import Dict, Any


def run_explain_stub(features: Dict[str, Any]) -> Dict[str, float]:
    # Return mock SHAP-like feature contributions
    return {k: 0.1 for k in features.keys()}
