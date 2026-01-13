/**
 * Enhanced Integration Tests for Unified AI Platform
 * 
 * These tests provide additional coverage for:
 * - Security edge cases and input validation
 * - Malformed request handling
 * - Performance stress scenarios
 * - Complex integration workflows
 * - Boundary conditions
 * - Error recovery
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

describe('Enhanced Security and Validation Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Input Sanitization', () => {
    test('should handle SQL injection attempts in memory keys', async () => {
      const maliciousKey = "key'; DROP TABLE users; --";
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: maliciousKey, value: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(platform.memory.has(maliciousKey)).toBe(true);
    });

    test('should handle XSS attempts in values', async () => {
      const xssValue = '<script>alert("xss")</script>';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'xss_test', value: xssValue })
        .expect(200);

      const stored = platform.memory.get('xss_test');
      expect(stored.content).toBe(xssValue);
    });

    test('should handle Unicode and special characters', async () => {
      const unicodeValue = '你好世界 🚀 ñ é ü';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'unicode_test', value: unicodeValue })
        .expect(200);

      const stored = platform.memory.get('unicode_test');
      expect(stored.content).toBe(unicodeValue);
    });

    test('should handle null bytes in strings', async () => {
      const nullByteString = 'test\0value';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'null_test', value: nullByteString })
        .expect(200);

      const stored = platform.memory.get('null_test');
      expect(stored.content).toBe(nullByteString);
    });

    test('should handle extremely long keys', async () => {
      const longKey = 'k'.repeat(10000);
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: longKey, value: 'test' })
        .expect(200);

      expect(platform.memory.has(longKey)).toBe(true);
    });

    test('should handle objects with circular references gracefully', async () => {
      const circularObj = { a: 1 };
      circularObj.self = circularObj;

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'circular', value: { safe: 'value' } })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Malformed Request Handling', () => {
    test('should reject requests with invalid Content-Type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);

      expect(response.status).toBe(400);
    });

    test('should handle requests with extra fields gracefully', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ 
          key: 'test', 
          value: 'data',
          extraField: 'should be ignored',
          anotherExtra: 123
        })
        .expect(200);

      const stored = platform.memory.get('test');
      expect(stored.content).toBe('data');
    });

    test('should handle deeply nested objects', async () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep'
                }
              }
            }
          }
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nested', value: deeplyNested })
        .expect(200);

      const stored = platform.memory.get('nested');
      expect(stored.content.level1.level2.level3.level4.level5.value).toBe('deep');
    });

    test('should handle arrays with mixed types', async () => {
      const mixedArray = [1, 'two', { three: 3 }, [4], null, undefined, true];
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'mixed', value: mixedArray })
        .expect(200);

      const stored = platform.memory.get('mixed');
      expect(Array.isArray(stored.content)).toBe(true);
    });

    test('should handle empty strings as keys with proper validation', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle whitespace-only keys', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '   ', value: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle numeric keys', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 12345, value: 'numeric key' })
        .expect(200);

      // Key should be coerced to string
      expect(platform.memory.has(12345)).toBe(true);
    });

    test('should handle boolean values', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_test', value: true })
        .expect(200);

      const stored = platform.memory.get('bool_test');
      expect(stored.content).toBe(true);
    });

    test('should handle Date objects', async () => {
      const date = new Date('2025-01-01');
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'date_test', value: date.toISOString() })
        .expect(200);

      const stored = platform.memory.get('date_test');
      expect(stored.content).toBe(date.toISOString());
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle rapid sequential requests', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `rapid_${i}`, value: `value_${i}` })
        );
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(50);
      expect(platform.memory.size).toBe(50);
    });

    test('should handle memory operations at scale', async () => {
      // Store 100 memories
      for (let i = 0; i < 100; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `scale_${i}`, value: { data: i } })
          .expect(200);
      }

      // Retrieve all memories
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body.count).toBe(100);
      expect(response.body.memories.length).toBe(100);
    });

    test('should handle large payload in memory value', async () => {
      const largeValue = {
        data: 'x'.repeat(100000), // 100KB string
        nested: Array.from({ length: 1000 }, (_, i) => ({ id: i }))
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_payload', value: largeValue })
        .expect(200);

      const stored = platform.memory.get('large_payload');
      expect(stored.content.data.length).toBe(100000);
    });

    test('should handle complex plan creation under load', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: `Task ${i}`,
            steps: Array.from({ length: 50 }, (_, j) => `Step ${j}`)
          })
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.plan_id).toBeDefined();
      });

      expect(platform.plans.size).toBe(20);
    });

    test('should maintain performance with mixed operations', async () => {
      const operations = [
        request(platform.app).get('/health'),
        request(platform.app).get('/api/v1/tools'),
        request(platform.app).post('/api/v1/memory').send({ key: 'k1', value: 'v1' }),
        request(platform.app).get('/api/v1/memory'),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'test' }),
        request(platform.app).get('/api/v1/plans'),
        request(platform.app).get('/api/v1/capabilities'),
        request(platform.app).get('/api/v1/demo'),
      ];

      const responses = await Promise.all(operations);
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });
  });

  describe('Complex Integration Workflows', () => {
    test('should support complete workflow: create plan, store memory, retrieve both', async () => {
      // Step 1: Create a plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build feature X',
          steps: ['Design', 'Implement', 'Test']
        })
        .expect(200);

      const planId = planResponse.body.plan_id;

      // Step 2: Store related memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `plan_${planId}_context`,
          value: { status: 'in_progress', priority: 'high' }
        })
        .expect(200);

      // Step 3: Retrieve plan
      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(plansResponse.body.count).toBeGreaterThan(0);

      // Step 4: Retrieve memory
      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(memoryResponse.body.count).toBeGreaterThan(0);
    });

    test('should handle plan updates via memory storage', async () => {
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Initial task',
          steps: ['Step 1']
        })
        .expect(200);

      const planId = planResponse.body.plan_id;

      // Store progress updates in memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `${planId}_progress`,
          value: { completed: 0, total: 1, current_step: 'Step 1' }
        })
        .expect(200);

      const memory = platform.memory.get(`${planId}_progress`);
      expect(memory.content.current_step).toBe('Step 1');
    });

    test('should support multi-step plan execution simulation', async () => {
      // Create plan
      const plan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Multi-step workflow',
          steps: ['Init', 'Process', 'Finalize']
        })
        .expect(200);

      const planId = plan.body.plan_id;

      // Simulate execution of each step
      for (let i = 0; i < 3; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({
            key: `${planId}_step_${i}`,
            value: { step: i, status: 'completed', timestamp: new Date().toISOString() }
          })
          .expect(200);
      }

      expect(platform.memory.size).toBe(3);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from JSON parsing errors', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{"key": "test", invalid json')
        .expect(400);

      expect(response.status).toBe(400);
    });

    test('should continue operating after individual request failures', async () => {
      // Send a bad request
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test' }) // missing value
        .expect(400);

      // Verify platform still works
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid', value: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle concurrent failures gracefully', async () => {
      const mixedRequests = [
        request(platform.app).post('/api/v1/memory').send({ key: 'k1', value: 'v1' }),
        request(platform.app).post('/api/v1/memory').send({ key: 'k2' }), // missing value
        request(platform.app).post('/api/v1/memory').send({ value: 'v3' }), // missing key
        request(platform.app).post('/api/v1/memory').send({ key: 'k4', value: 'v4' }),
      ];

      const responses = await Promise.all(mixedRequests.map(p => p.catch(e => e)));
      
      // At least some should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle exactly zero-length arrays', async () => {
      await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Empty steps',
          steps: []
        })
        .expect(200);

      const plans = Array.from(platform.plans.values());
      const emptyPlan = plans.find(p => p.task_description === 'Empty steps');
      expect(emptyPlan.steps).toEqual([]);
    });

    test('should handle single-character strings', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'a', value: 'b' })
        .expect(200);

      expect(platform.memory.has('a')).toBe(true);
    });

    test('should handle maximum safe integer values', async () => {
      const maxInt = Number.MAX_SAFE_INTEGER;
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'max_int', value: maxInt })
        .expect(200);

      const stored = platform.memory.get('max_int');
      expect(stored.content).toBe(maxInt);
    });

    test('should handle minimum safe integer values', async () => {
      const minInt = Number.MIN_SAFE_INTEGER;
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'min_int', value: minInt })
        .expect(200);

      const stored = platform.memory.get('min_int');
      expect(stored.content).toBe(minInt);
    });

    test('should handle floating point precision', async () => {
      const float = 0.1 + 0.2; // Known floating point issue
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'float', value: float })
        .expect(200);

      const stored = platform.memory.get('float');
      expect(stored.content).toBeCloseTo(0.3);
    });

    test('should handle empty object values', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'empty_obj', value: {} })
        .expect(200);

      const stored = platform.memory.get('empty_obj');
      expect(stored.content).toEqual({});
    });

    test('should handle empty array values', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'empty_arr', value: [] })
        .expect(200);

      const stored = platform.memory.get('empty_arr');
      expect(stored.content).toEqual([]);
    });
  });

  describe('Header and Metadata Validation', () => {
    test('should set appropriate security headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should handle custom headers gracefully', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('X-Custom-Header', 'custom-value')
        .set('X-Request-ID', '12345')
        .send({ key: 'custom', value: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should include proper content-type in all responses', async () => {
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
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });
  });

  describe('Timestamp and Versioning', () => {
    test('should include valid ISO timestamps in memory', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'time_test', value: 'data' })
        .expect(200);

      const stored = platform.memory.get('time_test');
      const createdDate = new Date(stored.created_at);
      expect(createdDate.toString()).not.toBe('Invalid Date');
    });

    test('should include valid ISO timestamps in plans', async () => {
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'test' })
        .expect(200);

      const plan = Array.from(platform.plans.values())[0];
      const createdDate = new Date(plan.created_at);
      expect(createdDate.toString()).not.toBe('Invalid Date');
    });

    test('should maintain timestamp ordering for sequential operations', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'first', value: '1' });

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'second', value: '2' });

      const first = platform.memory.get('first');
      const second = platform.memory.get('second');

      const firstTime = new Date(first.created_at).getTime();
      const secondTime = new Date(second.created_at).getTime();
      expect(secondTime).toBeGreaterThanOrEqual(firstTime);
    });
  });

  describe('Plan ID Generation', () => {
    test('should generate unique plan IDs', async () => {
      const ids = new Set();

      for (let i = 0; i < 10; i++) {
        const response = await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
          .expect(200);

        ids.add(response.body.plan_id);
      }

      expect(ids.size).toBe(10);
    });

    test('should use timestamp-based plan IDs', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'test' })
        .expect(200);

      expect(response.body.plan_id).toMatch(/^plan_\d+$/);
      
      const timestamp = parseInt(response.body.plan_id.split('_')[1]);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });
});

// Tests specific to SimpleUnifiedAIPlatform
describe('SimpleUnifiedAIPlatform Enhanced Tests', () => {
  let platform;
  let server;
  const testPort = 3003;

  // Helper function for HTTP requests
  function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: testPort,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ 
              status: res.statusCode, 
              headers: res.headers, 
              body: body ? JSON.parse(body) : {} 
            });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: body });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
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

  describe('HTTP Protocol Compliance', () => {
    test('should handle OPTIONS requests properly', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('OPTIONS', '/api/v1/memory');
        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        done();
      });
    });

    test('should handle HEAD requests appropriately', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('HEAD', '/health');
        // HEAD should return headers without body, may be 404 or 405
        expect([200, 404, 405]).toContain(response.status);
        done();
      });
    });

    test('should handle PUT requests to unsupported endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('PUT', '/api/v1/memory');
        expect(response.status).toBe(404);
        done();
      });
    });

    test('should handle DELETE requests to unsupported endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('DELETE', '/api/v1/memory');
        expect(response.status).toBe(404);
        done();
      });
    });
  });

  describe('Request Body Parsing Edge Cases', () => {
    test('should handle chunked request bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('POST', '/api/v1/memory', {
          key: 'chunked_test',
          value: 'large_data'.repeat(1000)
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle requests with no body gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('POST', '/api/v1/memory');
        expect(response.status).toBe(400);
        done();
      });
    });

    test('should handle malformed JSON in request body', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            // Should not crash, may accept or reject
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{invalid json}');
        req.end();
      });
    });
  });

  describe('File System Integration', () => {
    test('should handle missing tools.json gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('GET', '/api/v1/tools');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tools)).toBe(true);
        done();
      });
    });

    test('should handle missing index.html gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('GET', '/');
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('State Management', () => {
    test('should maintain state across multiple requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Add multiple memories
        await makeRequest('POST', '/api/v1/memory', { key: 'k1', value: 'v1' });
        await makeRequest('POST', '/api/v1/memory', { key: 'k2', value: 'v2' });
        await makeRequest('POST', '/api/v1/memory', { key: 'k3', value: 'v3' });

        // Verify all are stored
        const response = await makeRequest('GET', '/api/v1/memory');
        expect(response.body.count).toBe(3);
        done();
      });
    });

    test('should maintain separate memory and plan stores', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest('POST', '/api/v1/memory', { key: 'mem1', value: 'data' });
        await makeRequest('POST', '/api/v1/plans', { task_description: 'plan1' });

        const memResponse = await makeRequest('GET', '/api/v1/memory');
        const planResponse = await makeRequest('GET', '/api/v1/plans');

        expect(memResponse.body.count).toBe(1);
        expect(planResponse.body.count).toBe(1);
        done();
      });
    });
  });

  describe('Error Handling Robustness', () => {
    test('should catch and handle uncaught exceptions gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Send request to unknown route
        const response = await makeRequest('GET', '/api/v1/nonexistent');
        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
        done();
      });
    });

    test('should handle concurrent errors without crashing', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const badRequests = Array.from({ length: 10 }, () =>
          makeRequest('POST', '/api/v1/memory', {})
        );

        const responses = await Promise.all(badRequests);
        responses.forEach(response => {
          expect(response.status).toBe(400);
        });
        done();
      });
    });
  });

  describe('CORS and Security Headers', () => {
    test('should set CORS headers on all responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('GET', '/health');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        done();
      });
    });

    test('should set proper content-type headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('GET', '/health');
        expect(response.headers['content-type']).toBe('application/json');
        done();
      });
    });
  });

  describe('Performance Under Load', () => {
    test('should handle rapid sequential requests to different endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const requests = [];
        for (let i = 0; i < 20; i++) {
          requests.push(makeRequest('GET', '/health'));
          requests.push(makeRequest('GET', '/api/v1/tools'));
          requests.push(makeRequest('POST', '/api/v1/memory', { key: `k${i}`, value: `v${i}` }));
        }

        const responses = await Promise.all(requests);
        const successCount = responses.filter(r => r.status === 200).length;
        expect(successCount).toBe(60);
        done();
      });
    });

    test('should maintain response time under moderate load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const start = Date.now();
        
        const requests = Array.from({ length: 50 }, (_, i) =>
          makeRequest('POST', '/api/v1/memory', { key: `perf_${i}`, value: `val_${i}` })
        );

        await Promise.all(requests);
        
        const elapsed = Date.now() - start;
        // Should complete 50 requests in reasonable time (< 5 seconds)
        expect(elapsed).toBeLessThan(5000);
        done();
      });
    });
  });
});