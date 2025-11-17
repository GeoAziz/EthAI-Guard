"""
Baseline Snapshot Manager

Manages training baseline distributions for drift comparison.
Stores and retrieves feature statistics, score histograms, and fairness metrics.
"""
from typing import Dict, Any, List
import json
import numpy as np
from datetime import datetime


class BaselineManager:
    """
    Manages baseline snapshots for drift detection.
    
    Stores training data statistics including:
    - Feature distributions (histograms)
    - Score distribution
    - Fairness metrics
    - Data quality metrics
    """
    
    def __init__(self, db=None):
        """
        Initialize baseline manager.
        
        Args:
            db: Database connection (optional)
        """
        self.db = db
        self._cache = {}
    
    def create_baseline(
        self,
        model_id: str,
        training_data: List[Dict[str, Any]],
        feature_names: List[str],
        score_field: str = 'risk_score',
        protected_attrs: List[str] | None = None
    ) -> Dict[str, Any]:
        """
        Create baseline snapshot from training data.
        
        Args:
            model_id: Model identifier
            training_data: List of training examples
            feature_names: List of feature names to track
            score_field: Field name for model output score
            protected_attrs: Protected attributes for fairness tracking
        
        Returns:
            Baseline snapshot dict
        """
        baseline = {
            'model_id': model_id,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'sample_size': len(training_data),
            'feature_stats': {},
            'score_stats': {},
            'fairness_stats': {},
            'data_quality': {}
        }
        
        # Compute feature statistics
        for feature in feature_names:
            values = [sample.get(feature) for sample in training_data if sample.get(feature) is not None]
            
            if not values:
                continue
            
            # Numeric features
            if isinstance(values[0], (int, float)):
                values_array = np.array(values, dtype=float)
                counts, bin_edges = np.histogram(values_array, bins=20)
                
                baseline['feature_stats'][feature] = {
                    'type': 'numeric',
                    'histogram': counts.tolist(),
                    'bin_edges': bin_edges.tolist(),
                    'mean': float(np.mean(values_array)),
                    'std': float(np.std(values_array)),
                    'min': float(np.min(values_array)),
                    'max': float(np.max(values_array)),
                    'p50': float(np.percentile(values_array, 50)),
                    'p95': float(np.percentile(values_array, 95))
                }
            
            # Categorical features
            else:
                values_array = np.array(values)
                unique_values, counts = np.unique(values_array, return_counts=True)
                baseline['feature_stats'][feature] = {
                    'type': 'categorical',
                    'categories': unique_values.tolist(),
                    'counts': counts.tolist(),
                    'unique_count': len(unique_values)
                }
        
        # Compute score statistics
        scores = [sample.get(score_field) for sample in training_data if sample.get(score_field) is not None]
        if scores:
            scores_array = np.array(scores, dtype=float)
            counts, bin_edges = np.histogram(scores_array, bins=20)
            
            baseline['score_stats'] = {
                'histogram': counts.tolist(),
                'bin_edges': bin_edges.tolist(),
                'mean': float(np.mean(scores_array)),
                'std': float(np.std(scores_array)),
                'min': float(np.min(scores_array)),
                'max': float(np.max(scores_array)),
                'p50': float(np.percentile(scores_array, 50)),
                'p95': float(np.percentile(scores_array, 95))
            }
        
        # Compute fairness baseline (if protected attributes provided)
        if protected_attrs:
            for attr in protected_attrs:
                attr_values = [sample.get(attr) for sample in training_data if sample.get(attr) is not None]
                if attr_values:
                    unique_groups = list(set(attr_values))
                    baseline['fairness_stats'][attr] = {
                        'groups': unique_groups,
                        'group_counts': {group: attr_values.count(group) for group in unique_groups}
                    }
        
        # Data quality metrics
        null_rates = {}
        for feature in feature_names:
            total = len(training_data)
            null_count = sum(1 for sample in training_data if sample.get(feature) is None)
            null_rates[feature] = null_count / total if total > 0 else 0.0
        
        baseline['data_quality'] = {
            'null_rates': null_rates,
            'total_samples': len(training_data)
        }
        
        # Store in database if available
        if self.db:
            self._store_baseline(baseline)
        
        # Cache
        self._cache[model_id] = baseline
        
        return baseline
    
    def get_baseline(self, model_id: str) -> Dict[str, Any] | None:
        """
        Retrieve baseline for model.
        
        Args:
            model_id: Model identifier
        
        Returns:
            Baseline snapshot or None if not found
        """
        # Check cache first
        if model_id in self._cache:
            return self._cache[model_id]
        
        # Query database
        if self.db:
            baseline = self._load_baseline(model_id)
            if baseline:
                self._cache[model_id] = baseline
                return baseline
        
        return None
    
    def update_baseline(
        self,
        model_id: str,
        new_data: List[Dict[str, Any]],
        merge: bool = False
    ) -> Dict[str, Any]:
        """
        Update baseline with new data.
        
        Args:
            model_id: Model identifier
            new_data: New training examples
            merge: Whether to merge with existing baseline or replace
        
        Returns:
            Updated baseline snapshot
        """
        if merge:
            # TODO: Implement incremental baseline update
            raise NotImplementedError("Incremental baseline updates not yet implemented")
        else:
            # Replace baseline
            existing_baseline = self.get_baseline(model_id)
            feature_names = list(existing_baseline['feature_stats'].keys()) if existing_baseline else []
            return self.create_baseline(model_id, new_data, feature_names)
    
    def _store_baseline(self, baseline: Dict[str, Any]) -> None:
        """Store baseline in database."""
        if not self.db:
            return
        
        try:
            # Store in baselines collection
            collection = self.db['drift_baselines']
            
            # Upsert by model_id
            collection.update_one(
                {'model_id': baseline['model_id']},
                {'$set': baseline},
                upsert=True
            )
        except Exception as e:
            print(f"Warning: Failed to store baseline: {e}")
    
    def _load_baseline(self, model_id: str) -> Dict[str, Any] | None:
        """Load baseline from database."""
        if not self.db:
            return None
        
        try:
            collection = self.db['drift_baselines']
            baseline = collection.find_one({'model_id': model_id})
            
            if baseline:
                # Remove MongoDB _id
                baseline.pop('_id', None)
                return baseline
        except Exception as e:
            print(f"Warning: Failed to load baseline: {e}")
        
        return None
    
    def export_baseline(self, model_id: str, filepath: str) -> None:
        """
        Export baseline to JSON file.
        
        Args:
            model_id: Model identifier
            filepath: Output file path
        """
        baseline = self.get_baseline(model_id)
        if baseline:
            with open(filepath, 'w') as f:
                json.dump(baseline, f, indent=2)
    
    def import_baseline(self, filepath: str) -> Dict[str, Any]:
        """
        Import baseline from JSON file.
        
        Args:
            filepath: Input file path
        
        Returns:
            Imported baseline snapshot
        """
        with open(filepath, 'r') as f:
            baseline = json.load(f)
        
        # Store in database if available
        if self.db:
            self._store_baseline(baseline)
        
        # Cache
        self._cache[baseline['model_id']] = baseline
        
        return baseline
