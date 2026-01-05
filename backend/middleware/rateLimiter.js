const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redisClient } = require('./redisCache');

// Rate limiter for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  // Use Redis store if available
  ...(redisClient.connected && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:api:'
    })
  })
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  ...(redisClient.connected && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:auth:'
    })
  })
});

// User-based rate limiting middleware
const userRateLimit = (maxRequests = 1000, windowMs = 60 * 60 * 1000) => {
  return async (req, res, next) => {
    // Skip if no user is authenticated
    if (!req.user || !req.user.id) {
      return next();
    }

    const userId = req.user.id;
    const key = `rl:user:${userId}`;

    try {
      // Use Redis if available
      if (redisClient.connected) {
        const { getAsync, setAsync, expireAsync } = require('./redisCache');
        
        // Get current request count
        const currentCount = await getAsync(key);
        
        if (currentCount) {
          const count = parseInt(currentCount);
          
          // Check if limit exceeded
          if (count >= maxRequests) {
            return res.status(429).json({
              success: false,
              message: `Rate limit exceeded. Maximum ${maxRequests} requests per hour allowed.`,
              retryAfter: windowMs / 1000
            });
          }
          
          // Increment counter
          await setAsync(key, count + 1);
        } else {
          // First request in this window
          await setAsync(key, 1);
          await expireAsync(key, Math.floor(windowMs / 1000));
        }

        // Add rate limit info to response headers
        res.set({
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': Math.max(0, maxRequests - (parseInt(currentCount) || 0) - 1),
          'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
        });

        next();
      } else {
        // Fallback to in-memory rate limiting if Redis is not available
        if (!global.userRateLimitStore) {
          global.userRateLimitStore = new Map();
        }

        const now = Date.now();
        const userData = global.userRateLimitStore.get(userId) || {
          count: 0,
          resetTime: now + windowMs
        };

        // Reset if window has passed
        if (now >= userData.resetTime) {
          userData.count = 0;
          userData.resetTime = now + windowMs;
        }

        // Check limit
        if (userData.count >= maxRequests) {
          return res.status(429).json({
            success: false,
            message: `Rate limit exceeded. Maximum ${maxRequests} requests per hour allowed.`,
            retryAfter: Math.ceil((userData.resetTime - now) / 1000)
          });
        }

        // Increment counter
        userData.count++;
        global.userRateLimitStore.set(userId, userData);

        // Add rate limit info to response headers
        res.set({
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': Math.max(0, maxRequests - userData.count),
          'X-RateLimit-Reset': new Date(userData.resetTime).toISOString()
        });

        // Cleanup old entries periodically
        if (Math.random() < 0.01) { // 1% chance to cleanup
          const cutoff = now - windowMs;
          for (const [key, value] of global.userRateLimitStore.entries()) {
            if (value.resetTime < cutoff) {
              global.userRateLimitStore.delete(key);
            }
          }
        }

        next();
      }
    } catch (error) {
      console.error('User rate limit error:', error);
      // Don't block request on error
      next();
    }
  };
};

// Tiered rate limiting based on user role
const tierbasedRateLimit = () => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next();
    }

    const role = req.user.role || 'user';
    const limits = {
      admin: 10000,      // 10k requests per hour
      moderator: 5000,   // 5k requests per hour
      premium: 2000,     // 2k requests per hour
      user: 1000         // 1k requests per hour (default)
    };

    const maxRequests = limits[role] || limits.user;
    
    return userRateLimit(maxRequests, 60 * 60 * 1000)(req, res, next);
  };
};

// Create custom rate limiter with options
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    ...(keyGenerator && { keyGenerator }),
    message: {
      success: false,
      message
    },
    ...(redisClient.connected && {
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:custom:'
      })
    })
  });
};

// Endpoint-specific rate limiters
const emailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 emails per hour
  message: 'Too many emails sent. Please try again later.'
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts. Please try again later.'
});

const reviewLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reviews per hour
  message: 'Too many reviews submitted. Please try again later.'
});

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests. Please slow down.'
});

module.exports = {
  apiLimiter,
  authLimiter,
  userRateLimit,
  tieredRateLimit,
  createRateLimiter,
  emailLimiter,
  passwordResetLimiter,
  reviewLimiter,
  searchLimiter
};
