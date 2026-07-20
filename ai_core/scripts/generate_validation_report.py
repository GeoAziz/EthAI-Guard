#!/usr/bin/env python3
"""
Generate validation report for retrained model.

Creates comprehensive validation report including performance metrics,
fairness analysis, and recommendations.
"""
import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

import numpy as np
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def _load_json(path: str) -> Dict[str, Any] | None:
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return json.load(f)


def generate_validation_report(
    model_id: str,
    request_id: str,
    output_dir: str = 'validation'
) -> Dict[str, Any]:
    """
    Generate a validation report from the real artifacts produced by this
    retraining pipeline: train_model.py's metadata JSON (models/) and
    validation_tests.py's test-results JSON (output_dir/). If either is
    missing, the report is marked as failed/needing manual review rather
    than fabricating passing metrics.

    Args:
        model_id: Model identifier
        request_id: Retrain request ID
        output_dir: Directory containing validation_tests.py's results
                    (also where this report is written)

    Returns:
        Validation report dict
    """
    os.makedirs(output_dir, exist_ok=True)

    test_results = _load_json(os.path.join(output_dir, f'{model_id}_test_results.json'))

    report = {
        'model_id': model_id,
        'request_id': request_id,
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'summary': {
            'status': 'passed',
            'issues': [],
            'warnings': [],
            'recommendations': []
        },
        'performance_metrics': None,
        'stability_metrics': None,
        'recommendations': [],
        'approval_status': 'manual_review_required',
        'next_steps': [
            'Review report with stakeholders',
            'Perform A/B testing if in production',
            'Schedule promotion to production'
        ]
    }

    if test_results is None:
        report['summary']['status'] = 'failed'
        report['summary']['issues'].append(
            f'No validation_tests.py results found at {output_dir}/{model_id}_test_results.json; '
            'validation must run before this model can be promoted.'
        )
        report['approval_status'] = 'failed'
    elif not test_results.get('passed'):
        report['summary']['status'] = 'failed'
        report['summary']['issues'].append(
            f"validation_tests.py reported failure: {test_results.get('error', 'unknown error')}"
        )
        report['approval_status'] = 'failed'
    else:
        metrics = test_results['performance_metrics']
        report['performance_metrics'] = metrics
        report['stability_metrics'] = test_results.get('stability_metrics')

        if metrics['accuracy'] < 0.70:
            report['summary']['status'] = 'failed'
            report['summary']['issues'].append('Accuracy below 70% threshold')
            report['approval_status'] = 'failed'
        elif metrics['accuracy'] < 0.75:
            report['summary']['warnings'].append('Accuracy below 75% target')
            report['approval_status'] = 'manual_review_required'
        else:
            report['approval_status'] = 'ready_for_promotion'
            report['recommendations'].append('Model passed automated performance validation')

        stability = report['stability_metrics'] or {}
        if stability.get('avg_stability', 1.0) < 0.85:
            report['summary']['warnings'].append('Prediction stability below 85% under input perturbation')

    # This pipeline does not currently compute fairness metrics on retrained
    # models (validate_fairness() in validation_tests.py needs a protected
    # attribute index that main() doesn't supply yet) -- flag that gap
    # explicitly instead of reporting fabricated fairness numbers.
    report['fairness_metrics'] = None
    report['summary']['warnings'].append(
        'Fairness metrics were not computed for this retrain; review manually before promotion.'
    )

    # Save report
    report_path = os.path.join(output_dir, f'{model_id}_validation_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    logger.info(f'Validation report saved to {report_path}')

    # Save summary
    summary_path = os.path.join(output_dir, 'validation_summary.txt')
    with open(summary_path, 'w') as f:
        f.write(f'Validation Report: {model_id}\n')
        f.write(f'Generated: {report["generated_at"]}\n')
        f.write(f'Status: {report["approval_status"]}\n\n')

        f.write('Performance Metrics:\n')
        if report['performance_metrics']:
            for metric, value in report['performance_metrics'].items():
                f.write(f'  {metric}: {value:.4f}\n')
        else:
            f.write('  (not available)\n')

        f.write('\nFairness Metrics:\n')
        if report['fairness_metrics']:
            for attr, values in report['fairness_metrics'].items():
                f.write(f'  {attr}:\n')
                for key, value in values.items():
                    f.write(f'    {key}: {value:.4f}\n')
        else:
            f.write('  (not computed for this retrain)\n')

        if report['summary']['issues']:
            f.write('\nIssues:\n')
            for issue in report['summary']['issues']:
                f.write(f'  - {issue}\n')

        if report['summary']['warnings']:
            f.write('\nWarnings:\n')
            for warning in report['summary']['warnings']:
                f.write(f'  - {warning}\n')

        f.write('\nRecommendations:\n')
        for rec in report['summary']['recommendations']:
            f.write(f'  - {rec}\n')

    logger.info(f'Validation summary saved to {summary_path}')

    return report


def main():
    parser = argparse.ArgumentParser(description='Generate validation report')
    parser.add_argument('--model-id', required=True, help='Model ID')
    parser.add_argument('--request-id', required=True, help='Retrain request ID')
    parser.add_argument('--output-dir', default='validation', help='Output directory')

    args = parser.parse_args()

    try:
        report = generate_validation_report(
            model_id=args.model_id,
            request_id=args.request_id,
            output_dir=args.output_dir
        )

        logger.info(f'✓ Validation report generated')
        logger.info(f'  Status: {report["approval_status"]}')
        if report['performance_metrics']:
            logger.info(f'  Accuracy: {report["performance_metrics"]["accuracy"]:.4f}')
        if report['approval_status'] == 'failed':
            sys.exit(1)
    except Exception as e:
        logger.error(f'Failed to generate validation report: {e}', exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
