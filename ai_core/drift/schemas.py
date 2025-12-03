"""
MongoDB Schema Definitions for Drift Detection

Defines collection schemas and indexes for drift tracking.
"""

DRIFT_SNAPSHOTS_INDEXES = [
    {
        'keys': [('model_id', 1), ('window_end', -1)],
        'name': 'model_id_window_end',
        'comment': 'Query recent snapshots by model'
    },
    {
        'keys': [('window_end', 1)],
        'name': 'window_end_ttl',
        'expireAfterSeconds': 2592000,  # 30 days
        'comment': 'TTL index for automatic cleanup'
    }
]

DRIFT_ALERTS_INDEXES = [
    {
        'keys': [('model_id', 1), ('created_at', -1)],
        'name': 'model_id_created_at',
        'comment': 'Query alerts by model chronologically'
    },
    {
        'keys': [('fingerprint', 1), ('resolved', 1)],
        'name': 'fingerprint_resolved',
        'comment': 'Find existing unresolved alerts for deduplication'
    },
    {
        'keys': [('resolved', 1), ('severity', 1)],
        'name': 'resolved_severity',
        'comment': 'Query active alerts by severity'
    },
    {
        'keys': [('created_at', 1)],
        'name': 'created_at_ttl',
        'expireAfterSeconds': 7776000,  # 90 days
        'comment': 'TTL index for alert retention'
    }
]

DRIFT_BASELINES_INDEXES = [
    {
        'keys': [('model_id', 1)],
        'name': 'model_id_unique',
        'unique': True,
        'comment': 'One baseline per model'
    }
]


def setup_collections(db):
    """
    Create drift detection collections with indexes.

    Args:
        db: MongoDB database connection
    """
    # Create collections
    collections = {
        'drift_snapshots': DRIFT_SNAPSHOTS_INDEXES,
        'drift_alerts': DRIFT_ALERTS_INDEXES,
        'drift_baselines': DRIFT_BASELINES_INDEXES
    }

    for collection_name, indexes in collections.items():
        # Create collection if it doesn't exist
        if collection_name not in db.list_collection_names():
            db.create_collection(collection_name)
            print(f"Created collection: {collection_name}")

        collection = db[collection_name]

        # Create indexes
        for index_spec in indexes:
            keys = index_spec.pop('keys')
            name = index_spec.pop('name')
            try:
                collection.create_index(keys, name=name, **index_spec)
                print(f"Created index {name} on {collection_name}")
            except Exception as e:
                print(f"Index {name} already exists or error: {e}")


# Schema documentation
DRIFT_SNAPSHOT_SCHEMA = {
    'model_id': 'string',
    'window_start': 'ISO timestamp',
    'window_end': 'ISO timestamp',
    'sample_count': 'integer',
    'overall_status': 'string (stable|warning|critical)',
    'critical_count': 'integer',
    'warning_count': 'integer',
    'feature_drifts': {
        'feature_name': {
            'psi': 'float',
            'psi_severity': 'string',
            'mean_baseline': 'float',
            'mean_current': 'float',
            'std_baseline': 'float',
            'std_current': 'float'
        }
    },
    'score_drift': {
        'kl': 'float',
        'kl_severity': 'string',
        'mean_baseline': 'float',
        'mean_current': 'float',
        'p95_baseline': 'float',
        'p95_current': 'float'
    },
    'fairness_drift': {
        'metric_name': {
            'baseline': 'float',
            'current': 'float',
            'drift': 'float',
            'severity': 'string'
        }
    },
    'data_quality_drift': {
        'alerts': [
            {
                'type': 'string',
                'severity': 'string',
                'feature': 'string',
                'baseline': 'float',
                'current': 'float'
            }
        ]
    },
    'needs_retraining': 'boolean',
    'created_at': 'ISO timestamp'
}

DRIFT_ALERT_SCHEMA = {
    'fingerprint': 'string (MD5 hash)',
    'model_id': 'string',
    'type': 'string (population_drift|concept_drift|fairness_drift|data_quality)',
    'severity': 'string (warning|critical)',
    'metric_name': 'string',
    'metric_value': 'float',
    'threshold': 'float',
    'window_start': 'ISO timestamp',
    'window_end': 'ISO timestamp',
    'details': 'object',
    'resolved': 'boolean',
    'acknowledged': 'boolean',
    'created_at': 'ISO timestamp',
    'updated_at': 'ISO timestamp',
    'resolved_at': 'ISO timestamp (nullable)',
    'occurrence_count': 'integer'
}

DRIFT_BASELINE_SCHEMA = {
    'model_id': 'string',
    'created_at': 'ISO timestamp',
    'sample_size': 'integer',
    'feature_stats': {
        'feature_name': {
            'type': 'string (numeric|categorical)',
            'histogram': 'array of integers (numeric only)',
            'bin_edges': 'array of floats (numeric only)',
            'mean': 'float (numeric only)',
            'std': 'float (numeric only)',
            'min': 'float (numeric only)',
            'max': 'float (numeric only)',
            'p50': 'float (numeric only)',
            'p95': 'float (numeric only)',
            'categories': 'array of strings (categorical only)',
            'counts': 'array of integers (categorical only)',
            'unique_count': 'integer (categorical only)'
        }
    },
    'score_stats': {
        'histogram': 'array of integers',
        'bin_edges': 'array of floats',
        'mean': 'float',
        'std': 'float',
        'p95': 'float'
    },
    'fairness_stats': {
        'protected_attribute': {
            'groups': 'array of strings',
            'group_counts': 'array of integers'
        }
    },
    'data_quality': {
        'null_rates': {
            'feature_name': 'float'
        },
        'total_samples': 'integer'
    }
}
