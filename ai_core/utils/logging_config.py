"""
Centralized Logging Configuration for EthixAI AI Core
Using Loguru for elegant, production-ready logging

Features:
- Automatic rotation and retention
- Structured logging with context
- Performance tracking
- Compliance audit trail
- Error tracking with full context
"""

import sys
import os
from pathlib import Path
from loguru import logger
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Remove default handler
logger.remove()

# Determine log level from environment
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Create logs directory
LOGS_DIR = Path(__file__).parent.parent / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# Console handler (colorized for development)
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=LOG_LEVEL,
    colorize=True,
    backtrace=True,
    diagnose=True
)

# File handler - All logs (rotating)
logger.add(
    LOGS_DIR / "ai_core.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="DEBUG",
    rotation="10 MB",
    retention="30 days",
    compression="zip",
    backtrace=True,
    diagnose=True,
    enqueue=True  # Thread-safe
)

# File handler - Errors only
logger.add(
    LOGS_DIR / "error.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}\n{exception}",
    level="ERROR",
    rotation="5 MB",
    retention="60 days",
    compression="zip",
    backtrace=True,
    diagnose=True,
    enqueue=True
)

# File handler - JSON format for parsing
logger.add(
    LOGS_DIR / "ai_core.json",
    format="{message}",
    level="INFO",
    rotation="20 MB",
    retention="30 days",
    compression="zip",
    serialize=True,  # JSON format
    enqueue=True
)

# Audit log (compliance events)
logger.add(
    LOGS_DIR / "audit.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {message}",
    level="INFO",
    rotation="10 MB",
    retention="90 days",  # Longer retention for compliance
    compression="zip",
    filter=lambda record: record["extra"].get("audit", False),
    enqueue=True
)


class AILogger:
    """Enhanced logger with specialized methods for AI operations"""
    
    def __init__(self):
        self.logger = logger
        self._add_context()
    
    def _add_context(self):
        """Add global context to all logs"""
        self.logger = self.logger.bind(
            service="ethixai-ai-core",
            environment=ENVIRONMENT,
            version=os.getenv('VERSION', '1.0.0')
        )
    
    def log_inference_request(
        self,
        model_type: str,
        dataset_size: int,
        protected_attributes: list,
        user_id: Optional[str] = None,
        correlation_id: Optional[str] = None
    ):
        """Log model inference request"""
        self.logger.info(
            f"Model inference request received",
            extra={
                "event_type": "inference_request",
                "model_type": model_type,
                "dataset_size": dataset_size,
                "protected_attributes": protected_attributes,
                "user_id": user_id,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    def log_inference_response(
        self,
        model_type: str,
        duration_ms: float,
        fairness_score: float,
        bias_detected: bool,
        correlation_id: Optional[str] = None
    ):
        """Log model inference response"""
        log_level = "warning" if bias_detected else "info"
        
        getattr(self.logger, log_level)(
            f"Model inference completed in {duration_ms:.2f}ms",
            extra={
                "event_type": "inference_response",
                "model_type": model_type,
                "duration_ms": duration_ms,
                "fairness_score": fairness_score,
                "bias_detected": bias_detected,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    def log_bias_detection(
        self,
        protected_attribute: str,
        metric: str,
        value: float,
        threshold: float,
        bias_detected: bool,
        correlation_id: Optional[str] = None
    ):
        """Log bias detection event"""
        log_level = "warning" if bias_detected else "info"
        
        getattr(self.logger, log_level)(
            f"Bias detection: {protected_attribute} - {metric}={value:.4f} (threshold={threshold})",
            extra={
                "event_type": "bias_detection",
                "protected_attribute": protected_attribute,
                "metric": metric,
                "value": value,
                "threshold": threshold,
                "bias_detected": bias_detected,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "audit": True  # Mark as audit event
            }
        )
    
    def log_shap_computation(
        self,
        duration_ms: float,
        num_samples: int,
        num_features: int,
        correlation_id: Optional[str] = None
    ):
        """Log SHAP value computation"""
        log_level = "warning" if duration_ms > 5000 else "info"
        
        getattr(self.logger, log_level)(
            f"SHAP computation completed in {duration_ms:.2f}ms",
            extra={
                "event_type": "shap_computation",
                "duration_ms": duration_ms,
                "num_samples": num_samples,
                "num_features": num_features,
                "samples_per_second": num_samples / (duration_ms / 1000),
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    def log_model_cache(
        self,
        operation: str,
        cache_hit: bool,
        model_type: str,
        correlation_id: Optional[str] = None
    ):
        """Log model cache operations"""
        self.logger.debug(
            f"Model cache {operation}: {'HIT' if cache_hit else 'MISS'}",
            extra={
                "event_type": "model_cache",
                "operation": operation,
                "cache_hit": cache_hit,
                "model_type": model_type,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    def log_data_validation(
        self,
        validation_result: str,
        dataset_size: int,
        issues_found: int,
        correlation_id: Optional[str] = None
    ):
        """Log data validation results"""
        log_level = "warning" if issues_found > 0 else "info"
        
        getattr(self.logger, log_level)(
            f"Data validation: {validation_result} ({issues_found} issues found)",
            extra={
                "event_type": "data_validation",
                "validation_result": validation_result,
                "dataset_size": dataset_size,
                "issues_found": issues_found,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    def log_performance_metric(
        self,
        operation: str,
        duration_ms: float,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log performance metric"""
        log_level = "warning" if duration_ms > 1000 else "debug"
        
        extra_data = {
            "event_type": "performance",
            "operation": operation,
            "duration_ms": duration_ms,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if metadata:
            extra_data.update(metadata)
        
        getattr(self.logger, log_level)(
            f"Performance: {operation} took {duration_ms:.2f}ms",
            extra=extra_data
        )
    
    def log_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ):
        """Log error with full context"""
        extra_data = {
            "event_type": "error",
            "error_type": type(error).__name__,
            "error_message": str(error),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if context:
            extra_data.update(context)
        
        self.logger.error(
            f"Error occurred: {str(error)}",
            extra=extra_data
        )
    
    def log_audit_event(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log audit event for compliance"""
        extra_data = {
            "event_type": "audit",
            "action": action,
            "user_id": user_id,
            "resource": resource,
            "timestamp": datetime.utcnow().isoformat(),
            "audit": True  # Flag for audit log filter
        }
        
        if details:
            extra_data.update(details)
        
        self.logger.info(
            f"Audit: {action}",
            extra=extra_data
        )


# Create global logger instance
ai_logger = AILogger()

# Startup log
ai_logger.logger.info(
    f"AI Core logger initialized",
    extra={
        "log_level": LOG_LEVEL,
        "environment": ENVIRONMENT,
        "logs_directory": str(LOGS_DIR)
    }
)

# Export
__all__ = ['ai_logger', 'logger']
