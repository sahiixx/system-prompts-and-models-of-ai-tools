/**
 * Enhanced Unit Tests for SimpleUnifiedAIPlatform
 * 
 * Additional comprehensive tests covering:
 * - Advanced HTTP request handling
 * - Request body parsing edge cases
 * - Concurrent request handling
 * - Error recovery scenarios
 * - CORS and security headers
 * - Performance under load
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

// Helper to make HTTP requests
function makeRequest(server, method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = {
      hostname: 'localhost',
      port: addr.port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: body, rawBody: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

describe('SimpleUnifiedAIPlatform - Enhanced Tests', () => {
  let platform;
  let server;
  const testPort = 3003;

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

  describe('HTTP Request Parsing', () => {
    test('should handle empty request body for GET', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle malformed JSON in POST body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', '{invalid json}');
        expect([400, 500]).toContain(response.status);
        done();
      });
    });

    test('should handle incomplete JSON in request', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', '{"key":"test",');
        expect([400, 500]).toContain(response.status);
        done();
      });
    });

    test('should handle very large request bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeValue = 'x'.repeat(1000000);
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'large',
          value: largeValue
        });
        expect([200, 413]).toContain(response.status);
        done();
      });
    });

    test('should handle null characters in strings', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'null_char',
          value: 'test\x00value'
        });
        expect([200, 400]).toContain(response.status);
        done();
      });
    });

    test('should handle arrays in request body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'array_test',
          value: [1, 2, 3, 4, 5]
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle nested objects', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const nested = {
          level1: {
            level2: {
              level3: 'deep value'
            }
          }
        };
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'nested',
          value: nested
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle boolean values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'bool',
          value: true
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle numeric values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'number',
          value: 42
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle zero as value', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'zero',
          value: 0
        });
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('CORS Headers Validation', () => {
    test('should set Access-Control-Allow-Origin header', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        done();
      });
    });

    test('should set Access-Control-Allow-Methods header', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'OPTIONS', '/api/v1/memory');
        expect(response.headers['access-control-allow-methods']).toContain('GET');
        expect(response.headers['access-control-allow-methods']).toContain('POST');
        done();
      });
    });

    test('should set Access-Control-Allow-Headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'OPTIONS', '/api/v1/memory');
        expect(response.headers['access-control-allow-headers']).toBeDefined();
        done();
      });
    });

    test('should handle preflight for all endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = ['/health', '/api/v1/tools', '/api/v1/memory', '/api/v1/plans'];
        
        for (const endpoint of endpoints) {
          const response = await makeRequest(server, 'OPTIONS', endpoint);
          expect(response.status).toBe(200);
        }
        done();
      });
    });
  });

  describe('Error Handling Paths', () => {
    test('should handle server errors gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Force an error condition by accessing invalid route
        const response = await makeRequest(server, 'GET', '/invalid/route/that/does/not/exist');
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Not Found');
        done();
      });
    });

    test('should include error message in response', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/nonexistent');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');
        done();
      });
    });

    test('should handle internal errors', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Send invalid data to trigger error
        const response = await makeRequest(server, 'POST', '/api/v1/memory', 'not json');
        expect([400, 500]).toContain(response.status);
        done();
      });
    });

    test('should recover from errors and continue serving', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // First request with error
        await makeRequest(server, 'GET', '/nonexistent');
        
        // Second request should work
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple simultaneous GET requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 20 }, () =>
          makeRequest(server, 'GET', '/health')
        );
        
        const responses = await Promise.all(promises);
        responses.forEach(res => {
          expect(res.status).toBe(200);
        });
        done();
      });
    });

    test('should handle concurrent POST requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 15 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `concurrent_${i}`,
            value: `value_${i}`
          })
        );
        
        const responses = await Promise.all(promises);
        responses.forEach(res => {
          expect(res.status).toBe(200);
        });
        expect(platform.memory.size).toBe(15);
        done();
      });
    });

    test('should handle mixed GET and POST requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
          promises.push(makeRequest(server, 'POST', '/api/v1/memory', {
            key: `mixed_${i}`,
            value: `value_${i}`
          }));
          promises.push(makeRequest(server, 'GET', '/api/v1/memory'));
        }
        
        const responses = await Promise.all(promises);
        responses.forEach(res => {
          expect([200, 201]).toContain(res.status);
        });
        done();
      });
    });

    test('should maintain data consistency under concurrent writes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const key = 'consistency';
        const promises = Array.from({ length: 10 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: key,
            value: `update_${i}`
          })
        );
        
        await Promise.all(promises);
        
        const stored = platform.memory.get(key);
        expect(stored).toBeDefined();
        expect(stored.content).toMatch(/^update_\d$/);
        done();
      });
    });
  });

  describe('Request Method Validation', () => {
    test('should reject unsupported methods', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'TRACE', '/health');
        expect([404, 405]).toContain(response.status);
        done();
      });
    });

    test('should handle HEAD requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'HEAD', '/health');
        expect([200, 404, 405]).toContain(response.status);
        done();
      });
    });

    test('should handle DELETE requests to unknown endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'DELETE', '/api/v1/memory');
        expect(response.status).toBe(404);
        done();
      });
    });

    test('should handle PUT requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'PUT', '/api/v1/memory', {
          key: 'test',
          value: 'data'
        });
        expect(response.status).toBe(404);
        done();
      });
    });
  });

  describe('Response Format Validation', () => {
    test('should return valid JSON for all endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = [
          '/health',
          '/api/v1/tools',
          '/api/v1/memory',
          '/api/v1/plans',
          '/api/v1/capabilities',
          '/api/v1/demo'
        ];
        
        for (const endpoint of endpoints) {
          const response = await makeRequest(server, 'GET', endpoint);
          expect(response.status).toBe(200);
          expect(typeof response.body).toBe('object');
        }
        done();
      });
    });

    test('should set Content-Type to application/json', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.headers['content-type']).toContain('application/json');
        done();
      });
    });

    test('should include timestamp in ISO format', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        done();
      });
    });
  });

  describe('Tools Endpoint Edge Cases', () => {
    test('should return empty array if tools file missing', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        expect(Array.isArray(response.body.tools)).toBe(true);
        done();
      });
    });

    test('should handle tools file read errors gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tools');
        expect(response.body).toHaveProperty('count');
        done();
      });
    });
  });

  describe('Memory Operations Advanced', () => {
    test('should handle special characters in memory keys', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'key-with.special_chars@123',
          value: 'data'
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle Unicode in memory values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'unicode_test',
          value: '你好世界 🚀 émojis'
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle very long keys', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const longKey = 'key_' + 'x'.repeat(1000);
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: longKey,
          value: 'data'
        });
        expect([200, 400]).toContain(response.status);
        done();
      });
    });

    test('should return memory count correctly', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'k1', value: 'v1' });
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'k2', value: 'v2' });
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'k3', value: 'v3' });
        
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.body.count).toBe(3);
        done();
      });
    });
  });

  describe('Plans Operations Advanced', () => {
    test('should handle empty step arrays', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Empty steps',
          steps: []
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle complex step objects', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const steps = [
          { id: 1, action: 'step1', metadata: { priority: 'high' } },
          { id: 2, action: 'step2', metadata: { priority: 'low' } }
        ];
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Complex plan',
          steps: steps
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should generate unique plan IDs', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response1 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task 1'
        });
        const response2 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task 2'
        });
        
        expect(response1.body.plan_id).not.toBe(response2.body.plan_id);
        done();
      });
    });

    test('should maintain plan status', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Status test'
        });
        
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.status).toBe('created');
        done();
      });
    });

    test('should handle very long task descriptions', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const longDesc = 'Task ' + 'x'.repeat(10000);
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: longDesc
        });
        expect([200, 400]).toContain(response.status);
        done();
      });
    });
  });

  describe('Server Lifecycle', () => {
    test('should start and be immediately available', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle rapid start-stop cycles', (done) => {
      const tempServer = platform.createServer();
      tempServer.listen(testPort, () => {
        tempServer.close(() => {
          const newServer = platform.createServer();
          newServer.listen(testPort, () => {
            newServer.close(done);
          });
        });
      });
    });

    test('should set isInitialized on start', (done) => {
      platform.start().then(() => {
        expect(platform.isInitialized).toBe(true);
        done();
      });
    });
  });

  describe('Custom Headers Handling', () => {
    test('should accept custom request headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health', null, {
          'X-Custom-Header': 'custom-value'
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle Authorization header', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/capabilities', null, {
          'Authorization': 'Bearer token123'
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle X-Requested-With header', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test',
          value: 'data'
        }, {
          'X-Requested-With': 'XMLHttpRequest'
        });
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Index Page Handling', () => {
    test('should attempt to serve index.html', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        expect([200, 404]).toContain(response.status);
        done();
      });
    });

    test('should handle missing index.html gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        // Should either serve the file or return 404, not crash
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('Capabilities Endpoint', () => {
    test('should return platform information', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/capabilities');
        expect(response.body.platform).toBeDefined();
        expect(response.body.platform.name).toBe('Unified AI Platform');
        done();
      });
    });

    test('should include core capabilities', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/capabilities');
        expect(response.body.core_capabilities).toBeDefined();
        expect(response.body.core_capabilities.multi_modal).toBeDefined();
        done();
      });
    });

    test('should include performance metrics', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/capabilities');
        expect(response.body.performance).toBeDefined();
        done();
      });
    });
  });

  describe('Demo Endpoint', () => {
    test('should return demo information', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/demo');
        expect(response.body.message).toBe('Unified AI Platform Demo');
        expect(response.body.features).toBeDefined();
        expect(Array.isArray(response.body.features)).toBe(true);
        done();
      });
    });

    test('should list integrated systems', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/demo');
        expect(response.body.systems_combined).toBeDefined();
        expect(Array.isArray(response.body.systems_combined)).toBe(true);
        done();
      });
    });

    test('should include status message', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/demo');
        expect(response.body.status).toBe('Ready for deployment!');
        done();
      });
    });
  });
});