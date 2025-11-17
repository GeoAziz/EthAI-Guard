"""
Fairness Metrics Engine for Model Validation

Calculates key fairness indicators:
- Disparate Impact
- Equal Opportunity Score
- Demographic Parity Gap
- Consistency Score
- Stability Score
- Rule violation severity
"""
from typing import List, Dict, Any
import statistics


def calculate_disparate_impact(results: List[Dict[str, Any]], sensitive_attr: str) -> Dict[str, Any]:
    """
    Calculate disparate impact: ratio of positive outcomes between groups.
    
    80% rule (4/5 rule): ratio should be >= 0.8
    
    Args:
        results: List of validation results with outcomes
        sensitive_attr: Attribute to measure (e.g., 'gender', 'ethnicity')
    
    Returns:
        Metric dict with score, level, explanation
    """
    # Group results by sensitive attribute
    groups = {}
    for result in results:
        attr_value = result["input"].get("applicant", {}).get(sensitive_attr)
        if attr_value:
            if attr_value not in groups:
                groups[attr_value] = []
            groups[attr_value].append(result)
    
    if len(groups) < 2:
        return {
            "metric_name": "disparate_impact",
            "score": 1.0,
            "level": "acceptable",
            "explanation": f"Insufficient groups for {sensitive_attr} comparison",
            "details": {}
        }
    
    # Calculate approval rates per group
    approval_rates = {}
    for group_name, group_results in groups.items():
        approved = sum(1 for r in group_results if r["output"]["risk_level"] == "low")
        approval_rates[group_name] = approved / len(group_results) if group_results else 0
    
    # Find min and max rates
    if not approval_rates:
        return {
            "metric_name": "disparate_impact",
            "score": 1.0,
            "level": "acceptable",
            "explanation": "No approval data available",
            "details": {}
        }
    
    min_rate = min(approval_rates.values())
    max_rate = max(approval_rates.values())
    
    # Disparate impact ratio
    ratio = min_rate / max_rate if max_rate > 0 else 1.0
    
    # Determine level (80% rule)
    if ratio >= 0.8:
        level = "acceptable"
        explanation = f"Disparate impact ratio {ratio:.2f} meets 80% rule"
    elif ratio >= 0.6:
        level = "warning"
        explanation = f"Disparate impact ratio {ratio:.2f} below 80% threshold"
    else:
        level = "critical"
        explanation = f"Disparate impact ratio {ratio:.2f} indicates significant disparity"
    
    return {
        "metric_name": "disparate_impact",
        "score": ratio,
        "level": level,
        "explanation": explanation,
        "details": {
            "sensitive_attribute": sensitive_attr,
            "approval_rates_by_group": approval_rates,
            "min_rate": min_rate,
            "max_rate": max_rate,
        }
    }


def calculate_equal_opportunity(results: List[Dict[str, Any]], sensitive_attr: str) -> Dict[str, Any]:
    """
    Equal Opportunity: difference in true positive rates across groups.
    
    Measures if qualified applicants get approved equally regardless of group.
    """
    groups = {}
    for result in results:
        attr_value = result["input"].get("applicant", {}).get(sensitive_attr)
        if attr_value:
            if attr_value not in groups:
                groups[attr_value] = {"qualified_approved": 0, "qualified_total": 0}
            
            # Consider "qualified" as having good credit + income
            credit = result["input"].get("financial", {}).get("credit_score", 0)
            income = result["input"].get("financial", {}).get("annual_income", 0)
            qualified = credit >= 650 and income >= 40000
            
            if qualified:
                groups[attr_value]["qualified_total"] += 1
                if result["output"]["risk_level"] == "low":
                    groups[attr_value]["qualified_approved"] += 1
    
    if len(groups) < 2:
        return {
            "metric_name": "equal_opportunity",
            "score": 1.0,
            "level": "acceptable",
            "explanation": f"Insufficient groups for {sensitive_attr} comparison",
            "details": {}
        }
    
    # Calculate TPR per group
    tpr_by_group = {}
    for group_name, group_data in groups.items():
        if group_data["qualified_total"] > 0:
            tpr_by_group[group_name] = group_data["qualified_approved"] / group_data["qualified_total"]
        else:
            tpr_by_group[group_name] = 0
    
    if not tpr_by_group:
        return {
            "metric_name": "equal_opportunity",
            "score": 1.0,
            "level": "acceptable",
            "explanation": "No qualified applicants in dataset",
            "details": {}
        }
    
    # Measure max difference in TPR
    tpr_values = list(tpr_by_group.values())
    max_diff = max(tpr_values) - min(tpr_values)
    
    # Score: 1 - max_diff (higher is better)
    score = 1 - max_diff
    
    if max_diff <= 0.1:
        level = "acceptable"
        explanation = f"Equal opportunity difference {max_diff:.2f} is minimal"
    elif max_diff <= 0.2:
        level = "warning"
        explanation = f"Equal opportunity difference {max_diff:.2f} shows disparity"
    else:
        level = "critical"
        explanation = f"Equal opportunity difference {max_diff:.2f} indicates significant bias"
    
    return {
        "metric_name": "equal_opportunity",
        "score": score,
        "level": level,
        "explanation": explanation,
        "details": {
            "sensitive_attribute": sensitive_attr,
            "tpr_by_group": tpr_by_group,
            "max_difference": max_diff,
        }
    }


def calculate_demographic_parity(results: List[Dict[str, Any]], sensitive_attr: str) -> Dict[str, Any]:
    """
    Demographic Parity: positive outcome rates should be similar across groups.
    """
    groups = {}
    for result in results:
        attr_value = result["input"].get("applicant", {}).get(sensitive_attr)
        if attr_value:
            if attr_value not in groups:
                groups[attr_value] = {"total": 0, "positive": 0}
            groups[attr_value]["total"] += 1
            if result["output"]["risk_level"] == "low":
                groups[attr_value]["positive"] += 1
    
    if len(groups) < 2:
        return {
            "metric_name": "demographic_parity_gap",
            "score": 0.0,
            "level": "acceptable",
            "explanation": f"Insufficient groups for {sensitive_attr}",
            "details": {}
        }
    
    # Calculate positive rates
    positive_rates = {}
    for group_name, group_data in groups.items():
        if group_data["total"] > 0:
            positive_rates[group_name] = group_data["positive"] / group_data["total"]
        else:
            positive_rates[group_name] = 0
    
    # Max difference (gap)
    rates = list(positive_rates.values())
    gap = max(rates) - min(rates)
    
    if gap <= 0.1:
        level = "acceptable"
        explanation = f"Demographic parity gap {gap:.2f} is acceptable"
    elif gap <= 0.2:
        level = "warning"
        explanation = f"Demographic parity gap {gap:.2f} shows imbalance"
    else:
        level = "critical"
        explanation = f"Demographic parity gap {gap:.2f} indicates significant disparity"
    
    return {
        "metric_name": "demographic_parity_gap",
        "score": gap,
        "level": level,
        "explanation": explanation,
        "details": {
            "sensitive_attribute": sensitive_attr,
            "positive_rates_by_group": positive_rates,
            "gap": gap,
        }
    }


def calculate_consistency_score(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Consistency: similar inputs should produce similar outputs.
    
    Measures variance in risk scores for applicants with similar profiles.
    """
    # Group by similar profiles (income bracket + credit bracket)
    def get_profile_key(result):
        income = result["input"].get("financial", {}).get("annual_income", 0)
        credit = result["input"].get("financial", {}).get("credit_score", 0)
        income_bracket = income // 20000  # 20k brackets
        credit_bracket = credit // 50  # 50-point brackets
        return f"{income_bracket}_{credit_bracket}"
    
    profiles = {}
    for result in results:
        key = get_profile_key(result)
        if key not in profiles:
            profiles[key] = []
        profiles[key].append(result["output"]["risk_score"])
    
    # Calculate variance within each profile
    variances = []
    for profile_key, scores in profiles.items():
        if len(scores) >= 3:  # Need at least 3 for meaningful variance
            variance = statistics.variance(scores) if len(scores) > 1 else 0
            variances.append(variance)
    
    if not variances:
        return {
            "metric_name": "consistency_score",
            "score": 1.0,
            "level": "acceptable",
            "explanation": "Insufficient data for consistency analysis",
            "details": {}
        }
    
    avg_variance = statistics.mean(variances)
    
    # Normalize: lower variance = higher consistency
    # Typical risk score variance of 100-400 is concerning
    if avg_variance <= 50:
        score = 1.0
        level = "acceptable"
        explanation = f"Model is highly consistent (variance {avg_variance:.1f})"
    elif avg_variance <= 150:
        score = 0.7
        level = "acceptable"
        explanation = f"Model shows acceptable consistency (variance {avg_variance:.1f})"
    elif avg_variance <= 300:
        score = 0.5
        level = "warning"
        explanation = f"Model consistency is moderate (variance {avg_variance:.1f})"
    else:
        score = 0.3
        level = "critical"
        explanation = f"Model shows high inconsistency (variance {avg_variance:.1f})"
    
    return {
        "metric_name": "consistency_score",
        "score": score,
        "level": level,
        "explanation": explanation,
        "details": {
            "avg_variance": avg_variance,
            "profile_count": len(profiles),
            "analyzed_profiles": len(variances),
        }
    }


def calculate_stability_score(results_original: List[Dict[str, Any]], results_noisy: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Stability: model should be robust to small input perturbations.
    
    Compares original results to results with minor noise added.
    """
    if len(results_original) != len(results_noisy):
        return {
            "metric_name": "stability_score",
            "score": 1.0,
            "level": "acceptable",
            "explanation": "Stability test not performed (no noisy data)",
            "details": {}
        }
    
    # Measure score differences
    score_diffs = []
    level_changes = 0
    
    for orig, noisy in zip(results_original, results_noisy):
        orig_score = orig["output"]["risk_score"]
        noisy_score = noisy["output"]["risk_score"]
        score_diffs.append(abs(orig_score - noisy_score))
        
        if orig["output"]["risk_level"] != noisy["output"]["risk_level"]:
            level_changes += 1
    
    avg_diff = statistics.mean(score_diffs)
    level_change_rate = level_changes / len(results_original)
    
    # Score based on average difference and level changes
    if avg_diff <= 5 and level_change_rate <= 0.05:
        score = 1.0
        level = "acceptable"
        explanation = f"Model is highly stable (avg diff {avg_diff:.1f}, {level_change_rate:.1%} level changes)"
    elif avg_diff <= 10 and level_change_rate <= 0.15:
        score = 0.8
        level = "acceptable"
        explanation = f"Model shows good stability (avg diff {avg_diff:.1f}, {level_change_rate:.1%} level changes)"
    elif avg_diff <= 20 and level_change_rate <= 0.30:
        score = 0.6
        level = "warning"
        explanation = f"Model stability is moderate (avg diff {avg_diff:.1f}, {level_change_rate:.1%} level changes)"
    else:
        score = 0.4
        level = "critical"
        explanation = f"Model is unstable (avg diff {avg_diff:.1f}, {level_change_rate:.1%} level changes)"
    
    return {
        "metric_name": "stability_score",
        "score": score,
        "level": level,
        "explanation": explanation,
        "details": {
            "avg_score_difference": avg_diff,
            "level_change_rate": level_change_rate,
            "level_changes": level_changes,
            "total_comparisons": len(results_original),
        }
    }


def calculate_rule_violation_severity(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Measure severity of ethical rule violations across all results.
    """
    total = len(results)
    violation_counts = {}
    high_risk_count = 0
    
    for result in results:
        triggered = result["output"].get("triggered_rules", [])
        for rule in triggered:
            violation_counts[rule] = violation_counts.get(rule, 0) + 1
        
        if result["output"]["risk_level"] == "high":
            high_risk_count += 1
    
    total_violations = sum(violation_counts.values())
    violation_rate = total_violations / total if total > 0 else 0
    high_risk_rate = high_risk_count / total if total > 0 else 0
    
    # Severity based on violation rate and high-risk rate
    if violation_rate <= 0.1 and high_risk_rate <= 0.05:
        score = 1.0
        level = "acceptable"
        explanation = f"Low violation rate ({violation_rate:.1%}), high-risk rate ({high_risk_rate:.1%})"
    elif violation_rate <= 0.25 and high_risk_rate <= 0.15:
        score = 0.7
        level = "acceptable"
        explanation = f"Acceptable violation rate ({violation_rate:.1%}), high-risk rate ({high_risk_rate:.1%})"
    elif violation_rate <= 0.40 and high_risk_rate <= 0.30:
        score = 0.5
        level = "warning"
        explanation = f"Moderate violation rate ({violation_rate:.1%}), high-risk rate ({high_risk_rate:.1%})"
    else:
        score = 0.3
        level = "critical"
        explanation = f"High violation rate ({violation_rate:.1%}), high-risk rate ({high_risk_rate:.1%})"
    
    return {
        "metric_name": "rule_violation_severity",
        "score": score,
        "level": level,
        "explanation": explanation,
        "details": {
            "total_evaluations": total,
            "total_violations": total_violations,
            "violation_rate": violation_rate,
            "high_risk_count": high_risk_count,
            "high_risk_rate": high_risk_rate,
            "violations_by_rule": violation_counts,
        }
    }


def calculate_all_metrics(results: List[Dict[str, Any]], results_noisy: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    """
    Calculate all fairness metrics for a validation run.
    
    Args:
        results: List of evaluation results (original)
        results_noisy: Optional list of results with noise for stability test
    
    Returns:
        Dictionary of all metrics with overall fairness score
    """
    metrics = {}
    
    # Fairness metrics by sensitive attribute
    for attr in ["gender", "ethnicity"]:
        metrics[f"disparate_impact_{attr}"] = calculate_disparate_impact(results, attr)
        metrics[f"equal_opportunity_{attr}"] = calculate_equal_opportunity(results, attr)
        metrics[f"demographic_parity_{attr}"] = calculate_demographic_parity(results, attr)
    
    # Model quality metrics
    metrics["consistency"] = calculate_consistency_score(results)
    metrics["rule_violations"] = calculate_rule_violation_severity(results)
    
    # Stability (if noisy data provided)
    if results_noisy:
        metrics["stability"] = calculate_stability_score(results, results_noisy)
    
    # Calculate overall fairness score (average of all metric scores)
    all_scores = [m["score"] for m in metrics.values()]
    overall_score = statistics.mean(all_scores) if all_scores else 0.0
    
    # Determine overall level
    critical_count = sum(1 for m in metrics.values() if m["level"] == "critical")
    warning_count = sum(1 for m in metrics.values() if m["level"] == "warning")
    
    if critical_count > 0:
        overall_level = "critical"
    elif warning_count > len(metrics) / 2:
        overall_level = "warning"
    else:
        overall_level = "acceptable"
    
    return {
        "metrics": metrics,
        "overall_fairness_score": overall_score,
        "overall_level": overall_level,
        "critical_metrics": critical_count,
        "warning_metrics": warning_count,
        "acceptable_metrics": len(metrics) - critical_count - warning_count,
    }
