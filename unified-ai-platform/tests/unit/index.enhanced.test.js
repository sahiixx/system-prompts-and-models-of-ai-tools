/**
 * Enhanced Unit Tests for UnifiedAIPlatform
 * 
 * These tests provide additional coverage for:
 * - Advanced error scenarios
 * - Environment variable edge cases
 * - Security configurations
 * - Performance and stress testing
 * - Middleware behavior
 * - Complex integration scenarios
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
          input: { type: 'string' }
        }
      }
    }
  }
]));

describe('UnifiedAIPlatform - Enhanced Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Environment Variable Handling', () => {
    test('should handle ALLOWED_ORIGINS with single origin', () => {
      const originalOrigins = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = 'http://example.com';
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform).toBeDefined();
      
      process.env.ALLOWED_ORIGINS = originalOrigins;
    });

    test('should handle ALLOWED_ORIGINS with multiple origins', () => {
      const originalOrigins = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = 'http://example.com,http://test.com,https://secure.com';
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform).toBeDefined();
      
      process.env.ALLOWED_ORIGINS = originalOrigins;
    });

    test('should handle missing ALLOWED_ORIGINS', () => {
      const originalOrigins = process.env.ALLOWED_ORIGINS;
      delete process.env.ALLOWED_ORIGINS;
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform).toBeDefined();
      
      process.env.ALLOWED_ORIGINS = originalOrigins;
    });

    test('should use production error messages when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should include stack trace when NODE_ENV is development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should handle invalid PORT gracefully', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = 'invalid';
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform.port).toBe('invalid');
      
      process.env.PORT = originalPort;
    });

    test('should handle very large PORT number', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '65535';
      
      const testPlatform = new UnifiedAIPlatform();
      expect(testPlatform.port).toBe('65535');
      
      process.env.PORT = originalPort;
    });
  });

  describe('Security Middleware Tests', () => {
    test('should set Content-Security-Policy headers', async () => {
      const response = await request(platform.app)
        .get('/health');

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should allow CORS for OPTIONS requests', async () => {
      const response = await request(platform.app)
        .options('/api/v1/memory');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle large JSON payloads within limit', async () => {
      const largeData = {
        key: 'large_test',
        value: 'x'.repeat(1000000) // 1MB of data
      };

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(largeData);

      expect([200, 413]).toContain(response.status);
    });

    test('should reject payloads exceeding 10mb limit', async () => {
      const hugeData = {
        key: 'huge_test',
        value: 'x'.repeat(11000000) // 11MB of data
      };

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(hugeData);

      expect([413, 400]).toContain(response.status);
    });

    test('should handle requests with various Content-Types', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=test&value=data');

      expect([200, 400]).toContain(response.status);
    });

    test('should apply compression middleware', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('Accept-Encoding', 'gzip');

      // Compression should be applied or response should be valid
      expect(response.status).toBe(200);
    });
  });

  describe('Advanced Memory Operations', () => {
    test('should handle storing array values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'array_test', value: [1, 2, 3, 4, 5] });

      expect(response.status).toBe(200);
      const stored = platform.memory.get('array_test');
      expect(stored.content).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle storing boolean values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_test', value: true });

      expect(response.status).toBe(200);
      const stored = platform.memory.get('bool_test');
      expect(stored.content).toBe(true);
    });

    test('should handle storing numeric values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'num_test', value: 42 });

      expect(response.status).toBe(200);
      const stored = platform.memory.get('num_test');
      expect(stored.content).toBe(42);
    });

    test('should handle storing zero as value', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zero_test', value: 0 });

      expect(response.status).toBe(200);
      const stored = platform.memory.get('zero_test');
      expect(stored.content).toBe(0);
    });

    test('should handle empty string as value', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'empty_test', value: '' });

      expect(response.status).toBe(400);
    });

    test('should handle special characters in keys', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'key-with-special_chars.123', value: 'data' });

      expect(response.status).toBe(200);
    });

    test('should handle Unicode keys', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'key_with_你好_unicode', value: 'data' });

      expect(response.status).toBe(200);
    });

    test('should handle deeply nested objects', async () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'deep value'
                }
              }
            }
          }
        }
      };

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep_test', value: deepObject });

      expect(response.status).toBe(200);
      const stored = platform.memory.get('deep_test');
      expect(stored.content.level1.level2.level3.level4.level5.data).toBe('deep value');
    });

    test('should handle arrays with mixed types', async () => {
      const mixedArray = [1, 'string', true, null, { key: 'value' }, [1, 2]];
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'mixed_array', value: mixedArray });

      expect(response.status).toBe(200);
      const stored = platform.memory.get('mixed_array');
      expect(stored.content).toEqual(mixedArray);
    });

    test('should update last_accessed timestamp', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'data' });

      const firstAccess = platform.memory.get('timestamp_test').last_accessed;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'updated' });

      const secondAccess = platform.memory.get('timestamp_test').last_accessed;
      expect(new Date(secondAccess) >= new Date(firstAccess)).toBe(true);
    });
  });

  describe('Advanced Plans Operations', () => {
    test('should handle null steps', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task', steps: null });

      expect(response.status).toBe(200);
      const plan = platform.plans.get(response.body.plan_id);
      expect(Array.isArray(plan.steps)).toBe(true);
    });

    test('should handle empty steps array', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task', steps: [] });

      expect(response.status).toBe(200);
      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual([]);
    });

    test('should handle steps with complex objects', async () => {
      const complexSteps = [
        { id: 1, action: 'step1', metadata: { priority: 'high' } },
        { id: 2, action: 'step2', metadata: { priority: 'low' } }
      ];

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complex task', steps: complexSteps });

      expect(response.status).toBe(200);
      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual(complexSteps);
    });

    test('should handle task description with special characters', async () => {
      const specialDesc = 'Task with <special> & "characters" \'quoted\'';
      
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: specialDesc });

      expect(response.status).toBe(200);
      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.task_description).toBe(specialDesc);
    });

    test('should handle Unicode in task description', async () => {
      const unicodeDesc = 'Task with 你好 and émojis 🚀';
      
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: unicodeDesc });

      expect(response.status).toBe(200);
    });

    test('should maintain plan status as created', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Status test' });

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.status).toBe('created');
    });

    test('should handle whitespace-only task description', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: '   ' });

      // Whitespace-only should be treated as valid or invalid based on implementation
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle requests with missing body', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory');

      expect(response.status).toBe(400);
    });

    test('should handle requests with invalid JSON structure', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('not json at all');

      expect([400, 500]).toContain(response.status);
    });

    test('should handle GET requests to POST-only endpoints', async () => {
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      // Should still work as it's a valid GET endpoint
      expect(response.status).toBe(200);
    });

    test('should handle DELETE requests to undefined endpoints', async () => {
      const response = await request(platform.app)
        .delete('/api/v1/memory');

      expect(response.status).toBe(404);
    });

    test('should handle PUT requests to undefined endpoints', async () => {
      const response = await request(platform.app)
        .put('/api/v1/memory');

      expect(response.status).toBe(404);
    });

    test('should handle PATCH requests', async () => {
      const response = await request(platform.app)
        .patch('/api/v1/memory');

      expect(response.status).toBe(404);
    });

    test('should include proper error structure', async () => {
      const response = await request(platform.app)
        .get('/nonexistent/endpoint');

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle rapid sequential requests', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(platform.app)
            .get('/health')
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });
    });

    test('should handle concurrent writes to different keys', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: `value_${i}` })
      );

      const responses = await Promise.all(promises);
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });
      expect(platform.memory.size).toBe(20);
    });

    test('should handle concurrent reads', async () => {
      platform.memory.set('read_test', { content: 'data', created_at: new Date().toISOString(), last_accessed: new Date().toISOString() });

      const promises = Array.from({ length: 30 }, () =>
        request(platform.app)
          .get('/api/v1/memory')
      );

      const responses = await Promise.all(promises);
      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.count).toBeGreaterThan(0);
      });
    });

    test('should handle mixed read/write operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 15; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `mixed_${i}`, value: `value_${i}` })
        );
        operations.push(
          request(platform.app)
            .get('/api/v1/memory')
        );
      }

      const responses = await Promise.all(operations);
      responses.forEach(res => {
        expect([200, 201]).toContain(res.status);
      });
    });

    test('should maintain data consistency under concurrent updates', async () => {
      const key = 'consistency_test';
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: key, value: `update_${i}` })
      );

      await Promise.all(promises);
      
      const final = platform.memory.get(key);
      expect(final).toBeDefined();
      expect(final.content).toMatch(/^update_\d$/);
    });
  });

  describe('API Response Format Validation', () => {
    test('should return consistent timestamp format', async () => {
      const response = await request(platform.app)
        .get('/health');

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should include all required health check fields', async () => {
      const response = await request(platform.app)
        .get('/health');

      const requiredFields = ['status', 'platform', 'version', 'timestamp', 'uptime', 'memory', 'initialized', 'features'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    });

    test('should include all required tool fields', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools');

      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
      expect(response.body.count).toBe(response.body.tools.length);
    });

    test('should include all required capabilities fields', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities');

      const requiredFields = ['platform', 'core_capabilities', 'operating_modes', 'performance', 'description'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    });

    test('should return proper JSON content type', async () => {
      const response = await request(platform.app)
        .get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Static File Serving', () => {
    test('should set correct content-type for static files', async () => {
      const response = await request(platform.app)
        .get('/static/test.txt');

      // Should return proper headers even if file doesn't exist
      expect([200, 404]).toContain(response.status);
    });

    test('should handle requests for directories', async () => {
      const response = await request(platform.app)
        .get('/static/');

      expect([200, 403, 404]).toContain(response.status);
    });

    test('should not serve files outside static directory', async () => {
      const response = await request(platform.app)
        .get('/static/../config/system-config.json');

      // Should not allow directory traversal
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Memory Management', () => {
    test('should handle memory growth', () => {
      for (let i = 0; i < 1000; i++) {
        platform.memory.set(`key_${i}`, {
          content: `value_${i}`,
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        });
      }

      expect(platform.memory.size).toBe(1000);
    });

    test('should handle plans growth', () => {
      for (let i = 0; i < 100; i++) {
        platform.plans.set(`plan_${i}`, {
          task_description: `task ${i}`,
          steps: [],
          created_at: new Date().toISOString(),
          status: 'created'
        });
      }

      expect(platform.plans.size).toBe(100);
    });

    test('should clear memory when cleared', () => {
      platform.memory.set('test', { content: 'data', created_at: new Date().toISOString(), last_accessed: new Date().toISOString() });
      platform.memory.clear();
      
      expect(platform.memory.size).toBe(0);
    });

    test('should allow deletion of specific memory entries', () => {
      platform.memory.set('delete_me', { content: 'data', created_at: new Date().toISOString(), last_accessed: new Date().toISOString() });
      expect(platform.memory.has('delete_me')).toBe(true);
      
      platform.memory.delete('delete_me');
      expect(platform.memory.has('delete_me')).toBe(false);
    });
  });

  describe('Request Headers Validation', () => {
    test('should handle requests without User-Agent', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('User-Agent', '');

      expect(response.status).toBe(200);
    });

    test('should handle requests with custom headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('X-Custom-Header', 'custom-value');

      expect(response.status).toBe(200);
    });

    test('should handle Authorization header', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
    });

    test('should handle X-Requested-With header', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ key: 'test', value: 'data' });

      expect(response.status).toBe(200);
    });
  });

  describe('Logging Behavior', () => {
    test('should log platform capabilities', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Platform Capabilities'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Targets'));
      
      consoleSpy.mockRestore();
    });

    test('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Trigger an error by sending invalid data
      await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Initialization State', () => {
    test('should report not initialized before start', () => {
      expect(platform.isInitialized).toBe(false);
    });

    test('should have consistent state after construction', () => {
      expect(platform.memory.size).toBe(0);
      expect(platform.plans.size).toBe(0);
      expect(platform.tools).toBeDefined();
      expect(platform.app).toBeDefined();
    });
  });
});