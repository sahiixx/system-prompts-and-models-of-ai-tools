const express = require('express');
const router = express.Router();
const os = require('os');
const { redisClient, getCacheStats } = require('../middleware/redisCache');
const mongoose = require('mongoose');

// @route   GET /api/health
// @desc    Basic health check
// @access  Public
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/health/detailed
// @desc    Detailed health check with system metrics
// @access  Public
router.get('/detailed', async (req, res) => {
  try {
    // System metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Process metrics
    const processMemory = process.memoryUsage();
    
    // Database status
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Redis status
    const redisStatus = redisClient.connected ? 'connected' : 'disconnected';
    const cacheStats = await getCacheStats();
    
    // CPU info
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuCount = cpus.length;
    
    // Load average (1, 5, 15 minutes)
    const loadAverage = os.loadavg();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: {
        process: process.uptime(),
        system: os.uptime()
      },
      memory: {
        system: {
          total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          usagePercent: `${((usedMemory / totalMemory) * 100).toFixed(2)}%`
        },
        process: {
          rss: `${(processMemory.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(processMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(processMemory.external / 1024 / 1024).toFixed(2)} MB`
        }
      },
      cpu: {
        model: cpuModel,
        cores: cpuCount,
        loadAverage: {
          '1min': loadAverage[0].toFixed(2),
          '5min': loadAverage[1].toFixed(2),
          '15min': loadAverage[2].toFixed(2)
        }
      },
      database: {
        status: dbStatus,
        host: mongoose.connection.host || 'N/A',
        name: mongoose.connection.name || 'N/A'
      },
      cache: {
        status: redisStatus,
        stats: cacheStats
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// @route   GET /api/health/readiness
// @desc    Kubernetes readiness probe
// @access  Public
router.get('/readiness', async (req, res) => {
  try {
    // Check database connection
    const dbReady = mongoose.connection.readyState === 1;
    
    if (!dbReady) {
      return res.status(503).json({
        status: 'NOT_READY',
        message: 'Database not connected'
      });
    }
    
    res.json({
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      error: error.message
    });
  }
});

// @route   GET /api/health/liveness
// @desc    Kubernetes liveness probe
// @access  Public
router.get('/liveness', (req, res) => {
  res.json({
    status: 'ALIVE',
    timestamp: new Date().toISOString()
  });
});

// @route   GET /api/health/metrics
// @desc    Prometheus-style metrics
// @access  Public
router.get('/metrics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = `
# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${process.uptime()}

# HELP nodejs_heap_size_total_bytes Total heap size in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memUsage.heapTotal}

# HELP nodejs_heap_size_used_bytes Used heap size in bytes
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${memUsage.heapUsed}

# HELP nodejs_external_memory_bytes External memory in bytes
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes ${memUsage.external}

# HELP nodejs_cpu_user_usage_seconds User CPU time spent in seconds
# TYPE nodejs_cpu_user_usage_seconds counter
nodejs_cpu_user_usage_seconds ${cpuUsage.user / 1000000}

# HELP nodejs_cpu_system_usage_seconds System CPU time spent in seconds
# TYPE nodejs_cpu_system_usage_seconds counter
nodejs_cpu_system_usage_seconds ${cpuUsage.system / 1000000}

# HELP database_connection_status Database connection status (1 = connected, 0 = disconnected)
# TYPE database_connection_status gauge
database_connection_status ${mongoose.connection.readyState === 1 ? 1 : 0}

# HELP redis_connection_status Redis connection status (1 = connected, 0 = disconnected)
# TYPE redis_connection_status gauge
redis_connection_status ${redisClient.connected ? 1 : 0}
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Error generating metrics');
  }
});

// @route   GET /api/health/dependencies
// @desc    Check all service dependencies
// @access  Public
router.get('/dependencies', async (req, res) => {
  const dependencies = {
    database: {
      name: 'MongoDB',
      status: 'unknown',
      responseTime: 0
    },
    cache: {
      name: 'Redis',
      status: 'unknown',
      responseTime: 0
    }
  };

  // Check MongoDB
  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    dependencies.database.status = 'healthy';
    dependencies.database.responseTime = Date.now() - dbStart;
  } catch (error) {
    dependencies.database.status = 'unhealthy';
    dependencies.database.error = error.message;
  }

  // Check Redis
  try {
    if (redisClient.connected) {
      const redisStart = Date.now();
      await new Promise((resolve, reject) => {
        redisClient.ping((err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      dependencies.cache.status = 'healthy';
      dependencies.cache.responseTime = Date.now() - redisStart;
    } else {
      dependencies.cache.status = 'disconnected';
    }
  } catch (error) {
    dependencies.cache.status = 'unhealthy';
    dependencies.cache.error = error.message;
  }

  // Determine overall status
  const allHealthy = Object.values(dependencies).every(dep => dep.status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    dependencies
  });
});

module.exports = router;
