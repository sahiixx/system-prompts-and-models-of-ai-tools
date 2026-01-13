const NodeCache = require('node-cache');
const logger = require('../utils/logger');

// Create cache instance with default TTL of 5 minutes (300 seconds)
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

// Cache middleware factory
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query params
    const key = `__express__${req.originalUrl || req.url}`;

    // Try to get cached response
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      logger.debug(`Cache hit: ${key}`);
      return res.json(cachedResponse);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = (body) => {
      // Cache successful responses only
      if (res.statusCode === 200 && body) {
        cache.set(key, body, duration);
        logger.debug(`Cache set: ${key} for ${duration}s`);
      }
      return originalJson(body);
    };

    next();
  };
};

// Clear cache by pattern
const clearCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  
  matchingKeys.forEach(key => {
    cache.del(key);
    logger.debug(`Cache cleared: ${key}`);
  });

  return matchingKeys.length;
};

// Clear all cache
const clearAllCache = () => {
  cache.flushAll();
  logger.info('All cache cleared');
};

// Get cache stats
const getCacheStats = () => {
  return cache.getStats();
};

module.exports = {
  cacheMiddleware,
  clearCache,
  clearAllCache,
  getCacheStats,
  cache
};
