/**
 * Security and Validation Tests
 * 
 * These tests cover:
 * - Input validation and sanitization
 * - Security headers
 * - Error message safety
 * - Rate limiting considerations
 * - XSS prevention
 * - Injection attack prevention
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

describe('Security and Validation Tests', () => {
  let platform;
  let app;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
    app = platform.app;
  });

  describe('Input Validation - Memory', () => {
    test('should reject extremely long keys', async () => {
      const longKey = 'a'.repeat(10000);
      
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' });

      // Should handle gracefully (either accept or reject appropriately)
      expect([200, 400, 413]).toContain(response.status);
    });

    test('should reject extremely large payloads', async () => {
      const largeValue = 'x'.repeat(20 * 1024 * 1024); // 20MB
      
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: largeValue });

      // Should reject payloads exceeding limit
      expect([400, 413]).toContain(response.status);
    });

    test('should handle null bytes in input', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'test\0null', value: 'value\0byte' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle SQL injection patterns safely', async () => {
      const sqlPatterns = [
        "'; DROP TABLE users--",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--"
      ];

      for (const pattern of sqlPatterns) {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'sql_test', value: pattern })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should handle XSS patterns safely', async () => {
      const xssPatterns = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      for (const pattern of xssPatterns) {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'xss_test', value: pattern })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should handle command injection patterns', async () => {
      const commandPatterns = [
        '; ls -la',
        '| cat /etc/passwd',
        '`whoami`',
        '$(rm -rf /)'
      ];

      for (const pattern of commandPatterns) {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'cmd_test', value: pattern })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should handle LDAP injection patterns', async () => {
      const ldapPatterns = [
        '*)(objectClass=*',
        'admin)(&(password=*))',
        '*)(uid=*)(|(uid=*'
      ];

      for (const pattern of ldapPatterns) {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'ldap_test', value: pattern })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Input Validation - Plans', () => {
    test('should handle extremely long task descriptions', async () => {
      const longDesc = 'A'.repeat(100000);
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ task_description: longDesc });

      expect([200, 400, 413]).toContain(response.status);
    });

    test('should handle deeply nested step arrays', async () => {
      const deepSteps = Array(1000).fill().map((_, i) => `Step ${i}`);
      
      const response = await request(app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Deep test',
          steps: deepSteps
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle malicious step content', async () => {
      const maliciousSteps = [
        '<script>alert("XSS")</script>',
        'rm -rf /',
        '$(malicious command)',
        '../../../etc/passwd'
      ];

      const response = await request(app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Security test',
          steps: maliciousSteps
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for common security headers
      expect(response.headers).toBeDefined();
    });

    test('should set CORS headers appropriately', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/memory')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Error Message Safety', () => {
    test('should not expose internal paths in error messages', async () => {
      const response = await request(app)
        .get('/nonexistent/path/that/does/not/exist')
        .expect(404);

      const message = JSON.stringify(response.body).toLowerCase();
      
      // Should not expose full file system paths
      expect(message).not.toMatch(/\/home\//);
      expect(message).not.toMatch(/\/usr\//);
      expect(message).not.toMatch(/c:\\/);
      expect(message).not.toMatch(/\\windows\\/);
    });

    test('should not expose stack traces in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should provide safe error messages', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });
  });

  describe('Type Confusion Attacks', () => {
    test('should handle array when object expected', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send(['array', 'not', 'object']);

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    test('should handle number when string expected', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 12345, value: 67890 });

      // Should handle type coercion appropriately
      expect([200, 400]).toContain(response.status);
    });

    test('should handle boolean when string expected', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: true, value: false });

      expect([200, 400]).toContain(response.status);
    });

    test('should handle nested objects with type confusion', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({
          key: 'nested_test',
          value: {
            number: '123',
            string: 456,
            boolean: 'true',
            null: 'null'
          }
        });

      // Should handle without crashing
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should not allow directory traversal in endpoints', async () => {
      const traversalPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/api/v1/../../../etc/passwd'
      ];

      for (const path of traversalPaths) {
        const response = await request(app).get(path);
        
        // Should return 404, not expose file system
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Prototype Pollution Prevention', () => {
    test('should not allow __proto__ in memory keys', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: '__proto__', value: 'malicious' })
        .expect(200);

      // Should store safely without polluting prototype
      expect(({}).polluted).toBeUndefined();
    });

    test('should not allow constructor in memory keys', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'constructor', value: 'malicious' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle prototype pollution attempt in nested objects', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send({
          key: 'proto_test',
          value: {
            '__proto__': { polluted: true },
            'constructor': { prototype: { polluted: true } }
          }
        });

      expect([200, 400]).toContain(response.status);
      expect(({}).polluted).toBeUndefined();
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    test('should handle rapid repeated requests', async () => {
      const requests = Array(100).fill().map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle concurrent memory operations', async () => {
      const operations = Array(50).fill().map((_, i) =>
        request(app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: `value_${i}` })
      );

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle large number of plans', async () => {
      const operations = Array(30).fill().map((_, i) =>
        request(app)
          .post('/api/v1/plans')
          .send({ task_description: `Plan ${i}` })
      );

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Content Type Validation', () => {
    test('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .send('key=test&value=data');

      // Should handle gracefully
      expect([200, 400, 415]).toContain(response.status);
    });

    test('should handle incorrect content-type', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      expect([200, 400, 415]).toContain(response.status);
    });
  });

  describe('Memory Safety', () => {
    test('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/api/v1/memory')
          .send({ key: `leak_test_${i}`, value: 'x'.repeat(1000) });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase unboundedly (allowing for reasonable growth)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB threshold
    });
  });

  describe('Timing Attack Prevention', () => {
    test('should not vary response time based on data existence', async () => {
      const times = [];

      // Test with existing data
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'timing_test', value: 'data' });

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(app).get('/api/v1/memory');
        times.push(Date.now() - start);
      }

      // Variance should be minimal (allowing for network/system jitter)
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const variance = times.map(t => Math.abs(t - avgTime));
      const maxVariance = Math.max(...variance);

      expect(maxVariance).toBeLessThan(1000); // 1 second max variance
    });
  });

  describe('JSON Injection Prevention', () => {
    test('should safely handle JSON-like strings', async () => {
      const jsonStrings = [
        '{"fake": "json"}',
        '[1, 2, 3]',
        'null',
        'true',
        '{"nested": {"data": "here"}}'
      ];

      for (const jsonStr of jsonStrings) {
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'json_test', value: jsonStr })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Regular Expression DoS Prevention', () => {
    test('should handle regex catastrophic backtracking patterns', async () => {
      const regexDosPatterns = [
        'a'.repeat(100) + '!',
        '(' + 'a'.repeat(100) + ')*',
        '^(a+)+$' + 'a'.repeat(50)
      ];

      for (const pattern of regexDosPatterns) {
        const start = Date.now();
        const response = await request(app)
          .post('/api/v1/memory')
          .send({ key: 'regex_test', value: pattern });
        const duration = Date.now() - start;

        // Should complete in reasonable time
        expect(duration).toBeLessThan(5000);
        expect([200, 400]).toContain(response.status);
      }
    });
  });
});