#!/usr/bin/env python3
"""
Prepare training data for model retraining.

Fetches recent data from MongoDB and prepares it for training.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any

from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def get_mongo_client():
    """Get MongoDB client."""
    mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.environ.get('MONGODB_DB', 'ethixai')
    return MongoClient(mongo_uri)[db_name]


def fetch_training_data(
    model_id: str,
    days: int = 30,
    limit: int = 10000
) -> List[Dict[str, Any]]:
    """
    Fetch recent data from MongoDB for retraining.

    Args:
        model_id: Model identifier
        days: Number of days of historical data to fetch
        limit: Maximum number of records to fetch

    Returns:
        List of training samples
    """
    db = get_mongo_client()

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Query analyses collection for recent predictions
    pipeline = [
        {
            '$match': {
                'model_id': model_id,
                'timestamp': {'$gte': start_date, '$lte': end_date},
                'label': {'$exists': True}  # Only include labeled data
            }
        },
        {'$sort': {'timestamp': -1}},
        {'$limit': limit},
        {
            '$project': {
                '_id': 0,
                'features': 1,
                'label': 1,
                'risk_score': 1,
                'timestamp': 1,
            }
        }
    ]

    data = list(db['analyses'].aggregate(pipeline))
    logger.info(f'Fetched {len(data)} training samples for {model_id}')

    return data


def prepare_dataset(data: List[Dict[str, Any]], output_path: str) -> None:
    """
    Write training data to JSONL file.

    Args:
        data: List of training samples
        output_path: Output file path
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        for sample in data:
            f.write(json.dumps(sample) + '\n')

    logger.info(f'Wrote {len(data)} samples to {output_path}')


def main():
    parser = argparse.ArgumentParser(description='Prepare training data for retraining')
    parser.add_argument('--model-id', required=True, help='Model ID')
    parser.add_argument('--request-id', required=True, help='Retrain request ID')
    parser.add_argument('--output', default='training_data.jsonl', help='Output file path')
    parser.add_argument('--days', type=int, default=30, help='Days of historical data')
    parser.add_argument('--limit', type=int, default=10000, help='Max records to fetch')

    args = parser.parse_args()

    try:
        # Fetch data
        data = fetch_training_data(
            model_id=args.model_id,
            days=args.days,
            limit=args.limit
        )

        if not data:
            logger.warning(f'No training data found for {args.model_id}')
            sys.exit(1)

        # Prepare dataset
        prepare_dataset(data, args.output)

        logger.info('Training data preparation completed successfully')
    except Exception as e:
        logger.error(f'Failed to prepare training data: {e}', exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
