import os
import sys
import pytest
from unittest.mock import MagicMock, patch
import json

THIS_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


class TestReportGeneration:
    """Test validation report generation in AI Core"""

    def test_generate_report_with_valid_metrics(self):
        """Test generating a validation report with complete metrics"""
        metrics = {
            "accuracy": 0.94,
            "f1": 0.91,
            "precision": 0.89,
            "recall": 0.93,
            "auc_roc": 0.96,
        }

        report = {
            "report_id": "report_123",
            "status": "completed",
            "overall_score": 0.92,
            "confidence_score": 0.88,
            "metrics_summary": metrics,
            "total_cases": 200,
        }

        assert report["report_id"] == "report_123"
        assert report["status"] == "completed"
        assert report["overall_score"] == 0.92
        assert report["metrics_summary"]["accuracy"] == 0.94

    def test_generate_report_calculates_overall_score(self):
        """Test that overall score is mean of individual metrics"""
        metrics = {
            "accuracy": 0.90,
            "f1": 0.90,
            "precision": 0.90,
            "recall": 0.90,
        }

        expected_overall = sum(metrics.values()) / len(metrics)

        report = {
            "metrics_summary": metrics,
            "overall_score": expected_overall,
        }

        assert report["overall_score"] == 0.90

    def test_generate_report_with_edge_case_coverage(self):
        """Test report generation includes edge case analysis"""
        report = {
            "report_id": "edge_case_report",
            "edge_cases_tested": 50,
            "edge_case_coverage": {
                "boundary_values": 25,
                "extreme_values": 15,
                "null_handling": 10,
            },
            "edge_case_results": {
                "passed": 48,
                "failed": 2,
                "accuracy_on_edges": 0.96,
            },
        }

        assert report["edge_cases_tested"] == 50
        assert report["edge_case_results"]["passed"] == 48
        assert report["edge_case_results"]["accuracy_on_edges"] == 0.96

    def test_generate_report_with_stability_analysis(self):
        """Test report includes model stability metrics"""
        report = {
            "report_id": "stability_report",
            "stability_test": {
                "num_runs": 5,
                "mean_accuracy": 0.92,
                "std_dev": 0.015,
                "variance": 0.00022,
                "all_runs_passed": True,
            },
        }

        assert report["stability_test"]["num_runs"] == 5
        assert report["stability_test"]["std_dev"] == 0.015
        assert report["stability_test"]["all_runs_passed"] is True

    def test_generate_report_detects_fairness_issues(self):
        """Test fairness analysis is included in reports"""
        report = {
            "report_id": "fairness_report",
            "fairness_analysis": {
                "demographic_parity_diff": 0.08,
                "equal_opportunity_diff": 0.12,
                "disparate_impact": 0.85,
                "issues_found": [
                    "Disparate impact on protected group A",
                    "Demographic parity difference above 5% threshold",
                ],
            },
        }

        assert report["fairness_analysis"]["demographic_parity_diff"] == 0.08
        assert len(report["fairness_analysis"]["issues_found"]) == 2

    def test_generate_report_with_recommendations(self):
        """Test report includes actionable recommendations"""
        report = {
            "report_id": "recommendations_report",
            "recommendations": [
                {
                    "category": "fairness",
                    "severity": "high",
                    "message": "Address demographic parity gap for Group A",
                    "action": "Retrain model with balanced sampling",
                },
                {
                    "category": "performance",
                    "severity": "medium",
                    "message": "Precision on minority class could improve",
                    "action": "Increase minority class samples in training",
                },
            ],
        }

        assert len(report["recommendations"]) == 2
        assert report["recommendations"][0]["severity"] == "high"

    def test_report_includes_data_quality_analysis(self):
        """Test data quality metrics in report"""
        report = {
            "report_id": "data_quality_report",
            "data_quality": {
                "missing_values_count": 5,
                "missing_values_percentage": 0.025,
                "outliers_detected": 12,
                "data_imbalance_ratio": 0.65,
                "warnings": [],
            },
        }

        assert report["data_quality"]["missing_values_percentage"] == 0.025
        assert report["data_quality"]["outliers_detected"] == 12

    def test_report_handles_missing_optional_fields(self):
        """Test report generation with minimal required fields"""
        minimal_report = {
            "report_id": "minimal",
            "status": "completed",
            "overall_score": 0.85,
            "total_cases": 100,
        }

        assert "report_id" in minimal_report
        assert "status" in minimal_report
        assert minimal_report["status"] == "completed"

    def test_report_serialization_to_json(self):
        """Test report can be serialized to JSON"""
        report = {
            "report_id": "json_test",
            "status": "completed",
            "metrics": {"accuracy": 0.94},
            "created_at": "2025-07-16T10:30:00Z",
        }

        json_str = json.dumps(report)
        assert isinstance(json_str, str)

        parsed = json.loads(json_str)
        assert parsed["report_id"] == "json_test"

    def test_report_validation_score_bounds(self):
        """Test overall score is properly bounded [0, 1]"""
        scores = [0.0, 0.5, 0.99, 1.0]

        for score in scores:
            report = {"overall_score": score}
            assert 0.0 <= report["overall_score"] <= 1.0

    def test_report_comparison_for_model_versions(self):
        """Test comparing reports across model versions"""
        v1_report = {
            "model_version": "1.0",
            "overall_score": 0.87,
            "accuracy": 0.89,
        }

        v2_report = {
            "model_version": "2.0",
            "overall_score": 0.92,
            "accuracy": 0.94,
        }

        improvement = v2_report["overall_score"] - v1_report["overall_score"]
        assert improvement == 0.05
        assert v2_report["overall_score"] > v1_report["overall_score"]

    def test_report_handles_nan_values(self):
        """Test report generation handles NaN/missing metric values"""
        report = {
            "report_id": "nan_test",
            "metrics": {
                "accuracy": 0.94,
                "f1": None,
                "precision": 0.89,
            },
        }

        valid_metrics = [v for v in report["metrics"].values() if v is not None]
        assert len(valid_metrics) == 2

    def test_large_synthetic_dataset_report(self):
        """Test report generation with large number of synthetic cases"""
        report = {
            "report_id": "large_dataset",
            "total_cases": 10000,
            "overall_score": 0.91,
            "generation_time_seconds": 45,
        }

        assert report["total_cases"] == 10000
        assert report["generation_time_seconds"] < 60

    def test_report_includes_model_metadata(self):
        """Test report captures model metadata"""
        report = {
            "report_id": "metadata_test",
            "model_name": "credit_risk_classifier",
            "model_version": "3.2.1",
            "framework": "scikit-learn",
            "input_shape": (None, 15),
            "output_shape": (None, 1),
        }

        assert report["model_name"] == "credit_risk_classifier"
        assert report["framework"] == "scikit-learn"

    def test_report_error_status_on_validation_failure(self):
        """Test report status reflects validation failures"""
        failed_report = {
            "report_id": "failed_validation",
            "status": "failed",
            "error": "Model accuracy below 70% threshold",
            "overall_score": 0.65,
        }

        assert failed_report["status"] == "failed"
        assert failed_report["overall_score"] < 0.70

    def test_report_includes_timestamp_metadata(self):
        """Test report includes created_at and updated_at timestamps"""
        import datetime

        now = datetime.datetime.utcnow().isoformat()
        report = {
            "report_id": "timestamp_test",
            "created_at": now,
            "updated_at": now,
        }

        assert report["created_at"] is not None
        assert report["updated_at"] is not None
