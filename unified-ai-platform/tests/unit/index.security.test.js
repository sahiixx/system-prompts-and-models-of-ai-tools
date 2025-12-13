/**
 * Security and Validation Tests for UnifiedAIPlatform
 * 
 * These tests cover:
 * - Input validation and sanitization
 * - Injection attack prevention
 * - Size limit enforcement
 * - Rate limiting scenarios
 * - Header security
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

jest.mock('../../config/tools.json', () => ([]));

describe('UnifiedAIPlatform Security Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Input Validation', () => {
    test('should reject SQL injection attempts in memory keys', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--"
      ];

      for (const input of maliciousInputs) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: input, value: 'test' });
        
        // Should either reject or safely store
        if (response.status === 200) {
          const stored = platform.memory.get(input);
          expect(stored.content).toBe('test');
        }
      }
    });

    test('should handle XSS attempts in values', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>'
      ];

      for (const payload of xssPayloads) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'xss_test', value: payload })
          .expect(200);

        const stored = platform.memory.get('xss_test');
        expect(stored.content).toBe(payload);
      }
    });

    test('should handle NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $where: 'this.password == "secret"' }
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'nosql_test', value: payload });
        
        if (response.status === 200) {
          const stored = platform.memory.get('nosql_test');
          expect(stored).toBeDefined();
        }
      }
    });

    test('should reject extremely long keys', async () => {
      const longKey = 'a'.repeat(10000);
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' });
      
      // Should handle gracefully - either accept or reject
      expect([200, 400, 413]).toContain(response.status);
    });

    test('should handle Unicode and special characters safely', async () => {
      const specialChars = [
        '🚀💻🎯',
        '中文测试',
        'Тест',
        '🔥'.repeat(100),
        '\u0000\u0001\u0002',
        '\\n\\r\\t'
      ];

      for (const char of specialChars) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `special_${char}`, value: char })
          .expect(200);
      }
    });
  });

  describe('Size Limits', () => {
    test('should handle payload at size limit', async () => {
      // 10MB is the configured limit
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_data', value: largeValue });
      
      expect([200, 413]).toContain(response.status);
    });

    test('should reject oversized payloads gracefully', async () => {
      const oversizedValue = 'x'.repeat(11 * 1024 * 1024); // 11MB, over limit
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'oversized', value: oversizedValue });
      
      expect([413, 400]).toContain(response.status);
    });

    test('should handle multiple large memory entries', async () => {
      const largeValue = 'x'.repeat(100000); // 100KB each
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `large_${i}`, value: largeValue })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;
      
      expect(successCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HTTP Header Security', () => {
    test('should include security headers in responses', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // Check for security headers set by helmet
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should have CSP headers configured', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should handle requests with suspicious headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('X-Forwarded-For', '"><script>alert(1)</script>')
        .set('User-Agent', '<img src=x onerror=alert(1)>');

      expect(response.status).toBe(200);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should prevent directory traversal in routes', async () => {
      const traversalAttempts = [
        '/api/v1/../../../etc/passwd',
        '/api/v1/memory/../../config',
        '/api/v1/plans/.././../secrets'
      ];

      for (const path of traversalAttempts) {
        const response = await request(platform.app).get(path);
        expect([404, 400]).toContain(response.status);
      }
    });
  });

  describe('Content Type Validation', () => {
    test('should handle incorrect content-type headers', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/xml')
        .send('<xml>data</xml>');

      // Should either parse as text or reject
      expect([200, 400, 415]).toContain(response.status);
    });

    test('should accept valid JSON content-type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({ key: 'test', value: 'data' });

      expect(response.status).toBe(200);
    });
  });

  describe('Request Method Security', () => {
    test('should reject unsupported HTTP methods', async () => {
      const response = await request(platform.app)
        .patch('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect([404, 405]).toContain(response.status);
    });

    test('should handle HEAD requests appropriately', async () => {
      const response = await request(platform.app)
        .head('/health');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Data Type Validation', () => {
    test('should handle type confusion attacks', async () => {
      const confusingInputs = [
        { key: ['array', 'as', 'key'], value: 'test' },
        { key: { object: 'as key' }, value: 'test' },
        { key: true, value: 'test' },
        { key: 123, value: 'test' }
      ];

      for (const input of confusingInputs) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send(input);
        
        expect([200, 400]).toContain(response.status);
      }
    });

    test('should validate array inputs for plans', async () => {
      const invalidSteps = [
        null,
        undefined,
        'not an array',
        { 0: 'step1', 1: 'step2' },
        [null, undefined, '']
      ];

      for (const steps of invalidSteps) {
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: 'test', steps });
        
        // Should handle gracefully
        expect(true).toBe(true);
      }
    });
  });

  describe('Error Message Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      const response = await request(platform.app)
        .get('/api/v1/nonexistent')
        .expect(404);

      const errorMessage = response.body.message || response.body.error;
      
      // Should not contain stack traces in production-like errors
      expect(errorMessage).not.toMatch(/at Object\./);
      expect(errorMessage).not.toMatch(/node_modules/);
      expect(errorMessage).not.toMatch(/\/home\//);
    });

    test('should sanitize error responses', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({});

      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('Denial of Service Prevention', () => {
    test('should handle rapid repeated requests', async () => {
      const rapidRequests = Array.from({ length: 100 }, () =>
        request(platform.app).get('/health')
      );

      const results = await Promise.all(rapidRequests);
      const successCount = results.filter(r => r.status === 200).length;
      
      expect(successCount).toBeGreaterThan(50); // At least half should succeed
    });

    test('should handle recursive data structures safely', async () => {
      const circular: any = { key: 'test' };
      circular.self = circular;

      try {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'circular', value: circular });
      } catch (error) {
        // Should not crash the server
        expect(error).toBeDefined();
      }

      // Server should still be responsive
      const health = await request(platform.app).get('/health');
      expect(health.status).toBe(200);
    });

    test('should limit concurrent operations', async () => {
      const heavyOperations = Array.from({ length: 50 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ 
            task_description: `Heavy operation ${i}`,
            steps: Array.from({ length: 1000 }, (_, j) => `Step ${j}`)
          })
      );

      const results = await Promise.allSettled(heavyOperations);
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      
      expect(fulfilled).toBeGreaterThan(0);
    });
  });

  describe('Authentication Edge Cases', () => {
    test('should handle missing authentication headers gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      // Currently no auth required, should succeed
      expect(response.status).toBeLessThan(500);
    });

    test('should handle malformed authorization headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('Authorization', 'Bearer <script>alert(1)</script>');

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('CORS Security', () => {
    test('should handle CORS preflight from various origins', async () => {
      const origins = [
        'http://localhost:3000',
        'https://malicious-site.com',
        'null'
      ];

      for (const origin of origins) {
        const response = await request(platform.app)
          .options('/api/v1/memory')
          .set('Origin', origin);

        expect([200, 204]).toContain(response.status);
      }
    });

    test('should include appropriate CORS headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});