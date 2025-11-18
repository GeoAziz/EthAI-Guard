/**
 * Caching middleware for Express.js
 * Implements in-memory caching with TTL for frequent queries
 */

const NodeCache = require('node-cache');

// Initialize cache with 5-minute TTL, check period every 2 minutes
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 120, // 2 minutes
  useClones: false // For performance
});

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds (default: 300)
 * @returns {Function} Express middleware
 */
function cacheMiddleware(duration = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const key = `${req.originalUrl || req.url}`;
    
    // Check if cached response exists
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      // Increment cache hit metric
      if (global.metricsCollector) {
        global.metricsCollector.cacheHits.inc({ endpoint: req.path });
      }
      
      console.log(`[Cache] HIT: ${key}`);
      return res.json(cachedResponse);
    }

    // Cache miss - proceed with request
    console.log(`[Cache] MISS: ${key}`);
    
    if (global.metricsCollector) {
      global.metricsCollector.cacheMisses.inc({ endpoint: req.path });
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to cache response
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, duration);
        console.log(`[Cache] STORED: ${key} (TTL: ${duration}s)`);
      }
      
      return originalJson(body);
    };

    next();
  };
}

/**
 * Cache invalidation middleware
 * Clears cache entries matching a pattern
 */
function invalidateCache(pattern) {
  return (req, res, next) => {
    const keys = cache.keys();
    let deletedCount = 0;

    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`[Cache] INVALIDATED: ${deletedCount} keys matching "${pattern}"`);
    }

    next();
  };
}

/**
 * Manual cache invalidation
 */
function clearCache(pattern = null) {
  if (pattern) {
    const keys = cache.keys();
    let deletedCount = 0;

    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
        deletedCount++;
      }
    });

    console.log(`[Cache] CLEARED: ${deletedCount} keys matching "${pattern}"`);
    return deletedCount;
  } else {
    cache.flushAll();
    console.log('[Cache] CLEARED: All keys');
    return true;
  }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats,
  cache
};
