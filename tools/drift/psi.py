from __future__ import annotations
import numpy as np


def _bin_edges(data: np.ndarray, bins: int = 10):
    # Use quantile-based bins to be robust to skew
    qs = np.linspace(0, 1, bins + 1)
    edges = np.unique(np.quantile(data, qs))
    # Ensure at least two edges
    if edges.size < 2:
        edges = np.array([np.min(data), np.max(data) + 1e-9])
    return edges


def compute_psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    """
    Population Stability Index between expected (baseline) and actual distributions.
    Values: <0.1 no drift, 0.1-0.25 moderate, >0.25 significant.
    """
    expected = np.asarray(expected).astype(float)
    actual = np.asarray(actual).astype(float)
    edges = _bin_edges(expected, bins)
    exp_hist, _ = np.histogram(expected, bins=edges)
    act_hist, _ = np.histogram(actual, bins=edges)
    exp_pct = np.clip(exp_hist / max(exp_hist.sum(), 1), 1e-12, 1)
    act_pct = np.clip(act_hist / max(act_hist.sum(), 1), 1e-12, 1)
    psi = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
    return float(psi)


def compute_kl(p: np.ndarray, q: np.ndarray, bins: int = 20) -> float:
    """KL divergence D(P||Q) using shared binning from P."""
    p = np.asarray(p).astype(float)
    q = np.asarray(q).astype(float)
    edges = _bin_edges(p, bins)
    p_hist, _ = np.histogram(p, bins=edges)
    q_hist, _ = np.histogram(q, bins=edges)
    p_prob = np.clip(p_hist / max(p_hist.sum(), 1), 1e-12, 1)
    q_prob = np.clip(q_hist / max(q_hist.sum(), 1), 1e-12, 1)
    kl = np.sum(p_prob * np.log(p_prob / q_prob))
    return float(kl)
