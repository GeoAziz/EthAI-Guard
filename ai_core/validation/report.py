"""
Validation Report Generator

Produces comprehensive validation reports in JSON and HTML formats.
"""
from typing import Dict, Any, List
from datetime import datetime
import json


def generate_validation_report(
    model_metadata: Dict[str, Any],
    synthetic_stats: Dict[str, Any],
    metrics: Dict[str, Any],
    validation_summary: Dict[str, Any],
    include_html: bool = False
) -> Dict[str, Any]:
    """
    Generate comprehensive validation report.
    
    Args:
        model_metadata: Model name, version, description
        synthetic_stats: Dataset statistics from generator
        metrics: All fairness metrics from metrics.py
        validation_summary: Summary from validator.py
        include_html: Whether to generate HTML report
    
    Returns:
        Dict with report_json, report_html (optional), pass_fail, recommendations
    """
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Determine overall pass/fail
    overall_score = metrics.get("overall_fairness_score", 0)
    critical_metrics = [m for m in metrics.get("metrics", []) if m.get("level") == "critical"]
    
    if critical_metrics:
        status = "fail"
        status_reason = f"{len(critical_metrics)} critical fairness issue(s) detected"
    elif overall_score >= 80:
        status = "pass"
        status_reason = "All fairness metrics within acceptable thresholds"
    elif overall_score >= 60:
        status = "conditional_pass"
        status_reason = "Some fairness warnings detected, review recommended"
    else:
        status = "fail"
        status_reason = "Overall fairness score below acceptable threshold"
    
    # Generate recommendations
    recommendations = _generate_recommendations(metrics, validation_summary)
    
    # Build JSON report
    report_json = {
        "report_id": f"val-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        "timestamp": timestamp,
        "model_metadata": model_metadata,
        "synthetic_dataset": {
            "total_cases": synthetic_stats.get("total_cases", 0),
            "edge_cases": synthetic_stats.get("edge_cases", 0),
            "distribution": synthetic_stats.get("distribution", {}),
        },
        "validation_summary": validation_summary,
        "fairness_metrics": {
            "overall_score": overall_score,
            "metrics": metrics.get("metrics", []),
        },
        "status": status,
        "status_reason": status_reason,
        "recommendations": recommendations,
        "confidence_score": _calculate_confidence_score(
            synthetic_stats.get("total_cases", 0),
            validation_summary.get("successful_evaluations", 0)
        ),
    }
    
    result = {
        "report_json": report_json,
        "status": status,
        "overall_score": overall_score,
        "recommendations": recommendations,
    }
    
    # Generate HTML if requested
    if include_html:
        result["report_html"] = _generate_html_report(report_json)
    
    return result


def _generate_recommendations(metrics: Dict[str, Any], validation_summary: Dict[str, Any]) -> List[str]:
    """
    Generate actionable recommendations based on metrics.
    """
    recommendations = []
    
    for metric in metrics.get("metrics", []):
        metric_name = metric.get("metric")
        level = metric.get("level")
        score = metric.get("score", 0)
        
        if level == "critical":
            if metric_name == "disparate_impact":
                recommendations.append(
                    f"CRITICAL: Disparate impact score {score:.2f} fails 80% rule. "
                    "Review model features for protected attribute bias. Consider retraining with fairness constraints."
                )
            elif metric_name == "equal_opportunity":
                recommendations.append(
                    f"CRITICAL: Equal opportunity score {score:.2f} shows significant TPR differences. "
                    "Investigate model performance across demographic groups. Ensure training data is balanced."
                )
            elif metric_name == "demographic_parity":
                recommendations.append(
                    f"CRITICAL: Demographic parity score {score:.2f} shows unequal positive outcome rates. "
                    "Review decision thresholds and calibration across groups."
                )
            elif metric_name == "consistency":
                recommendations.append(
                    f"CRITICAL: Consistency score {score:.2f} shows high variance for similar profiles. "
                    "Model may be unstable. Review feature importance and model complexity."
                )
            elif metric_name == "stability":
                recommendations.append(
                    f"CRITICAL: Stability score {score:.2f} shows sensitivity to input noise. "
                    "Model lacks robustness. Consider regularization or ensemble methods."
                )
            elif metric_name == "rule_violations":
                recommendations.append(
                    f"CRITICAL: Rule violation severity {score:.2f} indicates ethical policy breaches. "
                    "Review triggered rules and implement safeguards."
                )
        
        elif level == "warning":
            if metric_name == "disparate_impact":
                recommendations.append(
                    f"WARNING: Disparate impact score {score:.2f} approaches critical threshold. Monitor closely."
                )
            elif metric_name == "equal_opportunity":
                recommendations.append(
                    f"WARNING: Equal opportunity score {score:.2f} shows moderate TPR differences. Review group performance."
                )
            elif metric_name == "demographic_parity":
                recommendations.append(
                    f"WARNING: Demographic parity score {score:.2f} shows outcome rate gaps. Consider threshold adjustments."
                )
            elif metric_name == "consistency":
                recommendations.append(
                    f"WARNING: Consistency score {score:.2f} shows some variance. Review feature correlations."
                )
            elif metric_name == "stability":
                recommendations.append(
                    f"WARNING: Stability score {score:.2f} shows some sensitivity to noise. Consider model robustness improvements."
                )
    
    # General recommendations
    avg_risk = validation_summary.get("avg_risk_score", 50)
    if avg_risk > 70:
        recommendations.append(
            f"Model produces high average risk score ({avg_risk:.1f}). "
            "Consider reviewing decision thresholds to avoid excessive false positives."
        )
    elif avg_risk < 30:
        recommendations.append(
            f"Model produces low average risk score ({avg_risk:.1f}). "
            "Verify model is appropriately sensitive to risk factors."
        )
    
    # If no critical issues
    if not recommendations:
        recommendations.append(
            "Model passes all fairness checks. Continue monitoring in production. "
            "Re-run validation quarterly or when training data changes."
        )
    
    return recommendations


def _calculate_confidence_score(total_cases: int, successful_evals: int) -> float:
    """
    Calculate confidence score for validation (0-100).
    
    Based on:
    - Number of test cases (more = higher confidence)
    - Evaluation success rate
    """
    if total_cases == 0:
        return 0.0
    
    # Success rate component (0-50 points)
    success_rate = successful_evals / total_cases
    success_score = success_rate * 50
    
    # Coverage component (0-50 points)
    # Full confidence at 500+ cases
    if total_cases >= 500:
        coverage_score = 50.0
    elif total_cases >= 100:
        coverage_score = 30.0 + (total_cases - 100) / 400 * 20
    else:
        coverage_score = total_cases / 100 * 30
    
    return min(100.0, success_score + coverage_score)


def _generate_html_report(report_json: Dict[str, Any]) -> str:
    """
    Generate HTML version of validation report.
    """
    status = report_json["status"]
    status_color = {
        "pass": "#10b981",
        "conditional_pass": "#f59e0b",
        "fail": "#ef4444",
    }.get(status, "#6b7280")
    
    metrics_html = ""
    for metric in report_json["fairness_metrics"]["metrics"]:
        level_color = {
            "acceptable": "#10b981",
            "warning": "#f59e0b",
            "critical": "#ef4444",
        }.get(metric["level"], "#6b7280")
        
        metrics_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{metric['metric']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{metric['score']:.2f}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <span style="background: {level_color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    {metric['level'].upper()}
                </span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{metric['explanation']}</td>
        </tr>
        """
    
    recommendations_html = ""
    for rec in report_json["recommendations"]:
        rec_color = "#ef4444" if "CRITICAL" in rec else "#f59e0b" if "WARNING" in rec else "#10b981"
        recommendations_html += f"""
        <li style="margin-bottom: 8px; padding: 8px; border-left: 3px solid {rec_color}; background: #f9fafb;">
            {rec}
        </li>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Model Validation Report - {report_json['report_id']}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f9fafb; }}
            .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
            h1 {{ color: #111827; margin-bottom: 8px; }}
            .subtitle {{ color: #6b7280; margin-bottom: 32px; }}
            .section {{ margin-bottom: 32px; }}
            .section h2 {{ color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
            th {{ text-align: left; padding: 12px; background: #f3f4f6; border-bottom: 2px solid #e5e7eb; color: #374151; }}
            .status-badge {{ display: inline-block; padding: 8px 16px; border-radius: 6px; color: white; background: {status_color}; font-weight: 600; }}
            .metric-card {{ background: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛡️ Model Validation Report</h1>
            <div class="subtitle">
                Report ID: {report_json['report_id']}<br>
                Generated: {report_json['timestamp']}<br>
                Model: {report_json['model_metadata'].get('name', 'Unknown')} v{report_json['model_metadata'].get('version', '1.0')}
            </div>
            
            <div class="section">
                <h2>Overall Status</h2>
                <div style="margin-top: 16px;">
                    <span class="status-badge">{status.upper().replace('_', ' ')}</span>
                    <p style="margin-top: 16px; color: #4b5563;">{report_json['status_reason']}</p>
                    <div style="margin-top: 16px; background: #f3f4f6; padding: 16px; border-radius: 6px;">
                        <strong>Overall Fairness Score:</strong> {report_json['fairness_metrics']['overall_score']:.1f}/100<br>
                        <strong>Confidence Score:</strong> {report_json['confidence_score']:.1f}/100
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>Test Dataset</h2>
                <p>
                    <strong>Total Cases:</strong> {report_json['synthetic_dataset']['total_cases']}<br>
                    <strong>Edge Cases:</strong> {report_json['synthetic_dataset']['edge_cases']}<br>
                    <strong>Successful Evaluations:</strong> {report_json['validation_summary'].get('successful_evaluations', 0)}<br>
                    <strong>Average Risk Score:</strong> {report_json['validation_summary'].get('avg_risk_score', 0):.1f}
                </p>
            </div>
            
            <div class="section">
                <h2>Fairness Metrics</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Score</th>
                            <th>Level</th>
                            <th>Explanation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics_html}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>Recommendations</h2>
                <ul style="list-style: none; padding: 0;">
                    {recommendations_html}
                </ul>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


def export_report_json(report: Dict[str, Any], filepath: str) -> None:
    """
    Export report to JSON file.
    """
    with open(filepath, 'w') as f:
        json.dump(report["report_json"], f, indent=2)


def export_report_html(report: Dict[str, Any], filepath: str) -> None:
    """
    Export report to HTML file.
    """
    if "report_html" not in report:
        raise ValueError("HTML report not generated. Set include_html=True when generating report.")
    
    with open(filepath, 'w') as f:
        f.write(report["report_html"])
