/**
 * Enhanced Unit Tests for SimpleUnifiedAIPlatform (src/simple-server.js)
 * 
 * Additional comprehensive tests covering:
 * - HTTP protocol edge cases
 * - Streaming and chunked transfer
 * - Connection handling
 * - Performance under load
 * - Security scenarios
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

  describe('HTTP Protocol Edge Cases', () => {
    test('should handle requests with no body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle HEAD requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'HEAD', '/health');
        expect([200, 405]).toContain(response.status);
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
        // PUT not specifically handled, should get 404
        expect([200, 404]).toContain(response.status);
        done();
      });
    });

    test('should handle DELETE requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'DELETE', '/api/v1/memory');
        expect(response.status).toBe(404);
        done();
      });
    });

    test('should handle requests with query parameters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health?debug=true&verbose=1');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle requests with URL fragments', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health#section');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle requests with encoded characters in path', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/%6D%65%6D%6F%72%79'); // 'memory' encoded
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('Connection and Request Handling', () => {
    test('should handle multiple requests on same connection (keep-alive)', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const addr = server.address();
        const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
        
        const promises = Array.from({ length: 5 }, () =>
          new Promise((resolve) => {
            http.get({
              hostname: 'localhost',
              port: addr.port,
              path: '/health',
              agent: agent
            }, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve(res.statusCode));
            });
          })
        );

        const statuses = await Promise.all(promises);
        expect(statuses.every(s => s === 200)).toBe(true);
        agent.destroy();
        done();
      });
    });

    test('should handle slow clients', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
        
        socket.on('connect', () => {
          socket.write('GET /health HTTP/1.1\r\n');
          socket.write('Host: localhost\r\n');
          
          // Slowly send the rest of the headers
          setTimeout(() => {
            socket.write('\r\n');
            socket.end();
          }, 100);
        });

        socket.on('data', (data) => {
          expect(data.toString()).toContain('HTTP/1.1');
          socket.destroy();
          done();
        });

        socket.on('error', (err) => {
          expect(err).toBeDefined();
          done();
        });
      });
    });

    test('should handle chunked transfer encoding', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const addr = server.address();
        const postData = JSON.stringify({ key: 'chunked_test', value: 'data' });
        
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
            expect(res.statusCode).toBe(200);
            done();
          });
        });

        // Send in chunks
        const chunkSize = 10;
        for (let i = 0; i < postData.length; i += chunkSize) {
          req.write(postData.slice(i, i + chunkSize));
        }
        req.end();
      });
    });

    test('should handle connection timeout gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
        
        socket.setTimeout(1000);
        socket.on('timeout', () => {
          socket.destroy();
          done();
        });

        socket.on('error', () => {
          done();
        });

        // Don't send anything, just wait for timeout
      });
    });
  });

  describe('Security and Input Validation', () => {
    test('should handle oversized headers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health', null, {
          'X-Large-Header': 'A'.repeat(50000)
        });
        
        expect([200, 431]).toContain(response.status);
        done();
      });
    });

    test('should handle malicious content-length header', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
        
        socket.on('connect', () => {
          socket.write('POST /api/v1/memory HTTP/1.1\r\n');
          socket.write('Host: localhost\r\n');
          socket.write('Content-Type: application/json\r\n');
          socket.write('Content-Length: 999999999\r\n'); // Malicious large value
          socket.write('\r\n');
          socket.write('{"key":"test","value":"data"}');
          socket.end();
        });

        socket.on('data', (data) => {
          const response = data.toString();
          expect(response).toContain('HTTP/1.1');
          socket.destroy();
          done();
        });

        socket.on('error', () => {
          done();
        });
      });
    });

    test('should handle HTTP request smuggling attempts', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
        
        socket.on('connect', () => {
          // Attempt to smuggle a second request
          socket.write('POST /api/v1/memory HTTP/1.1\r\n');
          socket.write('Host: localhost\r\n');
          socket.write('Content-Length: 50\r\n');
          socket.write('Transfer-Encoding: chunked\r\n');
          socket.write('\r\n');
          socket.write('0\r\n\r\n');
          socket.write('GET /admin HTTP/1.1\r\n');
          socket.write('Host: localhost\r\n');
          socket.write('\r\n');
          socket.end();
        });

        socket.on('data', (data) => {
          const response = data.toString();
          expect(response).toContain('HTTP/1.1');
          socket.destroy();
          done();
        });

        socket.on('error', () => {
          done();
        });
      });
    });

    test('should handle NULL bytes in URL', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health\x00/admin');
        expect([200, 400, 404]).toContain(response.status);
        done();
      });
    });

    test('should handle CRLF injection attempts', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health', null, {
          'X-Inject': 'test\r\nX-Injected: malicious'
        });
        
        // Header should be rejected or sanitized
        expect(response.headers['x-injected']).toBeUndefined();
        done();
      });
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('should handle POST with mismatched Content-Length', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
        
        socket.on('connect', () => {
          const data = JSON.stringify({ key: 'test', value: 'data' });
          socket.write('POST /api/v1/memory HTTP/1.1\r\n');
          socket.write('Host: localhost\r\n');
          socket.write('Content-Type: application/json\r\n');
          socket.write(`Content-Length: ${data.length + 100}\r\n`); // Wrong length
          socket.write('\r\n');
          socket.write(data);
          // Don't send the rest, let it timeout or handle
          setTimeout(() => socket.end(), 1000);
        });

        socket.on('data', (data) => {
          expect(data.toString()).toContain('HTTP/1.1');
          socket.destroy();
          done();
        });

        socket.on('error', () => {
          done();
        });
      });
    });

    test('should handle incomplete HTTP request', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
        
        socket.on('connect', () => {
          socket.write('GET /health HTTP/1.1\r\n');
          // Don't send Host or finish request
          setTimeout(() => socket.destroy(), 500);
        });

        socket.on('error', () => {
          done();
        });

        socket.on('close', () => {
          done();
        });
      });
    });

    test('should handle rapid connection open/close', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        let completed = 0;
        const total = 50;

        for (let i = 0; i < total; i++) {
          const socket = new http.Agent().createConnection({ port: addr.port, host: 'localhost' });
          socket.on('connect', () => {
            socket.destroy();
            completed++;
            if (completed === total) done();
          });
          socket.on('error', () => {
            completed++;
            if (completed === total) done();
          });
        }
      });
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle burst of concurrent connections', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 200 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `burst_${i}`,
            value: `data_${i}`
          })
        );

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => 
          r.status === 'fulfilled' && r.value.status === 200
        );

        // At least 80% should succeed
        expect(successful.length).toBeGreaterThan(160);
        done();
      });
    });

    test('should handle large JSON payloads', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeValue = {
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: 'A'.repeat(100)
          }))
        };

        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'large_payload',
          value: largeValue
        });

        expect([200, 413]).toContain(response.status);
        done();
      });
    });

    test('should maintain performance under sustained load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const iterations = 10;
        const concurrency = 20;
        const times = [];

        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          const promises = Array.from({ length: concurrency }, () =>
            makeRequest(server, 'GET', '/health')
          );
          await Promise.all(promises);
          times.push(Date.now() - start);
        }

        // Performance should not degrade significantly
        const avgFirst = times.slice(0, 3).reduce((a, b) => a + b) / 3;
        const avgLast = times.slice(-3).reduce((a, b) => a + b) / 3;
        
        expect(avgLast).toBeLessThan(avgFirst * 2); // Should not double
        done();
      });
    });
  });

  describe('Data Integrity', () => {
    test('should preserve UTF-8 encoding', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const utf8Value = '日本語 🎌 Emoji 😀 Special: ñáéíóú';
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'utf8_test',
          value: utf8Value
        });

        const stored = platform.memory.get('utf8_test');
        expect(stored.content).toBe(utf8Value);
        done();
      });
    });

    test('should handle special JSON characters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const specialValue = 'Contains: \\ " \n \r \t \b \f';
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'special_chars',
          value: specialValue
        });

        const stored = platform.memory.get('special_chars');
        expect(stored.content).toBe(specialValue);
        done();
      });
    });

    test('should preserve precision of large numbers', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeNumber = 9007199254740991; // Max safe integer
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'large_num',
          value: largeNumber
        });

        const stored = platform.memory.get('large_num');
        expect(stored.content).toBe(largeNumber);
        done();
      });
    });

    test('should handle floating point precision', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const floatValue = 0.1 + 0.2;
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'float_test',
          value: floatValue
        });

        const stored = platform.memory.get('float_test');
        expect(stored.content).toBeCloseTo(0.3);
        done();
      });
    });
  });

  describe('Response Headers Validation', () => {
    test('should set correct CORS headers for all endpoints', (done) => {
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
          expect(response.headers['access-control-allow-origin']).toBe('*');
          expect(response.headers['access-control-allow-methods']).toBeDefined();
          expect(response.headers['access-control-allow-headers']).toBeDefined();
        }
        done();
      });
    });

    test('should set content-type to JSON for API endpoints', (done) => {
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
          expect(response.headers['content-type']).toBe('application/json');
        }
        done();
      });
    });
  });

  describe('State Management', () => {
    test('should maintain separate state for memory and plans', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'state_test',
          value: 'memory_data'
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'State test task'
        });

        expect(platform.memory.size).toBe(1);
        expect(platform.plans.size).toBe(1);
        done();
      });
    });

    test('should handle state queries after multiple operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Add multiple items
        for (let i = 0; i < 10; i++) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: `item_${i}`,
            value: `data_${i}`
          });
        }

        // Query state
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.body.count).toBe(10);
        expect(response.body.memories).toHaveLength(10);
        done();
      });
    });
  });
});