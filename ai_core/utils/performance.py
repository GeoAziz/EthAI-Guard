"""
Performance optimization utilities for EthixAI
Provides caching, batch processing, and optimization helpers
"""

from functools import lru_cache, wraps
from typing import Any, Callable, List, Dict
import hashlib
import json
import time
import numpy as np
from datetime import datetime, timedelta

class PerformanceCache:
    """Simple in-memory cache for expensive computations"""
    
    def __init__(self, ttl_seconds: int = 300):
        self._cache: Dict[str, tuple[Any, float]] = {}
        self.ttl_seconds = ttl_seconds
    
    def _is_expired(self, timestamp: float) -> bool:
        """Check if cache entry is expired"""
        return time.time() - timestamp > self.ttl_seconds
    
    def get(self, key: str) -> Any:
        """Get cached value if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if not self._is_expired(timestamp):
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        """Set cache value with current timestamp"""
        self._cache[key] = (value, time.time())
    
    def clear(self):
        """Clear all cache entries"""
        self._cache.clear()
    
    def cleanup_expired(self):
        """Remove expired entries"""
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if self._is_expired(timestamp)
        ]
        for key in expired_keys:
            del self._cache[key]


# Global cache instance
_analysis_cache = PerformanceCache(ttl_seconds=300)


def cache_analysis_result(func: Callable) -> Callable:
    """Decorator to cache analysis results based on input hash"""
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Create cache key from function args
        cache_key = _create_cache_key(func.__name__, args, kwargs)
        
        # Check cache
        cached_result = _analysis_cache.get(cache_key)
        if cached_result is not None:
            return cached_result
        
        # Compute result
        result = func(*args, **kwargs)
        
        # Store in cache
        _analysis_cache.set(cache_key, result)
        
        return result
    
    return wrapper


def _create_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """Create a deterministic cache key from function arguments"""
    try:
        # Convert args to serializable format
        key_data = {
            'function': func_name,
            'args': str(args),
            'kwargs': {k: str(v) for k, v in kwargs.items()}
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    except Exception:
        # Fallback to timestamp-based key if serialization fails
        return f"{func_name}_{time.time()}"


def batch_process(items: List[Any], batch_size: int = 50) -> List[List[Any]]:
    """Split items into batches for efficient processing"""
    batches = []
    for i in range(0, len(items), batch_size):
        batches.append(items[i:i + batch_size])
    return batches


def optimize_dataframe_memory(df):
    """Optimize pandas DataFrame memory usage"""
    try:
        import pandas as pd
        
        for col in df.columns:
            col_type = df[col].dtype
            
            if col_type != object:
                # Optimize numeric columns
                c_min = df[col].min()
                c_max = df[col].max()
                
                if str(col_type)[:3] == 'int':
                    if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                        df[col] = df[col].astype(np.int8)
                    elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                        df[col] = df[col].astype(np.int16)
                    elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                        df[col] = df[col].astype(np.int32)
                else:
                    if c_min > np.finfo(np.float16).min and c_max < np.finfo(np.float16).max:
                        df[col] = df[col].astype(np.float32)
        
        return df
    except Exception as e:
        print(f"Warning: Could not optimize DataFrame: {e}")
        return df


class PerformanceTimer:
    """Context manager for timing code execution"""
    
    def __init__(self, name: str = "Operation"):
        self.name = name
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args):
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        print(f"[PERF] {self.name} took {duration:.3f}s")
    
    @property
    def elapsed(self) -> float:
        """Get elapsed time in seconds"""
        if self.end_time:
            return self.end_time - self.start_time
        return time.time() - self.start_time if self.start_time else 0


def clear_analysis_cache():
    """Clear the global analysis cache"""
    _analysis_cache.clear()


def cleanup_expired_cache():
    """Remove expired entries from cache"""
    _analysis_cache.cleanup_expired()
