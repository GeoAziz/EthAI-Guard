"""
Model Validation Router

Provides endpoint to run full model validation with synthetic data.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import logging

# Import validation components (with fallback for direct execution)
try:
    # Package-relative imports
    from ..synthetic.generator import generate_synthetic_cases, get_dataset_stats  # type: ignore[reportMissingImports]
    from ..validation.validator import run_validation, extract_validation_summary  # type: ignore[reportMissingImports]
    from ..validation.metrics import calculate_all_metrics  # type: ignore[reportMissingImports]
    from ..validation.report import generate_validation_report  # type: ignore[reportMissingImports]
except ImportError:
    # Fallback for direct execution (Docker)
    from synthetic.generator import generate_synthetic_cases, get_dataset_stats  # type: ignore[reportMissingImports]
    from validation.validator import run_validation, extract_validation_summary  # type: ignore[reportMissingImports]
    from validation.metrics import calculate_all_metrics  # type: ignore[reportMissingImports]
    from validation.report import generate_validation_report  # type: ignore[reportMissingImports]

logger = logging.getLogger(__name__)
router = APIRouter()


class ValidateModelRequest(BaseModel):
    """Request to validate model with synthetic data."""
    model_name: str = Field(..., description="Name of the model being validated")
    model_version: str = Field(default="1.0", description="Version of the model")
    model_description: Optional[str] = Field(None, description="Description of the model")
    num_synthetic_cases: int = Field(default=200, ge=50, le=500, description="Number of synthetic test cases to generate")
    include_edge_cases: bool = Field(default=True, description="Whether to include edge cases")
    include_stability_test: bool = Field(default=True, description="Whether to test model stability with noise")
    include_html_report: bool = Field(default=False, description="Whether to generate HTML report")


class ValidateModelResponse(BaseModel):
    """Response from model validation."""
    report_id: str
    status: str
    overall_score: float
    confidence_score: float
    total_cases: int
    metrics_summary: Dict[str, Any]
    recommendations: list[str]
    report_json: Dict[str, Any]
    report_html: Optional[str] = None


@router.post("/validate-model", response_model=ValidateModelResponse)
async def validate_model(request: ValidateModelRequest):
    """
    Run full model validation pipeline:
    1. Generate synthetic dataset
    2. Run all evaluations through model
    3. Compute fairness metrics
    4. Generate validation report
    5. Return summary
    """
    try:
        logger.info(f"Starting model validation: {request.model_name} v{request.model_version}")
        
        # Step 1: Generate synthetic dataset
        logger.info(f"Generating {request.num_synthetic_cases} synthetic test cases...")
        synthetic_cases = generate_synthetic_cases(
            count=request.num_synthetic_cases,
            include_edge_cases=request.include_edge_cases
        )
        dataset_stats = get_dataset_stats(synthetic_cases)
        
        # Step 2: Run evaluations through model
        logger.info("Running evaluations through model...")

        def model_eval_func(case: Dict[str, Any]) -> Dict[str, Any]:
            """Lightweight rule-based evaluator for synthetic cases.

            Produces output compatible with validation metrics:
            - risk_score (0-100)
            - risk_level: low | medium | high
            - triggered_rules: list of rule ids
            """
            fin = case.get("financial", {})
            app = case.get("applicant", {})
            req = case.get("request", {})

            credit = int(fin.get("credit_score", 600) or 600)
            income = int(fin.get("annual_income", 0) or 0)
            debt = int(fin.get("existing_debt", 0) or 0)
            savings = int(fin.get("savings", 0) or 0)
            loan_amt = int(req.get("loan_amount", 0) or 0)
            age = int(app.get("age", 40) or 40)

            # Base risk inversely related to credit score
            risk = 100 - max(300, min(850, credit)) * (100 / 850)

            # Debt-to-income adjustments
            dti = (debt / income) if income > 0 else 1.0
            if dti > 0.6:
                risk += 25
            elif dti > 0.4:
                risk += 15
            elif dti > 0.2:
                risk += 5

            # Loan relative to income/savings
            if income > 0:
                loan_ratio = loan_amt / max(1, income)
                if loan_ratio > 3.0:
                    risk += 20
                elif loan_ratio > 2.0:
                    risk += 10
            if savings < loan_amt * 0.1:
                risk += 5

            # Age-related stability risk
            if age < 21:
                risk += 10
            elif age > 75:
                risk += 8

            # Clamp to [0, 100]
            risk_score = int(max(0, min(100, round(risk))))

            if risk_score <= 30:
                risk_level = "low"
            elif risk_score <= 70:
                risk_level = "medium"
            else:
                risk_level = "high"

            # Triggered rules
            rules: List[str] = []
            if dti > 0.4:
                rules.append("high_debt_to_income")
            if credit < 580:
                rules.append("low_credit_score")
            if income > 0 and (loan_amt / income) > 3.0:
                rules.append("large_loan_relative_income")
            if age < 21 or age > 75:
                rules.append("age_risk")

            return {
                "risk_score": risk_score,
                "risk_level": risk_level,
                "triggered_rules": rules,
            }
        
        validation_result = run_validation(
            model_func=model_eval_func,
            synthetic_cases=synthetic_cases,
            include_stability_test=request.include_stability_test
        )
        
        validation_summary = extract_validation_summary(validation_result["results"])
        
        # Step 3: Compute fairness metrics
        logger.info("Computing fairness metrics...")
        
        # Transform results to metrics input format
        results_for_metrics = []
        for r in validation_result["results"]:
            results_for_metrics.append({
                "input": r["input"],
                "output": r["output"],
                "sensitive_attributes": {
                    "gender": r["input"].get("applicant", {}).get("gender"),
                    "ethnicity": r["input"].get("applicant", {}).get("ethnicity"),
                    "age": r["input"].get("applicant", {}).get("age"),
                    "disability": r["input"].get("applicant", {}).get("disability"),
                }
            })
        
        # If stability test was performed, transform noisy results
        noisy_for_metrics = None
        if validation_result.get("stability_test_performed") and "noisy_results" in validation_result:
            noisy_for_metrics = []
            for r in validation_result["noisy_results"]:
                noisy_for_metrics.append({
                    "input": r["input"],
                    "output": r["output"],
                    "sensitive_attributes": {
                        "gender": r["input"].get("applicant", {}).get("gender"),
                        "ethnicity": r["input"].get("applicant", {}).get("ethnicity"),
                        "age": r["input"].get("applicant", {}).get("age"),
                        "disability": r["input"].get("applicant", {}).get("disability"),
                    }
                })
        
        all_metrics = calculate_all_metrics(
            results=results_for_metrics,
            results_noisy=noisy_for_metrics
        )

        # Shape metrics for report generator (expects list of metric dicts)
        metrics_list = []
        for name, md in all_metrics.get("metrics", {}).items():
            metrics_list.append({
                "metric": name,
                "score": md.get("score"),
                "level": md.get("level"),
                "explanation": md.get("explanation"),
            })
        metrics_for_report = {
            "overall_fairness_score": all_metrics.get("overall_fairness_score", 0.0),
            "metrics": metrics_list,
        }
        
        # Step 4: Generate validation report
        logger.info("Generating validation report...")
        model_metadata = {
            "name": request.model_name,
            "version": request.model_version,
            "description": request.model_description or "Ethical AI model for loan decision analysis",
        }
        
        report = generate_validation_report(
            model_metadata=model_metadata,
            synthetic_stats=dataset_stats,
            metrics=metrics_for_report,
            validation_summary=validation_summary,
            include_html=request.include_html_report
        )
        
        logger.info(f"Validation complete: status={report['status']}, score={report['overall_score']:.1f}")
        
        # Step 5: Return summary
        return ValidateModelResponse(
            report_id=report["report_json"]["report_id"],
            status=report["status"],
            overall_score=report["overall_score"],
            confidence_score=report["report_json"]["confidence_score"],
            total_cases=dataset_stats["total_cases"],
            metrics_summary={
                "overall_fairness_score": all_metrics["overall_fairness_score"],
                "num_critical": sum(1 for m in all_metrics["metrics"].values() if m.get("level") == "critical"),
                "num_warnings": sum(1 for m in all_metrics["metrics"].values() if m.get("level") == "warning"),
                "num_acceptable": sum(1 for m in all_metrics["metrics"].values() if m.get("level") == "acceptable"),
            },
            recommendations=report["recommendations"],
            report_json=report["report_json"],
            report_html=report.get("report_html"),
        )
    
    except Exception as e:
        logger.error(f"Model validation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Model validation failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "model_validation"}
