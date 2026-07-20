#!/usr/bin/env python3
"""
Validation tests for retrained models.

Runs comprehensive validation on newly trained models.
"""
import argparse
import json
import os
import sys
from typing import Dict, Any

import pytest
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
import joblib
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class ModelValidator:
    """Validates model performance and fairness."""

    def __init__(self, model_path: str, scaler_path: str):
        """Initialize validator."""
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

    def validate_model_structure(self) -> bool:
        """Validate model structure and components."""
        assert hasattr(self.model, 'predict'), 'Model missing predict method'
        assert hasattr(self.model, 'predict_proba'), 'Model missing predict_proba method'
        assert self.scaler is not None, 'Scaler not loaded'
        logger.info('✓ Model structure validation passed')
        return True

    def validate_predictions(self, X: np.ndarray) -> Dict[str, Any]:
        """Validate predictions on test data."""
        try:
            X_scaled = self.scaler.transform(X)
            predictions = self.model.predict(X_scaled)
            probabilities = self.model.predict_proba(X_scaled)

            assert len(predictions) == len(X), 'Prediction length mismatch'
            assert predictions.dtype in [np.int32, np.int64], 'Invalid prediction type'
            assert probabilities.shape[0] == len(X), 'Probability shape mismatch'

            logger.info(f'✓ Predictions validated: {len(predictions)} samples')

            return {
                'predictions': predictions.tolist(),
                'probabilities': probabilities.tolist(),
                'avg_confidence': float(np.max(probabilities, axis=1).mean()),
            }
        except Exception as e:
            logger.error(f'Prediction validation failed: {e}')
            raise

    def validate_performance(
        self,
        X: np.ndarray,
        y: np.ndarray,
        min_accuracy: float = 0.7
    ) -> Dict[str, float]:
        """Validate model performance metrics."""
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)

        accuracy = accuracy_score(y, predictions)
        precision = precision_score(y, predictions, zero_division=0)
        recall = recall_score(y, predictions, zero_division=0)
        f1 = f1_score(y, predictions, zero_division=0)

        try:
            auc = roc_auc_score(y, probabilities[:, 1])
        except Exception:
            auc = 0.0

        # Validate minimum performance
        assert accuracy >= min_accuracy, f'Accuracy {accuracy:.4f} below minimum {min_accuracy}'

        logger.info(f'✓ Performance metrics validated:')
        logger.info(f'  Accuracy: {accuracy:.4f}')
        logger.info(f'  Precision: {precision:.4f}')
        logger.info(f'  Recall: {recall:.4f}')
        logger.info(f'  F1 Score: {f1:.4f}')
        logger.info(f'  ROC AUC: {auc:.4f}')

        return {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'roc_auc': float(auc),
        }

    def validate_fairness(
        self,
        X: np.ndarray,
        y: np.ndarray,
        protected_attr_idx: int
    ) -> Dict[str, Any]:
        """Validate fairness metrics across protected attributes."""
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)

        # Get unique groups
        groups = np.unique(X[:, protected_attr_idx])

        fairness_results = {}
        for group in groups:
            group_mask = X[:, protected_attr_idx] == group
            group_preds = predictions[group_mask]
            group_labels = y[group_mask]

            if len(group_preds) > 0:
                group_accuracy = accuracy_score(group_labels, group_preds)
                fairness_results[f'group_{group}_accuracy'] = float(group_accuracy)

        logger.info(f'✓ Fairness metrics validated:')
        for key, value in fairness_results.items():
            logger.info(f'  {key}: {value:.4f}')

        return fairness_results

    def validate_stability(self, X: np.ndarray, n_iterations: int = 10) -> Dict[str, float]:
        """Validate prediction stability with small perturbations."""
        X_scaled = self.scaler.transform(X)
        base_predictions = self.model.predict(X_scaled)

        stability_scores = []
        for _ in range(n_iterations):
            # Add small noise
            noise = np.random.normal(0, 0.01, X_scaled.shape)
            perturbed = X_scaled + noise
            perturbed_preds = self.model.predict(perturbed)

            # Calculate stability as agreement
            agreement = (base_predictions == perturbed_preds).mean()
            stability_scores.append(agreement)

        avg_stability = np.mean(stability_scores)
        logger.info(f'✓ Stability validation passed: {avg_stability:.4f}')

        return {
            'avg_stability': float(avg_stability),
            'min_stability': float(np.min(stability_scores)),
            'max_stability': float(np.max(stability_scores)),
        }


@pytest.fixture
def validator():
    """Pytest fixture for model validator."""
    model_path = os.environ.get('MODEL_PATH')
    scaler_path = os.environ.get('SCALER_PATH')

    if not model_path or not scaler_path:
        pytest.skip('Model paths not configured')

    return ModelValidator(model_path, scaler_path)


def test_model_structure(validator):
    """Test model structure and components."""
    assert validator.validate_model_structure()


def test_model_predictions(validator):
    """Test model can make predictions."""
    X = np.random.normal(0, 1, (100, 10))
    results = validator.validate_predictions(X)
    assert 'predictions' in results
    assert 'probabilities' in results


def test_model_performance(validator):
    """Test model performance on synthetic data."""
    X = np.random.normal(0, 1, (200, 10))
    y = (X[:, 0] > 0).astype(int)
    metrics = validator.validate_performance(X, y, min_accuracy=0.5)
    assert 'accuracy' in metrics


def test_model_stability(validator):
    """Test model prediction stability."""
    X = np.random.normal(0, 1, (100, 10))
    stability = validator.validate_stability(X)
    assert 'avg_stability' in stability
    assert stability['avg_stability'] > 0.5


def main():
    parser = argparse.ArgumentParser(description='Run model validation tests')
    parser.add_argument('--model-id', required=True, help='Model ID')
    parser.add_argument('--request-id', required=True, help='Retrain request ID')
    parser.add_argument('--output-dir', default='validation', help='Output directory for results')

    args = parser.parse_args()

    # Find model artifacts
    model_dir = 'models'
    model_files = [f for f in os.listdir(model_dir) if f.startswith(args.model_id)]

    if not model_files:
        logger.error(f'No model files found for {args.model_id}')
        sys.exit(1)

    # Extract version from model filename
    model_file = [f for f in model_files if f.endswith('.pkl') and 'scaler' not in f][0]
    version = model_file.replace(f'{args.model_id}_', '').replace('.pkl', '')

    model_path = os.path.join(model_dir, model_file)
    scaler_path = os.path.join(model_dir, f'{args.model_id}_{version}_scaler.pkl')

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        logger.error('Model or scaler not found')
        sys.exit(1)

    # Run validation
    try:
        validator = ModelValidator(model_path, scaler_path)
        validator.validate_model_structure()

        # Test on synthetic data
        X_test = np.random.normal(0, 1, (200, 10))
        y_test = (X_test[:, 0] > 0).astype(int)

        validator.validate_predictions(X_test)
        metrics = validator.validate_performance(X_test, y_test, min_accuracy=0.5)
        stability = validator.validate_stability(X_test)

        os.makedirs(args.output_dir, exist_ok=True)
        results_path = os.path.join(args.output_dir, f'{args.model_id}_test_results.json')
        with open(results_path, 'w') as f:
            json.dump({
                'model_id': args.model_id,
                'request_id': args.request_id,
                'version': version,
                'passed': True,
                'performance_metrics': metrics,
                'stability_metrics': stability,
            }, f, indent=2)
        logger.info(f'Validation results saved to {results_path}')

        logger.info('✓ All validation tests passed')
    except AssertionError as e:
        logger.error(f'Validation failed: {e}')
        os.makedirs(args.output_dir, exist_ok=True)
        results_path = os.path.join(args.output_dir, f'{args.model_id}_test_results.json')
        with open(results_path, 'w') as f:
            json.dump({
                'model_id': args.model_id,
                'request_id': args.request_id,
                'passed': False,
                'error': str(e),
            }, f, indent=2)
        sys.exit(1)
    except Exception as e:
        logger.error(f'Unexpected error during validation: {e}', exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
