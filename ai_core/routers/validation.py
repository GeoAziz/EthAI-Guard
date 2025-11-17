"""
Model Validation Router

Provides endpoint to run full model validation with synthetic data.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging

# Import validation components
try:
    from ai_core.synthetic.generator import generate_synthetic_cases, get_dataset_stats
    from ai_core.validation.validator import run_validation, extract_validation_summary
    from ai_core.validation.metrics import calculate_all_metrics
    from ai_core.validation.report import generate_validation_report
    from ai_core.routers.analyze_impl import run_analysis_core
except ModuleNotFoundError:
    from synthetic.generator import generate_synthetic_cases, get_dataset_stats
    from validation.validator import run_validation, extract_validation_summary
    from validation.metrics import calculate_all_metrics
    from validation.report import generate_validation_report
    from routers.analyze_impl import run_analysis_core

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
            """Wrapper to run case through analysis endpoint."""
            # Transform synthetic case to analysis input format
            analysis_input = {
                "applicant": case.get("applicant", {}),
                "financial": case.get("financial", {}),
                "request": case.get("request", {}),
                "dataset": "synthetic_validation",
            }
            # Run through core analysis logic
            result = run_analysis_core(analysis_input)
            return result
        
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
                    "disability": r["input"].get("applicant", {}).get("disability_status"),
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
                        "disability": r["input"].get("applicant", {}).get("disability_status"),
                    }
                })
        
        all_metrics = calculate_all_metrics(
            results=results_for_metrics,
            results_noisy=noisy_for_metrics
        )
        
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
            metrics=all_metrics,
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
                "num_critical": len([m for m in all_metrics["metrics"] if m["level"] == "critical"]),
                "num_warnings": len([m for m in all_metrics["metrics"] if m["level"] == "warning"]),
                "num_acceptable": len([m for m in all_metrics["metrics"] if m["level"] == "acceptable"]),
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
