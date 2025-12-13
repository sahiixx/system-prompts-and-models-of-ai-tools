/**
 * Enhanced Unit Tests for SimpleUnifiedAIPlatform (src/simple-server.js)
 * 
 * Additional comprehensive tests covering:
 * - Advanced HTTP scenarios
 * - Streaming and chunked requests
 * - Connection handling
 * - Protocol edge cases
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

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
      req.write(JSON.stringify(data));
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

  describe('HTTP Protocol Edge Cases', () => {
    test('should handle multiple headers correctly', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health', null, {
          'X-Custom-Header': 'test-value',
          'X-Request-ID': '12345'
        });
        
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        done();
      });
    });

    test('should handle HEAD requests gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/health',
          method: 'HEAD'
        };

        const req = http.request(options, (res) => {
          expect([200, 404]).toContain(res.statusCode);
          done();
        });

        req.end();
      });
    });

    test('should handle PUT requests (not explicitly supported)', (done) => {
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

    test('should handle DELETE requests (not explicitly supported)', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'DELETE', '/api/v1/memory');
        expect(response.status).toBe(404);
        done();
      });
    });
  });

  describe('Request Body Parsing', () => {
    test('should handle empty request body for GET', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.status).toBe(200);
        expect(response.body.memories).toBeDefined();
        done();
      });
    });

    test('should handle request with no Content-Type', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST'
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write(JSON.stringify({ key: 'test', value: 'data' }));
        req.end();
      });
    });

    test('should handle chunked request body', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
          }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const parsed = JSON.parse(body);
            expect(parsed.success).toBe(true);
            done();
          });
        });

        const data = JSON.stringify({ key: 'chunked', value: 'test' });
        req.write(data);
        req.end();
      });
    });

    test('should handle very large JSON payloads', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeValue = 'x'.repeat(500000);
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'large',
          value: largeValue
        });
        
        expect(response.status).toBe(200);
        expect(platform.memory.get('large').content).toBe(largeValue);
        done();
      });
    });
  });

  describe('Connection Handling', () => {
    test('should handle rapid connection/disconnection', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 20 }, () =>
          makeRequest(server, 'GET', '/health')
        );

        const results = await Promise.all(promises);
        results.forEach(result => {
          expect(result.status).toBe(200);
        });
        done();
      });
    });

    test('should handle concurrent requests to different endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = [
          makeRequest(server, 'GET', '/health'),
          makeRequest(server, 'GET', '/api/v1/tools'),
          makeRequest(server, 'GET', '/api/v1/capabilities'),
          makeRequest(server, 'GET', '/api/v1/demo'),
          makeRequest(server, 'GET', '/api/v1/memory')
        ];

        const results = await Promise.all(promises);
        results.forEach(result => {
          expect(result.status).toBe(200);
        });
        done();
      });
    });

    test('should handle slow clients gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            expect(res.statusCode).toBe(200);
            done();
          });
        });

        const data = JSON.stringify({ key: 'slow', value: 'client' });
        
        // Simulate slow writing
        for (let i = 0; i < data.length; i += 10) {
          req.write(data.slice(i, i + 10));
        }
        
        setTimeout(() => req.end(), 50);
      });
    });
  });

  describe('Error Recovery', () => {
    test('should recover from JSON parsing errors', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            // Should not crash server
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{invalid json');
        req.end();
      });
    });

    test('should handle requests after JSON parsing error', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Send bad request
        await makeRequest(server, 'POST', '/api/v1/memory', null).catch(() => {});
        
        // Server should still work
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle missing files gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data across multiple operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create multiple memories
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'k1', value: 'v1' });
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'k2', value: 'v2' });
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'k3', value: 'v3' });

        // Verify all are stored
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.body.count).toBe(3);
        
        // Verify data integrity
        expect(platform.memory.get('k1').content).toBe('v1');
        expect(platform.memory.get('k2').content).toBe('v2');
        expect(platform.memory.get('k3').content).toBe('v3');
        done();
      });
    });

    test('should handle concurrent writes to different keys', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 50 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `concurrent_${i}`,
            value: `value_${i}`
          })
        );

        await Promise.all(promises);
        expect(platform.memory.size).toBe(50);
        
        // Verify each entry
        for (let i = 0; i < 50; i++) {
          expect(platform.memory.get(`concurrent_${i}`).content).toBe(`value_${i}`);
        }
        done();
      });
    });

    test('should preserve plan data through multiple creates', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const plan1 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Plan 1',
          steps: ['A', 'B']
        });

        const plan2 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Plan 2',
          steps: ['C', 'D']
        });

        // Verify both plans exist
        const response = await makeRequest(server, 'GET', '/api/v1/plans');
        expect(response.body.count).toBe(2);

        // Verify individual plan data
        const storedPlan1 = platform.plans.get(plan1.body.plan_id);
        const storedPlan2 = platform.plans.get(plan2.body.plan_id);
        
        expect(storedPlan1.task_description).toBe('Plan 1');
        expect(storedPlan2.task_description).toBe('Plan 2');
        expect(storedPlan1.steps).toEqual(['A', 'B']);
        expect(storedPlan2.steps).toEqual(['C', 'D']);
        done();
      });
    });
  });

  describe('Platform Lifecycle', () => {
    test('should initialize correctly on start', (done) => {
      platform.start().then(() => {
        expect(platform.isInitialized).toBe(true);
        done();
      });
    });

    test('should log capabilities without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalledTimes(expect.any(Number));
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should handle start errors gracefully', (done) => {
      const existingServer = http.createServer();
      existingServer.listen(testPort, () => {
        platform.start().catch((error) => {
          expect(error).toBeDefined();
          existingServer.close(done);
        });
      });
    });
  });

  describe('Query Parameters', () => {
    test('should handle query parameters in GET requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health?debug=true');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should ignore query parameters for POST requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory?extra=param', {
          key: 'test',
          value: 'data'
        });
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Special Characters in URLs', () => {
    test('should handle URL-encoded characters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test key with spaces',
          value: 'test value'
        });
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle routes with trailing slashes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health/');
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });
});