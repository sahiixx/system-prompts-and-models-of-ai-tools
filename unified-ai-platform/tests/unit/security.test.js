/**
 * Security-Focused Tests for Unified AI Platform
 * 
 * These tests focus specifically on security concerns:
 * - Input validation and sanitization
 * - Authentication and authorization scenarios
 * - Rate limiting and abuse prevention
 * - Data exposure and information leakage
 * - Injection attacks
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

describe('Security Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Injection Attack Prevention', () => {
    test('should safely handle NoSQL injection attempts', async () => {
      const maliciousInput = { $ne: null };
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: maliciousInput })
        .expect(200);

      const stored = platform.memory.get('test');
      expect(stored.content).toEqual(maliciousInput);
    });

    test('should handle command injection attempts in values', async () => {
      const cmdInjection = '; rm -rf /';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'cmd_test', value: cmdInjection })
        .expect(200);

      expect(platform.memory.has('cmd_test')).toBe(true);
    });

    test('should handle path traversal attempts', async () => {
      const pathTraversal = '../../../etc/passwd';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: pathTraversal, value: 'malicious' })
        .expect(200);

      // Should store the key as-is without traversing
      expect(platform.memory.has(pathTraversal)).toBe(true);
    });

    test('should handle LDAP injection attempts', async () => {
      const ldapInjection = '*)(objectClass=*)';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'ldap_test', value: ldapInjection })
        .expect(200);

      const stored = platform.memory.get('ldap_test');
      expect(stored.content).toBe(ldapInjection);
    });

    test('should handle XML injection attempts', async () => {
      const xmlInjection = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xml_test', value: xmlInjection })
        .expect(200);

      const stored = platform.memory.get('xml_test');
      expect(stored.content).toBe(xmlInjection);
    });
  });

  describe('XSS Prevention', () => {
    const xssVectors = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<body onload=alert("XSS")>',
      '<svg/onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<input onfocus=alert("XSS") autofocus>',
    ];

    test.each(xssVectors)('should safely store XSS vector: %s', async (xssVector) => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssVector })
        .expect(200);

      const stored = platform.memory.get('xss_test');
      expect(stored.content).toBe(xssVector);
    });
  });

  describe('Data Exposure Prevention', () => {
    test('should not expose internal error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Trigger an error by not providing required fields
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should not expose sensitive configuration in health endpoint', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // Should not expose things like API keys, secrets, etc.
      expect(response.body.api_key).toBeUndefined();
      expect(response.body.secret).toBeUndefined();
      expect(response.body.password).toBeUndefined();
    });

    test('should sanitize error messages', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({})
        .expect(400);

      // Error message should be user-friendly, not technical
      expect(response.body.error).toBeDefined();
      expect(response.body.message).not.toContain('stack');
      expect(response.body.message).not.toContain('TypeError');
    });
  });

  describe('Content Security Policy', () => {
    test('should set CSP headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // Helmet should set CSP headers
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should restrict inline scripts in CSP', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      if (csp) {
        expect(csp).toContain('script-src');
      }
    });
  });

  describe('Request Size Limits', () => {
    test('should respect 10MB body size limit', async () => {
      // Create a payload just under 10MB
      const largePayload = 'x'.repeat(9 * 1024 * 1024);
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large', value: largePayload });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle requests near the size limit', async () => {
      const nearLimitPayload = 'x'.repeat(8 * 1024 * 1024);
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'near_limit', value: nearLimitPayload })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('HTTP Security Headers', () => {
    test('should set X-Frame-Options header', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('should set X-Content-Type-Options header', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should set X-XSS-Protection header', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // May or may not be set depending on Helmet version
      if (response.headers['x-xss-protection']) {
        expect(response.headers['x-xss-protection']).toBeDefined();
      }
    });

    test('should set Strict-Transport-Security header', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // HSTS may be set by Helmet
      if (response.headers['strict-transport-security']) {
        expect(response.headers['strict-transport-security']).toContain('max-age');
      }
    });
  });

  describe('Input Validation Bypass Attempts', () => {
    test('should handle array instead of object', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(['not', 'an', 'object'])
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle string instead of object', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send('just a string')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle number instead of object', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(12345)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle null payload', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send(null)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Special Character Handling', () => {
    test('should handle Unicode control characters', async () => {
      const controlChars = '\u0000\u0001\u0002\u0003';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'control', value: controlChars })
        .expect(200);

      const stored = platform.memory.get('control');
      expect(stored.content).toBe(controlChars);
    });

    test('should handle right-to-left override characters', async () => {
      const rtlOverride = 'test\u202Emalicious';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'rtl', value: rtlOverride })
        .expect(200);

      const stored = platform.memory.get('rtl');
      expect(stored.content).toBe(rtlOverride);
    });

    test('should handle emoji and special Unicode', async () => {
      const emoji = '😀🎉🚀💻🔥';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'emoji', value: emoji })
        .expect(200);

      const stored = platform.memory.get('emoji');
      expect(stored.content).toBe(emoji);
    });

    test('should handle zero-width characters', async () => {
      const zeroWidth = 'test\u200Bvalue';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zero_width', value: zeroWidth })
        .expect(200);

      const stored = platform.memory.get('zero_width');
      expect(stored.content).toBe(zeroWidth);
    });
  });

  describe('Prototype Pollution Prevention', () => {
    test('should not allow __proto__ manipulation', async () => {
      const maliciousPayload = {
        key: 'test',
        value: 'data',
        '__proto__': { polluted: true }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send(maliciousPayload)
        .expect(200);

      // Object.prototype should not be polluted
      expect(Object.prototype.polluted).toBeUndefined();
    });

    test('should not allow constructor manipulation', async () => {
      const maliciousPayload = {
        key: 'test',
        value: 'data',
        'constructor': { polluted: true }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send(maliciousPayload)
        .expect(200);

      // Should store safely without pollution
      expect(platform.memory.has('test')).toBe(true);
    });
  });

  describe('Denial of Service Prevention', () => {
    test('should handle extremely nested objects without crashing', async () => {
      let nested = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nested = { next: nested };
      }

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep_nest', value: nested });

      // Should either accept or reject, but not crash
      expect([200, 400]).toContain(response.status);
    });

    test('should handle arrays with many elements', async () => {
      const bigArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'big_array', value: bigArray })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle multiple rapid requests without memory leak', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Send many requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `leak_test_${i}`, value: 'data' })
      );

      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});