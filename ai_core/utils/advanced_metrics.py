"""Advanced fairness metrics beyond standard measures."""

import numpy as np
from typing import Dict, List, Tuple, Any


class AdvancedFairnessMetrics:
    """Compute advanced fairness metrics."""

    @staticmethod
    def calibration_within_groups(
        y_true: np.ndarray,
        y_pred_proba: np.ndarray,
        sensitive_attr: np.ndarray,
        n_bins: int = 10
    ) -> Dict[str, float]:
        """
        Compute calibration within each protected group.

        A model is calibrated if predicted probabilities match actual outcomes.
        """
        group_calibrations = {}
        groups = np.unique(sensitive_attr)

        for group in groups:
            mask = sensitive_attr == group
            y_true_group = y_true[mask]
            y_pred_proba_group = y_pred_proba[mask]

            # Bin predictions and compute calibration error
            bins = np.linspace(0, 1, n_bins + 1)
            bin_indices = np.digitize(y_pred_proba_group, bins) - 1
            bin_indices = np.clip(bin_indices, 0, n_bins - 1)

            calibration_errors = []
            for b in range(n_bins):
                mask_bin = bin_indices == b
                if mask_bin.sum() == 0:
                    continue

                actual_mean = y_true_group[mask_bin].mean()
                pred_mean = y_pred_proba_group[mask_bin].mean()
                error = abs(actual_mean - pred_mean)
                calibration_errors.append(error)

            group_calibrations[str(group)] = (
                np.mean(calibration_errors) if calibration_errors else 0.0
            )

        return {
            "calibration_within_groups": group_calibrations,
            "average_calibration_error": float(np.mean(list(group_calibrations.values()))),
        }

    @staticmethod
    def average_absolute_odds_difference(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        sensitive_attr: np.ndarray
    ) -> float:
        """
        Average Absolute Odds Difference (AAOD).

        Average of absolute differences in FPR and FNR between groups.
        """
        groups = np.unique(sensitive_attr)
        odds_diffs = []

        for i, group1 in enumerate(groups):
            mask1 = sensitive_attr == group1
            for group2 in groups[i + 1 :]:
                mask2 = sensitive_attr == group2

                # FPR: false positive rate
                fpr1 = ((y_pred[mask1] == 1) & (y_true[mask1] == 0)).sum() / max(
                    ((y_true[mask1] == 0).sum()), 1
                )
                fpr2 = ((y_pred[mask2] == 1) & (y_true[mask2] == 0)).sum() / max(
                    ((y_true[mask2] == 0).sum()), 1
                )

                # FNR: false negative rate
                fnr1 = ((y_pred[mask1] == 0) & (y_true[mask1] == 1)).sum() / max(
                    ((y_true[mask1] == 1).sum()), 1
                )
                fnr2 = ((y_pred[mask2] == 0) & (y_true[mask2] == 1)).sum() / max(
                    ((y_true[mask2] == 1).sum()), 1
                )

                aaod = (abs(fpr1 - fpr2) + abs(fnr1 - fnr2)) / 2
                odds_diffs.append(aaod)

        return float(np.mean(odds_diffs)) if odds_diffs else 0.0

    @staticmethod
    def intersectional_fairness(
        y_pred: np.ndarray,
        y_true: np.ndarray,
        sensitive_attrs: Dict[str, np.ndarray]
    ) -> Dict[str, float]:
        """
        Measure fairness across intersections of multiple protected attributes.
        """
        intersections = {}

        # Get all unique combinations
        attr_names = list(sensitive_attrs.keys())
        if len(attr_names) < 2:
            return {"intersectional_fairness": 0.0}

        attr1_name, attr2_name = attr_names[0], attr_names[1]
        attr1 = sensitive_attrs[attr1_name]
        attr2 = sensitive_attrs[attr2_name]

        groups1 = np.unique(attr1)
        groups2 = np.unique(attr2)

        for g1 in groups1:
            for g2 in groups2:
                mask = (attr1 == g1) & (attr2 == g2)
                if mask.sum() == 0:
                    continue

                pos_rate = y_pred[mask].mean()
                intersections[f"{attr1_name}={g1}__{attr2_name}={g2}"] = float(pos_rate)

        # Compute variance across intersections
        if intersections:
            values = list(intersections.values())
            variance = float(np.var(values))
        else:
            variance = 0.0

        return {
            "intersections": intersections,
            "intersectional_variance": variance,
        }

    @staticmethod
    def counterfactual_fairness_proxy(
        y_pred: np.ndarray,
        sensitive_attr: np.ndarray,
        causal_paths: List[int] = None
    ) -> Dict[str, float]:
        """
        Proxy for counterfactual fairness using intervention analysis.

        Measures whether outcome would change if sensitive attribute were different.
        """
        if causal_paths is None:
            causal_paths = list(range(len(y_pred)))

        groups = np.unique(sensitive_attr)
        cf_scores = {}

        for group in groups:
            mask = sensitive_attr == group
            outcome_rate = y_pred[mask].mean()
            cf_scores[str(group)] = float(outcome_rate)

        # Compute counterfactual distance
        if len(cf_scores) > 1:
            min_rate = min(cf_scores.values())
            max_rate = max(cf_scores.values())
            cf_distance = max_rate - min_rate
        else:
            cf_distance = 0.0

        return {
            "counterfactual_scores_by_group": cf_scores,
            "counterfactual_distance": float(cf_distance),
        }

    @staticmethod
    def individual_fairness(
        y_pred: np.ndarray,
        features: np.ndarray,
        k_neighbors: int = 5
    ) -> float:
        """
        Measure individual fairness: similar individuals should receive similar predictions.
        """
        from sklearn.metrics.pairwise import euclidean_distances

        distances = euclidean_distances(features)
        fairness_violations = 0
        total_comparisons = 0

        for i in range(len(features)):
            # Find k nearest neighbors
            neighbor_indices = np.argsort(distances[i])[1 : k_neighbors + 1]

            for j in neighbor_indices:
                total_comparisons += 1
                # Check if similar individuals get different predictions
                if y_pred[i] != y_pred[j]:
                    fairness_violations += 1

        if total_comparisons == 0:
            return 0.0

        individual_fairness_score = 1 - (fairness_violations / total_comparisons)
        return float(individual_fairness_score)

    @staticmethod
    def temporal_fairness_drift(
        y_pred_baseline: np.ndarray,
        y_pred_current: np.ndarray,
        sensitive_attr: np.ndarray
    ) -> Dict[str, float]:
        """
        Measure fairness drift over time across groups.
        """
        groups = np.unique(sensitive_attr)
        drift_by_group = {}

        for group in groups:
            mask = sensitive_attr == group
            baseline_rate = y_pred_baseline[mask].mean()
            current_rate = y_pred_current[mask].mean()
            drift = abs(current_rate - baseline_rate)
            drift_by_group[str(group)] = float(drift)

        return {
            "drift_by_group": drift_by_group,
            "average_drift": float(np.mean(list(drift_by_group.values()))),
            "max_drift": float(max(drift_by_group.values())) if drift_by_group else 0.0,
        }


def compute_all_advanced_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_pred_proba: np.ndarray,
    sensitive_attrs: Dict[str, np.ndarray],
    features: np.ndarray = None,
) -> Dict[str, Any]:
    """Compute all advanced fairness metrics."""

    metrics = AdvancedFairnessMetrics()
    results = {}

    # Calibration within groups
    if y_pred_proba is not None and len(sensitive_attrs) > 0:
        primary_attr = list(sensitive_attrs.values())[0]
        results["calibration"] = metrics.calibration_within_groups(
            y_true, y_pred_proba, primary_attr
        )

    # Average Absolute Odds Difference
    if len(sensitive_attrs) > 0:
        primary_attr = list(sensitive_attrs.values())[0]
        results["aaod"] = {
            "average_absolute_odds_difference": metrics.average_absolute_odds_difference(
                y_true, y_pred, primary_attr
            )
        }

    # Intersectional Fairness
    if len(sensitive_attrs) >= 2:
        results["intersectional"] = metrics.intersectional_fairness(
            y_pred, y_true, sensitive_attrs
        )

    # Counterfactual Fairness Proxy
    if len(sensitive_attrs) > 0:
        primary_attr = list(sensitive_attrs.values())[0]
        results["counterfactual"] = metrics.counterfactual_fairness_proxy(
            y_pred, primary_attr
        )

    # Individual Fairness
    if features is not None:
        results["individual_fairness"] = {
            "individual_fairness_score": metrics.individual_fairness(y_pred, features)
        }

    return results
