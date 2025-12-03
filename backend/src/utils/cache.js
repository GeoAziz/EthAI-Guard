const LRUModule = require('lru-cache');

let client = null;
let usingRedis = false;

function _createLRU(opts = {}) {
  // lru-cache versions export different shapes (function or { default: fn })
  try {
    if (typeof LRUModule === 'function') {
      return new LRUModule(opts);
    }
    if (LRUModule && typeof LRUModule.default === 'function') {
      return new LRUModule.default(opts);
    }
    if (LRUModule && typeof LRUModule.LRU === 'function') {
      return new LRUModule.LRU(opts);
    }
  } catch (e) {
    // fallthrough to fallback implementation
  }

  // Minimal fallback LRU-like implementation (not full-featured)
  const fallback = new Map();
  return {
    get(k) {
      const e = fallback.get(k);
      if (!e) {
        return undefined;
      }
      if (e.expires && Date.now() > e.expires) {
        fallback.delete(k);
        return undefined;
      }
      return e.v;
    },
    set(k, v, { ttl } = {}) {
      const entry = { v, expires: ttl ? Date.now() + ttl : undefined };
      fallback.set(k, entry);
    },
    delete(k) {
      return fallback.delete(k);
    },
  };
}

function init(redisUrl) {
  if (!redisUrl) {
    // fallback to LRU in-memory cache
    const cache = _createLRU({ max: 500, ttl: 1000 * 60 * 5 });
    client = {
      async get(k) {
        return cache.get(k);
      },
      async set(k, v, ttlMs) {
        // older LRU versions accept (key, value, { ttl }) while our fallback accepts same shape
        try {
          cache.set(k, v, { ttl: ttlMs });
        } catch (_) {
          cache.set(k, v, ttlMs);
        }
      },
    };
    usingRedis = false;
    return client;
  }

  try {
    // lazy require so package is optional
    const { createClient } = require('redis');
    const redis = createClient({ url: redisUrl });
    redis.connect().catch(() => {});
    client = redis;
    usingRedis = true;
    return client;
  } catch (e) {
    // cannot load redis client, fallback to LRU
    const cache = new LRU({ max: 500, ttl: 1000 * 60 * 5 });
    client = {
      async get(k) {
        return cache.get(k);
      },
      async set(k, v, ttlMs) {
        cache.set(k, v, { ttl: ttlMs });
      },
    };
    usingRedis = false;
    return client;
  }
}

async function get(key) {
  if (!client) {
    throw new Error('cache not initialized');
  }
  if (usingRedis) {
    return await client.get(key).then(v => v ? JSON.parse(v) : null);
  }
  return client.get(key);
}

async function set(key, value, ttlMs = 60000) {
  if (!client) {
    throw new Error('cache not initialized');
  }
  if (usingRedis) {
    return await client.set(key, JSON.stringify(value), { PX: ttlMs }).catch(() => {});
  }
  return client.set(key, value, ttlMs);
}

async function del(key) {
  if (!client) {
    throw new Error('cache not initialized');
  }
  if (usingRedis) {
    return await client.del(key).catch(() => {});
  }
  // LRU instance uses .delete()
  try {
    return client.delete(key);
  } catch (e) {
    return undefined;
  }
}

module.exports = { init, get, set, del };
