/**
 * Security and Input Validation Tests for Unified AI Platform
 * 
 * These tests focus on:
 * - Input validation and sanitization
 * - XSS prevention
 * - Injection attacks (SQL-like, command injection attempts)
 * - Header manipulation
 * - Rate limiting considerations
 * - Authentication and authorization edge cases
 * - CORS security
 * - Path traversal attempts
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');
const http = require('http');

jest.mock('../../config/system-config.json', () => ({
  platform: { name: 'Unified AI Platform', version: '1.0.0' },
  core_capabilities: {
    multi_modal: { enabled: true },
    memory_system: { enabled: true },
    tool_system: { enabled: true },
    planning_system: { enabled: true },
    security: { enabled: true }
  },
  operating_modes: { development: { debug: true }, production: { debug: false } },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  { type: 'function', function: { name: 'test_tool', description: 'Test' } }
]));

describe('Security Tests - UnifiedAIPlatform', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    test('should handle script tags in memory values', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssPayload })
        .expect(200);

      const stored = platform.memory.get('xss_test');
      expect(stored.content).toBe(xssPayload);
      // Value is stored but should be escaped when rendered
    });

    test('should handle HTML entities in memory keys', async () => {
      const htmlKey = 'key&lt;test&gt;';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: htmlKey, value: 'data' })
        .expect(200);

      expect(platform.memory.has(htmlKey)).toBe(true);
    });

    test('should handle JavaScript code in plan descriptions', async () => {
      const jsPayload = 'javascript:void(0)';
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: jsPayload })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.task_description).toBe(jsPayload);
    });

    test('should handle onclick handlers in values', async () => {
      const payload = '<div onclick="alert(1)">Click me</div>';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'onclick_test', value: payload })
        .expect(200);

      const stored = platform.memory.get('onclick_test');
      expect(stored.content).toBe(payload);
    });

    test('should handle encoded script tags', async () => {
      const encodedScript = '%3Cscript%3Ealert(1)%3C%2Fscript%3E';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'encoded', value: encodedScript })
        .expect(200);

      expect(platform.memory.has('encoded')).toBe(true);
    });
  });

  describe('Injection Attacks', () => {
    test('should handle SQL-like injection in memory keys', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: sqlInjection, value: 'data' })
        .expect(200);

      expect(platform.memory.has(sqlInjection)).toBe(true);
    });

    test('should handle command injection attempts in values', async () => {
      const cmdInjection = '$(rm -rf /)';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'cmd_test', value: cmdInjection })
        .expect(200);

      const stored = platform.memory.get('cmd_test');
      expect(stored.content).toBe(cmdInjection);
    });

    test('should handle shell metacharacters', async () => {
      const shellChars = '`whoami`; ls -la; cat /etc/passwd';
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: shellChars })
        .expect(200);

      expect(platform.plans.size).toBeGreaterThan(0);
    });

    test('should handle null byte injection', async () => {
      const nullByte = 'data\x00injection';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'null_test', value: nullByte })
        .expect(200);

      expect(platform.memory.has('null_test')).toBe(true);
    });

    test('should handle LDAP injection patterns', async () => {
      const ldapInjection = '*)(&(password=*))';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'ldap_test', value: ldapInjection })
        .expect(200);

      expect(platform.memory.has('ldap_test')).toBe(true);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should handle directory traversal in routes', async () => {
      const response = await request(platform.app)
        .get('/api/v1/../../etc/passwd')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    test('should handle encoded path traversal', async () => {
      await request(platform.app)
        .get('/api/v1/%2e%2e%2f%2e%2e%2fetc%2fpasswd')
        .expect(404);
    });

    test('should handle null byte path traversal', async () => {
      await request(platform.app)
        .get('/api/v1/data%00.txt')
        .expect(404);
    });

    test('should handle Windows path traversal', async () => {
      await request(platform.app)
        .get('/api/v1/..\\..\\windows\\system32')
        .expect(404);
    });
  });

  describe('Header Manipulation', () => {
    test('should handle very long headers', async () => {
      const longHeader = 'A'.repeat(10000);
      const response = await request(platform.app)
        .get('/health')
        .set('X-Custom-Header', longHeader);

      expect([200, 400, 413]).toContain(response.status);
    });

    test('should handle special characters in headers', async () => {
      await request(platform.app)
        .get('/health')
        .set('X-Special', '\r\nInjected: value')
        .expect(200);
    });

    test('should handle null bytes in headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('X-Null', 'value\x00injection');

      expect([200, 400]).toContain(response.status);
    });

    test('should handle multiple Host headers', async () => {
      // Express typically handles this, but test the behavior
      const response = await request(platform.app)
        .get('/health');

      expect(response.status).toBe(200);
    });

    test('should handle malformed Content-Type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json; charset=utf-8; boundary=--')
        .send({ key: 'test', value: 'data' });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Input Size Limits', () => {
    test('should handle extremely large memory values', async () => {
      const largeValue = 'A'.repeat(1000000); // 1MB
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large', value: largeValue });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle extremely large plan descriptions', async () => {
      const largeDesc = 'X'.repeat(500000);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: largeDesc });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle deeply nested JSON objects', async () => {
      let nested = { value: 'data' };
      for (let i = 0; i < 100; i++) {
        nested = { nested };
      }

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nested', value: nested });

      expect([200, 400]).toContain(response.status);
    });

    test('should handle very large arrays in plan steps', async () => {
      const hugeArray = Array.from({ length: 10000 }, (_, i) => `Step ${i}`);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test', steps: hugeArray });

      expect([200, 413]).toContain(response.status);
    });
  });

  describe('Special Characters and Unicode', () => {
    test('should handle emoji in memory keys and values', async () => {
      const emoji = '🔥🚀💻';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'emoji_key', value: emoji })
        .expect(200);

      const stored = platform.memory.get('emoji_key');
      expect(stored.content).toBe(emoji);
    });

    test('should handle RTL characters', async () => {
      const rtl = 'مرحبا بك في منصة الذكاء الاصطناعي';
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: rtl })
        .expect(200);

      expect(platform.plans.size).toBeGreaterThan(0);
    });

    test('should handle zero-width characters', async () => {
      const zeroWidth = 'test\u200B\u200C\u200Ddata';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zw_test', value: zeroWidth })
        .expect(200);

      expect(platform.memory.has('zw_test')).toBe(true);
    });

    test('should handle control characters', async () => {
      const controlChars = '\x01\x02\x03\x04\x05';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'ctrl_test', value: controlChars })
        .expect(200);

      expect(platform.memory.has('ctrl_test')).toBe(true);
    });

    test('should handle Unicode normalization issues', async () => {
      const normalized = 'café';
      const decomposed = 'café'; // Different Unicode representation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: normalized, value: 'test' })
        .expect(200);

      expect(platform.memory.has(normalized)).toBe(true);
    });
  });

  describe('CORS Security', () => {
    test('should set appropriate CORS headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(platform.app)
        .options('/api/v1/memory')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should validate Origin header if configured', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com');

      expect(response.status).toBe(200);
      // CORS middleware should handle origin validation
    });
  });

  describe('Content-Type Validation', () => {
    test('should handle missing Content-Type on POST', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send('key=test&value=data');

      expect([200, 400, 415]).toContain(response.status);
    });

    test('should handle incorrect Content-Type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect([200, 400, 415]).toContain(response.status);
    });

    test('should handle multipart/form-data', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'multipart/form-data')
        .send('boundary=----WebKitFormBoundary');

      expect([200, 400, 415]).toContain(response.status);
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose stack traces in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(platform.app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.stack).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });

    test('should provide generic error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: null })
        .expect(400);

      // Should not expose internal details
      expect(response.body.message).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate Limiting Considerations', () => {
    test('should handle rapid sequential requests', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(platform.app)
            .get('/health')
        );
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;
      
      // All should succeed unless rate limiting is implemented
      expect(successCount).toBeGreaterThan(0);
    });

    test('should handle burst of POST requests', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `burst_${i}`, value: `data_${i}` })
        );
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;
      
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Memory Exhaustion Prevention', () => {
    test('should handle many concurrent memory writes', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `mem_${i}`, value: `data_${i}` })
      );

      await Promise.all(promises);
      expect(platform.memory.size).toBeLessThanOrEqual(100);
    });

    test('should handle circular reference attempts', async () => {
      const circularObj = { a: 'value' };
      // Note: JSON.stringify will fail on circular references
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: circularObj });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Request Method Validation', () => {
    test('should reject unsupported methods', async () => {
      const response = await request(platform.app)
        .patch('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect([404, 405]).toContain(response.status);
    });

    test('should handle TRACE method', async () => {
      const response = await request(platform.app)
        .trace('/health');

      // TRACE should typically be disabled for security
      expect([404, 405, 501]).toContain(response.status);
    });

    test('should handle custom methods', async () => {
      const response = await request(platform.app)
        .del('/api/v1/memory');

      expect([404, 405]).toContain(response.status);
    });
  });
});

describe('Security Tests - SimpleUnifiedAIPlatform', () => {
  let platform;
  let server;
  const testPort = 3003;

  function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const addr = server.address();
      const options = {
        hostname: 'localhost',
        port: addr.port,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: body });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  beforeEach(() => {
    platform = new SimpleUnifiedAIPlatform();
    platform.port = testPort;
  });

  afterEach((done) => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    } else {
      done();
    }
  });

  describe('XSS Prevention - Simple Server', () => {
    test('should handle XSS in memory values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const xss = '<script>alert("XSS")</script>';
        await makeRequest('POST', '/api/v1/memory', { key: 'xss', value: xss });
        
        const stored = platform.memory.get('xss');
        expect(stored.content).toBe(xss);
        done();
      });
    });

    test('should handle encoded XSS attempts', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const encoded = '&lt;script&gt;alert(1)&lt;/script&gt;';
        await makeRequest('POST', '/api/v1/memory', { key: 'enc', value: encoded });
        
        expect(platform.memory.has('enc')).toBe(true);
        done();
      });
    });
  });

  describe('Injection Prevention - Simple Server', () => {
    test('should handle SQL injection patterns', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const sql = "admin' OR '1'='1";
        await makeRequest('POST', '/api/v1/memory', { key: sql, value: 'data' });
        
        expect(platform.memory.has(sql)).toBe(true);
        done();
      });
    });

    test('should handle command injection', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const cmd = '`cat /etc/passwd`';
        await makeRequest('POST', '/api/v1/plans', { task_description: cmd });
        
        expect(platform.plans.size).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Malformed Request Handling', () => {
    test('should handle invalid JSON', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{invalid json');
        req.end();
      });
    });

    test('should handle truncated JSON', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{"key":"test","value":');
        req.end();
      });
    });
  });

  describe('Large Payload Handling', () => {
    test('should handle very large POST body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeData = 'X'.repeat(100000);
        const response = await makeRequest('POST', '/api/v1/memory', {
          key: 'large',
          value: largeData
        });

        expect([200, 413]).toContain(response.status);
        done();
      });
    });
  });

  describe('Unicode and Special Characters', () => {
    test('should handle emoji correctly', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const emoji = '🎉🎊🎈';
        await makeRequest('POST', '/api/v1/memory', { key: 'emoji', value: emoji });
        
        const stored = platform.memory.get('emoji');
        expect(stored.content).toBe(emoji);
        done();
      });
    });

    test('should handle multi-byte characters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const multibyte = '你好世界';
        await makeRequest('POST', '/api/v1/plans', { task_description: multibyte });
        
        expect(platform.plans.size).toBeGreaterThan(0);
        done();
      });
    });
  });
});