"""
Compliance Checker

Validates Model Cards against internal policies and external regulations.
Returns PASS/WARNING/FAIL status with detailed violation reports.

Usage:
    python compliance_checker.py \\
        --model-card docs/model_cards/fairlens_v2_1_0.json \\
        --policies governance/policies.yaml \\
        --output compliance_reports/fairlens_v2_1_0.json
"""

import json
import yaml
import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class CheckResult:
    """Result of a single compliance check"""
    check_name: str
    status: str  # PASS, WARNING, FAIL
    details: Dict[str, Any]
    severity: Optional[str] = None  # LOW, MEDIUM, HIGH, CRITICAL
    message: Optional[str] = None
    regulation: Optional[str] = None


@dataclass
class ComplianceReport:
    """Complete compliance validation report"""
    model_id: str
    check_timestamp: str
    overall_status: str  # PASS, WARNING, FAIL
    checks: List[Dict[str, Any]]
    violations: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]
    summary: Dict[str, int]
    
    def to_dict(self) -> Dict:
        return asdict(self)


class ComplianceChecker:
    """Validate Model Cards against policies"""
    
    def __init__(self, policy_config_path: str):
        """
        Initialize Compliance Checker
        
        Args:
            policy_config_path: Path to policies YAML file
        """
        self.policies = self._load_policies(policy_config_path)
    
    def _load_policies(self, path: str) -> Dict:
        """Load policy configuration from YAML"""
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    
    def check_compliance(self, model_card_path: str) -> ComplianceReport:
        """
        Validate Model Card against all policies
        
        Args:
            model_card_path: Path to Model Card JSON file
        
        Returns:
            ComplianceReport with overall status and violations
        """
        # Load Model Card
        with open(model_card_path, 'r') as f:
            model_card = json.load(f)
        
        model_id = model_card.get('model_metadata', {}).get('model_id', 'unknown')
        
        # Run all checks
        results = []
        results.append(self._check_fairness_thresholds(model_card))
        results.append(self._check_performance_thresholds(model_card))
        results.append(self._check_explainability(model_card))
        results.append(self._check_protected_attribute_leakage(model_card))
        results.append(self._check_data_quality(model_card))
        results.extend(self._check_regulatory_requirements(model_card))
        
        # Filter out None results
        results = [r for r in results if r is not None]
        
        # Aggregate status
        overall_status = self._aggregate_status(results)
        
        # Extract violations and warnings
        violations = [r for r in results if r.status == "FAIL"]
        warnings = [r for r in results if r.status == "WARNING"]
        
        # Build summary
        summary = {
            "total_checks": len(results),
            "passed": len([r for r in results if r.status == "PASS"]),
            "warnings": len(warnings),
            "failures": len(violations)
        }
        
        return ComplianceReport(
            model_id=model_id,
            check_timestamp=datetime.now().isoformat() + "Z",
            overall_status=overall_status,
            checks=[asdict(r) for r in results],
            violations=[asdict(v) for v in violations],
            warnings=[asdict(w) for w in warnings],
            summary=summary
        )
    
    def _aggregate_status(self, results: List[CheckResult]) -> str:
        """Determine overall status from individual check results"""
        if any(r.status == "FAIL" for r in results):
            return "FAIL"
        elif any(r.status == "WARNING" for r in results):
            return "WARNING"
        else:
            return "PASS"
    
    def _check_fairness_thresholds(self, model_card: Dict) -> CheckResult:
        """
        Check fairness metrics against policy thresholds:
        - Demographic parity difference < 0.10
        - Disparate impact ratio > 0.80
        - Equal opportunity difference < 0.05
        """
        fairness_metrics = model_card.get('fairness_metrics', {})
        
        if not fairness_metrics:
            return CheckResult(
                check_name="Fairness Thresholds",
                status="WARNING",
                details={"message": "No fairness metrics found in Model Card"},
                severity="MEDIUM",
                message="Fairness metrics missing - cannot validate"
            )
        
        policies = self.policies.get('fairness_policies', {})
        violations = []
        
        # Check demographic parity
        dp_policy = policies.get('demographic_parity', {})
        dp_max_diff = dp_policy.get('max_difference', 0.10)
        dp_data = fairness_metrics.get('demographic_parity', {})
        
        max_dp_diff = 0.0
        for attr, groups in dp_data.items():
            if isinstance(groups, dict) and 'difference' in groups:
                diff = groups['difference']
                max_dp_diff = max(max_dp_diff, diff)
                if diff > dp_max_diff:
                    violations.append({
                        "metric": "demographic_parity",
                        "attribute": attr,
                        "value": diff,
                        "threshold": dp_max_diff,
                        "regulation": dp_policy.get('regulation', 'Internal Policy')
                    })
        
        # Check disparate impact
        di_policy = policies.get('disparate_impact', {})
        di_min_ratio = di_policy.get('min_ratio', 0.80)
        di_data = fairness_metrics.get('disparate_impact', {})
        
        min_di_ratio = 1.0
        for attr, groups in di_data.items():
            if isinstance(groups, dict) and 'ratio' in groups:
                ratio = groups['ratio']
                min_di_ratio = min(min_di_ratio, ratio)
                if ratio < di_min_ratio:
                    violations.append({
                        "metric": "disparate_impact",
                        "attribute": attr,
                        "value": ratio,
                        "threshold": di_min_ratio,
                        "regulation": di_policy.get('regulation', 'Internal Policy')
                    })
        
        # Check equal opportunity
        eo_policy = policies.get('equal_opportunity', {})
        eo_max_diff = eo_policy.get('max_difference', 0.05)
        eo_data = fairness_metrics.get('equal_opportunity', {})
        
        for attr, groups in eo_data.items():
            if isinstance(groups, dict) and 'difference' in groups:
                diff = groups['difference']
                if diff > eo_max_diff:
                    violations.append({
                        "metric": "equal_opportunity",
                        "attribute": attr,
                        "value": diff,
                        "threshold": eo_max_diff,
                        "regulation": eo_policy.get('regulation', 'Internal Policy')
                    })
        
        if violations:
            return CheckResult(
                check_name="Fairness Thresholds",
                status="FAIL",
                details={
                    "violations": violations,
                    "max_demographic_parity_diff": max_dp_diff,
                    "min_disparate_impact_ratio": min_di_ratio
                },
                severity="CRITICAL",
                message=f"Fairness thresholds violated: {len(violations)} metric(s) failed"
            )
        else:
            return CheckResult(
                check_name="Fairness Thresholds",
                status="PASS",
                details={
                    "max_demographic_parity_diff": max_dp_diff,
                    "dp_threshold": dp_max_diff,
                    "min_disparate_impact_ratio": min_di_ratio,
                    "di_threshold": di_min_ratio,
                    "passed": True
                }
            )
    
    def _check_performance_thresholds(self, model_card: Dict) -> CheckResult:
        """
        Check performance metrics against minimum thresholds:
        - Minimum accuracy >= 0.75
        - Minimum AUC-ROC >= 0.70
        """
        performance = model_card.get('performance', {})
        policies = self.policies.get('performance_policies', {})
        
        accuracy = performance.get('overall_accuracy', 0.0)
        auc_roc = performance.get('auc_roc', 0.0)
        
        min_accuracy = policies.get('minimum_accuracy', {}).get('threshold', 0.75)
        min_auc = policies.get('minimum_auc_roc', {}).get('threshold', 0.70)
        
        violations = []
        
        if accuracy < min_accuracy:
            violations.append({
                "metric": "accuracy",
                "value": accuracy,
                "threshold": min_accuracy
            })
        
        if auc_roc < min_auc:
            violations.append({
                "metric": "auc_roc",
                "value": auc_roc,
                "threshold": min_auc
            })
        
        if violations:
            return CheckResult(
                check_name="Performance Thresholds",
                status="FAIL",
                details={
                    "violations": violations,
                    "accuracy": accuracy,
                    "auc_roc": auc_roc
                },
                severity="HIGH",
                message=f"Performance below minimum thresholds: {len(violations)} metric(s) failed"
            )
        else:
            return CheckResult(
                check_name="Performance Thresholds",
                status="PASS",
                details={
                    "accuracy": accuracy,
                    "minimum_accuracy": min_accuracy,
                    "auc_roc": auc_roc,
                    "minimum_auc": min_auc,
                    "passed": True
                }
            )
    
    def _check_explainability(self, model_card: Dict) -> CheckResult:
        """
        Check explainability requirements:
        - SHAP explanations available
        - Interpretability score >= 0.70
        """
        explainability = model_card.get('explainability', {})
        policies = self.policies.get('explainability_policies', {})
        
        if not explainability:
            return CheckResult(
                check_name="Explainability",
                status="WARNING",
                details={"message": "No explainability data found"},
                severity="MEDIUM",
                message="Explainability data missing"
            )
        
        min_score = policies.get('interpretability_score', {}).get('min_score', 0.70)
        interpretability_score = explainability.get('interpretability_score', 0.0)
        
        if interpretability_score < min_score:
            return CheckResult(
                check_name="Explainability",
                status="FAIL",
                details={
                    "interpretability_score": interpretability_score,
                    "minimum_threshold": min_score
                },
                severity="MEDIUM",
                message=f"Interpretability score {interpretability_score:.2f} below threshold {min_score}"
            )
        else:
            return CheckResult(
                check_name="Explainability",
                status="PASS",
                details={
                    "method": explainability.get('method', 'Unknown'),
                    "interpretability_score": interpretability_score,
                    "threshold": min_score,
                    "passed": True
                }
            )
    
    def _check_protected_attribute_leakage(self, model_card: Dict) -> Optional[CheckResult]:
        """
        Check that protected attributes are NOT in top 5 features
        """
        explainability = model_card.get('explainability', {})
        fairness_metrics = model_card.get('fairness_metrics', {})
        
        if not explainability or not fairness_metrics:
            return CheckResult(
                check_name="Protected Attribute Leakage",
                status="WARNING",
                details={"message": "Insufficient data to check"},
                severity="LOW",
                message="Cannot verify protected attribute leakage - missing data"
            )
        
        protected_attrs = fairness_metrics.get('protected_attributes', [])
        global_importance = explainability.get('global_importance', {})
        top_features = global_importance.get('top_features', [])
        
        if not top_features:
            return None  # Skip if no feature importance data
        
        # Extract feature names from top 5
        top_5_names = [f.get('feature', '') for f in top_features[:5]]
        
        # Check for protected attributes in top 5
        leakage = []
        for attr in protected_attrs:
            if attr in top_5_names:
                rank = top_5_names.index(attr) + 1
                leakage.append({
                    "attribute": attr,
                    "rank": rank
                })
        
        if leakage:
            # If protected attribute in top 5, it's a warning (not necessarily failure)
            # because some attributes like age might be legitimate business factors
            return CheckResult(
                check_name="Protected Attribute Leakage",
                status="WARNING",
                details={
                    "protected_attributes_found": leakage,
                    "top_5_features": top_5_names
                },
                severity="HIGH",
                message=f"Protected attribute(s) found in top 5 features: {[l['attribute'] for l in leakage]}"
            )
        else:
            return CheckResult(
                check_name="Protected Attribute Leakage",
                status="PASS",
                details={
                    "top_5_features": top_5_names,
                    "protected_attributes": protected_attrs,
                    "passed": True
                }
            )
    
    def _check_data_quality(self, model_card: Dict) -> Optional[CheckResult]:
        """Check training data quality metrics"""
        training_data = model_card.get('training_data', {})
        data_quality = training_data.get('data_quality', {})
        
        if not data_quality:
            return None  # Skip if no data quality info
        
        completeness = data_quality.get('completeness', 1.0)
        min_completeness = self.policies.get('data_quality_policies', {}).get('completeness', {}).get('min_score', 0.90)
        
        if completeness < min_completeness:
            return CheckResult(
                check_name="Data Quality",
                status="WARNING",
                details={
                    "completeness": completeness,
                    "threshold": min_completeness
                },
                severity="MEDIUM",
                message=f"Data completeness {completeness:.1%} below threshold {min_completeness:.1%}"
            )
        else:
            return CheckResult(
                check_name="Data Quality",
                status="PASS",
                details={
                    "completeness": completeness,
                    "threshold": min_completeness,
                    "passed": True
                }
            )
    
    def _check_regulatory_requirements(self, model_card: Dict) -> List[CheckResult]:
        """Check regulatory compliance requirements"""
        results = []
        compliance = model_card.get('compliance', {})
        regulations = compliance.get('regulations', [])
        
        # Check EU AI Act
        eu_reg = next((r for r in regulations if 'EU AI Act' in r.get('regulation', '')), None)
        if eu_reg:
            if eu_reg.get('compliance_status') == 'COMPLIANT':
                results.append(CheckResult(
                    check_name="EU AI Act Compliance",
                    status="PASS",
                    details={
                        "risk_level": eu_reg.get('risk_level', 'Unknown'),
                        "requirements_met": eu_reg.get('requirements_met', [])
                    }
                ))
            else:
                results.append(CheckResult(
                    check_name="EU AI Act Compliance",
                    status="FAIL",
                    details={"status": eu_reg.get('compliance_status')},
                    severity="CRITICAL",
                    message="Model not compliant with EU AI Act",
                    regulation="EU AI Act"
                ))
        
        # Check Kenya Data Protection Act
        kenya_reg = next((r for r in regulations if 'Kenya' in r.get('regulation', '')), None)
        if kenya_reg:
            if kenya_reg.get('compliance_status') == 'COMPLIANT':
                results.append(CheckResult(
                    check_name="Kenya Data Protection Act Compliance",
                    status="PASS",
                    details={
                        "requirements_met": kenya_reg.get('requirements_met', [])
                    }
                ))
        
        return results


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description="Validate Model Card compliance")
    parser.add_argument("--model-card", required=True, help="Path to Model Card JSON file")
    parser.add_argument("--policies", required=True, help="Path to policies YAML file")
    parser.add_argument("--output", help="Output path for compliance report JSON (optional)")
    
    args = parser.parse_args()
    
    # Check compliance
    checker = ComplianceChecker(args.policies)
    report = checker.check_compliance(args.model_card)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"COMPLIANCE CHECK REPORT")
    print(f"{'='*60}")
    print(f"Model: {report.model_id}")
    print(f"Timestamp: {report.check_timestamp}")
    print(f"\nOverall Status: {report.overall_status}")
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total Checks: {report.summary['total_checks']}")
    print(f"✅ Passed: {report.summary['passed']}")
    print(f"⚠️  Warnings: {report.summary['warnings']}")
    print(f"❌ Failures: {report.summary['failures']}")
    
    # Print violations
    if report.violations:
        print(f"\n{'='*60}")
        print(f"VIOLATIONS (CRITICAL)")
        print(f"{'='*60}")
        for violation in report.violations:
            print(f"\n❌ {violation['check_name']}")
            print(f"   Severity: {violation.get('severity', 'UNKNOWN')}")
            print(f"   Message: {violation.get('message', 'No message')}")
            if violation.get('regulation'):
                print(f"   Regulation: {violation['regulation']}")
    
    # Print warnings
    if report.warnings:
        print(f"\n{'='*60}")
        print(f"WARNINGS")
        print(f"{'='*60}")
        for warning in report.warnings:
            print(f"\n⚠️  {warning['check_name']}")
            print(f"   Severity: {warning.get('severity', 'UNKNOWN')}")
            print(f"   Message: {warning.get('message', 'No message')}")
    
    print(f"\n{'='*60}\n")
    
    # Save report if output specified
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(report.to_dict(), f, indent=2)
        
        print(f"✅ Compliance report saved to: {args.output}")
    
    # Exit with appropriate code
    if report.overall_status == "FAIL":
        sys.exit(1)
    elif report.overall_status == "WARNING":
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
