#!/usr/bin/env python3
"""
Update baseline after successful model retraining.

Updates feature distributions and metrics after new model validation.
"""
import argparse
import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

import numpy as np
import logging

# Import baseline manager from drift module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from drift.baseline import BaselineManager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def get_mongo_client():
    """Get MongoDB client."""
    from pymongo import MongoClient
    mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.environ.get('MONGODB_DB', 'ethixai')
    return MongoClient(mongo_uri)[db_name]


def load_training_data(data_path: str) -> List[Dict[str, Any]]:
    """Load training data from JSONL file."""
    data = []
    with open(data_path, 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return data


def update_baseline(
    model_id: str,
    request_id: str,
    data_path: str,
    merge: bool = True
) -> Dict[str, Any]:
    """
    Update baseline after retraining.

    Args:
        model_id: Model identifier
        request_id: Retrain request ID
        data_path: Path to training data
        merge: Whether to merge with existing baseline

    Returns:
        Updated baseline
    """
    try:
        db = get_mongo_client()
        baseline_manager = BaselineManager(db)

        # Load training data
        training_data = load_training_data(data_path)
        if not training_data:
            logger.error('No training data loaded')
            return None

        logger.info(f'Updating baseline for {model_id} with {len(training_data)} samples')

        # Extract feature names
        feature_names = list(set(k for sample in training_data for k in sample.keys() if k != 'label'))
        feature_names.sort()

        # Update baseline
        updated_baseline = baseline_manager.update_baseline(
            model_id=model_id,
            new_data=training_data,
            merge=merge
        )

        # Store metadata about the update
        metadata = {
            'request_id': request_id,
            'model_id': model_id,
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            'sample_size': len(training_data),
            'merge_type': 'incremental' if merge else 'replacement',
            'features_updated': len(feature_names),
        }

        # Store update metadata in database
        db['baseline_updates'].insert_one(metadata)
        logger.info(f'Baseline update metadata stored')

        # Log update event
        update_event = {
            'event': 'baseline_updated',
            'model_id': model_id,
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'details': {
                'merge_type': metadata['merge_type'],
                'sample_size': metadata['sample_size'],
                'features_updated': metadata['features_updated']
            }
        }
        db['audit_logs'].insert_one(update_event)

        logger.info('✓ Baseline updated successfully')
        return updated_baseline

    except Exception as e:
        logger.error(f'Failed to update baseline: {e}', exc_info=True)
        raise


def main():
    parser = argparse.ArgumentParser(description='Update baseline after retraining')
    parser.add_argument('--model-id', required=True, help='Model ID')
    parser.add_argument('--request-id', required=True, help='Retrain request ID')
    parser.add_argument('--data-path', required=True, help='Path to training data')
    parser.add_argument('--merge', action='store_true', default=True, help='Merge with existing baseline')

    args = parser.parse_args()

    try:
        baseline = update_baseline(
            model_id=args.model_id,
            request_id=args.request_id,
            data_path=args.data_path,
            merge=args.merge
        )

        if baseline:
            logger.info(f'Baseline successfully updated for {args.model_id}')
            logger.info(f'Sample size: {baseline["sample_size"]}')
    except Exception as e:
        logger.error(f'Baseline update failed: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
