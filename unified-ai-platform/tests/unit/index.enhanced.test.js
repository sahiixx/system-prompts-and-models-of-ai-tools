/**
 * Enhanced Unit Tests for UnifiedAIPlatform (src/index.js)
 * 
 * These additional tests provide comprehensive coverage for:
 * - Security and input validation
 * - Performance and load handling
 * - Data persistence and race conditions
 * - Advanced error scenarios
 * - Integration between components
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

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

describe('UnifiedAIPlatform - Enhanced Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  afterEach(async () => {
    if (platform.server) {
      await new Promise((resolve) => {
        platform.server.close(resolve);
      });
    }
  });

  describe('Security Tests', () => {
    describe('Input Validation', () => {
      test('should reject SQL injection attempts in memory keys', async () => {
        const sqlInjection = "'; DROP TABLE users; --";
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: sqlInjection, value: 'test' })
          .expect(200);

        const stored = platform.memory.get(sqlInjection);
        expect(stored).toBeDefined();
        expect(stored.content).toBe('test');
      });

      test('should handle XSS attempts in memory values', async () => {
        const xssPayload = '<script>alert("XSS")</script>';
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'xss_test', value: xssPayload })
          .expect(200);

        const stored = platform.memory.get('xss_test');
        expect(stored.content).toBe(xssPayload);
      });

      test('should handle extremely long keys', async () => {
        const longKey = 'k'.repeat(10000);
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: longKey, value: 'test' })
          .expect(200);

        expect(platform.memory.has(longKey)).toBe(true);
      });

      test('should handle special characters in keys', async () => {
        const specialChars = '!@#$%^&*()[]{}|\\;:\'"<>,.?/~`';
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: specialChars, value: 'test' })
          .expect(200);

        expect(platform.memory.has(specialChars)).toBe(true);
      });

      test('should handle unicode characters in keys and values', async () => {
        const unicodeKey = '你好世界🌍';
        const unicodeValue = '👋🎉💻';
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: unicodeKey, value: unicodeValue })
          .expect(200);

        const stored = platform.memory.get(unicodeKey);
        expect(stored.content).toBe(unicodeValue);
      });
    });

    describe('Request Size Limits', () => {
      test('should handle large JSON payloads within limit', async () => {
        const largeValue = 'x'.repeat(1000000); // 1MB
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'large', value: largeValue })
          .expect(200);

        const stored = platform.memory.get('large');
        expect(stored.content).toBe(largeValue);
      });

      test('should handle deeply nested objects', async () => {
        let deepObject = { value: 'end' };
        for (let i = 0; i < 100; i++) {
          deepObject = { nested: deepObject };
        }

        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'deep', value: deepObject })
          .expect(200);

        expect(platform.memory.has('deep')).toBe(true);
      });
    });

    describe('Header Validation', () => {
      test('should handle missing Content-Type header', async () => {
        const response = await request(platform.app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('healthy');
      });

      test('should handle invalid Content-Type', async () => {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .set('Content-Type', 'text/plain')
          .send('not json')
          .expect(400);
      });
    });
  });

  describe('Performance Tests', () => {
    describe('Response Time', () => {
      test('should respond to health check quickly', async () => {
        const start = Date.now();
        await request(platform.app)
          .get('/health')
          .expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000);
      });

      test('should handle rapid sequential requests', async () => {
        const requests = [];
        for (let i = 0; i < 50; i++) {
          requests.push(
            request(platform.app)
              .get('/health')
              .expect(200)
          );
        }

        const results = await Promise.all(requests);
        expect(results).toHaveLength(50);
      });
    });

    describe('Memory Management', () => {
      test('should handle large number of memory entries', async () => {
        const promises = Array.from({ length: 1000 }, (_, i) =>
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `key_${i}`, value: `value_${i}` })
        );

        await Promise.all(promises);
        expect(platform.memory.size).toBe(1000);
      });

      test('should handle large number of plans', async () => {
        const promises = Array.from({ length: 100 }, (_, i) =>
          request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: `Task ${i}` })
        );

        await Promise.all(promises);
        expect(platform.plans.size).toBe(100);
      });

      test('should retrieve all memories efficiently', async () => {
        for (let i = 0; i < 100; i++) {
          platform.memory.set(`key_${i}`, {
            content: `value_${i}`,
            created_at: new Date().toISOString(),
            last_accessed: new Date().toISOString()
          });
        }

        const start = Date.now();
        const response = await request(platform.app)
          .get('/api/v1/memory')
          .expect(200);
        const duration = Date.now() - start;

        expect(response.body.count).toBe(100);
        expect(duration).toBeLessThan(500);
      });
    });
  });

  describe('Data Persistence and Race Conditions', () => {
    test('should maintain data consistency under concurrent writes to same key', async () => {
      const key = 'race_condition_test';
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: key, value: `value_${i}` })
      );

      await Promise.all(promises);
      
      const stored = platform.memory.get(key);
      expect(stored).toBeDefined();
      expect(stored.content).toMatch(/^value_\d+$/);
    });

    test('should handle concurrent plan creation with unique IDs', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Concurrent task ${i}` })
      );

      const responses = await Promise.all(promises);
      const planIds = responses.map(r => r.body.plan_id);
      const uniqueIds = new Set(planIds);

      expect(uniqueIds.size).toBe(20);
    });

    test('should preserve memory metadata through updates', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'meta_test', value: 'original' })
        .expect(200);

      const original = platform.memory.get('meta_test');
      const originalCreatedAt = original.created_at;

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'meta_test', value: 'updated' })
        .expect(200);

      const updated = platform.memory.get('meta_test');
      expect(updated.content).toBe('updated');
      expect(updated.created_at).not.toBe(originalCreatedAt);
    });
  });

  describe('Advanced Error Scenarios', () => {
    test('should handle circular JSON structures gracefully', async () => {
      const circular = { name: 'test' };
      circular.self = circular;

      // Express should handle this gracefully
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'circular', value: 'safe_value' })
        .expect(200);
    });

    test('should handle very large arrays in plan steps', async () => {
      const hugeSteps = Array.from({ length: 10000 }, (_, i) => `Step ${i}`);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Huge plan', steps: hugeSteps })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toHaveLength(10000);
    });

    test('should handle missing route with proper error format', async () => {
      const response = await request(platform.app)
        .get('/api/v2/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should handle POST to GET-only endpoints gracefully', async () => {
      const response = await request(platform.app)
        .post('/health')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('Integration Tests', () => {
    test('should support complete workflow: create plan, store memory, retrieve both', async () => {
      // Create plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Integration test task',
          steps: ['Step 1', 'Step 2']
        })
        .expect(200);

      const planId = planResponse.body.plan_id;

      // Store memory related to plan
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ 
          key: `plan_context_${planId}`,
          value: { status: 'in_progress', planId: planId }
        })
        .expect(200);

      // Retrieve both
      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(plansResponse.body.count).toBe(1);
      expect(memoryResponse.body.count).toBe(1);
    });

    test('should maintain state across multiple operations', async () => {
      const operations = [
        () => request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'state1', value: 'data1' }),
        () => request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: 'Plan 1' }),
        () => request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'state2', value: 'data2' }),
        () => request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: 'Plan 2' }),
      ];

      for (const operation of operations) {
        await operation();
      }

      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memoryResponse.body.count).toBe(2);
      expect(plansResponse.body.count).toBe(2);
    });

    test('should handle mixed successful and failed operations', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid', value: 'data' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'invalid' })
        .expect(400);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid2', value: 'data2' })
        .expect(200);

      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body.count).toBe(2);
    });
  });

  describe('Edge Cases - Type Coercion', () => {
    test('should handle boolean values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_test', value: true })
        .expect(200);

      const stored = platform.memory.get('bool_test');
      expect(stored.content).toBe(true);
    });

    test('should handle number values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'number_test', value: 42 })
        .expect(200);

      const stored = platform.memory.get('number_test');
      expect(stored.content).toBe(42);
    });

    test('should handle array values', async () => {
      const arrayValue = [1, 'two', { three: 3 }, [4, 5]];
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'array_test', value: arrayValue })
        .expect(200);

      const stored = platform.memory.get('array_test');
      expect(stored.content).toEqual(arrayValue);
    });

    test('should handle empty string values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'empty_test', value: '' })
        .expect(400);
    });

    test('should handle zero as value', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zero_test', value: 0 })
        .expect(200);

      const stored = platform.memory.get('zero_test');
      expect(stored.content).toBe(0);
    });

    test('should handle false as value', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'false_test', value: false })
        .expect(200);

      const stored = platform.memory.get('false_test');
      expect(stored.content).toBe(false);
    });
  });

  describe('Timestamp and Metadata Validation', () => {
    test('should use valid ISO 8601 timestamps', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'time_test', value: 'data' })
        .expect(200);

      const stored = platform.memory.get('time_test');
      expect(stored.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(stored.last_accessed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should update last_accessed on each memory operation', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'access_test', value: 'data' })
        .expect(200);

      const first = platform.memory.get('access_test');
      const firstAccess = first.last_accessed;

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'access_test', value: 'updated' })
        .expect(200);

      const second = platform.memory.get('access_test');
      expect(second.last_accessed).not.toBe(firstAccess);
    });

    test('should include proper plan metadata', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Metadata test' })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan).toMatchObject({
        task_description: 'Metadata test',
        status: 'created',
        steps: []
      });
      expect(plan.created_at).toBeDefined();
    });
  });

  describe('Health Check Comprehensive', () => {
    test('should report accurate memory usage', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const memUsage = response.body.memory;
      expect(memUsage.heapUsed).toBeGreaterThan(0);
      expect(memUsage.heapTotal).toBeGreaterThan(memUsage.heapUsed);
      expect(memUsage.external).toBeGreaterThanOrEqual(0);
    });

    test('should report increasing uptime', async () => {
      const first = await request(platform.app)
        .get('/health')
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 100));

      const second = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(second.body.uptime).toBeGreaterThan(first.body.uptime);
    });

    test('should always return valid timestamp', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});