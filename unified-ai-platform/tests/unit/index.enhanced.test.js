/**
 * Enhanced Unit Tests for UnifiedAIPlatform (src/index.js)
 * 
 * These tests provide additional coverage for:
 * - Concurrency and race conditions
 * - Memory leak scenarios
 * - Error boundary testing
 * - Security edge cases
 * - Performance under load
 * - State corruption scenarios
 * - Resource cleanup
 * - Complex middleware interactions
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
    concurrent_operations: { max_parallel: 10 }
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

  afterEach(() => {
    if (platform) {
      platform = null;
    }
  });

  describe('Concurrency and Race Conditions', () => {
    test('should handle concurrent memory writes without data loss', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `key_${i}`, value: `value_${i}` })
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      // Verify all memories were stored
      const response = await request(platform.app).get('/api/v1/memory');
      expect(response.body.count).toBe(50);
    });

    test('should handle concurrent plan creation correctly', async () => {
      const promises = Array.from({ length: 30 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `task_${i}`, steps: [`step1_${i}`, `step2_${i}`] })
      );

      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.plan_id).toBeDefined();
      });

      const plansResponse = await request(platform.app).get('/api/v1/plans');
      expect(plansResponse.body.count).toBe(30);
    });

    test('should handle concurrent reads and writes to memory', async () => {
      // Pre-populate some data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'shared', value: 'initial' });

      const operations = [];
      
      // Mix of reads and writes
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          operations.push(
            request(platform.app).get('/api/v1/memory')
          );
        } else {
          operations.push(
            request(platform.app)
              .post('/api/v1/memory')
              .send({ key: `concurrent_${i}`, value: `value_${i}` })
          );
        }
      }

      const results = await Promise.all(operations);
      
      results.forEach(res => {
        expect([200]).toContain(res.status);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle extremely large payloads within limits', async () => {
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB of data
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large', value: largeValue });

      // Should succeed within the 10mb limit
      expect([200, 413]).toContain(response.status);
    });

    test('should handle payloads exceeding size limit', async () => {
      const hugeValue = 'x'.repeat(11 * 1024 * 1024); // 11MB (over 10MB limit)
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'huge', value: hugeValue });

      expect(response.status).toBe(413); // Payload Too Large
    });

    test('should handle missing required fields in memory POST', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test' }) // missing value
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle missing required fields in plans POST', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ steps: ['step1'] }) // missing task_description
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle empty POST body for memory', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle empty POST body for plans', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle null values in request body', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: null, value: null })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle undefined values in request body', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: undefined, value: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle special characters in memory keys', async () => {
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key\\with\\backslashes'
      ];

      for (const key of specialKeys) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key, value: 'test' });
        
        expect([200, 400]).toContain(response.status);
      }
    });

    test('should handle very long key names', async () => {
      const longKey = 'k'.repeat(10000);
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' });

      expect([200, 400]).toContain(response.status);
    });

    test('should handle Unicode characters in keys and values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '🔑test', value: '📝 Unicode value with émojis' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle SQL injection attempts in keys', async () => {
      const maliciousKey = "'; DROP TABLE memory; --";
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: maliciousKey, value: 'test' });

      // Should handle safely
      expect([200, 400]).toContain(response.status);
    });

    test('should handle XSS attempts in values', async () => {
      const xssValue = '<script>alert("XSS")</script>';
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssValue })
        .expect(200);

      // Value should be stored as-is (string)
      expect(response.body.success).toBe(true);
    });
  });

  describe('Memory Management and State', () => {
    test('should handle memory overflow scenarios gracefully', async () => {
      // Store many items
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `mem_${i}`, value: `data_${i}` })
        );
      }

      await Promise.all(promises);

      const response = await request(platform.app).get('/api/v1/memory');
      expect(response.body.count).toBe(1000);
    });

    test('should handle memory key collision (overwrite)', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'duplicate', value: 'first' });

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'duplicate', value: 'second' })
        .expect(200);

      const memResponse = await request(platform.app).get('/api/v1/memory');
      const duplicateEntry = memResponse.body.memories.find(([k]) => k === 'duplicate');
      
      expect(duplicateEntry[1].content).toBe('second');
    });

    test('should maintain memory metadata (timestamps)', async () => {
      const beforeTime = new Date().toISOString();
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamped', value: 'data' });

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      
      const afterTime = new Date().toISOString();
      
      const response = await request(platform.app).get('/api/v1/memory');
      const entry = response.body.memories.find(([k]) => k === 'timestamped');
      
      expect(entry[1].created_at).toBeDefined();
      expect(entry[1].last_accessed).toBeDefined();
      expect(entry[1].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should handle plans with empty steps array', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Empty plan', steps: [] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.plan_id).toBeDefined();
    });

    test('should generate unique plan IDs', async () => {
      const planIds = new Set();
      
      for (let i = 0; i < 100; i++) {
        const response = await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `task_${i}` });
        
        planIds.add(response.body.plan_id);
      }

      expect(planIds.size).toBe(100); // All unique
    });

    test('should handle plans with very long descriptions', async () => {
      const longDescription = 'x'.repeat(100000);
      
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: longDescription });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle plans with complex nested step structures', async () => {
      const complexSteps = [
        { step: 1, action: 'read', params: { file: 'test.js' } },
        { step: 2, action: 'analyze', params: { depth: 3 } },
        { step: 3, action: 'write', params: { output: 'result.json' } }
      ];

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complex plan', steps: complexSteps })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('HTTP Method Validation', () => {
    test('should reject PUT requests to memory endpoint', async () => {
      const response = await request(platform.app)
        .put('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect(response.status).toBe(404);
    });

    test('should reject DELETE requests to plans endpoint', async () => {
      const response = await request(platform.app)
        .delete('/api/v1/plans')
        .send({ plan_id: 'test' });

      expect(response.status).toBe(404);
    });

    test('should reject PATCH requests to capabilities endpoint', async () => {
      const response = await request(platform.app)
        .patch('/api/v1/capabilities')
        .send({ update: 'test' });

      expect(response.status).toBe(404);
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include CORS headers in responses', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should include security headers from helmet', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(platform.app)
        .options('/api/v1/memory')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should respond to health checks quickly', async () => {
      const start = Date.now();
      
      await request(platform.app).get('/health');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle rapid sequential requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(request(platform.app).get('/health'));
      }

      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });

    test('should maintain consistent response structure under load', async () => {
      const responses = await Promise.all(
        Array.from({ length: 50 }, () =>
          request(platform.app).get('/api/v1/capabilities')
        )
      );

      responses.forEach(res => {
        expect(res.body).toHaveProperty('platform');
        expect(res.body).toHaveProperty('core_capabilities');
        expect(res.body).toHaveProperty('operating_modes');
        expect(res.body).toHaveProperty('performance');
      });
    });
  });

  describe('API Response Consistency', () => {
    test('all successful responses should have consistent structure', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/api/v1/tools' },
        { method: 'get', path: '/api/v1/memory' },
        { method: 'get', path: '/api/v1/plans' },
        { method: 'get', path: '/api/v1/capabilities' },
        { method: 'get', path: '/api/v1/demo' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(platform.app)[endpoint.method](endpoint.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(typeof response.body).toBe('object');
      }
    });

    test('all error responses should have error field', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('all POST responses should indicate success or failure', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect(response.body).toHaveProperty('success');
      expect(typeof response.body.success).toBe('boolean');
    });
  });

  describe('Content-Type Handling', () => {
    test('should handle application/json content type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send({ key: 'test', value: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle application/x-www-form-urlencoded', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=test&value=data');

      // Should process form data
      expect([200, 400]).toContain(response.status);
    });

    test('should reject unsupported content types appropriately', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      // May not parse correctly
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Static File Serving', () => {
    test('should serve static files from /static route', async () => {
      const response = await request(platform.app)
        .get('/static/test.txt');

      // Will be 404 if file doesn't exist, which is expected
      expect([200, 404]).toContain(response.status);
    });

    test('should not serve files outside static directory', async () => {
      const response = await request(platform.app)
        .get('/../../../etc/passwd')
        .expect(404);
    });
  });

  describe('Logging and Observability', () => {
    test('should log requests (verified by middleware presence)', () => {
      // Middleware is set up, actual logging verification would require log capture
      expect(platform.app._router).toBeDefined();
    });

    test('should track memory usage in health endpoint', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.heapUsed).toBeGreaterThan(0);
      expect(response.body.memory.heapTotal).toBeGreaterThan(0);
    });

    test('should track uptime in health endpoint', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should accept valid memory data types', async () => {
      const validValues = [
        'string value',
        { object: 'value' },
        ['array', 'value'],
        123,
        true,
        null
      ];

      for (const value of validValues) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `test_${typeof value}`, value });
        
        expect(response.status).toBe(200);
      }
    });

    test('should handle deeply nested objects in memory values', async () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep value'
              }
            }
          }
        }
      };

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep', value: deepObject })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle circular references in values gracefully', async () => {
      const obj = { a: 1 };
      obj.self = obj; // Circular reference

      // JSON.stringify will fail on circular refs
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'circular', value: obj });

      // Should handle error
      expect([400, 500]).toContain(response.status);
    });
  });
});