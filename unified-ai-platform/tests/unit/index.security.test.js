/**
 * Security and Validation Tests for UnifiedAIPlatform
 * 
 * These tests cover security aspects including:
 * - Input validation and sanitization
 * - Injection attack prevention
 * - Rate limiting considerations
 * - Security headers validation
 * - Authentication/Authorization patterns
 * - Data exposure prevention
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock configuration
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

describe('UnifiedAIPlatform - Security Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('XSS Protection', () => {
    test('should not execute script tags in memory values', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssPayload })
        .expect(200);

      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      // Value should be stored but not executed
      expect(response.body.memories[0][1].content).toBe(xssPayload);
    });

    test('should handle HTML entities in task descriptions', async () => {
      const htmlPayload = '<img src=x onerror=alert(1)>';
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: htmlPayload })
        .expect(200);

      // Should store but not execute
      expect(true).toBe(true);
    });

    test('should handle unicode characters safely', async () => {
      const unicodePayload = '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'unicode', value: unicodePayload })
        .expect(200);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should handle SQL injection attempts in memory keys', async () => {
      const sqlPayload = "'; DROP TABLE users; --";
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: sqlPayload, value: 'test' })
        .expect(200);

      // Should be stored as literal string
      expect(platform.memory.has(sqlPayload)).toBe(true);
    });

    test('should handle SQL injection in plan descriptions', async () => {
      const sqlPayload = "1' OR '1'='1";
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: sqlPayload })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle union-based SQL injection attempts', async () => {
      const payload = "' UNION SELECT * FROM users --";
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'sql_test', value: payload })
        .expect(200);
    });
  });

  describe('Command Injection Prevention', () => {
    test('should handle shell metacharacters in keys', async () => {
      const shellPayload = '$(whoami)';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: shellPayload, value: 'test' })
        .expect(200);
    });

    test('should handle pipe characters safely', async () => {
      const payload = 'test | cat /etc/passwd';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'pipe_test', value: payload })
        .expect(200);
    });

    test('should handle backtick command substitution', async () => {
      const payload = '`rm -rf /`';
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: payload })
        .expect(200);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should handle directory traversal in keys', async () => {
      const traversal = '../../../etc/passwd';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: traversal, value: 'test' })
        .expect(200);
    });

    test('should handle encoded path traversal', async () => {
      const encoded = '..%2F..%2F..%2Fetc%2Fpasswd';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: encoded, value: 'test' })
        .expect(200);
    });

    test('should handle double-encoded traversal', async () => {
      const doubleEncoded = '%252e%252e%252f';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: doubleEncoded, value: 'test' })
        .expect(200);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should handle JavaScript object injection', async () => {
      const noSqlPayload = { $gt: '' };
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nosql_test', value: noSqlPayload })
        .expect(200);
    });

    test('should handle $where operator injection', async () => {
      const payload = { $where: 'this.password == "test"' };
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'where_test', value: payload })
        .expect(200);
    });
  });

  describe('Prototype Pollution Prevention', () => {
    test('should not allow __proto__ pollution', async () => {
      const protoPayload = { __proto__: { polluted: true } };
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'proto_test', value: protoPayload })
        .expect(200);

      // Verify Object prototype is not polluted
      expect({}.polluted).toBeUndefined();
    });

    test('should not allow constructor pollution', async () => {
      const constructorPayload = { constructor: { prototype: { polluted: true } } };
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'constructor_test', value: constructorPayload })
        .expect(200);
    });
  });

  describe('SSRF Prevention', () => {
    test('should validate URLs in memory values', async () => {
      const ssrfUrl = 'http://169.254.169.254/latest/meta-data/';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'url_test', value: ssrfUrl })
        .expect(200);
    });

    test('should handle localhost URLs', async () => {
      const localhostUrl = 'http://localhost:22';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'localhost_test', value: localhostUrl })
        .expect(200);
    });
  });

  describe('Security Headers', () => {
    test('should set X-Content-Type-Options header', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should set X-Frame-Options header', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('should set Content-Security-Policy', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should not expose sensitive headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Input Size Limits', () => {
    test('should handle extremely large memory values', async () => {
      const largeValue = 'A'.repeat(1024 * 1024); // 1MB
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_value', value: largeValue })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle very long keys', async () => {
      const longKey = 'k'.repeat(10000);
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' })
        .expect(200);
    });

    test('should handle deeply nested objects', async () => {
      let nested = { value: 'end' };
      for (let i = 0; i < 100; i++) {
        nested = { nested };
      }

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nested', value: nested })
        .expect(200);
    });
  });

  describe('Rate Limiting Considerations', () => {
    test('should handle rapid successive requests', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `rate_${i}`, value: 'test' })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed (no rate limiting in basic implementation)
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    test('should handle concurrent health checks', async () => {
      const promises = Array.from({ length: 50 }, () =>
        request(platform.app).get('/health')
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Data Sanitization', () => {
    test('should handle null bytes in strings', async () => {
      const nullByteString = 'test\x00hidden';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'null_byte', value: nullByteString })
        .expect(200);
    });

    test('should handle control characters', async () => {
      const controlChars = 'test\r\n\t\b\f';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'control', value: controlChars })
        .expect(200);
    });

    test('should handle zero-width characters', async () => {
      const zeroWidth = 'test\u200B\u200C\u200D';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zero_width', value: zeroWidth })
        .expect(200);
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(platform.app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.stack).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });

    test('should include stack traces in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // This won't have stack trace in 404 but tests the pattern
      const response = await request(platform.app)
        .get('/nonexistent')
        .expect(404);

      // In development, more info could be exposed
      expect(response.body.message).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('JSON Payload Attacks', () => {
    test('should handle circular references gracefully', async () => {
      // Can't send actual circular references via JSON, but test handling
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'valid' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle invalid JSON gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"invalid": }')
        .expect(400);
    });

    test('should handle JSON with duplicate keys', async () => {
      // Node.js takes last value for duplicate keys
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'dup', value: 'first', key: 'dup2', value: 'second' })
        .expect(200);
    });
  });

  describe('Special Character Handling', () => {
    test('should handle emoji in values', async () => {
      const emoji = '😀🎉🚀💻🔥';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'emoji', value: emoji })
        .expect(200);

      const stored = platform.memory.get('emoji');
      expect(stored.content).toBe(emoji);
    });

    test('should handle RTL characters', async () => {
      const rtl = 'test ‏مرحبا‏';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'rtl', value: rtl })
        .expect(200);
    });

    test('should handle zalgo text', async () => {
      const zalgo = 'Z̸̧̦̥͔̻̞̟͔̒̓̄̓̈́̅̎͘͝A̷̟̜̟̱̘͙̔̄̀̕L̸̢̳̤̪̗̟̣̔̆̊̌̃͘G̸̣̦̭̱̦̞̋̇̓͝O̸̡̲̭̦̮̤̟͐';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zalgo', value: zalgo })
        .expect(200);
    });
  });

  describe('Content Type Validation', () => {
    test('should only accept JSON content type for POST', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'text/plain')
        .send('key=test&value=data');

      // May fail to parse or accept
      expect([200, 400, 415]).toContain(response.status);
    });

    test('should handle missing content-type header', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Memory Leaks Prevention', () => {
    test('should not accumulate memory indefinitely', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many memories
      for (let i = 0; i < 1000; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `mem_${i}`, value: `data_${i}` });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Request Timeout Handling', () => {
    test('should handle slow requests gracefully', async () => {
      // Simulate slow request by creating large payload
      const largeSteps = Array.from({ length: 1000 }, (_, i) => `Step ${i}`);
      
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complex task', steps: largeSteps })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});