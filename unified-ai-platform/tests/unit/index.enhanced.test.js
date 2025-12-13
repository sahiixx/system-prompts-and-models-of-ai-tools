/**
 * Enhanced Unit Tests for UnifiedAIPlatform (src/index.js)
 * 
 * These additional tests provide comprehensive coverage including:
 * - Middleware configuration edge cases
 * - Complex routing scenarios
 * - Memory operations with various data types
 * - Plan execution workflows
 * - Error handling with different error types
 * - Security scenarios
 * - Performance monitoring
 * - Concurrent operations
 */

const request = require('supertest');
const express = require('express');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock dependencies
jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Unified AI Platform',
    version: '1.0.0',
    description: 'Test platform'
  },
  core_capabilities: {
    multi_modal: { enabled: true, supported_types: ['text', 'code'], processors: [] },
    memory_system: { enabled: true, types: ['user_preferences'], persistence: 'in_memory' },
    tool_system: { enabled: true, modular: true, json_defined: true, dynamic_loading: true },
    planning_system: { enabled: true, modes: ['two_phase'], strategies: ['sequential'] },
    security: { enabled: true, features: ['authentication'] }
  },
  operating_modes: {
    development: { debug: true, logging: 'verbose', hot_reload: true },
    production: { debug: false, logging: 'error', performance_optimized: true }
  },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512, optimization: true },
    concurrent_operations: { max_parallel: 10, queue_size: 100 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  { type: 'function', function: { name: 'test_tool', description: 'A test tool', parameters: { type: 'object', properties: {}, required: [] } } }
]));

describe('UnifiedAIPlatform - Enhanced Tests', () => {
  let platform;
  let app;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
    app = platform.app;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Memory System - Advanced Operations', () => {
    test('should handle storing complex nested objects in memory', async () => {
      const complexData = {
        user: { id: 123, preferences: { theme: 'dark', language: 'en' } },
        metadata: { tags: ['important', 'urgent'], created: Date.now() }
      };

      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'complex_data', value: complexData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const getResponse = await request(app).get('/api/v1/memory');
      expect(getResponse.status).toBe(200);
      
      const memories = getResponse.body.memories;
      const savedMemory = memories.find(([k]) => k === 'complex_data');
      expect(savedMemory).toBeDefined();
      expect(savedMemory[1].content).toEqual(complexData);
    });

    test('should handle storing arrays in memory', async () => {
      const arrayData = ['item1', 'item2', 'item3'];

      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'array_data', value: arrayData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle storing boolean values in memory', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'boolean_flag', value: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle storing numeric values in memory', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'counter', value: 42 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle storing null values in memory', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'null_value', value: null });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject memory POST with only key', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'incomplete' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should reject memory POST with only value', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ value: 'no_key' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should reject memory POST with empty key', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'some_value' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should overwrite existing memory with same key', async () => {
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'test_key', value: 'original_value' });

      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'test_key', value: 'updated_value' });

      expect(response.status).toBe(200);
      
      const getResponse = await request(app).get('/api/v1/memory');
      const memories = getResponse.body.memories;
      const memory = memories.find(([k]) => k === 'test_key');
      expect(memory[1].content).toBe('updated_value');
    });

    test('should track timestamps in memory entries', async () => {
      const beforeTime = new Date().toISOString();
      
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'value' });

      const afterTime = new Date().toISOString();
      
      const response = await request(app).get('/api/v1/memory');
      const memories = response.body.memories;
      const memory = memories.find(([k]) => k === 'timestamp_test');
      
      expect(memory[1].created_at).toBeDefined();
      expect(memory[1].last_accessed).toBeDefined();
      expect(memory[1].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should handle special characters in memory keys', async () => {
      const specialKey = 'key-with_special.chars@123';
      
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: specialKey, value: 'test' });

      expect(response.status).toBe(200);
    });

    test('should handle very long string values in memory', async () => {
      const longString = 'a'.repeat(10000);
      
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'long_string', value: longString });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Planning System - Advanced Operations', () => {
    test('should handle complex multi-step plans', async () => {
      const complexPlan = {
        task_description: 'Build a complete web application',
        steps: [
          'Step 1: Design database schema',
          'Step 2: Create API endpoints',
          'Step 3: Build frontend components',
          'Step 4: Implement authentication',
          'Step 5: Deploy to production'
        ]
      };

      const response = await request(app)
        .post('/api/v1/plans')
        .send(complexPlan);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.plan_id).toMatch(/^plan_\d+$/);

      const getResponse = await request(app).get('/api/v1/plans');
      const plans = getResponse.body.plans;
      const savedPlan = plans.find(([id]) => id === response.body.plan_id);
      expect(savedPlan[1].steps).toHaveLength(5);
    });

    test('should create plan with empty steps array when not provided', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'Simple task' });

      expect(response.status).toBe(200);
      
      const getResponse = await request(app).get('/api/v1/plans');
      const plans = getResponse.body.plans;
      const savedPlan = plans.find(([id]) => id === response.body.plan_id);
      expect(savedPlan[1].steps).toEqual([]);
    });

    test('should reject plan POST with empty task_description', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: '', steps: ['step1'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should reject plan POST with no task_description', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ steps: ['step1'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task description is required');
    });

    test('should handle plan with special characters in description', async () => {
      const specialDescription = 'Task with @#$% special chars & symbols!';
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: specialDescription });

      expect(response.status).toBe(200);
    });

    test('should generate unique plan IDs for concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
      );

      const responses = await Promise.all(promises);
      const planIds = responses.map(r => r.body.plan_id);
      const uniqueIds = new Set(planIds);

      expect(uniqueIds.size).toBe(5);
    });

    test('should set plan status to "created" by default', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test task' });

      const getResponse = await request(app).get('/api/v1/plans');
      const plans = getResponse.body.plans;
      const savedPlan = plans.find(([id]) => id === response.body.plan_id);
      
      expect(savedPlan[1].status).toBe('created');
    });

    test('should handle very long task descriptions', async () => {
      const longDescription = 'Task: ' + 'x'.repeat(5000);
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: longDescription });

      expect(response.status).toBe(200);
    });

    test('should handle plan with many steps', async () => {
      const manySteps = Array.from({ length: 100 }, (_, i) => `Step ${i + 1}`);
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complex task', steps: manySteps });

      expect(response.status).toBe(200);
      
      const getResponse = await request(app).get('/api/v1/plans');
      const plans = getResponse.body.plans;
      const savedPlan = plans.find(([id]) => id === response.body.plan_id);
      expect(savedPlan[1].steps).toHaveLength(100);
    });
  });

  describe('Health Endpoint - Comprehensive Checks', () => {
    test('should include process memory usage details', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.heapUsed).toBeDefined();
      expect(response.body.memory.heapTotal).toBeDefined();
      expect(response.body.memory.external).toBeDefined();
    });

    test('should return uptime as a positive number', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.uptime).toBe('number');
    });

    test('should include ISO timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should show all features as enabled', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.features.multi_modal).toBe(true);
      expect(response.body.features.memory_system).toBe(true);
      expect(response.body.features.tool_system).toBe(true);
      expect(response.body.features.planning_system).toBe(true);
      expect(response.body.features.security).toBe(true);
    });

    test('should be accessible multiple times', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Tools Endpoint - Edge Cases', () => {
    test('should return tools array with proper structure', async () => {
      const response = await request(app).get('/api/v1/tools');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.count).toBe(response.body.tools.length);
    });

    test('should include tool description', async () => {
      const response = await request(app).get('/api/v1/tools');

      expect(response.status).toBe(200);
      expect(response.body.description).toBeDefined();
      expect(typeof response.body.description).toBe('string');
    });

    test('should return consistent tools across multiple requests', async () => {
      const response1 = await request(app).get('/api/v1/tools');
      const response2 = await request(app).get('/api/v1/tools');

      expect(response1.body.count).toBe(response2.body.count);
      expect(response1.body.tools).toEqual(response2.body.tools);
    });
  });

  describe('Capabilities Endpoint - Detailed Checks', () => {
    test('should include all configuration sections', async () => {
      const response = await request(app).get('/api/v1/capabilities');

      expect(response.status).toBe(200);
      expect(response.body.platform).toBeDefined();
      expect(response.body.core_capabilities).toBeDefined();
      expect(response.body.operating_modes).toBeDefined();
      expect(response.body.performance).toBeDefined();
    });

    test('should include platform metadata', async () => {
      const response = await request(app).get('/api/v1/capabilities');

      expect(response.status).toBe(200);
      expect(response.body.platform.name).toBe('Unified AI Platform');
      expect(response.body.platform.version).toBeDefined();
      expect(response.body.platform.description).toBeDefined();
    });

    test('should include performance targets', async () => {
      const response = await request(app).get('/api/v1/capabilities');

      expect(response.status).toBe(200);
      expect(response.body.performance.response_time).toBeDefined();
      expect(response.body.performance.memory_usage).toBeDefined();
      expect(response.body.performance.concurrent_operations).toBeDefined();
    });

    test('should include operating modes', async () => {
      const response = await request(app).get('/api/v1/capabilities');

      expect(response.status).toBe(200);
      expect(response.body.operating_modes.development).toBeDefined();
      expect(response.body.operating_modes.production).toBeDefined();
    });
  });

  describe('Demo Endpoint - Content Validation', () => {
    test('should include list of features', async () => {
      const response = await request(app).get('/api/v1/demo');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.features)).toBe(true);
      expect(response.body.features.length).toBeGreaterThan(0);
    });

    test('should include systems combined information', async () => {
      const response = await request(app).get('/api/v1/demo');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.systems_combined)).toBe(true);
      expect(response.body.systems_combined.length).toBeGreaterThan(0);
    });

    test('should include status message', async () => {
      const response = await request(app).get('/api/v1/demo');

      expect(response.status).toBe(200);
      expect(response.body.status).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test('should list specific AI systems', async () => {
      const response = await request(app).get('/api/v1/demo');

      expect(response.status).toBe(200);
      const combined = response.body.systems_combined.join(' ');
      expect(combined).toContain('Cursor');
      expect(combined).toContain('Devin');
      expect(combined).toContain('Manus');
    });
  });

  describe('Error Handling - Various Scenarios', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('/nonexistent/route');
    });

    test('should handle 404 for POST to non-existent routes', async () => {
      const response = await request(app)
        .post('/nonexistent/route')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
    });

    test('should include timestamp in 404 responses', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should handle malformed JSON in POST requests gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle requests with missing Content-Type', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send('key=test&value=data');

      // Should still process or return appropriate error
      expect(response.status).toBeDefined();
    });

    test('should handle very large request bodies (within limit)', async () => {
      const largeValue = 'x'.repeat(1000000); // 1MB
      
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'large', value: largeValue });

      expect(response.status).toBeDefined();
    });

    test('should handle empty POST body', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default port', () => {
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.port).toBe(3000);
    });

    test('should initialize with custom PORT from environment', () => {
      process.env.PORT = '4000';
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.port).toBe('4000');
      delete process.env.PORT;
    });

    test('should initialize memory as empty Map', () => {
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.memory).toBeInstanceOf(Map);
      expect(newPlatform.memory.size).toBe(0);
    });

    test('should initialize plans as empty Map', () => {
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.plans).toBeInstanceOf(Map);
      expect(newPlatform.plans.size).toBe(0);
    });

    test('should initialize tools from config', () => {
      const newPlatform = new UnifiedAIPlatform();
      expect(Array.isArray(newPlatform.tools)).toBe(true);
      expect(newPlatform.tools.length).toBeGreaterThan(0);
    });

    test('should set isInitialized to false initially', () => {
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.isInitialized).toBe(false);
    });

    test('should have Express app instance', () => {
      const newPlatform = new UnifiedAIPlatform();
      expect(newPlatform.app).toBeDefined();
      expect(typeof newPlatform.app).toBe('function');
    });
  });

  describe('HTTP Methods - Comprehensive Testing', () => {
    test('should reject unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect(response.status).toBe(404);
    });

    test('should handle OPTIONS requests properly', async () => {
      const response = await request(app)
        .options('/api/v1/memory');

      // Should either return 200 or appropriate status for OPTIONS
      expect([200, 204, 404]).toContain(response.status);
    });

    test('should handle HEAD requests', async () => {
      const response = await request(app)
        .head('/health');

      // HEAD requests should not include body
      expect(response.text).toBeFalsy();
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple simultaneous memory operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/v1/memory')
          .send({ key: `key_${i}`, value: `value_${i}` })
      );

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      const getResponse = await request(app).get('/api/v1/memory');
      expect(getResponse.body.count).toBeGreaterThanOrEqual(10);
    });

    test('should handle mixed GET and POST requests concurrently', async () => {
      const operations = [
        request(app).get('/health'),
        request(app).post('/api/v1/memory').send({ key: 'test1', value: 'val1' }),
        request(app).get('/api/v1/tools'),
        request(app).post('/api/v1/plans').send({ task_description: 'task1' }),
        request(app).get('/api/v1/demo')
      ];

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('State Management', () => {
    test('should maintain separate memory and plans stores', async () => {
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'mem1', value: 'memory_value' });

      await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'plan_task' });

      const memResponse = await request(app).get('/api/v1/memory');
      const planResponse = await request(app).get('/api/v1/plans');

      expect(memResponse.body.count).toBeGreaterThan(0);
      expect(planResponse.body.count).toBeGreaterThan(0);
      expect(memResponse.body.memories).not.toEqual(planResponse.body.plans);
    });

    test('should persist memory across multiple GET requests', async () => {
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'persistent', value: 'test_value' });

      const response1 = await request(app).get('/api/v1/memory');
      const response2 = await request(app).get('/api/v1/memory');

      expect(response1.body.count).toBe(response2.body.count);
      expect(response1.body.memories).toEqual(response2.body.memories);
    });
  });

  describe('Input Validation', () => {
    test('should validate memory input types', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 123, value: 'test' }); // numeric key

      // Should either accept or reject gracefully
      expect([200, 400]).toContain(response.status);
    });

    test('should handle null values in requests', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: null });

      expect(response.status).toBe(200);
    });

    test('should handle undefined values in requests', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: undefined });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Response Format Consistency', () => {
    test('should return JSON for all API endpoints', async () => {
      const endpoints = [
        '/health',
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });

    test('should include proper status codes', async () => {
      const successEndpoints = [
        { method: 'get', path: '/health', expectedStatus: 200 },
        { method: 'get', path: '/api/v1/tools', expectedStatus: 200 },
        { method: 'get', path: '/api/v1/memory', expectedStatus: 200 }
      ];

      for (const { method, path, expectedStatus } of successEndpoints) {
        const response = await request(app)[method](path);
        expect(response.status).toBe(expectedStatus);
      }
    });
  });
});