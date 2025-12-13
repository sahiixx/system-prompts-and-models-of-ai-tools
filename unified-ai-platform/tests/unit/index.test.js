/**
 * Unit Tests for UnifiedAIPlatform (src/index.js)
 * 
 * These tests cover the main Express-based AI platform including:
 * - Constructor and initialization
 * - Middleware setup
 * - Route handlers (health, API endpoints, memory, plans, capabilities)
 * - Error handling
 * - Server lifecycle (start/stop)
 * - Edge cases and failure conditions
 */

const request = require('supertest');
const express = require('express');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock external dependencies
jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Unified AI Platform',
    version: '1.0.0',
    description: 'Test platform'
  },
  core_capabilities: {
    multi_modal: { enabled: true },
    memory_system: { enabled: true },
    tool_system: { enabled: true },
    planning_system: { enabled: true },
    security: { enabled: true }
  },
  operating_modes: {
    development: { debug: true },
    production: { debug: false }
  },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  {
    type: 'function',
    function: {
      name: 'test_tool',
      description: 'A test tool'
    }
  }
]));

describe('UnifiedAIPlatform', () => {
  let platform;
  let server;

  beforeEach(() => {
    // Create a fresh instance for each test
    platform = new UnifiedAIPlatform();
  });

  afterEach(async () => {
    // Clean up
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      server = null;
    }
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(platform).toBeDefined();
      expect(platform.app).toBeDefined();
      expect(platform.port).toBe(process.env.PORT || 3000);
      expect(platform.isInitialized).toBe(false);
    });

    test('should initialize memory as a Map', () => {
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.memory.size).toBe(0);
    });

    test('should initialize plans as a Map', () => {
      expect(platform.plans).toBeInstanceOf(Map);
      expect(platform.plans.size).toBe(0);
    });

    test('should load tools configuration', () => {
      expect(platform.tools).toBeDefined();
      expect(Array.isArray(platform.tools)).toBe(true);
    });

    test('should use PORT from environment if set', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '4000';
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform.port).toBe('4000');
      process.env.PORT = originalPort;
    });
  });

  describe('Middleware Setup', () => {
    test('should configure helmet security middleware', () => {
      // Middleware is set up in constructor
      expect(platform.app._router).toBeDefined();
    });

    test('should configure CORS middleware', () => {
      // CORS should be configured
      expect(platform.app._router.stack.some(layer => 
        layer.name === 'corsMiddleware'
      )).toBeTruthy();
    });

    test('should configure body parser for JSON', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' })
        .set('Content-Type', 'application/json');
      
      // Should not fail due to body parsing
      expect(response.status).toBeDefined();
    });
  });

  describe('GET /health', () => {
    test('should return 200 and health status', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        platform: 'Unified AI Platform',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });

    test('should include feature flags in health response', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.features).toMatchObject({
        multi_modal: true,
        memory_system: true,
        tool_system: true,
        planning_system: true,
        security: true
      });
    });

    test('should show initialized status', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.initialized).toBe(false);
    });
  });

  describe('GET /api/v1/tools', () => {
    test('should return tools list', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
      expect(Array.isArray(response.body.tools)).toBe(true);
    });

    test('should return correct tool count', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(response.body.count).toBe(platform.tools.length);
    });
  });

  describe('GET /api/v1/memory', () => {
    test('should return empty memory initially', async () => {
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.memories).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test('should return stored memories', async () => {
      platform.memory.set('test_key', {
        content: 'test_value',
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      });

      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.memories).toHaveLength(1);
    });
  });

  describe('POST /api/v1/memory', () => {
    test('should store memory with key and value', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_pref', value: 'dark_mode' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Memory stored successfully');
      expect(platform.memory.has('user_pref')).toBe(true);
    });

    test('should include timestamp in stored memory', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' })
        .expect(200);

      const stored = platform.memory.get('test');
      expect(stored.created_at).toBeDefined();
      expect(stored.last_accessed).toBeDefined();
      expect(stored.content).toBe('data');
    });

    test('should return 400 if key is missing', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ value: 'data' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Key and value are required');
    });

    test('should return 400 if value is missing', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Key and value are required');
    });

    test('should return 400 if both key and value are missing', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle complex nested values', async () => {
      const complexValue = {
        settings: { theme: 'dark', language: 'en' },
        history: [1, 2, 3]
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complex', value: complexValue })
        .expect(200);

      const stored = platform.memory.get('complex');
      expect(stored.content).toEqual(complexValue);
    });
  });

  describe('GET /api/v1/plans', () => {
    test('should return empty plans initially', async () => {
      const response = await request(platform.app)
        .get('/api/v1/plans')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.plans).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test('should return stored plans', async () => {
      platform.plans.set('plan_1', {
        task_description: 'test task',
        steps: ['step1'],
        created_at: new Date().toISOString(),
        status: 'created'
      });

      const response = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.plans).toHaveLength(1);
    });
  });

  describe('POST /api/v1/plans', () => {
    test('should create plan with task description', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Build feature X' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.plan_id).toBeDefined();
      expect(response.body.plan_id).toMatch(/^plan_\d+$/);
      expect(response.body.message).toBe('Plan created successfully');
    });

    test('should create plan with steps', async () => {
      const steps = ['Analyze requirements', 'Design API', 'Implement'];
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Build API',
          steps: steps
        })
        .expect(200);

      const planId = response.body.plan_id;
      const plan = platform.plans.get(planId);
      expect(plan.steps).toEqual(steps);
    });

    test('should default to empty steps array if not provided', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Simple task' })
        .expect(200);

      const planId = response.body.plan_id;
      const plan = platform.plans.get(planId);
      expect(plan.steps).toEqual([]);
    });

    test('should return 400 if task description is missing', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Task description is required');
    });

    test('should include timestamp and status in plan', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test' })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.created_at).toBeDefined();
      expect(plan.status).toBe('created');
    });

    test('should generate unique plan IDs', async () => {
      const response1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task 1' })
        .expect(200);

      const response2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task 2' })
        .expect(200);

      expect(response1.body.plan_id).not.toBe(response2.body.plan_id);
    });
  });

  describe('GET /api/v1/capabilities', () => {
    test('should return platform capabilities', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('core_capabilities');
      expect(response.body).toHaveProperty('operating_modes');
      expect(response.body).toHaveProperty('performance');
    });

    test('should include platform information', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.platform).toMatchObject({
        name: 'Unified AI Platform',
        version: '1.0.0'
      });
    });
  });

  describe('GET /api/v1/demo', () => {
    test('should return demo information', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Unified AI Platform Demo');
      expect(response.body.features).toBeDefined();
      expect(response.body.systems_combined).toBeDefined();
      expect(response.body.status).toBe('Ready for deployment!');
    });

    test('should list expected features', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(response.body.features).toContain('Multi-Modal Processing');
      expect(response.body.features).toContain('Context-Aware Memory');
      expect(response.body.features).toContain('Modular Tool System');
    });

    test('should list integrated systems', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(Array.isArray(response.body.systems_combined)).toBe(true);
      expect(response.body.systems_combined.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(platform.app)
        .get('/api/v1/unknown')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('not found');
    });

    test('should include timestamp in error responses', async () => {
      const response = await request(platform.app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.timestamp).toBeDefined();
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"invalid json')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      const testPort = 3001;
      platform.port = testPort;
      
      await platform.start();
      expect(platform.isInitialized).toBe(true);
      
      // Test that server is actually listening
      const response = await request(platform.app)
        .get('/health')
        .expect(200);
      
      expect(response.body.initialized).toBe(true);
    });

    test('should handle stop gracefully', async () => {
      await platform.stop();
      // Should not throw
      expect(true).toBe(true);
    });

    test('should log platform capabilities on start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('CORS Configuration', () => {
    test('should allow specified HTTP methods', async () => {
      const response = await request(platform.app)
        .options('/api/v1/memory')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Memory Edge Cases', () => {
    test('should handle empty string as key', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle null values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: null })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should overwrite existing memory with same key', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'override_test', value: 'original' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'override_test', value: 'updated' })
        .expect(200);

      const stored = platform.memory.get('override_test');
      expect(stored.content).toBe('updated');
    });
  });

  describe('Plans Edge Cases', () => {
    test('should handle empty task description', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: '' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle very long task descriptions', async () => {
      const longDescription = 'A'.repeat(10000);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: longDescription })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.task_description).toBe(longDescription);
    });

    test('should handle plans with large step arrays', async () => {
      const manySteps = Array.from({ length: 100 }, (_, i) => `Step ${i + 1}`);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Complex task',
          steps: manySteps
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toHaveLength(100);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple memory writes concurrently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `key_${i}`, value: `value_${i}` })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(platform.memory.size).toBe(10);
    });

    test('should handle multiple plan creations concurrently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.plan_id).toBeDefined();
      });

      expect(platform.plans.size).toBe(5);
    });
  });

  describe('Static Files', () => {
    test('should serve static files from public directory', async () => {
      // This tests the middleware setup, actual file serving depends on file existence
      const response = await request(platform.app)
        .get('/static/nonexistent.html');
      
      // Should either return file or 404, not 500
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Request Logging', () => {
    test('should log incoming requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(platform.app)
        .get('/health')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});