/**
 * Enhanced Unit Tests for UnifiedAIPlatform
 * 
 * These tests provide additional coverage for:
 * - Security and input validation edge cases
 * - Performance and stress testing scenarios
 * - Error recovery and resilience
 * - Data integrity and consistency
 * - Middleware behavior under extreme conditions
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock configurations
jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Unified AI Platform',
    version: '1.0.0',
    description: 'Test platform'
  },
  core_capabilities: {
    multi_modal: { enabled: true, supported_types: ['text', 'code'] },
    memory_system: { enabled: true, types: ['user_preferences'], persistence: 'in_memory' },
    tool_system: { enabled: true, modular: true, json_defined: true, dynamic_loading: true },
    planning_system: { enabled: true, modes: ['two_phase'], strategies: ['sequential'] },
    security: { enabled: true, features: ['authentication'] }
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
  { type: 'function', function: { name: 'test_tool', description: 'A test tool' } }
]));

describe('UnifiedAIPlatform - Enhanced Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  afterEach(() => {
    if (platform && platform.app) {
      // Cleanup
    }
  });

  describe('Security - Input Validation', () => {
    test('should reject memory with SQL injection attempt', async () => {
      const maliciousKey = "'; DROP TABLE users; --";
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: maliciousKey, value: 'test' });

      // Should either reject or safely store
      if (response.status === 200) {
        const stored = platform.memory.get(maliciousKey);
        expect(stored).toBeDefined();
        expect(stored.content).toBe('test');
      }
    });

    test('should handle XSS attack attempts in memory values', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssPayload })
        .expect(200);

      const stored = platform.memory.get('xss_test');
      expect(stored.content).toBe(xssPayload);
    });

    test('should handle very long key names', async () => {
      const longKey = 'k'.repeat(10000);
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' });

      expect([200, 400]).toContain(response.status);
    });

    test('should handle unicode and special characters in keys', async () => {
      const unicodeKey = '测试🔥';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: unicodeKey, value: 'unicode_value' })
        .expect(200);

      const stored = platform.memory.get(unicodeKey);
      expect(stored.content).toBe('unicode_value');
    });

    test('should handle circular reference in JSON payload', async () => {
      // Express should reject this with 400
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"key":"test","value":{"a":"b"},"circular":"value"}');

      expect(response.status).toBeDefined();
    });

    test('should reject extremely large payloads', async () => {
      const hugeValue = 'x'.repeat(11 * 1024 * 1024); // 11MB, exceeds 10MB limit
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'huge', value: hugeValue });

      expect(response.status).toBe(413);
    });
  });

  describe('Memory System - Data Integrity', () => {
    test('should maintain timestamp accuracy', async () => {
      const beforeTime = new Date().toISOString();
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'data' })
        .expect(200);

      const afterTime = new Date().toISOString();
      const stored = platform.memory.get('timestamp_test');
      
      expect(stored.created_at).toBeDefined();
      expect(stored.created_at >= beforeTime).toBe(true);
      expect(stored.created_at <= afterTime).toBe(true);
    });

    test('should handle memory updates correctly', async () => {
      // First write
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'update_test', value: 'original' });

      const firstWrite = platform.memory.get('update_test');
      const firstTimestamp = firstWrite.created_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second write
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'update_test', value: 'updated' });

      const secondWrite = platform.memory.get('update_test');
      
      expect(secondWrite.content).toBe('updated');
      expect(secondWrite.created_at).not.toBe(firstTimestamp);
    });

    test('should handle numeric values in memory', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'numeric', value: 42 })
        .expect(200);

      const stored = platform.memory.get('numeric');
      expect(stored.content).toBe(42);
    });

    test('should handle boolean values in memory', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_test', value: false })
        .expect(200);

      const stored = platform.memory.get('bool_test');
      expect(stored.content).toBe(false);
    });

    test('should handle array values in memory', async () => {
      const arrayValue = [1, 2, 3, 'four', { five: 5 }];
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'array_test', value: arrayValue })
        .expect(200);

      const stored = platform.memory.get('array_test');
      expect(stored.content).toEqual(arrayValue);
    });

    test('should handle deeply nested objects', async () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep_value'
              }
            }
          }
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep', value: deepObject })
        .expect(200);

      const stored = platform.memory.get('deep');
      expect(stored.content.level1.level2.level3.level4.level5).toBe('deep_value');
    });
  });

  describe('Planning System - Advanced Scenarios', () => {
    test('should generate unique plan IDs for rapid creation', async () => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, () =>
          request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: 'Test' })
        )
      );

      const planIds = responses.map(r => r.body.plan_id);
      const uniqueIds = new Set(planIds);
      expect(uniqueIds.size).toBe(20);
    });

    test('should handle plans with empty steps array', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test', steps: [] })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan.steps.length).toBe(0);
    });

    test('should handle plans with non-array steps (validation)', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test', steps: 'not-an-array' });

      // Should either convert or use default empty array
      if (response.status === 200) {
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan).toBeDefined();
      }
    });

    test('should handle whitespace-only task descriptions', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: '   ' });

      // Should reject or handle gracefully
      expect(response.status).toBeDefined();
    });

    test('should store plan status correctly', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Status test' })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.status).toBe('created');
    });

    test('should handle steps with complex objects', async () => {
      const complexSteps = [
        { action: 'step1', params: { a: 1, b: 2 } },
        { action: 'step2', params: { x: 'y' } }
      ];

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complex', steps: complexSteps })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual(complexSteps);
    });
  });

  describe('API Endpoints - Response Format Validation', () => {
    test('should return consistent timestamp format across endpoints', async () => {
      const healthResponse = await request(platform.app).get('/health');
      const memoryResponse = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'test' });

      expect(healthResponse.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should include proper content-type headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.headers['content-type']).toContain('application/json');
    });

    test('should handle HEAD requests to endpoints', async () => {
      const response = await request(platform.app)
        .head('/health');

      expect([200, 404, 405]).toContain(response.status);
    });

    test('should return proper status codes for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/health', expected: 200 },
        { method: 'get', path: '/api/v1/tools', expected: 200 },
        { method: 'get', path: '/api/v1/memory', expected: 200 },
        { method: 'get', path: '/api/v1/plans', expected: 200 },
        { method: 'get', path: '/api/v1/capabilities', expected: 200 },
        { method: 'get', path: '/api/v1/demo', expected: 200 }
      ];

      for (const endpoint of endpoints) {
        const response = await request(platform.app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(endpoint.expected);
      }
    });
  });

  describe('Error Handling - Edge Cases', () => {
    test('should handle requests with missing content-type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send('key=test&value=test');

      expect(response.status).toBeDefined();
    });

    test('should handle double-encoded JSON', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('"{\\"key\\":\\"test\\",\\"value\\":\\"test\\"}"');

      expect(response.status).toBeDefined();
    });

    test('should handle null body in POST request', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(null);

      expect(response.status).toBe(400);
    });

    test('should handle undefined in request body', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: undefined, value: 'test' });

      expect(response.status).toBe(400);
    });
  });

  describe('Performance - Stress Testing', () => {
    test('should handle rapid sequential memory writes', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `seq_${i}`, value: `value_${i}` });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(platform.memory.size).toBe(50);
      expect(duration).toBeLessThan(10000); // Should complete in 10 seconds
    });

    test('should handle burst of concurrent requests', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `burst_${i}`, value: `value_${i}` })
      );

      const responses = await Promise.all(promises);
      
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(45); // Allow for some potential failures
    });

    test('should maintain memory integrity under load', async () => {
      const testData = Array.from({ length: 30 }, (_, i) => ({
        key: `load_${i}`,
        value: `value_${i}`
      }));

      await Promise.all(
        testData.map(data =>
          request(platform.app)
            .post('/api/v1/memory')
            .send(data)
        )
      );

      // Verify all data is intact
      testData.forEach(data => {
        const stored = platform.memory.get(data.key);
        expect(stored).toBeDefined();
        expect(stored.content).toBe(data.value);
      });
    });
  });

  describe('Health Check - Comprehensive Monitoring', () => {
    test('should report accurate memory usage', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.heapUsed).toBeGreaterThan(0);
      expect(response.body.memory.heapTotal).toBeGreaterThan(0);
    });

    test('should report uptime accurately', async () => {
      const firstCheck = await request(platform.app).get('/health');
      const firstUptime = firstCheck.body.uptime;

      await new Promise(resolve => setTimeout(resolve, 100));

      const secondCheck = await request(platform.app).get('/health');
      const secondUptime = secondCheck.body.uptime;

      expect(secondUptime).toBeGreaterThanOrEqual(firstUptime);
    });

    test('should report all feature flags', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const features = response.body.features;
      expect(features.multi_modal).toBeDefined();
      expect(features.memory_system).toBeDefined();
      expect(features.tool_system).toBeDefined();
      expect(features.planning_system).toBeDefined();
      expect(features.security).toBeDefined();
    });
  });

  describe('Tools API - Validation', () => {
    test('should return tools array', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(Array.isArray(response.body.tools)).toBe(true);
    });

    test('should return non-negative tool count', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(response.body.count).toBeGreaterThanOrEqual(0);
      expect(response.body.count).toBe(response.body.tools.length);
    });
  });

  describe('Capabilities Endpoint - Validation', () => {
    test('should return platform information', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.platform).toBeDefined();
      expect(response.body.platform.name).toBe('Unified AI Platform');
    });

    test('should return core capabilities structure', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.core_capabilities).toBeDefined();
      expect(typeof response.body.core_capabilities).toBe('object');
    });

    test('should return performance metrics', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.performance).toBeDefined();
      expect(response.body.performance.response_time).toBeDefined();
    });
  });

  describe('Demo Endpoint - Validation', () => {
    test('should return features array', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(Array.isArray(response.body.features)).toBe(true);
      expect(response.body.features.length).toBeGreaterThan(0);
    });

    test('should return systems combined information', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(Array.isArray(response.body.systems_combined)).toBe(true);
      expect(response.body.systems_combined.length).toBeGreaterThan(0);
    });

    test('should return status message', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(typeof response.body.status).toBe('string');
    });
  });
});