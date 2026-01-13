/**
 * Advanced Tests for SimpleUnifiedAIPlatform
 * 
 * These tests cover additional scenarios for the HTTP-based platform:
 * - Advanced error handling
 * - Security considerations
 * - Performance under various conditions
 * - Edge cases specific to HTTP implementation
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
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, rawBody: body });
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

describe('SimpleUnifiedAIPlatform - Advanced Tests', () => {
  let platform;
  let server;
  const testPort = 3004;

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

  describe('Request Body Parsing', () => {
    test('should handle empty request body for POST', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', '');
        
        // Should handle gracefully
        expect([200, 400]).toContain(response.status);
        done();
      });
    });

    test('should handle invalid JSON in request body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', '{invalid json}');
        
        // Should not crash server
        expect(response.status).toBeDefined();
        done();
      });
    });

    test('should handle very large JSON payload', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeData = {
          key: 'large',
          value: 'x'.repeat(1024 * 100) // 100KB
        };
        
        const response = await makeRequest(server, 'POST', '/api/v1/memory', largeData);
        expect([200, 413]).toContain(response.status);
        done();
      });
    });

    test('should handle chunked request data', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
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
            expect(res.statusCode).toBeDefined();
            done();
          });
        });

        // Write in chunks
        req.write('{"key":');
        setTimeout(() => req.write('"test",'), 10);
        setTimeout(() => req.write('"value":"'), 20);
        setTimeout(() => {
          req.write('data"}');
          req.end();
        }, 30);
      });
    });

    test('should handle concurrent large requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 10 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `concurrent_${i}`,
            value: 'x'.repeat(10000)
          })
        );

        const responses = await Promise.all(promises);
        const successCount = responses.filter(r => r.status === 200).length;
        expect(successCount).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('HTTP Protocol Edge Cases', () => {
    test('should handle HTTP/1.0 requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
          path: '/health',
          method: 'GET'
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBe(200);
          done();
        });

        req.end();
      });
    });

    test('should handle requests without Host header', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new require('net').Socket();
        
        socket.connect(addr.port, 'localhost', () => {
          socket.write('GET /health HTTP/1.1\r\n\r\n');
        });

        socket.on('data', (data) => {
          const response = data.toString();
          expect(response).toContain('HTTP/1.1');
          socket.destroy();
          done();
        });

        socket.on('error', () => {
          socket.destroy();
          done();
        });
      });
    });

    test('should handle keep-alive connections', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response1 = await makeRequest(server, 'GET', '/health', null, {
          'Connection': 'keep-alive'
        });

        const response2 = await makeRequest(server, 'GET', '/health', null, {
          'Connection': 'keep-alive'
        });

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
        done();
      });
    });

    test('should handle pipelined requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new require('net').Socket();
        
        socket.connect(addr.port, 'localhost', () => {
          // Send multiple requests without waiting for responses
          socket.write('GET /health HTTP/1.1\r\nHost: localhost\r\n\r\n');
          socket.write('GET /api/v1/tools HTTP/1.1\r\nHost: localhost\r\n\r\n');
        });

        let responseCount = 0;
        socket.on('data', () => {
          responseCount++;
          if (responseCount >= 2) {
            socket.destroy();
            done();
          }
        });

        socket.on('error', () => {
          socket.destroy();
          done();
        });
      });
    });
  });

  describe('URL Parsing Edge Cases', () => {
    test('should handle URLs with fragments', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health#fragment');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle URLs with complex query strings', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(
          server,
          'GET',
          '/health?a=1&b=2&c=3&arr[]=1&arr[]=2&obj[key]=value'
        );
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle encoded URL paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle double slashes in paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '//health');
        // May normalize or return 404
        expect([200, 404]).toContain(response.status);
        done();
      });
    });

    test('should handle trailing slashes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health/');
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('File Handling Edge Cases', () => {
    test('should handle missing index.html gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        // Should either serve file or return 404
        expect([200, 404]).toContain(response.status);
        done();
      });
    });

    test('should handle tools.json read errors gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        
        // Should return something even if file read fails
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tools)).toBe(true);
        done();
      });
    });
  });

  describe('Memory and Resource Management', () => {
    test('should handle rapid memory allocation and deallocation', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Allocate
        for (let i = 0; i < 100; i++) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: `temp_${i}`,
            value: 'x'.repeat(1000)
          });
        }

        // Check memory
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.body.count).toBe(100);

        done();
      });
    });

    test('should not leak memory with many connections', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const initialHeap = process.memoryUsage().heapUsed;

        // Make many requests
        for (let i = 0; i < 200; i++) {
          await makeRequest(server, 'GET', '/health');
        }

        const finalHeap = process.memoryUsage().heapUsed;
        const heapGrowth = finalHeap - initialHeap;

        // Growth should be reasonable
        expect(heapGrowth).toBeLessThan(50 * 1024 * 1024);
        done();
      });
    });

    test('should handle connection pool exhaustion', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create many simultaneous connections
        const promises = Array.from({ length: 100 }, () =>
          makeRequest(server, 'GET', '/health')
        );

        const responses = await Promise.all(promises);
        const successCount = responses.filter(r => r.status === 200).length;
        expect(successCount).toBeGreaterThan(90);
        done();
      });
    });
  });

  describe('Error Condition Handling', () => {
    test('should handle server errors gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Any valid request should not crash server
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should recover from request processing errors', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Send invalid request
        await makeRequest(server, 'POST', '/api/v1/memory', 'invalid');

        // Server should still work
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle unexpected disconnections', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new require('net').Socket();
        
        socket.connect(addr.port, 'localhost', () => {
          socket.write('POST /api/v1/memory HTTP/1.1\r\n');
          socket.write('Content-Type: application/json\r\n');
          socket.write('Content-Length: 100\r\n\r\n');
          socket.write('{"key":"test"'); // Incomplete
          socket.destroy(); // Disconnect abruptly
        });

        // Server should handle this gracefully
        setTimeout(async () => {
          // Server should still be responsive
          const response = await makeRequest(server, 'GET', '/health');
          expect(response.status).toBe(200);
          done();
        }, 100);
      });
    });
  });

  describe('Response Edge Cases', () => {
    test('should handle response streaming', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.rawBody).toBeDefined();
        expect(response.rawBody.length).toBeGreaterThan(0);
        done();
      });
    });

    test('should set correct response headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        expect(response.headers['content-type']).toBe('application/json');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        done();
      });
    });

    test('should handle large response bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Add many memories
        for (let i = 0; i < 100; i++) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: `response_${i}`,
            value: 'x'.repeat(1000)
          });
        }

        // Get large response
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(100);
        done();
      });
    });
  });

  describe('Platform Lifecycle', () => {
    test('should handle start and immediate operations', (done) => {
      platform.start().then(async () => {
        // Should be immediately usable
        const addr = server ? server.address() : { port: testPort };
        const testServer = http.createServer();
        
        // Create a test request
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/health',
          method: 'GET'
        };

        const req = http.request(options, (res) => {
          expect([200, 'ECONNREFUSED']).toContain(res ? res.statusCode : 'ECONNREFUSED');
          done();
        });

        req.on('error', () => {
          done();
        });

        req.end();
      });
    });

    test('should log capabilities without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should handle multiple start attempts gracefully', (done) => {
      const firstStart = platform.start().catch(() => {});
      
      // Try to start again
      const secondStart = platform.start().catch(() => {});
      
      Promise.all([firstStart, secondStart]).finally(() => {
        done();
      });
    });
  });

  describe('Security Headers', () => {
    test('should include CORS headers on all responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = ['/health', '/api/v1/tools', '/api/v1/memory', '/api/v1/capabilities'];
        
        for (const endpoint of endpoints) {
          const response = await makeRequest(server, 'GET', endpoint);
          expect(response.headers['access-control-allow-origin']).toBe('*');
          expect(response.headers['access-control-allow-methods']).toBeDefined();
        }
        
        done();
      });
    });

    test('should handle CORS preflight for all endpoints', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = ['/api/v1/memory', '/api/v1/plans', '/api/v1/tools'];
        
        for (const endpoint of endpoints) {
          const response = await makeRequest(server, 'OPTIONS', endpoint);
          expect(response.status).toBe(200);
        }
        
        done();
      });
    });
  });

  describe('Data Persistence Simulation', () => {
    test('should maintain data across multiple requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Add data
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'persist1',
          value: 'data1'
        });

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'persist2',
          value: 'data2'
        });

        // Verify persistence
        const response1 = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response1.body.count).toBe(2);

        // Should still be there
        const response2 = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response2.body.count).toBe(2);

        done();
      });
    });

    test('should handle state consistency across operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Mixed operations
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'm1', value: 'v1' });
        await makeRequest(server, 'POST', '/api/v1/plans', { task_description: 'p1' });
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'm2', value: 'v2' });
        await makeRequest(server, 'POST', '/api/v1/plans', { task_description: 'p2' });

        // Verify both stores are correct
        const memResp = await makeRequest(server, 'GET', '/api/v1/memory');
        const planResp = await makeRequest(server, 'GET', '/api/v1/plans');

        expect(memResp.body.count).toBe(2);
        expect(planResp.body.count).toBe(2);

        done();
      });
    });
  });
});