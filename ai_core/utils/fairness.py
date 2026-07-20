from typing import Sequence, Dict, List, Optional, Union, Callable, Any
import numpy as np


def _as_array(x):
    return np.asarray(x)


def _tpr(y: np.ndarray, yhat: np.ndarray, mask: np.ndarray) -> float:
    pos_mask = (y == 1) & mask
    if pos_mask.sum() == 0:
        return 0.0
    tp = int(((yhat == 1) & pos_mask).sum())
    return float(tp) / float(pos_mask.sum())


def _fpr(y: np.ndarray, yhat: np.ndarray, mask: np.ndarray) -> float:
    neg_mask = (y == 0) & mask
    if neg_mask.sum() == 0:
        return 0.0
    fp = int(((yhat == 1) & neg_mask).sum())
    return float(fp) / float(neg_mask.sum())


def demographic_parity_difference(y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute demographic parity difference: P(y_pred=1 | S=1) - P(y_pred=1 | S=0).

    Assumes binary sensitive values (truthy=1, falsy=0). Returns float in [-1,1].
    """
    y = _as_array(y_pred)
    s = _as_array(sensitive)
    mask1 = s.astype(bool)
    if mask1.sum() == 0 or (~mask1).sum() == 0:
        return 0.0
    p1 = float((y[mask1] == 1).mean())
    p0 = float((y[~mask1] == 1).mean())
    return p1 - p0


def equal_opportunity_difference(y_true: Union[Sequence, np.ndarray], y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute equal opportunity difference: TPR(S=1) - TPR(S=0).

    TPR = TP / (TP + FN) computed per group.
    """
    y = _as_array(y_true)
    yhat = _as_array(y_pred)
    s = _as_array(sensitive)
    mask1 = s.astype(bool)
    tpr1 = _tpr(y, yhat, mask1)
    tpr0 = _tpr(y, yhat, ~mask1)
    return tpr1 - tpr0


def equalized_odds_difference(y_true: Union[Sequence, np.ndarray], y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute equalized odds difference: max(|TPR(S=1)-TPR(S=0)|, |FPR(S=1)-FPR(S=0)|).

    Equalized odds requires both TPR and FPR to match across groups; this returns
    the worst-case (max) gap between the two rate differences.
    """
    y = _as_array(y_true)
    yhat = _as_array(y_pred)
    s = _as_array(sensitive)
    mask1 = s.astype(bool)
    mask0 = ~mask1
    d_tpr = abs(_tpr(y, yhat, mask1) - _tpr(y, yhat, mask0))
    d_fpr = abs(_fpr(y, yhat, mask1) - _fpr(y, yhat, mask0))
    return max(d_tpr, d_fpr)


def average_absolute_odds_difference(y_true: Union[Sequence, np.ndarray], y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute average absolute odds difference: mean(|ΔTPR|, |ΔFPR|).

    A softer companion to equalized_odds_difference (which takes the max instead
    of the mean of the two rate gaps).
    """
    y = _as_array(y_true)
    yhat = _as_array(y_pred)
    s = _as_array(sensitive)
    mask1 = s.astype(bool)
    mask0 = ~mask1
    d_tpr = abs(_tpr(y, yhat, mask1) - _tpr(y, yhat, mask0))
    d_fpr = abs(_fpr(y, yhat, mask1) - _fpr(y, yhat, mask0))
    return 0.5 * (d_tpr + d_fpr)


def disparate_impact_ratio(y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute the disparate impact ratio: min(selection rate) / max(selection rate)
    across all groups defined by `sensitive` (supports >2 groups).

    Per the 80% (4/5) rule, a ratio below 0.8 indicates likely adverse impact.
    Returns 1.0 (no disparity) when fewer than 2 non-empty groups exist or when
    the max rate is 0.
    """
    y = _as_array(y_pred)
    s = _as_array(sensitive)
    groups = np.unique(s)
    rates = []
    for g in groups:
        mask = s == g
        if mask.sum() == 0:
            continue
        rates.append(float((y[mask] == 1).mean()))
    if len(rates) < 2 or max(rates) == 0:
        return 1.0
    return min(rates) / max(rates)


def calibration_within_groups(
    y_true: Union[Sequence, np.ndarray],
    y_prob: Union[Sequence, np.ndarray],
    sensitive: Union[Sequence, np.ndarray],
    n_bins: int = 10,
) -> Dict[str, float]:
    """Compute expected calibration error (ECE) per group and the max gap between
    groups' ECE values.

    A model is well-calibrated within a group if, among samples with predicted
    probability p, the observed positive rate is also approximately p. ECE is the
    weighted average absolute gap between confidence and accuracy across bins.

    Returns a dict like {"group_0": ece0, "group_1": ece1, ..., "max_group_diff": gap}.
    """
    y = _as_array(y_true)
    p = _as_array(y_prob).astype(float)
    s = _as_array(sensitive)
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)

    def _ece(mask: np.ndarray) -> float:
        n = int(mask.sum())
        if n == 0:
            return 0.0
        yy = y[mask]
        pp = p[mask]
        total = 0.0
        for i in range(n_bins):
            lo, hi = bin_edges[i], bin_edges[i + 1]
            if i < n_bins - 1:
                in_bin = (pp >= lo) & (pp < hi)
            else:
                in_bin = (pp >= lo) & (pp <= hi)
            bin_count = int(in_bin.sum())
            if bin_count == 0:
                continue
            confidence = float(pp[in_bin].mean())
            accuracy = float(yy[in_bin].mean())
            total += (bin_count / n) * abs(confidence - accuracy)
        return float(total)

    groups = np.unique(s)
    result: Dict[str, float] = {}
    for g in groups:
        result[f"group_{g}"] = _ece(s == g)
    values = list(result.values())
    result["max_group_diff"] = float(max(values) - min(values)) if values else 0.0
    return result


def individual_fairness_consistency(
    X: Union[Sequence, np.ndarray],
    y_pred: Union[Sequence, np.ndarray],
    k: int = 5,
) -> float:
    """Compute an individual-fairness consistency score (Zemel et al. style):
    1 - the average absolute difference between each sample's prediction and the
    mean prediction of its k nearest neighbors in feature space.

    Score is in [0, 1]; higher means similar individuals receive similar outcomes.
    `X` must be a numeric 2D array-like of shape (n_samples, n_features).
    """
    Xa = np.asarray(X, dtype=float)
    if Xa.ndim == 1:
        Xa = Xa.reshape(-1, 1)
    yhat = np.asarray(y_pred, dtype=float)
    n = Xa.shape[0]
    if n < 2:
        return 1.0
    k_eff = min(k, n - 1)
    diffs = Xa[:, None, :] - Xa[None, :, :]
    dist = np.sqrt((diffs ** 2).sum(axis=-1))
    np.fill_diagonal(dist, np.inf)
    neighbor_idx = np.argsort(dist, axis=1)[:, :k_eff]
    neighbor_preds = yhat[neighbor_idx]
    per_sample_gap = np.abs(yhat[:, None] - neighbor_preds).mean(axis=1)
    return float(1.0 - per_sample_gap.mean())


def counterfactual_fairness_score(
    y_pred_factual: Union[Sequence, np.ndarray],
    y_pred_counterfactual: Union[Sequence, np.ndarray],
) -> float:
    """Compute a counterfactual fairness score: the fraction of predictions that
    change when the protected attribute is counterfactually flipped (holding all
    other features fixed).

    0.0 means predictions are fully invariant to the protected attribute
    (counterfactually fair); 1.0 means every prediction flips.
    Requires the caller to have generated `y_pred_counterfactual` by re-running
    the model on data with the protected attribute flipped/perturbed.
    """
    a = _as_array(y_pred_factual)
    b = _as_array(y_pred_counterfactual)
    if a.shape != b.shape or a.size == 0:
        return 0.0
    return float((a != b).mean())


def intersectional_demographic_parity(
    y_pred: Union[Sequence, np.ndarray],
    sensitive_attrs: List[Union[Sequence, np.ndarray]],
) -> float:
    """Generalize demographic parity to intersections of multiple protected
    attributes (e.g. gender AND race combined). Groups are formed from the
    tuple of values across all provided attribute arrays; returns the max-min
    gap in positive prediction rate across all intersectional groups.
    """
    y = _as_array(y_pred)
    arrs = [_as_array(a) for a in sensitive_attrs]
    n = len(y)
    groups: Dict[tuple, List[int]] = {}
    for i in range(n):
        key = tuple(arr[i] for arr in arrs)
        groups.setdefault(key, []).append(i)

    rates = []
    for idxs in groups.values():
        idx_arr = np.array(idxs)
        rates.append(float((y[idx_arr] == 1).mean()))

    if len(rates) < 2:
        return 0.0
    return float(max(rates) - min(rates))


class FairnessMetric:
    """Wraps a metric function with metadata so it can be discovered and invoked
    generically through a MetricRegistry."""

    def __init__(
        self,
        name: str,
        fn: Callable[..., Any],
        required_args: List[str],
        description: str = "",
        default_threshold: Optional[float] = None,
        kind: str = "difference",
    ):
        self.name = name
        self.fn = fn
        self.required_args = required_args
        self.description = description
        self.default_threshold = default_threshold
        # "difference" metrics violate when abs(value) > threshold.
        # "ratio_floor" metrics violate when value < threshold.
        self.kind = kind

    def is_computable(self, available_kwargs: Dict[str, Any]) -> bool:
        return all(arg in available_kwargs and available_kwargs[arg] is not None for arg in self.required_args)

    def compute(self, **kwargs) -> Any:
        call_kwargs = {k: kwargs[k] for k in self.required_args}
        return self.fn(**call_kwargs)


class MetricRegistry:
    """Registry enabling new fairness metrics to be added without modifying the
    core analyze pipeline. Register a metric once; compute_all() will pick it up
    automatically whenever the caller supplies its required arguments.
    """

    def __init__(self):
        self._metrics: Dict[str, FairnessMetric] = {}

    def register(
        self,
        name: str,
        fn: Callable[..., Any],
        required_args: List[str],
        description: str = "",
        default_threshold: Optional[float] = None,
        kind: str = "difference",
    ) -> None:
        self._metrics[name] = FairnessMetric(
            name=name,
            fn=fn,
            required_args=required_args,
            description=description,
            default_threshold=default_threshold,
            kind=kind,
        )

    def get(self, name: str) -> FairnessMetric:
        return self._metrics[name]

    def list_metrics(self) -> List[str]:
        return list(self._metrics.keys())

    def compute(self, name: str, **kwargs) -> Any:
        return self._metrics[name].compute(**kwargs)

    def compute_all(self, **kwargs) -> Dict[str, Any]:
        """Compute every registered metric whose required arguments are present
        in kwargs. Metrics that raise are skipped rather than failing the whole
        batch, so partial input (e.g. no probability scores) still yields results
        for the metrics that don't need them.
        """
        results: Dict[str, Any] = {}
        for name, metric in self._metrics.items():
            if not metric.is_computable(kwargs):
                continue
            try:
                results[name] = metric.compute(**kwargs)
            except Exception:
                continue
        return results


registry = MetricRegistry()
registry.register(
    "demographic_parity_difference",
    demographic_parity_difference,
    required_args=["y_pred", "sensitive"],
    description="P(y_pred=1|S=1) - P(y_pred=1|S=0)",
    default_threshold=0.10,
    kind="difference",
)
registry.register(
    "equal_opportunity_difference",
    equal_opportunity_difference,
    required_args=["y_true", "y_pred", "sensitive"],
    description="TPR(S=1) - TPR(S=0)",
    default_threshold=0.10,
    kind="difference",
)
registry.register(
    "equalized_odds_difference",
    equalized_odds_difference,
    required_args=["y_true", "y_pred", "sensitive"],
    description="max(|ΔTPR|, |ΔFPR|) across groups",
    default_threshold=0.10,
    kind="difference",
)
registry.register(
    "average_absolute_odds_difference",
    average_absolute_odds_difference,
    required_args=["y_true", "y_pred", "sensitive"],
    description="mean(|ΔTPR|, |ΔFPR|) across groups",
    default_threshold=0.10,
    kind="difference",
)
registry.register(
    "disparate_impact_ratio",
    disparate_impact_ratio,
    required_args=["y_pred", "sensitive"],
    description="min(selection rate)/max(selection rate); 80% rule floor",
    default_threshold=0.80,
    kind="ratio_floor",
)
registry.register(
    "calibration_within_groups",
    calibration_within_groups,
    required_args=["y_true", "y_prob", "sensitive"],
    description="Expected calibration error per group + max group gap",
    default_threshold=None,
    kind="dict",
)
registry.register(
    "individual_fairness_consistency",
    individual_fairness_consistency,
    required_args=["X", "y_pred"],
    description="1 - avg |pred_i - mean(pred_neighbors)| over k-NN in feature space",
    default_threshold=None,
    kind="score_ceiling",  # violates when value < threshold (lower consistency = worse)
)
registry.register(
    "counterfactual_fairness_score",
    counterfactual_fairness_score,
    required_args=["y_pred_factual", "y_pred_counterfactual"],
    description="Fraction of predictions that flip when the protected attribute is counterfactually changed",
    default_threshold=0.10,
    kind="difference",
)
registry.register(
    "intersectional_demographic_parity",
    intersectional_demographic_parity,
    required_args=["y_pred", "sensitive_attrs"],
    description="Max-min positive rate gap across intersectional groups (multiple protected attributes)",
    default_threshold=0.10,
    kind="difference",
)


def compute_metrics(y_true: Union[Sequence, np.ndarray], y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> Dict[str, float]:
    """Backward-compatible entry point used by the analyze pipeline. Returns the
    core "difference"-style metrics that share the same violation semantics
    (violation when abs(value) > threshold), computed from the plain
    y_true/y_pred/sensitive triple.
    """
    return {
        "demographic_parity_difference": float(demographic_parity_difference(y_pred, sensitive)),
        "equal_opportunity_difference": float(equal_opportunity_difference(y_true, y_pred, sensitive)),
        "equalized_odds_difference": float(equalized_odds_difference(y_true, y_pred, sensitive)),
        "average_absolute_odds_difference": float(average_absolute_odds_difference(y_true, y_pred, sensitive)),
    }


def compute_all_metrics(**kwargs) -> Dict[str, Any]:
    """Compute every registered metric computable from the given kwargs. Pass
    whichever of y_true, y_pred, sensitive, y_prob, X, sensitive_attrs,
    y_pred_factual, y_pred_counterfactual are available; metrics whose
    requirements aren't met are simply omitted from the result.
    """
    return registry.compute_all(**kwargs)


def validate_against_thresholds(metrics: Dict[str, float], thresholds: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    """Return dict of metric->(value, threshold) entries for violations of
    "difference"-style metrics (violation when abs(value) > threshold)."""
    violations = {}
    for k, thr in thresholds.items():
        val = metrics.get(k)
        if val is None:
            continue
        if abs(val) > thr:
            violations[k] = {"value": float(val), "threshold": float(thr)}
    return violations


def validate_ratio_floors(metrics: Dict[str, float], floors: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    """Return dict of metric->(value, threshold) entries for violations of
    "ratio_floor"-style metrics (violation when value < threshold), such as
    disparate_impact_ratio under the 80% rule."""
    violations = {}
    for k, floor in floors.items():
        val = metrics.get(k)
        if val is None:
            continue
        if val < floor:
            violations[k] = {"value": float(val), "threshold": float(floor)}
    return violations
