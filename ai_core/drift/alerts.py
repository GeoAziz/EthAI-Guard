"""
Alert Manager

Creates, tracks, and manages drift detection alerts with severity classification,
deduplication, resolution tracking, and notification dispatch.
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
import hashlib


class AlertManager:
    """
    Manages drift detection alerts with deduplication and notification.
    """

    def __init__(self, db=None, notification_handler=None):
        """
        Initialize alert manager.

        Args:
            db: Database connection
            notification_handler: Function to send notifications
        """
        self.db = db
        self.notification_handler = notification_handler

    def create_alert(
        self,
        model_id: str,
        alert_type: str,
        severity: str,
        metric_name: str,
        metric_value: float,
        threshold: float,
        window_start: str,
        window_end: str,
        details: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """
        Create a new drift alert with deduplication.

        Args:
            model_id: Model identifier
            alert_type: Type of alert (population_drift, concept_drift, fairness_drift, data_quality, stability)
            severity: Severity level (info, warning, critical)
            metric_name: Name of the metric that triggered alert
            metric_value: Current value of the metric
            threshold: Threshold that was exceeded
            window_start: Start of detection window
            window_end: End of detection window
            details: Additional alert details

        Returns:
            Created alert document
        """
        # Generate alert fingerprint for deduplication
        fingerprint = self._generate_fingerprint(model_id, alert_type, metric_name)

        # Check for existing unresolved alert with same fingerprint
        if self.db:
            existing = self._find_existing_alert(fingerprint)
            if existing:
                # Update existing alert instead of creating duplicate
                return self._update_alert(existing['_id'], metric_value, window_end)

        # Create new alert
        alert = {
            'fingerprint': fingerprint,
            'model_id': model_id,
            'type': alert_type,
            'severity': severity,
            'metric_name': metric_name,
            'metric_value': metric_value,
            'threshold': threshold,
            'window_start': window_start,
            'window_end': window_end,
            'details': details or {},
            'resolved': False,
            'acknowledged': False,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            'resolved_at': None,
            'occurrence_count': 1
        }

        # Store in database
        if self.db:
            result = self.db['drift_alerts'].insert_one(alert)
            alert['_id'] = str(result.inserted_id)

        # Send notification
        if self.notification_handler:
            self._send_notification(alert)

        return alert

    def resolve_alert(self, alert_id: str, resolution_note: str | None = None) -> bool:
        """
        Mark alert as resolved.

        Args:
            alert_id: Alert identifier
            resolution_note: Optional note about resolution

        Returns:
            True if resolved successfully
        """
        if not self.db:
            return False

        update = {
            '$set': {
                'resolved': True,
                'resolved_at': datetime.utcnow().isoformat() + 'Z',
                'updated_at': datetime.utcnow().isoformat() + 'Z'
            }
        }

        if resolution_note:
            update['$set']['resolution_note'] = resolution_note

        result = self.db['drift_alerts'].update_one(
            {'_id': alert_id},
            update
        )

        return result.modified_count > 0

    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """
        Mark alert as acknowledged.

        Args:
            alert_id: Alert identifier
            acknowledged_by: User who acknowledged

        Returns:
            True if acknowledged successfully
        """
        if not self.db:
            return False

        result = self.db['drift_alerts'].update_one(
            {'_id': alert_id},
            {
                '$set': {
                    'acknowledged': True,
                    'acknowledged_by': acknowledged_by,
                    'acknowledged_at': datetime.utcnow().isoformat() + 'Z',
                    'updated_at': datetime.utcnow().isoformat() + 'Z'
                }
            }
        )

        return result.modified_count > 0

    def get_active_alerts(
        self,
        model_id: str | None = None,
        severity: str | None = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get active (unresolved) alerts.

        Args:
            model_id: Filter by model (optional)
            severity: Filter by severity (optional)
            limit: Maximum number of alerts to return

        Returns:
            List of active alerts
        """
        if not self.db:
            return []

        query: Dict[str, Any] = {'resolved': False}
        if model_id:
            query['model_id'] = model_id
        if severity:
            query['severity'] = severity

        alerts = list(self.db['drift_alerts'].find(query).sort('created_at', -1).limit(limit))

        # Convert ObjectId to string
        for alert in alerts:
            alert['_id'] = str(alert['_id'])

        return alerts

    def get_alert_history(
        self,
        model_id: str,
        days: int = 7,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get alert history for model.

        Args:
            model_id: Model identifier
            days: Number of days to look back
            limit: Maximum number of alerts to return

        Returns:
            List of alerts
        """
        if not self.db:
            return []

        cutoff_dt = datetime.utcnow() - timedelta(days=days)
        cutoff = cutoff_dt.isoformat() + 'Z'

        alerts = list(self.db['drift_alerts'].find({
            'model_id': model_id,
            'created_at': {'$gte': cutoff}
        }).sort('created_at', -1).limit(limit))

        # Convert ObjectId to string
        for alert in alerts:
            alert['_id'] = str(alert['_id'])

        return alerts

    def _generate_fingerprint(self, model_id: str, alert_type: str, metric_name: str) -> str:
        """Generate unique fingerprint for alert deduplication."""
        key = f"{model_id}:{alert_type}:{metric_name}"
        return hashlib.md5(key.encode()).hexdigest()

    def _find_existing_alert(self, fingerprint: str) -> Dict[str, Any] | None:
        """Find existing unresolved alert with same fingerprint."""
        if not self.db:
            return None

        # Look for unresolved alerts from last 24 hours
        cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat() + 'Z'

        return self.db['drift_alerts'].find_one({
            'fingerprint': fingerprint,
            'resolved': False,
            'created_at': {'$gte': cutoff}
        })

    def _update_alert(self, alert_id: str, new_value: float, window_end: str) -> Dict[str, Any]:
        """Update existing alert with new occurrence."""
        if not self.db:
            return {}

        result = self.db['drift_alerts'].find_one_and_update(
            {'_id': alert_id},
            {
                '$set': {
                    'metric_value': new_value,
                    'window_end': window_end,
                    'updated_at': datetime.utcnow().isoformat() + 'Z'
                },
                '$inc': {'occurrence_count': 1}
            },
            return_document=True
        )

        if result:
            result['_id'] = str(result['_id'])

        return result or {}

    def _send_notification(self, alert: Dict[str, Any]) -> None:
        """Send alert notification via configured handler."""
        if not self.notification_handler:
            return

        try:
            self.notification_handler(alert)
        except Exception as e:
            print(f"Warning: Failed to send notification for alert {alert.get('_id')}: {e}")

    def should_trigger_retraining(self, model_id: str) -> bool:
        """
        Check if model should be flagged for retraining.

        Criteria: 2+ critical alerts in last 24 hours.

        Args:
            model_id: Model identifier

        Returns:
            True if retraining should be triggered
        """
        if not self.db:
            return False

        cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat() + 'Z'

        critical_count = self.db['drift_alerts'].count_documents({
            'model_id': model_id,
            'severity': 'critical',
            'resolved': False,
            'created_at': {'$gte': cutoff}
        })

        return critical_count >= 2
