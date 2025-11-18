/**
 * Prometheus Metrics Configuration for EthixAI Backend
 * Tracks application performance, business metrics, and system health
 */

const client = require('prom-client');
const logger = require('./logger');

// Enable default system metrics (CPU, memory, etc.)
const register = client.register;
client.collectDefaultMetrics({
  register,
  prefix: 'ethixai_backend_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ========================================
// HTTP Metrics
// ========================================

const httpRequestDuration = new client.Histogram({
  name: 'ethixai_backend_http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

const httpRequestTotal = new client.Counter({
  name: 'ethixai_backend_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestsInProgress = new client.Gauge({
  name: 'ethixai_backend_http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route']
});

const httpErrorsTotal = new client.Counter({
  name: 'ethixai_backend_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'error_type']
});

// ========================================
// Business Metrics
// ========================================

const inferenceRequestsTotal = new client.Counter({
  name: 'ethixai_backend_inference_requests_total',
  help: 'Total number of bias analysis requests',
  labelNames: ['model_type', 'user_id', 'status']
});

const biasDetectionsTotal = new client.Counter({
  name: 'ethixai_backend_bias_detections_total',
  help: 'Total number of bias detections',
  labelNames: ['protected_attribute', 'severity']
});

const fairnessScoreGauge = new client.Gauge({
  name: 'ethixai_backend_fairness_score',
  help: 'Current fairness score',
  labelNames: ['model_type', 'protected_attribute']
});

const datasetSizeHistogram = new client.Histogram({
  name: 'ethixai_backend_dataset_size',
  help: 'Size of datasets analyzed',
  labelNames: ['model_type'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000]
});

// ========================================
// Authentication Metrics
// ========================================

const authAttemptsTotal = new client.Counter({
  name: 'ethixai_backend_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status']
});

const activeSessionsGauge = new client.Gauge({
  name: 'ethixai_backend_active_sessions',
  help: 'Number of active user sessions'
});

const tokenRefreshTotal = new client.Counter({
  name: 'ethixai_backend_token_refresh_total',
  help: 'Total number of token refreshes',
  labelNames: ['status']
});

// ========================================
// Database Metrics
// ========================================

const dbQueryDuration = new client.Histogram({
  name: 'ethixai_backend_db_query_duration_ms',
  help: 'Duration of database queries in milliseconds',
  labelNames: ['operation', 'collection', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500]
});

const dbConnectionsGauge = new client.Gauge({
  name: 'ethixai_backend_db_connections',
  help: 'Number of active database connections',
  labelNames: ['database', 'state']
});

const dbErrorsTotal = new client.Counter({
  name: 'ethixai_backend_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type']
});

// ========================================
// Cache Metrics
// ========================================

const cacheHitsTotal = new client.Counter({
  name: 'ethixai_backend_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

const cacheMissesTotal = new client.Counter({
  name: 'ethixai_backend_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

const cacheSize = new client.Gauge({
  name: 'ethixai_backend_cache_size',
  help: 'Current size of cache',
  labelNames: ['cache_type']
});

// ========================================
// External API Metrics
// ========================================

const externalApiCallDuration = new client.Histogram({
  name: 'ethixai_backend_external_api_call_duration_ms',
  help: 'Duration of external API calls in milliseconds',
  labelNames: ['service', 'endpoint', 'status_code'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

const externalApiErrorsTotal = new client.Counter({
  name: 'ethixai_backend_external_api_errors_total',
  help: 'Total number of external API errors',
  labelNames: ['service', 'error_type']
});

// ========================================
// Report Metrics
// ========================================

const reportGenerationsTotal = new client.Counter({
  name: 'ethixai_backend_report_generations_total',
  help: 'Total number of report generations',
  labelNames: ['format', 'status']
});

const reportGenerationDuration = new client.Histogram({
  name: 'ethixai_backend_report_generation_duration_ms',
  help: 'Duration of report generation in milliseconds',
  labelNames: ['format'],
  buckets: [100, 500, 1000, 2000, 5000, 10000]
});

// ========================================
// Metrics Helper Functions
// ========================================

/**
 * Middleware to track HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
  const route = req.route?.path || req.path;
  const method = req.method;
  
  // Track in-progress requests
  httpRequestsInProgress.inc({ method, route });
  
  const startTime = Date.now();
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode });
    httpRequestsInProgress.dec({ method, route });
    
    // Track errors
    if (statusCode >= 400) {
      httpErrorsTotal.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }
    
    originalEnd.apply(res, args);
  };
  
  next();
};

/**
 * Record inference request
 */
const recordInferenceRequest = (modelType, userId, status) => {
  inferenceRequestsTotal.inc({ model_type: modelType, user_id: userId || 'anonymous', status });
};

/**
 * Record bias detection
 */
const recordBiasDetection = (protectedAttribute, severity) => {
  biasDetectionsTotal.inc({ protected_attribute: protectedAttribute, severity });
};

/**
 * Update fairness score
 */
const updateFairnessScore = (modelType, protectedAttribute, score) => {
  fairnessScoreGauge.set({ model_type: modelType, protected_attribute: protectedAttribute }, score);
};

/**
 * Record dataset size
 */
const recordDatasetSize = (modelType, size) => {
  datasetSizeHistogram.observe({ model_type: modelType }, size);
};

/**
 * Record authentication attempt
 */
const recordAuthAttempt = (method, status) => {
  authAttemptsTotal.inc({ method, status });
};

/**
 * Update active sessions count
 */
const updateActiveSessions = (count) => {
  activeSessionsGauge.set(count);
};

/**
 * Record database query
 */
const recordDbQuery = (operation, collection, duration, status = 'success') => {
  dbQueryDuration.observe({ operation, collection, status }, duration);
};

/**
 * Record database error
 */
const recordDbError = (operation, errorType) => {
  dbErrorsTotal.inc({ operation, error_type: errorType });
};

/**
 * Record cache operation
 */
const recordCacheOperation = (cacheType, hit) => {
  if (hit) {
    cacheHitsTotal.inc({ cache_type: cacheType });
  } else {
    cacheMissesTotal.inc({ cache_type: cacheType });
  }
};

/**
 * Update cache size
 */
const updateCacheSize = (cacheType, size) => {
  cacheSize.set({ cache_type: cacheType }, size);
};

/**
 * Record external API call
 */
const recordExternalApiCall = (service, endpoint, statusCode, duration) => {
  externalApiCallDuration.observe(
    { service, endpoint, status_code: statusCode },
    duration
  );
};

/**
 * Record report generation
 */
const recordReportGeneration = (format, status, duration = null) => {
  reportGenerationsTotal.inc({ format, status });
  
  if (duration !== null) {
    reportGenerationDuration.observe({ format }, duration);
  }
};

/**
 * Get current metrics
 */
const getMetrics = async () => {
  return await register.metrics();
};

/**
 * Reset all metrics (for testing)
 */
const resetMetrics = () => {
  register.resetMetrics();
};

// Log metrics initialization
logger.info('Prometheus metrics initialized', {
  metricsCount: register.getMetricsAsJSON().length,
  endpoint: '/metrics'
});

module.exports = {
  register,
  metricsMiddleware,
  getMetrics,
  resetMetrics,
  
  // Metric recording functions
  recordInferenceRequest,
  recordBiasDetection,
  updateFairnessScore,
  recordDatasetSize,
  recordAuthAttempt,
  updateActiveSessions,
  recordDbQuery,
  recordDbError,
  recordCacheOperation,
  updateCacheSize,
  recordExternalApiCall,
  recordReportGeneration,
  
  // Direct access to metrics (for advanced use)
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    httpRequestsInProgress,
    httpErrorsTotal,
    inferenceRequestsTotal,
    biasDetectionsTotal,
    fairnessScoreGauge,
    datasetSizeHistogram,
    authAttemptsTotal,
    activeSessionsGauge,
    tokenRefreshTotal,
    dbQueryDuration,
    dbConnectionsGauge,
    dbErrorsTotal,
    cacheHitsTotal,
    cacheMissesTotal,
    cacheSize,
    externalApiCallDuration,
    externalApiErrorsTotal,
    reportGenerationsTotal,
    reportGenerationDuration
  }
};
