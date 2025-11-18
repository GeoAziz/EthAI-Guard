/**
 * Security middleware for Express.js
 * Implements security headers, rate limiting, and other security best practices
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security headers middleware
 */
function securityHeaders() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for development
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"], // Allow local connections
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection
    xssFilter: true,
    
    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    
    // Hide X-Powered-By
    hidePoweredBy: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    }
  });
}

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per IP
 */
function rateLimiting(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Max 100 requests per window
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders, // Disable `X-RateLimit-*` headers
    
    // Skip rate limiting if disabled
    skip: (req) => {
      return process.env.DISABLE_RATE_LIMIT === '1' || 
             process.env.DISABLE_RATE_LIMIT === 'true';
    },
    
    // Custom key generator (use IP + user ID if authenticated)
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
    
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      console.warn(`[Security] Rate limit exceeded for ${req.ip}`);
      
      if (global.metricsCollector) {
        global.metricsCollector.rateLimitExceeded.inc({
          endpoint: req.path,
          method: req.method
        });
      }
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Strict rate limiting for sensitive endpoints
 */
function strictRateLimiting() {
  return rateLimiting({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 requests
    message: 'Too many authentication attempts, please try again later.'
  });
}

/**
 * API rate limiting (more permissive)
 */
function apiRateLimiting() {
  return rateLimiting({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'API rate limit exceeded.'
  });
}

/**
 * CORS configuration
 */
function corsOptions() {
  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:5000'];
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn(`[Security] CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  };
}

/**
 * Request sanitization middleware
 */
function sanitizeRequest() {
  return (req, res, next) => {
    // Remove potentially dangerous characters from query params
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/[<>]/g, '');
      }
    });
    
    next();
  };
}

/**
 * Security logging middleware
 */
function securityLogging() {
  return (req, res, next) => {
    const securityEvents = [];
    
    // Check for suspicious patterns
    const userAgent = req.get('user-agent') || '';
    const referer = req.get('referer') || '';
    
    // Detect potential SQL injection
    if (req.url.match(/(\%27)|(\')|(\-\-)|(\%23)|(#)/i)) {
      securityEvents.push('sql_injection_attempt');
    }
    
    // Detect potential XSS
    if (req.url.match(/<script|javascript:|onerror=/i)) {
      securityEvents.push('xss_attempt');
    }
    
    // Detect suspicious user agents
    if (userAgent.match(/nikto|sqlmap|nmap|masscan|nessus/i)) {
      securityEvents.push('suspicious_user_agent');
    }
    
    // Log security events
    if (securityEvents.length > 0) {
      console.warn(`[Security] Suspicious request from ${req.ip}:`, {
        ip: req.ip,
        method: req.method,
        url: req.url,
        userAgent,
        events: securityEvents
      });
      
      if (global.metricsCollector) {
        global.metricsCollector.securityEvents.inc({
          type: securityEvents[0],
          ip: req.ip
        });
      }
    }
    
    next();
  };
}

module.exports = {
  securityHeaders,
  rateLimiting,
  strictRateLimiting,
  apiRateLimiting,
  corsOptions,
  sanitizeRequest,
  securityLogging
};
