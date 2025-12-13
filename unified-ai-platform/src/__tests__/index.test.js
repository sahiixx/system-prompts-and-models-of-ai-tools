/**
 * Comprehensive Unit Tests for UnifiedAIPlatform (index.js)
 * 
 * Tests cover:
 * - Class initialization
 * - Middleware setup
 * - Route handlers (health, API endpoints)
 * - Error handling
 * - Server lifecycle
 * - Edge cases and error conditions
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../index');

// Mock dependencies
jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Test Platform',
    version: '1.0.0-test'
  },
  core_capabilities: {
    multi_modal: { enabled: true },
    memory_system: { enabled: true },
    tool_system: { enabled: true },
    planning_system: { enabled: true },
    security: { enabled: true }
  },
  operating_modes: {
    development: { debug: true }
  },
  performance: {
    response_time: { target_ms: 1000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10 }
  }
}));

jest.mock('../../config/tools.json', () => [
  {
    type: 'function',
    function: {
      name: 'test_tool',
      description: 'A test tool'
    }
  }
]);

describe('UnifiedAIPlatform', () => {
  let platform;
  let server;

  beforeEach(() => {
    // Create fresh instance for each test
    platform = new UnifiedAIPlatform();
  });

  afterEach(async () => {
    // Clean up server if it was started
    if (server) {
      await new Promise(resolve => server.close(resolve));
      server = null;
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(platform).toBeDefined();
      expect(platform.port).toBe(process.env.PORT || 3000);
      expect(platform.isInitialized).toBe(false);
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.plans).toBeInstanceOf(Map);
      expect(platform.tools).toBeDefined();
    });

    test('should use PORT environment variable if set', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '8080';
      
      const customPlatform = new UnifiedAIPlatform();
      expect(customPlatform.port).toBe('8080');
      
      process.env.PORT = originalPort;
    });

    test('should initialize empty memory and plans storage', () => {
      expect(platform.memory.size).toBe(0);
      expect(platform.plans.size).toBe(0);
    });

    test('should have express app configured', () => {
      expect(platform.app).toBeDefined();
      expect(typeof platform.app.listen).toBe('function');
    });
  });

  describe('Middleware Setup', () => {
    test('should configure security middleware', () => {
      // Security headers should be applied
      const app = platform.app;
      expect(app._router).toBeDefined();
    });

    test('should handle JSON body parsing', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' })
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(200);
    });

    test('should handle URL encoded data', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send('key=test&value=data')
        .set('Content-Type', 'application/x-www-form-urlencoded');
      
      expect(response.status).toBe(200);
    });

    test('should reject oversized payloads', async () => {
      const largePayload = { key: 'test', value: 'x'.repeat(11 * 1024 * 1024) };
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(largePayload)
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(413);
    });
  });

  describe('Health Check Endpoint', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        platform: 'Unified AI Platform',
        version: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.any(Object),
        initialized: false,
        features: {
          multi_modal: true,
          memory_system: true,
          tool_system: true,
          planning_system: true,
          security: true
        }
      });
    });

    test('health check should include memory usage', async () => {
      const response = await request(platform.app).get('/health');
      
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('rss');
    });

    test('health check timestamp should be valid ISO date', async () => {
      const response = await request(platform.app).get('/health');
      const timestamp = new Date(response.body.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('Tools API Endpoint', () => {
    test('GET /api/v1/tools should return tools list', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
      expect(Array.isArray(response.body.tools)).toBe(true);
    });

    test('tools endpoint should return correct count', async () => {
      const response = await request(platform.app).get('/api/v1/tools');
      
      expect(response.body.count).toBe(response.body.tools.length);
    });

    test('tools should have expected structure', async () => {
      const response = await request(platform.app).get('/api/v1/tools');
      
      if (response.body.tools.length > 0) {
        const tool = response.body.tools[0];
        expect(tool).toHaveProperty('type');
        expect(tool).toHaveProperty('function');
      }
    });
  });

  describe('Memory API Endpoints', () => {
    test('GET /api/v1/memory should return empty memory initially', async () => {
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        memories: [],
        count: 0,
        description: expect.any(String)
      });
    });

    test('POST /api/v1/memory should store a memory', async () => {
      const memoryData = {
        key: 'user_preference',
        value: 'dark_mode'
      };

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(memoryData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Memory stored successfully'
      });
    });

    test('POST /api/v1/memory should require key and value', async () => {
      const response1 = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test' })
        .expect(400);

      expect(response1.body).toHaveProperty('error');

      const response2 = await request(platform.app)
        .post('/api/v1/memory')
        .send({ value: 'test' })
        .expect(400);

      expect(response2.body).toHaveProperty('error');
    });

    test('stored memory should be retrievable', async () => {
      // Store a memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test_key', value: 'test_value' });

      // Retrieve memories
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.memories).toHaveLength(1);
      
      const [key, memoryObj] = response.body.memories[0];
      expect(key).toBe('test_key');
      expect(memoryObj.content).toBe('test_value');
      expect(memoryObj).toHaveProperty('created_at');
      expect(memoryObj).toHaveProperty('last_accessed');
    });

    test('memory should have timestamps', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamped', value: 'data' });

      const response = await request(platform.app).get('/api/v1/memory');
      const [, memoryObj] = response.body.memories[0];

      expect(new Date(memoryObj.created_at)).toBeInstanceOf(Date);
      expect(new Date(memoryObj.last_accessed)).toBeInstanceOf(Date);
    });

    test('multiple memories should be stored independently', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'key1', value: 'value1' });

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'key2', value: 'value2' });

      const response = await request(platform.app).get('/api/v1/memory');
      
      expect(response.body.count).toBe(2);
      expect(response.body.memories).toHaveLength(2);
    });

    test('memory values can be complex objects', async () => {
      const complexValue = {
        nested: { data: 'value' },
        array: [1, 2, 3],
        boolean: true
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complex', value: complexValue });

      const response = await request(platform.app).get('/api/v1/memory');
      const [, memoryObj] = response.body.memories[0];

      expect(memoryObj.content).toEqual(complexValue);
    });
  });

  describe('Plans API Endpoints', () => {
    test('GET /api/v1/plans should return empty plans initially', async () => {
      const response = await request(platform.app)
        .get('/api/v1/plans')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        plans: [],
        count: 0,
        description: expect.any(String)
      });
    });

    test('POST /api/v1/plans should create a plan', async () => {
      const planData = {
        task_description: 'Build a feature',
        steps: ['step1', 'step2', 'step3']
      };

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send(planData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        plan_id: expect.stringMatching(/^plan_\d+$/),
        message: 'Plan created successfully'
      });
    });

    test('POST /api/v1/plans should require task_description', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ steps: ['step1'] })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Task description is required');
    });

    test('plans can be created without explicit steps', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Simple task' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.plan_id).toBeDefined();
    });

    test('created plan should be retrievable', async () => {
      // Create a plan
      const createResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Test plan',
          steps: ['analyze', 'implement', 'test']
        });

      const planId = createResponse.body.plan_id;

      // Retrieve plans
      const response = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(response.body.count).toBe(1);
      
      const [retrievedPlanId, planObj] = response.body.plans[0];
      expect(retrievedPlanId).toBe(planId);
      expect(planObj.task_description).toBe('Test plan');
      expect(planObj.steps).toEqual(['analyze', 'implement', 'test']);
      expect(planObj.status).toBe('created');
      expect(planObj).toHaveProperty('created_at');
    });

    test('plan IDs should be unique', async () => {
      const response1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Plan 1' });

      const response2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Plan 2' });

      expect(response1.body.plan_id).not.toBe(response2.body.plan_id);
    });

    test('plan ID should include timestamp', async () => {
      const beforeTime = Date.now();
      
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test timing' });

      const afterTime = Date.now();
      const planIdTimestamp = parseInt(response.body.plan_id.replace('plan_', ''));

      expect(planIdTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(planIdTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Capabilities API Endpoint', () => {
    test('GET /api/v1/capabilities should return platform capabilities', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('core_capabilities');
      expect(response.body).toHaveProperty('operating_modes');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('description');
    });

    test('capabilities should include all core systems', async () => {
      const response = await request(platform.app).get('/api/v1/capabilities');

      expect(response.body.core_capabilities).toHaveProperty('multi_modal');
      expect(response.body.core_capabilities).toHaveProperty('memory_system');
      expect(response.body.core_capabilities).toHaveProperty('tool_system');
      expect(response.body.core_capabilities).toHaveProperty('planning_system');
      expect(response.body.core_capabilities).toHaveProperty('security');
    });
  });

  describe('Demo API Endpoint', () => {
    test('GET /api/v1/demo should return demo information', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.any(String),
        features: expect.any(Array),
        systems_combined: expect.any(Array),
        status: expect.any(String)
      });
    });

    test('demo should list key features', async () => {
      const response = await request(platform.app).get('/api/v1/demo');

      expect(response.body.features.length).toBeGreaterThan(0);
      expect(response.body.features).toContain('Multi-Modal Processing');
      expect(response.body.features).toContain('Context-Aware Memory');
    });

    test('demo should list combined systems', async () => {
      const response = await request(platform.app).get('/api/v1/demo');

      expect(response.body.systems_combined.length).toBeGreaterThan(0);
      expect(response.body.systems_combined.some(s => s.includes('Cursor'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(platform.app)
        .get('/api/v1/nonexistent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('not found'),
        timestamp: expect.any(String)
      });
    });

    test('should handle POST to unknown routes', async () => {
      const response = await request(platform.app)
        .post('/api/v1/unknown')
        .send({ data: 'test' })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);

      expect(response.status).toBe(400);
    });

    test('error responses should include timestamp', async () => {
      const response = await request(platform.app).get('/nonexistent');

      expect(response.body.timestamp).toBeDefined();
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers', async () => {
      const response = await request(platform.app).get('/health');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(platform.app)
        .options('/api/v1/memory')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    test('start() should launch server successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await platform.start();
      server = platform.app._server || { close: (cb) => cb() };
      
      expect(platform.isInitialized).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unified AI Platform running')
      );

      consoleSpy.mockRestore();
    }, 10000);

    test('stop() should shutdown gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await platform.stop();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down')
      );

      consoleSpy.mockRestore();
    });

    test('logPlatformCapabilities should display configuration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Platform Capabilities')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Targets')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Static File Serving', () => {
    test('should serve static files from /static route', async () => {
      // This tests the middleware configuration, not actual file serving
      // as we don't have actual static files in the test environment
      const response = await request(platform.app)
        .get('/static/nonexistent.css');

      // Either serves file (200) or returns 404 if not found
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Security Middleware', () => {
    test('should set security headers', async () => {
      const response = await request(platform.app).get('/health');

      // Helmet should set various security headers
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should have Content-Security-Policy', async () => {
      const response = await request(platform.app).get('/health');

      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('Request Logging', () => {
    test('should log incoming requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(platform.app).get('/health');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/GET \/health/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty POST body', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle null values in memory', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'null_test', value: null });

      // null is falsy, so it should be rejected
      expect(response.status).toBe(400);
    });

    test('should handle special characters in memory keys', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'key-with-special_chars.123', value: 'test' });

      expect(response.status).toBe(200);
    });

    test('should handle very long task descriptions', async () => {
      const longDescription = 'x'.repeat(10000);
      
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: longDescription });

      expect(response.status).toBe(200);
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map((_, i) => 
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: `value_${i}` })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const memoryResponse = await request(platform.app).get('/api/v1/memory');
      expect(memoryResponse.body.count).toBe(10);
    });
  });
});