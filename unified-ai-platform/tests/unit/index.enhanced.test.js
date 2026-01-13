/**
 * Enhanced Unit Tests for UnifiedAIPlatform (src/index.js)
 * 
 * Additional comprehensive tests covering:
 * - Security edge cases and attack vectors
 * - Performance and stress testing scenarios
 * - Complex integration scenarios
 * - Error recovery and resilience
 * - Resource management and cleanup
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock external dependencies
jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Unified AI Platform',
    version: '1.0.0',
    description: 'Test platform'
  },
  core_capabilities: {
    multi_modal: { enabled: true, supported_types: ['text', 'code', 'image'] },
    memory_system: { enabled: true, types: ['short_term', 'long_term'], persistence: true },
    tool_system: { enabled: true, modular: true, json_defined: true, dynamic_loading: true },
    planning_system: { enabled: true, modes: ['sequential', 'parallel'], strategies: ['divide_conquer', 'iterative'] },
    security: { enabled: true, features: ['input_validation', 'rate_limiting', 'auth'] }
  },
  operating_modes: {
    development: { debug: true, logging: 'verbose' },
    production: { debug: false, logging: 'minimal' }
  },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10, queue_size: 100 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  {
    type: 'function',
    function: {
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input parameter' }
        },
        required: ['input']
      }
    }
  }
]));

describe('UnifiedAIPlatform - Enhanced Security Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Input Validation and Sanitization', () => {
    test('should handle SQL injection attempts in memory keys', async () => {
      const maliciousKey = "'; DROP TABLE users; --";
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: maliciousKey, value: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(platform.memory.has(maliciousKey)).toBe(true);
      // Key should be stored as-is, not executed
    });

    test('should handle XSS attempts in memory values', async () => {
      const xssValue = '<script>alert("XSS")</script>';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssValue })
        .expect(200);

      const stored = platform.memory.get('xss_test');
      expect(stored.content).toBe(xssValue);
      // Value stored but should be sanitized on output
    });

    test('should handle path traversal attempts in keys', async () => {
      const traversalKey = '../../../etc/passwd';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: traversalKey, value: 'test' })
        .expect(200);

      expect(platform.memory.has(traversalKey)).toBe(true);
    });

    test('should handle null byte injection', async () => {
      const nullByteKey = 'test\x00malicious';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: nullByteKey, value: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle unicode normalization attacks', async () => {
      const unicodeKey = 'test\uFE64\uFE65';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: unicodeKey, value: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should reject excessively large payloads', async () => {
      const hugeValue = 'A'.repeat(20 * 1024 * 1024); // 20MB
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'huge', value: hugeValue })
        .expect(413); // Payload Too Large

      expect(platform.memory.has('huge')).toBe(false);
    });

    test('should handle circular references in JSON', async () => {
      // Express body parser should handle this, but let's verify
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send('{"key":"test","value":{"self":"#"}}')
        .set('Content-Type', 'application/json');

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Resource Exhaustion Protection', () => {
    test('should handle rapid memory creation attempts', async () => {
      const promises = Array.from({ length: 1000 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `flood_${i}`, value: `data_${i}` })
      );

      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      
      // Should handle at least some requests
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should handle memory with very deep nested objects', async () => {
      let deepObject = { value: 'end' };
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep', value: deepObject })
        .expect(200);

      const stored = platform.memory.get('deep');
      expect(stored.content).toBeDefined();
    });

    test('should handle plan creation with extremely large step arrays', async () => {
      const massiveSteps = Array.from({ length: 10000 }, (_, i) => `Step ${i}`);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Massive task',
          steps: massiveSteps
        });

      if (response.status === 200) {
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.steps.length).toBe(10000);
      } else {
        // Should reject if too large
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Concurrent Access and Race Conditions', () => {
    test('should handle concurrent updates to same memory key', async () => {
      const key = 'race_condition_test';
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: key, value: `update_${i}` })
      );

      await Promise.all(promises);
      
      // Should have one final value
      expect(platform.memory.has(key)).toBe(true);
      const stored = platform.memory.get(key);
      expect(stored.content).toMatch(/^update_\d+$/);
    });

    test('should handle concurrent plan ID generation', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Concurrent task ${i}` })
      );

      const responses = await Promise.all(promises);
      const planIds = responses.map(r => r.body.plan_id);
      const uniqueIds = new Set(planIds);
      
      // All plan IDs should be unique
      expect(uniqueIds.size).toBe(100);
    });

    test('should handle mixed read/write operations', async () => {
      // Pre-populate some data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'mixed_test', value: 'initial' });

      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          request(platform.app).get('/api/v1/memory'),
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `mixed_${i}`, value: `data_${i}` })
        );
      }

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(90); // At least 90% should succeed
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from malformed content-type header', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'invalid/type')
        .send({ key: 'test', value: 'data' });

      expect([200, 400, 415]).toContain(response.status);
    });

    test('should handle missing content-type gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', '')
        .send('{"key":"test","value":"data"}');

      expect([200, 400]).toContain(response.status);
    });

    test('should handle incomplete JSON streams', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"key":"test","value":');

      expect(response.status).toBe(400);
    });

    test('should handle non-JSON data with JSON content-type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('this is not JSON');

      expect(response.status).toBe(400);
    });

    test('should handle very long header values', async () => {
      const longHeader = 'A'.repeat(10000);
      const response = await request(platform.app)
        .get('/health')
        .set('X-Custom-Header', longHeader);

      expect([200, 431]).toContain(response.status);
    });
  });

  describe('Memory Management Edge Cases', () => {
    test('should handle memory keys with special characters', async () => {
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key@with#symbols',
        'key[with]brackets',
        'key{with}braces'
      ];

      for (const key of specialKeys) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: key, value: 'test' })
          .expect(200);

        expect(platform.memory.has(key)).toBe(true);
      }
    });

    test('should handle boolean values as memory content', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_test', value: true })
        .expect(200);

      const stored = platform.memory.get('bool_test');
      expect(stored.content).toBe(true);
    });

    test('should handle numeric values as memory content', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'num_test', value: 42 })
        .expect(200);

      const stored = platform.memory.get('num_test');
      expect(stored.content).toBe(42);
    });

    test('should handle array values as memory content', async () => {
      const arrayValue = [1, 'two', { three: 3 }, [4, 5]];
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'array_test', value: arrayValue })
        .expect(200);

      const stored = platform.memory.get('array_test');
      expect(stored.content).toEqual(arrayValue);
    });

    test('should handle Date objects in memory', async () => {
      const dateValue = new Date().toISOString();
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'date_test', value: dateValue })
        .expect(200);

      const stored = platform.memory.get('date_test');
      expect(stored.content).toBe(dateValue);
    });

    test('should handle memory update with same key but different value type', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'type_change', value: 'string' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'type_change', value: 123 })
        .expect(200);

      const stored = platform.memory.get('type_change');
      expect(stored.content).toBe(123);
    });
  });

  describe('Plans Advanced Scenarios', () => {
    test('should handle plans with nested step structures', async () => {
      const nestedSteps = [
        {
          name: 'Phase 1',
          substeps: ['1.1', '1.2', '1.3']
        },
        {
          name: 'Phase 2',
          substeps: ['2.1', '2.2']
        }
      ];

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Complex project',
          steps: nestedSteps
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual(nestedSteps);
    });

    test('should handle plans with empty string steps', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Task with empty steps',
          steps: ['valid step', '', 'another valid step']
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toHaveLength(3);
    });

    test('should handle plans with duplicate steps', async () => {
      const duplicateSteps = ['step 1', 'step 1', 'step 1'];
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Duplicate task',
          steps: duplicateSteps
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual(duplicateSteps);
    });

    test('should handle Unicode in task descriptions', async () => {
      const unicodeDesc = '测试任务 🚀 Тест émojis & spëcial chârs';
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: unicodeDesc })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.task_description).toBe(unicodeDesc);
    });

    test('should handle plans with numeric steps', async () => {
      const numericSteps = [1, 2, 3, 4, 5];
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Numeric steps',
          steps: numericSteps
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual(numericSteps);
    });
  });

  describe('Health Endpoint Advanced Checks', () => {
    test('should return consistent timestamp format', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should include positive uptime', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should include memory with required fields', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const memory = response.body.memory;
      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('external');
      expect(memory).toHaveProperty('arrayBuffers');
    });

    test('should cache health checks efficiently', async () => {
      const start = Date.now();
      const promises = Array.from({ length: 100 }, () =>
        request(platform.app).get('/health')
      );
      await Promise.all(promises);
      const duration = Date.now() - start;

      // 100 requests should complete reasonably fast
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('API Endpoint Response Consistency', () => {
    test('all successful responses should include timestamp where appropriate', async () => {
      const endpoints = [
        '/health',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      for (const endpoint of endpoints) {
        const response = await request(platform.app)
          .get(endpoint)
          .expect(200);

        // Some endpoints have timestamps
        if (response.body.timestamp) {
          expect(typeof response.body.timestamp).toBe('string');
        }
      }
    });

    test('all list endpoints should include count', async () => {
      const listEndpoints = [
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans'
      ];

      for (const endpoint of listEndpoints) {
        const response = await request(platform.app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toHaveProperty('count');
        expect(typeof response.body.count).toBe('number');
      }
    });

    test('all endpoints should set correct content-type', async () => {
      const endpoints = [
        '/health',
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      for (const endpoint of endpoints) {
        const response = await request(platform.app).get(endpoint);
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('Tools Configuration', () => {
    test('should return valid tool structure', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(response.body.tools).toBeDefined();
      expect(response.body.tools.length).toBeGreaterThan(0);
      
      const tool = response.body.tools[0];
      expect(tool).toHaveProperty('type');
      expect(tool).toHaveProperty('function');
      expect(tool.function).toHaveProperty('name');
      expect(tool.function).toHaveProperty('description');
    });

    test('tools should have valid parameter schemas', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      response.body.tools.forEach(tool => {
        expect(tool.function.parameters).toHaveProperty('type');
        expect(tool.function.parameters).toHaveProperty('properties');
      });
    });
  });

  describe('Capabilities Endpoint', () => {
    test('should return all core capabilities', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      const caps = response.body.core_capabilities;
      expect(caps).toHaveProperty('multi_modal');
      expect(caps).toHaveProperty('memory_system');
      expect(caps).toHaveProperty('tool_system');
      expect(caps).toHaveProperty('planning_system');
      expect(caps).toHaveProperty('security');
    });

    test('should include performance metrics', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      const perf = response.body.performance;
      expect(perf).toHaveProperty('response_time');
      expect(perf).toHaveProperty('memory_usage');
      expect(perf).toHaveProperty('concurrent_operations');
    });

    test('should include operating modes', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      const modes = response.body.operating_modes;
      expect(modes).toHaveProperty('development');
      expect(modes).toHaveProperty('production');
    });
  });
});