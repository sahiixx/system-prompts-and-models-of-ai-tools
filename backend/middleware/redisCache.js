const redis = require('redis');
const { promisify } = require('util');

// Create Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error and flush all commands with error
      console.error('Redis connection refused');
      return new Error('Redis connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after 1 hour
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
});

// Promisify Redis methods
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const existsAsync = promisify(redisClient.exists).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);

// Redis client error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✓ Redis ready to use');
});

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if Redis is not available
    if (!redisClient.connected) {
      console.warn('Redis not connected, skipping cache');
      return next();
    }

    // Generate cache key based on URL and query params
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      // Check if cached data exists
      const cachedData = await getAsync(key);

      if (cachedData) {
        console.log(`✓ Cache HIT for ${key}`);
        
        // Parse and return cached data
        const data = JSON.parse(cachedData);
        return res.json({
          ...data,
          fromCache: true,
          cached: true
        });
      }

      console.log(`✗ Cache MISS for ${key}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = (body) => {
        // Cache the response
        setAsync(key, JSON.stringify(body), 'EX', duration)
          .then(() => console.log(`✓ Cached ${key} for ${duration}s`))
          .catch(err => console.error('Cache set error:', err));

        // Send the response
        originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Clear cache by pattern
const clearCacheByPattern = async (pattern) => {
  try {
    if (!redisClient.connected) {
      console.warn('Redis not connected, cannot clear cache');
      return false;
    }

    const keys = await new Promise((resolve, reject) => {
      redisClient.keys(pattern, (err, keys) => {
        if (err) reject(err);
        else resolve(keys);
      });
    });

    if (keys && keys.length > 0) {
      await delAsync(...keys);
      console.log(`✓ Cleared ${keys.length} cache keys matching ${pattern}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

// Clear specific cache key
const clearCache = async (key) => {
  try {
    if (!redisClient.connected) {
      console.warn('Redis not connected, cannot clear cache');
      return false;
    }

    await delAsync(key);
    console.log(`✓ Cleared cache key: ${key}`);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

// Cache statistics
const getCacheStats = async () => {
  try {
    if (!redisClient.connected) {
      return { connected: false };
    }

    const info = await new Promise((resolve, reject) => {
      redisClient.info((err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    // Parse Redis INFO response
    const stats = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      connected: true,
      used_memory: stats.used_memory_human,
      connected_clients: stats.connected_clients,
      total_commands_processed: stats.total_commands_processed,
      keyspace_hits: stats.keyspace_hits,
      keyspace_misses: stats.keyspace_misses,
      uptime_in_days: stats.uptime_in_days
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { connected: false, error: error.message };
  }
};

// Middleware to clear cache on data modification
const clearCacheOnModify = (patterns) => {
  return async (req, res, next) => {
    // Store original send method
    const originalSend = res.send.bind(res);

    // Override send method to clear cache after successful response
    res.send = function(data) {
      // Only clear cache on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (Array.isArray(patterns)) {
          patterns.forEach(pattern => clearCacheByPattern(pattern));
        } else {
          clearCacheByPattern(patterns);
        }
      }

      // Send the response
      originalSend(data);
    };

    next();
  };
};

// Get or set cache with callback
const getOrSetCache = async (key, callback, duration = 300) => {
  try {
    if (!redisClient.connected) {
      console.warn('Redis not connected, executing callback directly');
      return await callback();
    }

    // Check if cached data exists
    const cachedData = await getAsync(key);

    if (cachedData) {
      console.log(`✓ Cache HIT for ${key}`);
      return JSON.parse(cachedData);
    }

    console.log(`✗ Cache MISS for ${key}`);

    // Execute callback to get fresh data
    const freshData = await callback();

    // Cache the fresh data
    await setAsync(key, JSON.stringify(freshData), 'EX', duration);
    console.log(`✓ Cached ${key} for ${duration}s`);

    return freshData;
  } catch (error) {
    console.error('getOrSetCache error:', error);
    // Return fresh data on error
    return await callback();
  }
};

module.exports = {
  redisClient,
  cache,
  clearCache,
  clearCacheByPattern,
  clearCacheOnModify,
  getCacheStats,
  getOrSetCache,
  getAsync,
  setAsync,
  delAsync,
  existsAsync,
  expireAsync
};
