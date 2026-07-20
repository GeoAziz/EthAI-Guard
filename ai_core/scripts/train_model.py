#!/usr/bin/env python3
"""
Train model from prepared training data.

Trains a new model version and saves artifacts.
"""
import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def load_training_data(data_path: str) -> tuple:
    """
    Load training data from JSONL file.

    Args:
        data_path: Path to training data file

    Returns:
        Tuple of (X, y, feature_names)
    """
    samples = []
    targets = []

    with open(data_path, 'r') as f:
        for line in f:
            sample = json.loads(line)
            samples.append(sample.get('features', {}))
            targets.append(sample.get('label', 0))

    # Extract feature names
    feature_names = list(set(k for sample in samples for k in sample.keys()))
    feature_names.sort()

    # Build feature matrix
    X = []
    for sample in samples:
        row = [sample.get(feat, 0) for feat in feature_names]
        X.append(row)

    X = np.array(X, dtype=float)
    y = np.array(targets, dtype=int)

    logger.info(f'Loaded {len(X)} samples with {len(feature_names)} features')
    return X, y, feature_names


def train_model(X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
    """
    Train a random forest classifier.

    Args:
        X: Feature matrix
        y: Target labels

    Returns:
        Trained model and metadata
    """
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled, y)

    # Get feature importances
    feature_importances = model.feature_importances_.tolist()

    logger.info(f'Model trained with accuracy: {model.score(X_scaled, y):.4f}')

    return {
        'model': model,
        'scaler': scaler,
        'accuracy': float(model.score(X_scaled, y)),
        'feature_importances': feature_importances,
        'n_estimators': model.n_estimators,
        'max_depth': model.max_depth,
    }


def save_model(
    model_dict: Dict[str, Any],
    feature_names: list,
    output_dir: str,
    model_id: str
) -> str:
    """
    Save trained model and metadata.

    Args:
        model_dict: Model and metadata
        feature_names: Feature names
        output_dir: Output directory
        model_id: Model identifier

    Returns:
        Path to saved model
    """
    os.makedirs(output_dir, exist_ok=True)

    # Generate version
    version = f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

    # Save model
    model_path = os.path.join(output_dir, f'{model_id}_{version}.pkl')
    joblib.dump(model_dict['model'], model_path)

    # Save scaler
    scaler_path = os.path.join(output_dir, f'{model_id}_{version}_scaler.pkl')
    joblib.dump(model_dict['scaler'], scaler_path)

    # Save metadata
    metadata = {
        'model_id': model_id,
        'version': version,
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'accuracy': model_dict['accuracy'],
        'feature_names': feature_names,
        'feature_importances': model_dict['feature_importances'],
        'hyperparameters': {
            'n_estimators': model_dict['n_estimators'],
            'max_depth': model_dict['max_depth'],
            'random_state': 42
        },
        'model_path': model_path,
        'scaler_path': scaler_path,
    }

    metadata_path = os.path.join(output_dir, f'{model_id}_{version}_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    logger.info(f'Model saved to {model_path}')
    logger.info(f'Metadata saved to {metadata_path}')

    return version


def main():
    parser = argparse.ArgumentParser(description='Train model from prepared data')
    parser.add_argument('--model-id', required=True, help='Model ID')
    parser.add_argument('--request-id', required=True, help='Retrain request ID')
    parser.add_argument('--data-path', required=True, help='Path to training data')
    parser.add_argument('--output-dir', default='models', help='Output directory')

    args = parser.parse_args()

    try:
        # Load data
        X, y, feature_names = load_training_data(args.data_path)

        if len(X) == 0:
            logger.error('No training data loaded')
            sys.exit(1)

        # Train model
        model_dict = train_model(X, y)

        # Save model
        version = save_model(
            model_dict,
            feature_names,
            args.output_dir,
            args.model_id
        )

        logger.info(f'Model training completed: {version}')
    except Exception as e:
        logger.error(f'Failed to train model: {e}', exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
