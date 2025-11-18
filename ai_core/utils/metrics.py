"""
Prometheus Metrics Configuration for EthixAI AI Core
Tracks model performance, inference latency, and bias detection metrics
"""

from prometheus_client import Counter, Histogram, Gauge, Summary, Info
import time
from functools import wraps
from typing import Callable, Any
import os

# ========================================
# Inference Metrics
# ========================================

inference_requests_total = Counter(
    'ethixai_aicore_inference_requests_total',
    'Total number of inference requests',
    ['model_type', 'status']
)

inference_duration = Histogram(
    'ethixai_aicore_inference_duration_seconds',
    'Duration of inference requests in seconds',
    ['model_type'],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0)
)

inference_errors_total = Counter(
    'ethixai_aicore_inference_errors_total',
    'Total number of inference errors',
    ['model_type', 'error_type']
)

dataset_size = Histogram(
    'ethixai_aicore_dataset_size',
    'Size of datasets processed',
    ['model_type'],
    buckets=(10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000)
)

# ========================================
# Bias Detection Metrics
# ========================================

bias_detections_total = Counter(
    'ethixai_aicore_bias_detections_total',
    'Total number of bias detections',
    ['protected_attribute', 'metric', 'severity']
)

fairness_score = Gauge(
    'ethixai_aicore_fairness_score',
    'Current fairness score',
    ['model_type', 'protected_attribute', 'metric']
)

bias_metrics_computed = Counter(
    'ethixai_aicore_bias_metrics_computed_total',
    'Total number of bias metrics computed',
    ['metric_type']
)

# ========================================
# SHAP Metrics
# ========================================

shap_computation_duration = Histogram(
    'ethixai_aicore_shap_computation_duration_seconds',
    'Duration of SHAP value computation in seconds',
    ['model_type'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0)
)

shap_samples_processed = Counter(
    'ethixai_aicore_shap_samples_processed_total',
    'Total number of samples processed for SHAP values',
    ['model_type']
)

shap_features_analyzed = Gauge(
    'ethixai_aicore_shap_features_analyzed',
    'Number of features analyzed in SHAP computation',
    ['model_type']
)

# ========================================
# Model Cache Metrics
# ========================================

model_cache_hits = Counter(
    'ethixai_aicore_model_cache_hits_total',
    'Total number of model cache hits',
    ['model_type']
)

model_cache_misses = Counter(
    'ethixai_aicore_model_cache_misses_total',
    'Total number of model cache misses',
    ['model_type']
)

model_cache_size = Gauge(
    'ethixai_aicore_model_cache_size_bytes',
    'Current size of model cache in bytes'
)

model_load_duration = Histogram(
    'ethixai_aicore_model_load_duration_seconds',
    'Duration of model loading in seconds',
    ['model_type'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0)
)

# ========================================
# Data Processing Metrics
# ========================================

data_validation_duration = Histogram(
    'ethixai_aicore_data_validation_duration_seconds',
    'Duration of data validation in seconds',
    buckets=(0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0)
)

data_validation_errors = Counter(
    'ethixai_aicore_data_validation_errors_total',
    'Total number of data validation errors',
    ['error_type']
)

missing_values_detected = Counter(
    'ethixai_aicore_missing_values_detected_total',
    'Total number of missing values detected',
    ['column']
)

data_preprocessing_duration = Histogram(
    'ethixai_aicore_data_preprocessing_duration_seconds',
    'Duration of data preprocessing in seconds',
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0)
)

# ========================================
# Performance Metrics
# ========================================

memory_usage = Gauge(
    'ethixai_aicore_memory_usage_bytes',
    'Current memory usage in bytes',
    ['type']  # 'rss', 'vms', 'shared'
)

cpu_usage = Gauge(
    'ethixai_aicore_cpu_usage_percent',
    'Current CPU usage percentage'
)

active_requests = Gauge(
    'ethixai_aicore_active_requests',
    'Number of currently active requests'
)

# ========================================
# API Metrics
# ========================================

http_requests_total = Counter(
    'ethixai_aicore_http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status_code']
)

http_request_duration = Histogram(
    'ethixai_aicore_http_request_duration_seconds',
    'Duration of HTTP requests in seconds',
    ['method', 'endpoint'],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0)
)

# ========================================
# System Info
# ========================================

system_info = Info(
    'ethixai_aicore_system',
    'AI Core system information'
)

# Set system info
system_info.info({
    'version': os.getenv('VERSION', '1.0.0'),
    'environment': os.getenv('ENVIRONMENT', 'development'),
    'python_version': os.getenv('PYTHON_VERSION', '3.11')
})


# ========================================
# Helper Functions
# ========================================

def track_inference_time(model_type: str) -> Callable:
    """
    Decorator to track inference time
    
    Usage:
        @track_inference_time('credit_scoring')
        def run_inference(data):
            # ... inference logic
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            status = 'success'
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                inference_errors_total.labels(
                    model_type=model_type,
                    error_type=type(e).__name__
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                inference_duration.labels(model_type=model_type).observe(duration)
                inference_requests_total.labels(model_type=model_type, status=status).inc()
        
        return wrapper
    return decorator


def track_shap_computation(model_type: str) -> Callable:
    """
    Decorator to track SHAP computation time
    
    Usage:
        @track_shap_computation('credit_scoring')
        def compute_shap_values(model, data):
            # ... SHAP logic
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                shap_computation_duration.labels(model_type=model_type).observe(duration)
        
        return wrapper
    return decorator


def record_inference_request(model_type: str, status: str = 'success'):
    """Record an inference request"""
    inference_requests_total.labels(model_type=model_type, status=status).inc()


def record_inference_duration(model_type: str, duration_seconds: float):
    """Record inference duration"""
    inference_duration.labels(model_type=model_type).observe(duration_seconds)


def record_dataset_size(model_type: str, size: int):
    """Record dataset size"""
    dataset_size.labels(model_type=model_type).observe(size)


def record_bias_detection(
    protected_attribute: str,
    metric: str,
    severity: str
):
    """Record a bias detection event"""
    bias_detections_total.labels(
        protected_attribute=protected_attribute,
        metric=metric,
        severity=severity
    ).inc()


def update_fairness_score(
    model_type: str,
    protected_attribute: str,
    metric: str,
    score: float
):
    """Update fairness score gauge"""
    fairness_score.labels(
        model_type=model_type,
        protected_attribute=protected_attribute,
        metric=metric
    ).set(score)


def record_shap_computation(
    model_type: str,
    duration_seconds: float,
    num_samples: int,
    num_features: int
):
    """Record SHAP computation metrics"""
    shap_computation_duration.labels(model_type=model_type).observe(duration_seconds)
    shap_samples_processed.labels(model_type=model_type).inc(num_samples)
    shap_features_analyzed.labels(model_type=model_type).set(num_features)


def record_model_cache_operation(model_type: str, hit: bool):
    """Record model cache hit or miss"""
    if hit:
        model_cache_hits.labels(model_type=model_type).inc()
    else:
        model_cache_misses.labels(model_type=model_type).inc()


def record_model_load(model_type: str, duration_seconds: float):
    """Record model load duration"""
    model_load_duration.labels(model_type=model_type).observe(duration_seconds)


def record_data_validation(duration_seconds: float, errors: int = 0, error_type: str = None):
    """Record data validation metrics"""
    data_validation_duration.observe(duration_seconds)
    
    if errors > 0 and error_type:
        data_validation_errors.labels(error_type=error_type).inc(errors)


def record_http_request(method: str, endpoint: str, status_code: int, duration_seconds: float):
    """Record HTTP request metrics"""
    http_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status_code=status_code
    ).inc()
    
    http_request_duration.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration_seconds)


def update_system_metrics(memory_rss: int, memory_vms: int, cpu_percent: float):
    """Update system resource metrics"""
    memory_usage.labels(type='rss').set(memory_rss)
    memory_usage.labels(type='vms').set(memory_vms)
    cpu_usage.set(cpu_percent)


class RequestTracker:
    """Context manager for tracking requests"""
    
    def __enter__(self):
        active_requests.inc()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        active_requests.dec()


# Export all
__all__ = [
    # Metrics
    'inference_requests_total',
    'inference_duration',
    'inference_errors_total',
    'dataset_size',
    'bias_detections_total',
    'fairness_score',
    'shap_computation_duration',
    'shap_samples_processed',
    'model_cache_hits',
    'model_cache_misses',
    'http_requests_total',
    'http_request_duration',
    
    # Decorators
    'track_inference_time',
    'track_shap_computation',
    
    # Helper functions
    'record_inference_request',
    'record_inference_duration',
    'record_dataset_size',
    'record_bias_detection',
    'update_fairness_score',
    'record_shap_computation',
    'record_model_cache_operation',
    'record_model_load',
    'record_data_validation',
    'record_http_request',
    'update_system_metrics',
    
    # Context manager
    'RequestTracker'
]
