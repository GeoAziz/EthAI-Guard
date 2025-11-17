"""
Model Validation Harness

Runs synthetic inputs through models, captures outputs,
extracts scores, and measures stability.
"""
from typing import List, Dict, Any, Callable
import copy
import random


def run_validation(
    model_func: Callable,
    synthetic_cases: List[Dict[str, Any]],
    include_stability_test: bool = True
) -> Dict[str, Any]:
    """
    Run full validation: evaluate all synthetic cases through model.
    
    Args:
        model_func: Function that takes input dict and returns evaluation result
        synthetic_cases: List of synthetic test cases
        include_stability_test: Whether to test stability with noisy inputs
    
    Returns:
        Dict with results, noisy_results (if stability test), and summary
    """
    results = []
    
    # Run all cases through model
    for case in synthetic_cases:
        try:
            output = model_func(case)
            results.append({
                "input": case,
                "output": output,
                "case_id": case.get("case_id", "unknown"),
            })
        except Exception as e:
            results.append({
                "input": case,
                "output": {"error": str(e), "risk_score": 50, "risk_level": "medium", "triggered_rules": []},
                "case_id": case.get("case_id", "unknown"),
                "error": str(e),
            })
    
    validation_result = {
        "results": results,
        "total_cases": len(synthetic_cases),
        "successful_evaluations": sum(1 for r in results if "error" not in r),
        "failed_evaluations": sum(1 for r in results if "error" in r),
    }
    
    # Stability test: add small noise and re-evaluate
    if include_stability_test and results:
        noisy_cases = [_add_noise_to_case(case) for case in synthetic_cases]
        noisy_results = []
        
        for case in noisy_cases:
            try:
                output = model_func(case)
                noisy_results.append({
                    "input": case,
                    "output": output,
                    "case_id": case.get("case_id", "unknown"),
                })
            except Exception as e:
                noisy_results.append({
                    "input": case,
                    "output": {"error": str(e), "risk_score": 50, "risk_level": "medium", "triggered_rules": []},
                    "case_id": case.get("case_id", "unknown"),
                    "error": str(e),
                })
        
        validation_result["noisy_results"] = noisy_results
        validation_result["stability_test_performed"] = True
    else:
        validation_result["stability_test_performed"] = False
    
    return validation_result


def _add_noise_to_case(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add small random noise to numeric fields to test stability.
    
    Noise is ±5% for financial values, ±1 for age/scores.
    """
    noisy_case = copy.deepcopy(case)
    
    # Add noise to financial values
    if "financial" in noisy_case:
        for key in ["annual_income", "existing_debt", "savings"]:
            if key in noisy_case["financial"]:
                value = noisy_case["financial"][key]
                noise_factor = random.uniform(0.95, 1.05)
                noisy_case["financial"][key] = int(value * noise_factor)
        
        # Credit score: ±5 points
        if "credit_score" in noisy_case["financial"]:
            score = noisy_case["financial"]["credit_score"]
            noise = random.randint(-5, 5)
            noisy_case["financial"]["credit_score"] = max(300, min(850, score + noise))
    
    # Age: ±1 year
    if "applicant" in noisy_case and "age" in noisy_case["applicant"]:
        age = noisy_case["applicant"]["age"]
        noise = random.choice([-1, 0, 1])
        noisy_case["applicant"]["age"] = max(18, min(100, age + noise))
    
    # Loan amount: ±3%
    if "request" in noisy_case and "loan_amount" in noisy_case["request"]:
        amount = noisy_case["request"]["loan_amount"]
        noise_factor = random.uniform(0.97, 1.03)
        noisy_case["request"]["loan_amount"] = int(amount * noise_factor)
    
    return noisy_case


def extract_validation_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extract high-level summary from validation results.
    """
    if not results:
        return {
            "total": 0,
            "risk_distribution": {},
            "triggered_rules_summary": {},
        }
    
    # Risk level distribution
    risk_distribution = {"low": 0, "medium": 0, "high": 0}
    for r in results:
        level = r["output"].get("risk_level", "medium")
        risk_distribution[level] = risk_distribution.get(level, 0) + 1
    
    # Triggered rules summary
    all_triggered = []
    for r in results:
        all_triggered.extend(r["output"].get("triggered_rules", []))
    
    triggered_rules_summary = {}
    for rule in all_triggered:
        triggered_rules_summary[rule] = triggered_rules_summary.get(rule, 0) + 1
    
    # Risk score stats
    risk_scores = [r["output"].get("risk_score", 50) for r in results]
    avg_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
    
    return {
        "total": len(results),
        "risk_distribution": risk_distribution,
        "triggered_rules_summary": triggered_rules_summary,
        "avg_risk_score": avg_risk_score,
        "min_risk_score": min(risk_scores) if risk_scores else 0,
        "max_risk_score": max(risk_scores) if risk_scores else 0,
    }
