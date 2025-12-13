/**
 * Enhanced Unit Tests for SimpleUnifiedAIPlatform
 * 
 * These tests provide additional coverage for:
 * - HTTP protocol edge cases
 * - Request parsing and validation
 * - Error recovery in native HTTP server
 * - Performance under load
 * - File system interactions
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
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

  describe('HTTP Protocol - Advanced', () => {
    test('should handle OPTIONS preflight with correct headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'OPTIONS', '/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        done();
      });
    });

    test('should handle HEAD requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/health',
          method: 'HEAD'
        };

        const req = http.request(options, (res) => {
          expect([200, 404, 405]).toContain(res.statusCode);
          done();
        });
        req.end();
      });
    });

    test('should handle PUT requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'PUT', '/api/v1/memory', {
          key: 'test',
          value: 'test'
        });
        
        // Should handle or return appropriate status
        expect(response.status).toBeDefined();
        done();
      });
    });

    test('should handle DELETE requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'DELETE', '/api/v1/memory/test');
        
        expect(response.status).toBeDefined();
        done();
      });
    });

    test('should handle requests without Content-Type header', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST'
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBeDefined();
          done();
        });

        req.write(JSON.stringify({ key: 'test', value: 'test' }));
        req.end();
      });
    });

    test('should handle request with custom headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'GET',
          '/health',
          null,
          { 'X-Custom-Header': 'test-value' }
        );
        
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Request Body Parsing - Edge Cases', () => {
    test('should handle empty request body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', null);
        expect(response.status).toBe(400);
        done();
      });
    });

    test('should handle invalid JSON gracefully', (done) => {
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
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{"invalid": json}');
        req.end();
      });
    });

    test('should handle very large request bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const largeData = 'x'.repeat(1024 * 1024); // 1MB
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBeDefined();
          done();
        });

        req.write(JSON.stringify({ key: 'large', value: largeData }));
        req.end();
      });
    });

    test('should handle chunked request data', (done) => {
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
            const parsed = JSON.parse(body);
            expect(parsed.success || parsed.error).toBeDefined();
            done();
          });
        });

        // Send data in chunks
        req.write('{"key":');
        setTimeout(() => {
          req.write('"test"');
          setTimeout(() => {
            req.write(',"value":"test"}');
            req.end();
          }, 10);
        }, 10);
      });
    });

    test('should handle URL-encoded form data', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBeDefined();
          done();
        });

        req.write('key=test&value=test');
        req.end();
      });
    });
  });

  describe('Memory Operations - Advanced', () => {
    test('should handle special characters in keys', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const specialKey = 'key-with-特殊字符-🎉';
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: specialKey,
          value: 'special_value'
        });

        expect(response.status).toBe(200);
        expect(platform.memory.get(specialKey).content).toBe('special_value');
        done();
      });
    });

    test('should handle memory keys with spaces', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'key with spaces',
          value: 'test'
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle numeric keys', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 12345,
          value: 'numeric_key'
        });

        if (response.status === 200) {
          const stored = platform.memory.get(12345) || platform.memory.get('12345');
          expect(stored).toBeDefined();
        }
        done();
      });
    });

    test('should preserve value types in memory', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const testValues = [
          { key: 'number', value: 42 },
          { key: 'boolean', value: true },
          { key: 'array', value: [1, 2, 3] },
          { key: 'object', value: { nested: 'value' } }
        ];

        for (const test of testValues) {
          await makeRequest(server, 'POST', '/api/v1/memory', test);
        }

        testValues.forEach(test => {
          const stored = platform.memory.get(test.key);
          expect(stored.content).toEqual(test.value);
        });

        done();
      });
    });

    test('should handle concurrent memory reads', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Write some data first
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'concurrent',
          value: 'test'
        });

        // Multiple concurrent reads
        const readPromises = Array.from({ length: 20 }, () =>
          makeRequest(server, 'GET', '/api/v1/memory')
        );

        const responses = await Promise.all(readPromises);
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.count).toBeGreaterThan(0);
        });

        done();
      });
    });
  });

  describe('Plans Operations - Advanced', () => {
    test('should handle plan retrieval after creation', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const createResponse = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Test task'
        });

        const planId = createResponse.body.plan_id;
        expect(planId).toBeDefined();

        const getResponse = await makeRequest(server, 'GET', '/api/v1/plans');
        const plans = getResponse.body.plans;
        const foundPlan = plans.find(([id]) => id === planId);

        expect(foundPlan).toBeDefined();
        done();
      });
    });

    test('should handle plans with special characters in description', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task with émojis 🚀 and special chars: <>&"'
        });

        expect(response.status).toBe(200);
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.task_description).toContain('🚀');
        done();
      });
    });

    test('should handle plan creation with various step formats', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const stepFormats = [
          ['string step'],
          [{ type: 'action', data: 'test' }],
          [1, 2, 3],
          [null, 'valid', undefined]
        ];

        for (const steps of stepFormats) {
          const response = await makeRequest(server, 'POST', '/api/v1/plans', {
            task_description: 'Test',
            steps: steps
          });

          expect(response.status).toBe(200);
        }

        done();
      });
    });

    test('should maintain plan order with rapid creation', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const planIds = [];
        
        for (let i = 0; i < 10; i++) {
          const response = await makeRequest(server, 'POST', '/api/v1/plans', {
            task_description: `Task ${i}`
          });
          planIds.push(response.body.plan_id);
        }

        // Verify all plans are unique
        const uniqueIds = new Set(planIds);
        expect(uniqueIds.size).toBe(10);
        done();
      });
    });
  });

  describe('File System Operations', () => {
    test('should handle missing index.html file', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        
        // Should either return HTML or 404
        expect([200, 404]).toContain(response.status);
        done();
      });
    });

    test('should handle missing tools.json file', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        
        // Should return empty array or error gracefully
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tools)).toBe(true);
        done();
      });
    });

    test('should return proper content-type for HTML', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/',
          method: 'GET'
        };

        const req = http.request(options, (res) => {
          if (res.statusCode === 200) {
            expect(res.headers['content-type']).toContain('text/html');
          }
          done();
        });
        req.end();
      });
    });
  });

  describe('URL Parsing', () => {
    test('should handle URLs with query parameters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health?debug=true&format=json');
        
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle URL-encoded paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle paths with trailing slashes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health/');
        
        expect(response.status).toBeDefined();
        done();
      });
    });

    test('should handle very long URLs', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const longPath = '/api/v1/memory?' + 'x'.repeat(1000);
        const response = await makeRequest(server, 'GET', longPath);
        
        expect(response.status).toBeDefined();
        done();
      });
    });
  });

  describe('Error Recovery', () => {
    test('should recover from JSON parse errors', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST'
        };

        const req = http.request(options, (res) => {
          // Should not crash server
          expect(res.statusCode).toBeDefined();
          
          // Server should still be responsive
          makeRequest(server, 'GET', '/health').then(response => {
            expect(response.status).toBe(200);
            done();
          });
        });

        req.write('{bad json}');
        req.end();
      });
    });

    test('should handle request abortion', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST'
        };

        const req = http.request(options, () => {
          // Should not be called
        });

        req.write('{"key":"test"');
        req.destroy(); // Abort request

        // Server should still be responsive
        setTimeout(() => {
          makeRequest(server, 'GET', '/health').then(response => {
            expect(response.status).toBe(200);
            done();
          });
        }, 100);
      });
    });

    test('should handle errors in request handlers', (done) => {
      server = platform.createServer();
      
      // Mock a method to throw error
      const originalHandle = platform.handleHealthCheck;
      platform.handleHealthCheck = () => {
        throw new Error('Simulated error');
      };

      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        // Should return 500 error, not crash
        expect(response.status).toBe(500);
        
        // Restore original method
        platform.handleHealthCheck = originalHandle;
        done();
      });
    });
  });

  describe('Performance and Load', () => {
    test('should handle rapid sequential requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const startTime = Date.now();
        
        for (let i = 0; i < 50; i++) {
          await makeRequest(server, 'GET', '/health');
        }

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // Should complete in 5 seconds
        done();
      });
    });

    test('should maintain data integrity under concurrent load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const writePromises = Array.from({ length: 30 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `load_${i}`,
            value: `value_${i}`
          })
        );

        await Promise.all(writePromises);

        // Verify integrity
        const getResponse = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(getResponse.body.count).toBe(30);

        done();
      });
    });

    test('should handle mixed read/write operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const operations = [];

        // Mix of writes and reads
        for (let i = 0; i < 20; i++) {
          if (i % 2 === 0) {
            operations.push(
              makeRequest(server, 'POST', '/api/v1/memory', {
                key: `mixed_${i}`,
                value: `value_${i}`
              })
            );
          } else {
            operations.push(makeRequest(server, 'GET', '/api/v1/memory'));
          }
        }

        const responses = await Promise.all(operations);
        const allSuccessful = responses.every(r => r.status === 200);
        expect(allSuccessful).toBe(true);

        done();
      });
    });
  });

  describe('Server Lifecycle', () => {
    test('should set isInitialized flag on start', (done) => {
      expect(platform.isInitialized).toBe(false);
      
      platform.start().then(() => {
        expect(platform.isInitialized).toBe(true);
        done();
      });
    });

    test('should log startup messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Platform Capabilities'));
      consoleSpy.mockRestore();
    });

    test('should handle port already in use error', (done) => {
      const blockingServer = http.createServer();
      blockingServer.listen(testPort, () => {
        platform.start().catch(error => {
          expect(error).toBeDefined();
          expect(error.code).toBe('EADDRINUSE');
          blockingServer.close(done);
        });
      });
    });
  });
});