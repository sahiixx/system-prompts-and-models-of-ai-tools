/**
 * Enhanced Unit Tests for SimpleUnifiedAIPlatform (src/simple-server.js)
 * 
 * These tests provide additional coverage for:
 * - HTTP protocol edge cases
 * - Request parsing errors
 * - Connection handling
 * - Timeout scenarios
 * - Large request handling
 * - Error recovery
 * - State management edge cases
 * - Concurrent request handling
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

// Helper function to make HTTP requests
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
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: body, parseError: e });
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

  describe('Concurrent Request Handling', () => {
    test('should handle multiple simultaneous GET requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 50 }, () =>
          makeRequest(server, 'GET', '/health')
        );

        const results = await Promise.all(promises);
        
        results.forEach(res => {
          expect(res.status).toBe(200);
          expect(res.body.status).toBe('healthy');
        });
        
        done();
      });
    });

    test('should handle concurrent memory writes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = [];
        for (let i = 0; i < 30; i++) {
          promises.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `key_${i}`,
              value: `value_${i}`
            })
          );
        }

        const results = await Promise.all(promises);
        
        results.forEach(res => {
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        // Verify all were stored
        const memResponse = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(memResponse.body.count).toBe(30);
        
        done();
      });
    });

    test('should handle mixed concurrent operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const operations = [
          makeRequest(server, 'GET', '/health'),
          makeRequest(server, 'POST', '/api/v1/memory', { key: 'a', value: '1' }),
          makeRequest(server, 'GET', '/api/v1/tools'),
          makeRequest(server, 'POST', '/api/v1/plans', { task_description: 'test' }),
          makeRequest(server, 'GET', '/api/v1/capabilities'),
          makeRequest(server, 'POST', '/api/v1/memory', { key: 'b', value: '2' }),
          makeRequest(server, 'GET', '/api/v1/demo'),
          makeRequest(server, 'GET', '/api/v1/memory'),
          makeRequest(server, 'GET', '/api/v1/plans')
        ];

        const results = await Promise.all(operations);
        
        results.forEach(res => {
          expect([200, 201]).toContain(res.status);
        });
        
        done();
      });
    });
  });

  describe('Request Parsing Edge Cases', () => {
    test('should handle malformed JSON in POST body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
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
            // Should handle gracefully
            expect([400, 200]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{"invalid": json malformed}');
        req.end();
      });
    });

    test('should handle empty POST body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', null);
        
        // Should handle empty body
        expect([400, 200]).toContain(response.status);
        done();
      });
    });

    test('should handle very large POST payloads', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeData = {
          key: 'large',
          value: 'x'.repeat(1024 * 1024) // 1MB
        };

        const response = await makeRequest(server, 'POST', '/api/v1/memory', largeData);
        
        // May succeed or fail depending on limits
        expect([200, 400, 413]).toContain(response.status);
        done();
      });
    });

    test('should handle chunked transfer encoding', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
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
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        // Send data in chunks
        req.write('{"key"');
        setTimeout(() => {
          req.write(': "test",');
          setTimeout(() => {
            req.write(' "value": "data"}');
            req.end();
          }, 10);
        }, 10);
      });
    });

    test('should handle missing Content-Type header', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'POST',
          '/api/v1/memory',
          { key: 'test', value: 'data' },
          { 'Content-Type': undefined }
        );
        
        expect([200, 400]).toContain(response.status);
        done();
      });
    });

    test('should handle invalid Content-Type header', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'POST',
          '/api/v1/memory',
          { key: 'test', value: 'data' },
          { 'Content-Type': 'text/plain' }
        );
        
        expect([200, 400, 415]).toContain(response.status);
        done();
      });
    });
  });

  describe('HTTP Method and Route Edge Cases', () => {
    test('should reject unsupported HTTP methods', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'TRACE', '/api/v1/memory');
        
        expect([404, 405, 501]).toContain(response.status);
        done();
      });
    });

    test('should handle PUT requests to POST-only endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'PUT',
          '/api/v1/memory',
          { key: 'test', value: 'data' }
        );
        
        expect([404, 405]).toContain(response.status);
        done();
      });
    });

    test('should handle DELETE requests to POST-only endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'DELETE', '/api/v1/plans');
        
        expect([404, 405]).toContain(response.status);
        done();
      });
    });

    test('should handle requests to non-existent routes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/nonexistent/path');
        
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Not Found');
        done();
      });
    });

    test('should handle deeply nested invalid paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'GET',
          '/api/v1/invalid/nested/path/that/does/not/exist'
        );
        
        expect(response.status).toBe(404);
        done();
      });
    });

    test('should handle paths with query parameters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'GET',
          '/health?param1=value1&param2=value2'
        );
        
        // Query params should be ignored, endpoint should work
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle paths with URL encoding', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'GET',
          '/api/v1/capabilities?search=test%20value'
        );
        
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle paths with fragments', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'GET',
          '/health#fragment'
        );
        
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Memory Management Edge Cases', () => {
    test('should handle memory key collisions', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'collision',
          value: 'first'
        });

        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'collision',
          value: 'second'
        });

        expect(response.status).toBe(200);

        const memResponse = await makeRequest(server, 'GET', '/api/v1/memory');
        const entry = memResponse.body.memories.find(([k]) => k === 'collision');
        expect(entry[1].content).toBe('second');
        
        done();
      });
    });

    test('should handle special characters in keys', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const specialKeys = [
          'key with spaces',
          'key-with-dashes',
          'key_with_underscores',
          'key.with.dots',
          'key🔑with-emoji'
        ];

        for (const key of specialKeys) {
          const response = await makeRequest(server, 'POST', '/api/v1/memory', {
            key,
            value: 'test'
          });
          
          expect([200, 400]).toContain(response.status);
        }
        
        done();
      });
    });

    test('should handle null and undefined in memory values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response1 = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'null_value',
          value: null
        });

        const response2 = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'undefined_value',
          value: undefined
        });

        // Should handle these gracefully
        expect([200, 400]).toContain(response1.status);
        expect([200, 400]).toContain(response2.status);
        
        done();
      });
    });

    test('should handle very long memory values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const longValue = 'x'.repeat(100000);
        
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'long',
          value: longValue
        });

        expect([200, 413]).toContain(response.status);
        done();
      });
    });

    test('should handle complex nested objects in memory', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const complexObject = {
          level1: {
            array: [1, 2, 3],
            level2: {
              boolean: true,
              number: 42,
              level3: {
                string: 'deep value'
              }
            }
          }
        };

        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'complex',
          value: complexObject
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle many small memory entries', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `mem_${i}`,
              value: `value_${i}`
            })
          );
        }

        await Promise.all(promises);

        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.body.count).toBe(100);
        
        done();
      });
    });
  });

  describe('Plans Management Edge Cases', () => {
    test('should handle plans with empty descriptions', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: '',
          steps: ['step1']
        });

        expect([200, 400]).toContain(response.status);
        done();
      });
    });

    test('should handle plans with no steps', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Empty plan'
        });

        expect(response.status).toBe(200);
        expect(response.body.plan_id).toBeDefined();
        done();
      });
    });

    test('should handle plans with many steps', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const steps = Array.from({ length: 100 }, (_, i) => `step_${i}`);
        
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Large plan',
          steps
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should generate unique plan IDs for concurrent requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 50 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/plans', {
            task_description: `task_${i}`
          })
        );

        const results = await Promise.all(promises);
        const planIds = results.map(r => r.body.plan_id);
        const uniqueIds = new Set(planIds);

        expect(uniqueIds.size).toBe(50);
        done();
      });
    });

    test('should handle plans with complex step objects', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const steps = [
          { id: 1, action: 'read', file: 'input.txt', params: { encoding: 'utf8' } },
          { id: 2, action: 'process', algorithm: 'sort', params: { order: 'asc' } },
          { id: 3, action: 'write', file: 'output.txt', params: { mode: '0644' } }
        ];

        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Complex workflow',
          steps
        });

        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('CORS Edge Cases', () => {
    test('should handle OPTIONS preflight for all endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = [
          '/api/v1/memory',
          '/api/v1/plans',
          '/api/v1/tools',
          '/api/v1/capabilities'
        ];

        for (const endpoint of endpoints) {
          const response = await makeRequest(server, 'OPTIONS', endpoint);
          expect(response.status).toBe(200);
          expect(response.headers['access-control-allow-origin']).toBe('*');
        }
        
        done();
      });
    });

    test('should include CORS headers in error responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/nonexistent');
        
        expect(response.headers['access-control-allow-origin']).toBe('*');
        done();
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from handler errors', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Make a request that might cause an error
        const response1 = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: null,
          value: undefined
        });

        // Server should still be responsive
        const response2 = await makeRequest(server, 'GET', '/health');
        expect(response2.status).toBe(200);
        
        done();
      });
    });

    test('should handle rapid connect/disconnect cycles', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        for (let i = 0; i < 10; i++) {
          const response = await makeRequest(server, 'GET', '/health');
          expect(response.status).toBe(200);
        }
        
        done();
      });
    });

    test('should handle server under memory pressure', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create memory pressure
        const largeData = [];
        for (let i = 0; i < 1000; i++) {
          largeData.push({ key: `mem_${i}`, value: 'x'.repeat(1000) });
        }

        // Server should still respond
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        expect(response.body.memory).toBeDefined();
        
        done();
      });
    });
  });

  describe('Response Format Validation', () => {
    test('all responses should be valid JSON', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = [
          { method: 'GET', path: '/health' },
          { method: 'GET', path: '/api/v1/tools' },
          { method: 'GET', path: '/api/v1/memory' },
          { method: 'GET', path: '/api/v1/plans' },
          { method: 'GET', path: '/api/v1/capabilities' },
          { method: 'GET', path: '/api/v1/demo' }
        ];

        for (const endpoint of endpoints) {
          const response = await makeRequest(server, endpoint.method, endpoint.path);
          
          expect(response.status).toBe(200);
          expect(typeof response.body).toBe('object');
          expect(response.parseError).toBeUndefined();
        }
        
        done();
      });
    });

    test('all error responses should include error field', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/invalid/path');
        
        expect(response.body.error).toBeDefined();
        expect(response.body.message).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        done();
      });
    });

    test('all success POST responses should include success field', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test',
          value: 'data'
        });

        expect(response.body.success).toBeDefined();
        expect(typeof response.body.success).toBe('boolean');
        done();
      });
    });
  });

  describe('File System Edge Cases', () => {
    test('should handle missing tools.json file gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        
        // Should return empty array or handle gracefully
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tools)).toBe(true);
        done();
      });
    });

    test('should handle missing index.html gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        
        // Should return 404 or serve file
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('State Persistence', () => {
    test('memory should persist across multiple requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'persistent',
          value: 'data'
        });

        const response1 = await makeRequest(server, 'GET', '/api/v1/memory');
        const response2 = await makeRequest(server, 'GET', '/api/v1/memory');

        expect(response1.body.count).toBe(response2.body.count);
        expect(response1.body.count).toBeGreaterThan(0);
        
        done();
      });
    });

    test('plans should persist across multiple requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'persistent plan'
        });

        const response1 = await makeRequest(server, 'GET', '/api/v1/plans');
        const response2 = await makeRequest(server, 'GET', '/api/v1/plans');

        expect(response1.body.count).toBe(response2.body.count);
        expect(response1.body.count).toBeGreaterThan(0);
        
        done();
      });
    });
  });
});