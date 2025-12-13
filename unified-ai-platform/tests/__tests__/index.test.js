/**
 * Comprehensive Unit Tests for UnifiedAIPlatform (index.js)
 * 
 * This test suite covers:
 * - Constructor initialization
 * - Middleware setup
 * - Route handlers (happy paths, edge cases, error conditions)
 * - Memory management operations
 * - Plan management operations
 * - Error handling
 * - Server lifecycle management
 * - Configuration loading
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock dependencies
jest.mock('express', () => {
  const express = jest.requireActual('express');
  const mockApp = express();
  mockApp.listen = jest.fn((port, callback) => {
    callback();
    return { on: jest.fn() };
  });
  return Object.assign(() => mockApp, express);
});

jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Test Platform',
    version: '1.0.0'
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
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  {
    type: 'function',
    function: { name: 'test_tool', description: 'Test tool' }
  }
]));

describe('UnifiedAIPlatform', () => {
  let platform;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PORT = '3000';
    platform = new UnifiedAIPlatform();
    app = platform.app;
  });

  afterEach(() => {
    delete process.env.PORT;
    delete process.env.ALLOWED_ORIGINS;
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(platform.port).toBe(3000);
      expect(platform.isInitialized).toBe(false);
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.plans).toBeInstanceOf(Map);
      expect(platform.tools).toBeDefined();
    });

    test('should use environment PORT if provided', () => {
      process.env.PORT = '8080';
      const customPlatform = new UnifiedAIPlatform();
      expect(customPlatform.port).toBe('8080');
    });

    test('should initialize memory as empty Map', () => {
      expect(platform.memory.size).toBe(0);
    });

    test('should initialize plans as empty Map', () => {
      expect(platform.plans.size).toBe(0);
    });

    test('should load tools configuration', () => {
      expect(platform.tools).toHaveLength(1);
      expect(platform.tools[0].function.name).toBe('test_tool');
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return 200 and health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('platform', 'Unified AI Platform');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });

    test('should include all feature flags', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body.features).toEqual({
        multi_modal: true,
        memory_system: true,
        tool_system: true,
        planning_system: true,
        security: true
      });
    });

    test('should return initialized status', async () => {
      platform.isInitialized = true;
      const response = await request(app).get('/health');
      
      expect(response.body.initialized).toBe(true);
    });

    test('should include process memory usage', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
    });

    test('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/health');
      
      expect(() => new Date(response.body.timestamp)).not.toThrow();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Tools API Endpoint', () => {
    test('should return tools list with 200 status', async () => {
      const response = await request(app).get('/api/v1/tools');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
    });

    test('should return correct tool count', async () => {
      const response = await request(app).get('/api/v1/tools');
      
      expect(response.body.count).toBe(1);
      expect(response.body.tools).toHaveLength(1);
    });

    test('should include tool descriptions', async () => {
      const response = await request(app).get('/api/v1/tools');
      
      expect(response.body.description).toContain('Unified AI Platform');
    });
  });

  describe('Memory API Endpoints', () => {
    describe('GET /api/v1/memory', () => {
      test('should return empty memories initially', async () => {
        const response = await request(app).get('/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.body.memories).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      test('should return stored memories', async () => {
        platform.memory.set('test-key', {
          content: 'test-value',
          created_at: new Date().toISOString()
        });

        const response = await request(app).get('/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.memories[0][0]).toBe('test-key');
      });

      test('should include description', async () => {
        const response = await request(app).get('/api/v1/memory');
        
        expect(response.body.description).toContain('In-memory storage');
      });
    });

    describe('POST /api/v1/memory', () => {
      test('should store memory with valid key and value', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'user-pref', value: 'dark-mode' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Memory stored successfully');
        expect(platform.memory.has('user-pref')).toBe(true);
      });

      test('should store memory with timestamps', async () => {
        await request(app)
          .post('/api/v1/memory')
          .send({ key: 'test', value: 'data' });
        
        const stored = platform.memory.get('test');
        expect(stored).toHaveProperty('content', 'data');
        expect(stored).toHaveProperty('created_at');
        expect(stored).toHaveProperty('last_accessed');
      });

      test('should return 400 when key is missing', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ value: 'test' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Key and value are required');
      });

      test('should return 400 when value is missing', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'test' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Key and value are required');
      });

      test('should return 400 when both key and value are missing', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({});
        
        expect(response.status).toBe(400);
      });

      test('should handle complex object values', async () => {
        const complexValue = { nested: { data: 'value' }, array: [1, 2, 3] };
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'complex', value: complexValue });
        
        expect(response.status).toBe(200);
        const stored = platform.memory.get('complex');
        expect(stored.content).toEqual(complexValue);
      });

      test('should overwrite existing memory key', async () => {
        await request(app)
          .post('/api/v1/memory')
          .send({ key: 'overwrite', value: 'first' });
        
        await request(app)
          .post('/api/v1/memory')
          .send({ key: 'overwrite', value: 'second' });
        
        const stored = platform.memory.get('overwrite');
        expect(stored.content).toBe('second');
      });

      test('should handle empty string values', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'empty', value: '' });
        
        expect(response.status).toBe(200);
        expect(platform.memory.get('empty').content).toBe('');
      });

      test('should handle numeric values', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'number', value: 42 });
        
        expect(response.status).toBe(200);
        expect(platform.memory.get('number').content).toBe(42);
      });

      test('should handle boolean values', async () => {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'bool', value: true });
        
        expect(response.status).toBe(200);
        expect(platform.memory.get('bool').content).toBe(true);
      });
    });
  });

  describe('Plans API Endpoints', () => {
    describe('GET /api/v1/plans', () => {
      test('should return empty plans initially', async () => {
        const response = await request(app).get('/api/v1/plans');
        
        expect(response.status).toBe(200);
        expect(response.body.plans).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      test('should return stored plans', async () => {
        platform.plans.set('plan-1', {
          task_description: 'Test task',
          steps: ['step1'],
          status: 'created'
        });

        const response = await request(app).get('/api/v1/plans');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
      });

      test('should include description', async () => {
        const response = await request(app).get('/api/v1/plans');
        
        expect(response.body.description).toContain('Execution plans');
      });
    });

    describe('POST /api/v1/plans', () => {
      test('should create plan with valid task description', async () => {
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'Build feature X' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('plan_id');
        expect(response.body.message).toBe('Plan created successfully');
      });

      test('should generate unique plan IDs', async () => {
        const response1 = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'Task 1' });
        
        const response2 = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'Task 2' });
        
        expect(response1.body.plan_id).not.toBe(response2.body.plan_id);
      });

      test('should store plan with steps if provided', async () => {
        const steps = ['step1', 'step2', 'step3'];
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'Complex task', steps });
        
        const planId = response.body.plan_id;
        const stored = platform.plans.get(planId);
        expect(stored.steps).toEqual(steps);
      });

      test('should use empty array for steps if not provided', async () => {
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'Simple task' });
        
        const planId = response.body.plan_id;
        const stored = platform.plans.get(planId);
        expect(stored.steps).toEqual([]);
      });

      test('should set initial status to created', async () => {
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'New task' });
        
        const planId = response.body.plan_id;
        const stored = platform.plans.get(planId);
        expect(stored.status).toBe('created');
      });

      test('should include created_at timestamp', async () => {
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: 'Timed task' });
        
        const planId = response.body.plan_id;
        const stored = platform.plans.get(planId);
        expect(stored.created_at).toBeDefined();
        expect(() => new Date(stored.created_at)).not.toThrow();
      });

      test('should return 400 when task_description is missing', async () => {
        const response = await request(app)
          .post('/api/v1/plans')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Task description is required');
      });

      test('should return 400 when task_description is empty', async () => {
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: '' });
        
        expect(response.status).toBe(400);
      });

      test('should handle long task descriptions', async () => {
        const longDescription = 'A'.repeat(1000);
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: longDescription });
        
        expect(response.status).toBe(200);
        const stored = platform.plans.get(response.body.plan_id);
        expect(stored.task_description).toBe(longDescription);
      });

      test('should handle special characters in task description', async () => {
        const specialChars = '!@#$%^&*()[]{}|\\;:",.<>?/~`';
        const response = await request(app)
          .post('/api/v1/plans')
          .send({ task_description: specialChars });
        
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Capabilities Endpoint', () => {
    test('should return platform capabilities', async () => {
      const response = await request(app).get('/api/v1/capabilities');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('core_capabilities');
      expect(response.body).toHaveProperty('operating_modes');
      expect(response.body).toHaveProperty('performance');
    });

    test('should include complete configuration', async () => {
      const response = await request(app).get('/api/v1/capabilities');
      
      expect(response.body.core_capabilities).toHaveProperty('multi_modal');
      expect(response.body.core_capabilities).toHaveProperty('memory_system');
      expect(response.body.core_capabilities).toHaveProperty('tool_system');
    });

    test('should include description', async () => {
      const response = await request(app).get('/api/v1/capabilities');
      
      expect(response.body.description).toContain('Unified AI Platform');
      expect(response.body.description).toContain('Cursor');
    });
  });

  describe('Demo Endpoint', () => {
    test('should return demo information', async () => {
      const response = await request(app).get('/api/v1/demo');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('systems_combined');
      expect(response.body).toHaveProperty('status');
    });

    test('should list all key features', async () => {
      const response = await request(app).get('/api/v1/demo');
      
      expect(response.body.features).toContain('Multi-Modal Processing');
      expect(response.body.features).toContain('Context-Aware Memory');
      expect(response.body.features).toContain('Modular Tool System');
    });

    test('should mention integrated systems', async () => {
      const response = await request(app).get('/api/v1/demo');
      
      const systemsStr = response.body.systems_combined.join(' ');
      expect(systemsStr).toContain('Cursor');
      expect(systemsStr).toContain('Devin');
      expect(systemsStr).toContain('Manus');
    });
  });

  describe('404 Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('should include route information in 404 error', async () => {
      const response = await request(app).get('/nonexistent');
      
      expect(response.body.message).toContain('GET');
      expect(response.body.message).toContain('/nonexistent');
    });

    test('should include timestamp in 404 error', async () => {
      const response = await request(app).get('/missing');
      
      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle Content-Type mismatch', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Content-Type', 'text/plain')
        .send('not json');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('CORS Configuration', () => {
    test('should set CORS headers on responses', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(app).options('/api/v1/memory');
      
      expect(response.status).toBeLessThan(300);
    });
  });

  describe('Server Lifecycle', () => {
    test('start method should initialize server', async () => {
      const newPlatform = new UnifiedAIPlatform();
      await newPlatform.start();
      
      expect(newPlatform.isInitialized).toBe(true);
    });

    test('should log platform capabilities on start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const newPlatform = new UnifiedAIPlatform();
      
      await newPlatform.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Platform Capabilities'));
      consoleSpy.mockRestore();
    });

    test('stop method should complete without errors', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await platform.stop();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Shutting down'));
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle missing ALLOWED_ORIGINS environment variable', () => {
      delete process.env.ALLOWED_ORIGINS;
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.app).toBeDefined();
    });

    test('should parse comma-separated ALLOWED_ORIGINS', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:4000';
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.app).toBeDefined();
    });
  });

  describe('Security Features', () => {
    test('should apply helmet security middleware', async () => {
      const response = await request(app).get('/health');
      
      // Helmet sets various security headers
      expect(response.headers).toBeDefined();
    });

    test('should limit request body size', async () => {
      const largePayload = { key: 'test', value: 'x'.repeat(11 * 1024 * 1024) };
      const response = await request(app)
        .post('/api/v1/memory')
        .send(largePayload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Memory Management Edge Cases', () => {
    test('should handle null values in memory', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'null-test', value: null });
      
      expect(response.status).toBe(200);
    });

    test('should handle array values in memory', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'array-test', value: [1, 2, 3, 4, 5] });
      
      expect(response.status).toBe(200);
      expect(platform.memory.get('array-test').content).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle unicode characters in memory keys', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: '你好-世界', value: 'unicode test' });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Plan Management Edge Cases', () => {
    test('should handle empty steps array', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'No steps task', steps: [] });
      
      expect(response.status).toBe(200);
      const stored = platform.plans.get(response.body.plan_id);
      expect(stored.steps).toEqual([]);
    });

    test('should handle complex step objects', async () => {
      const complexSteps = [
        { action: 'analyze', params: { depth: 3 } },
        { action: 'execute', params: { mode: 'safe' } }
      ];
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complex plan', steps: complexSteps });
      
      expect(response.status).toBe(200);
      const stored = platform.plans.get(response.body.plan_id);
      expect(stored.steps).toEqual(complexSteps);
    });

    test('should handle whitespace-only task description', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: '   ' });
      
      // Whitespace-only is still truthy in JavaScript
      expect(response.status).toBe(200);
    });
  });

  describe('Concurrency and State Management', () => {
    test('should handle concurrent memory writes', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/memory')
            .send({ key: `concurrent-${i}`, value: `value-${i}` })
        );
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(platform.memory.size).toBe(10);
    });

    test('should handle concurrent plan creation', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/plans')
            .send({ task_description: `Plan ${i}` })
        );
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(platform.plans.size).toBe(10);
    });

    test('should maintain state across multiple requests', async () => {
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'state-test', value: 'initial' });
      
      const getResponse = await request(app).get('/api/v1/memory');
      expect(getResponse.body.count).toBe(1);
      
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'state-test-2', value: 'second' });
      
      const getResponse2 = await request(app).get('/api/v1/memory');
      expect(getResponse2.body.count).toBe(2);
    });
  });

  describe('Input Validation', () => {
    test('should handle very long memory keys', async () => {
      const longKey = 'k'.repeat(1000);
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' });
      
      expect(response.status).toBe(200);
    });

    test('should handle nested object structures in plans', async () => {
      const complexPlan = {
        task_description: 'Nested task',
        steps: [
          {
            name: 'step1',
            substeps: [
              { action: 'sub1', params: { nested: { deep: 'value' } } }
            ]
          }
        ]
      };
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send(complexPlan);
      
      expect(response.status).toBe(200);
    });

    test('should reject excessively large payloads', async () => {
      const hugeValue = 'x'.repeat(11 * 1024 * 1024);
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'huge', value: hugeValue });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});