"""
Drift Detection Module

Provides algorithms and tools for detecting distribution drift
in model inputs and outputs.
"""

from .algorithms import (  # type: ignore
    compute_psi,
    compute_kl_divergence,
    compute_wasserstein_distance,
    compute_histogram,
    classify_psi_severity,
    classify_kl_severity,
    compute_fairness_drift,
    compute_data_quality_drift,
    compute_explanation_stability,
    aggregate_drift_metrics
)
from .baseline import BaselineManager  # type: ignore
from .alerts import AlertManager  # type: ignore
from .worker import DriftWorker  # type: ignore

__all__ = [
    'compute_psi',
    'compute_kl_divergence',
    'compute_wasserstein_distance',
    'compute_histogram',
    'classify_psi_severity',
    'classify_kl_severity',
    'compute_fairness_drift',
    'compute_data_quality_drift',
    'compute_explanation_stability',
    'aggregate_drift_metrics',
    'BaselineManager',
    'AlertManager',
    'DriftWorker'
]
