const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

// Distributed tracing context: stores trace info for request correlation
class TraceContext {
  constructor(traceId, spanId, parentSpanId = null) {
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
  }

  toHeaders() {
    return {
      'traceparent': `00-${this.traceId}-${this.spanId}-01`,
      'tracestate': '',
      'x-trace-id': this.traceId,
      'x-span-id': this.spanId,
    };
  }

  static fromHeaders(headers) {
    const traceId = headers['x-trace-id'] || headers['traceparent']?.split('-')[1] || uuidv4().replace(/-/g, '');
    const spanId = headers['x-span-id'] || headers['traceparent']?.split('-')[2] || uuidv4().replace(/-/g, '').slice(0, 16);
    return new TraceContext(traceId, spanId);
  }

  duration() {
    return Date.now() - this.startTime;
  }
}

// Middleware for Express: attach trace context to request
function traceMiddleware(req, res, next) {
  const trace = TraceContext.fromHeaders(req.headers);
  req.trace = trace;
  res.setHeader('X-Trace-Id', trace.traceId);
  res.setHeader('X-Span-Id', trace.spanId);
  next();
}

// Wrapper for axios to propagate trace context
function traceAxiosInterceptor(axiosInstance) {
  axiosInstance.interceptors.request.use((config) => {
    if (global.currentTrace) {
      const headers = global.currentTrace.toHeaders();
      Object.assign(config.headers || {}, headers);
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error),
  );
}

// Set current trace in async context (nodejs AsyncLocalStorage would be better but keeping it simple)
function setCurrentTrace(trace) {
  global.currentTrace = trace;
}

function getCurrentTrace() {
  return global.currentTrace;
}

function initTracing() {
  logger.info('Distributed tracing initialized (W3C traceparent + custom headers)');
}

module.exports = {
  TraceContext,
  traceMiddleware,
  traceAxiosInterceptor,
  setCurrentTrace,
  getCurrentTrace,
  initTracing,
};
