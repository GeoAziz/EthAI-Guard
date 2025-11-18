"""
Drift Detection Worker

Orchestrates drift detection in streaming-lite (5min) and batch (daily) modes.
Computes PSI, KL divergence, fairness drift, and data quality metrics.
"""
from typing import Dict, Any, List
import numpy as np
from datetime import datetime, timedelta
import argparse
import time

from . import algorithms as drift_algorithms  # type: ignore
from .baseline import BaselineManager  # type: ignore
from .alerts import AlertManager  # type: ignore


class DriftWorker:
    """
    Drift detection worker with streaming-lite and batch modes.
    """
    
    def __init__(
        self,
        db,
        baseline_manager: BaselineManager,
        alert_manager: AlertManager,
        model_id: str = 'default_model'
    ):
        """
        Initialize drift worker.
        
        Args:
            db: Database connection
            baseline_manager: Baseline snapshot manager
            alert_manager: Alert manager
            model_id: Model identifier
        """
        self.db = db
        self.baseline_manager = baseline_manager
        self.alert_manager = alert_manager
        self.model_id = model_id
    
    def run_streaming_lite(
        self,
        window_minutes: int = 5,
        max_samples: int = 1000
    ) -> Dict[str, Any]:
        """
        Run streaming-lite drift detection on recent window.
        
        Args:
            window_minutes: Size of detection window in minutes
            max_samples: Maximum number of samples to analyze
        
        Returns:
            Drift detection results
        """
        print(f"[DriftWorker] Running streaming-lite mode (window={window_minutes}min, max_samples={max_samples})")
        
        # Get baseline
        baseline = self.baseline_manager.get_baseline(self.model_id)
        if not baseline:
            print(f"[DriftWorker] No baseline found for model {self.model_id}")
            return {'error': 'No baseline available'}
        
        # Query recent evaluations
        window_start = datetime.utcnow() - timedelta(minutes=window_minutes)
        evaluations = self._fetch_recent_evaluations(window_start, max_samples)
        
        if len(evaluations) < 10:
            print(f"[DriftWorker] Insufficient samples ({len(evaluations)}), skipping detection")
            return {'error': 'Insufficient samples', 'sample_count': len(evaluations)}
        
        print(f"[DriftWorker] Analyzing {len(evaluations)} samples")
        
        # Compute drift metrics
        results = self._compute_drift(baseline, evaluations, window_start, datetime.utcnow())
        
        # Store snapshot
        self._store_snapshot(results)
        
        # Create alerts
        self._process_alerts(results)
        
        # Update Prometheus metrics (would be done via metrics export)
        self._export_metrics(results)
        
        return results
    
    def run_batch(
        self,
        lookback_days: int = 1,
        max_samples: int = 10000
    ) -> Dict[str, Any]:
        """
        Run batch drift detection for comprehensive analysis.
        
        Args:
            lookback_days: Number of days to analyze
            max_samples: Maximum number of samples to analyze
        
        Returns:
            Drift detection results
        """
        print(f"[DriftWorker] Running batch mode (lookback={lookback_days}days, max_samples={max_samples})")
        
        baseline = self.baseline_manager.get_baseline(self.model_id)
        if not baseline:
            print(f"[DriftWorker] No baseline found for model {self.model_id}")
            return {'error': 'No baseline available'}
        
        window_start = datetime.utcnow() - timedelta(days=lookback_days)
        evaluations = self._fetch_recent_evaluations(window_start, max_samples)
        
        if len(evaluations) < 50:
            print(f"[DriftWorker] Insufficient samples ({len(evaluations)}), skipping detection")
            return {'error': 'Insufficient samples', 'sample_count': len(evaluations)}
        
        print(f"[DriftWorker] Analyzing {len(evaluations)} samples")
        
        results = self._compute_drift(baseline, evaluations, window_start, datetime.utcnow())
        self._store_snapshot(results)
        self._process_alerts(results)
        self._export_metrics(results)
        
        return results
    
    def _fetch_recent_evaluations(
        self,
        since: datetime,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch recent evaluations from database."""
        if not self.db:
            return []
        
        try:
            since_iso = since.isoformat() + 'Z'
            evaluations = list(self.db['ethical_evaluations'].find({
                'timestamp': {'$gte': since_iso}
            }).sort('timestamp', -1).limit(limit))
            
            return evaluations
        except Exception as e:
            print(f"[DriftWorker] Error fetching evaluations: {e}")
            return []
    
    def _compute_drift(
        self,
        baseline: Dict[str, Any],
        evaluations: List[Dict[str, Any]],
        window_start: datetime,
        window_end: datetime
    ) -> Dict[str, Any]:
        """Compute all drift metrics."""
        feature_drifts = {}
        
        # Population drift (per feature)
        for feature_name, baseline_stats in baseline['feature_stats'].items():
            if baseline_stats['type'] == 'numeric':
                # Extract current values
                current_values = [
                    eval.get('input_summary', {}).get(feature_name)
                    for eval in evaluations
                    if eval.get('input_summary', {}).get(feature_name) is not None
                ]
                
                if len(current_values) < 10:
                    continue
                
                current_values_array = np.array(current_values, dtype=float)
                
                # Compute histogram with same bins as baseline
                bin_edges = np.array(baseline_stats['bin_edges'])
                current_hist, _ = np.histogram(current_values_array, bins=bin_edges)
                baseline_hist = np.array(baseline_stats['histogram'])
                
                # Compute PSI
                psi = drift_algorithms.compute_psi(baseline_hist, current_hist)
                severity = drift_algorithms.classify_psi_severity(psi)
                
                feature_drifts[feature_name] = {
                    'psi': psi,
                    'psi_severity': severity,
                    'mean_baseline': baseline_stats['mean'],
                    'mean_current': float(np.mean(current_values_array)),
                    'std_baseline': baseline_stats['std'],
                    'std_current': float(np.std(current_values_array))
                }
        
        # Concept drift (score distribution)
        scores = [eval.get('risk_score', 0) for eval in evaluations]
        scores_array = np.array(scores, dtype=float)
        
        baseline_score_stats = baseline['score_stats']
        bin_edges = np.array(baseline_score_stats['bin_edges'])
        current_score_hist, _ = np.histogram(scores_array, bins=bin_edges)
        baseline_score_hist = np.array(baseline_score_stats['histogram'])
        
        score_kl = drift_algorithms.compute_kl_divergence(baseline_score_hist, current_score_hist)
        score_drift = {
            'kl': score_kl,
            'kl_severity': drift_algorithms.classify_kl_severity(score_kl),
            'mean_baseline': baseline_score_stats['mean'],
            'mean_current': float(np.mean(scores_array)),
            'p95_baseline': baseline_score_stats['p95'],
            'p95_current': float(np.percentile(scores_array, 95))
        }
        
        # Fairness drift (simplified - would compute from protected attributes)
        fairness_drift = {}  # Placeholder
        
        # Data quality drift
        null_rates_current = {}
        for feature_name in baseline['feature_stats'].keys():
            total = len(evaluations)
            null_count = sum(
                1 for eval in evaluations
                if eval.get('input_summary', {}).get(feature_name) is None
            )
            null_rates_current[feature_name] = null_count / total if total > 0 else 0.0
        
        data_quality_current = {'null_rates': null_rates_current}
        data_quality_baseline = baseline['data_quality']
        data_quality_drift = drift_algorithms.compute_data_quality_drift(data_quality_baseline, data_quality_current)
        
        # Aggregate
        aggregated = drift_algorithms.aggregate_drift_metrics(
            feature_drifts,
            score_drift,
            fairness_drift,
            data_quality_drift,
            {'stable': True, 'avg_similarity': 1.0}  # Placeholder for explanation stability
        )
        
        # Add metadata
        aggregated['model_id'] = self.model_id
        aggregated['window_start'] = window_start.isoformat() + 'Z'
        aggregated['window_end'] = window_end.isoformat() + 'Z'
        aggregated['sample_count'] = len(evaluations)
        aggregated['baseline_created_at'] = baseline['created_at']
        
        return aggregated
    
    def _store_snapshot(self, results: Dict[str, Any]) -> None:
        """Store drift snapshot in database."""
        if not self.db:
            return
        
        try:
            snapshot = {
                'model_id': results['model_id'],
                'window_start': results['window_start'],
                'window_end': results['window_end'],
                'sample_count': results['sample_count'],
                'overall_status': results['overall_status'],
                'critical_count': results['critical_count'],
                'warning_count': results['warning_count'],
                'feature_drifts': results['feature_drifts'],
                'score_drift': results['score_drift'],
                'fairness_drift': results['fairness_drift'],
                'data_quality_drift': results['data_quality_drift'],
                'needs_retraining': results['needs_retraining'],
                'created_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            self.db['drift_snapshots'].insert_one(snapshot)
            print(f"[DriftWorker] Stored snapshot with status={results['overall_status']}")
        except Exception as e:
            print(f"[DriftWorker] Error storing snapshot: {e}")
    
    def _process_alerts(self, results: Dict[str, Any]) -> None:
        """Create alerts for drift violations."""
        if not self.alert_manager:
            return
        
        # Feature drift alerts
        for feature, metrics in results['feature_drifts'].items():
            if metrics['psi_severity'] in ['warning', 'critical']:
                self.alert_manager.create_alert(
                    model_id=self.model_id,
                    alert_type='population_drift',
                    severity=metrics['psi_severity'],
                    metric_name=f'psi_{feature}',
                    metric_value=metrics['psi'],
                    threshold=0.25 if metrics['psi_severity'] == 'critical' else 0.1,
                    window_start=results['window_start'],
                    window_end=results['window_end'],
                    details={'feature': feature, 'metrics': metrics}
                )
        
        # Score drift alerts
        if results['score_drift']['kl_severity'] in ['warning', 'critical']:
            self.alert_manager.create_alert(
                model_id=self.model_id,
                alert_type='concept_drift',
                severity=results['score_drift']['kl_severity'],
                metric_name='score_kl_divergence',
                metric_value=results['score_drift']['kl'],
                threshold=0.3 if results['score_drift']['kl_severity'] == 'critical' else 0.1,
                window_start=results['window_start'],
                window_end=results['window_end'],
                details=results['score_drift']
            )
        
        # Data quality alerts
        for alert in results['data_quality_drift'].get('alerts', []):
            self.alert_manager.create_alert(
                model_id=self.model_id,
                alert_type='data_quality',
                severity=alert['severity'],
                metric_name=f"data_quality_{alert['type']}",
                metric_value=alert.get('current', 0),
                threshold=alert.get('baseline', 0) + 0.15 if alert['severity'] == 'critical' else 0.05,
                window_start=results['window_start'],
                window_end=results['window_end'],
                details=alert
            )
        
        print(f"[DriftWorker] Created alerts: {results['critical_count']} critical, {results['warning_count']} warnings")
    
    def _export_metrics(self, results: Dict[str, Any]) -> None:
        """Export metrics to Prometheus (placeholder)."""
        # In production, would update Prometheus gauges here
        # For now, just log
        print(f"[DriftWorker] Metrics: status={results['overall_status']}, " +
              f"critical={results['critical_count']}, warnings={results['warning_count']}")


def main():
    """CLI entry point for drift worker."""
    parser = argparse.ArgumentParser(description='Drift Detection Worker')
    parser.add_argument('--mode', choices=['streaming', 'batch'], default='streaming',
                        help='Detection mode')
    parser.add_argument('--window', type=int, default=5,
                        help='Window size in minutes (streaming) or days (batch)')
    parser.add_argument('--model-id', default='default_model',
                        help='Model identifier')
    parser.add_argument('--continuous', action='store_true',
                        help='Run continuously (streaming mode only)')
    parser.add_argument('--interval', type=int, default=5,
                        help='Interval between runs in minutes (continuous mode)')
    
    args = parser.parse_args()
    
    # Initialize components (would load from config in production)
    try:
        from ai_core.utils.persistence import get_db
        db = get_db()
    except Exception:
        print("Warning: Could not connect to database, running in dry-run mode")
        db = None
    
    baseline_manager = BaselineManager(db)
    alert_manager = AlertManager(db)
    worker = DriftWorker(db, baseline_manager, alert_manager, args.model_id)
    
    if args.continuous and args.mode == 'streaming':
        print(f"Running continuously with {args.interval}min interval. Press Ctrl+C to stop.")
        while True:
            try:
                worker.run_streaming_lite(window_minutes=args.window)
                time.sleep(args.interval * 60)
            except KeyboardInterrupt:
                print("\nStopping worker...")
                break
            except Exception as e:
                print(f"Error in worker loop: {e}")
                time.sleep(args.interval * 60)
    else:
        if args.mode == 'streaming':
            results = worker.run_streaming_lite(window_minutes=args.window)
        else:
            results = worker.run_batch(lookback_days=args.window)
        
        print(f"\nResults: {results.get('overall_status', 'unknown')}")
        print(f"Critical: {results.get('critical_count', 0)}, Warnings: {results.get('warning_count', 0)}")


if __name__ == '__main__':
    main()
