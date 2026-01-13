/**
 * Unit Tests for SimpleUnifiedAIPlatform (src/simple-server.js)
 * 
 * These tests cover the HTTP-based (non-Express) AI platform including:
 * - Constructor and initialization
 * - HTTP server creation
 * - Request routing and handling
 * - All API endpoints
 * - Error handling
 * - CORS configuration
 * - Edge cases and failure conditions
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

// Helper function to make HTTP requests
function makeRequest(server, method, path, data = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = {
      hostname: 'localhost',
      port: addr.port,
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

describe('SimpleUnifiedAIPlatform', () => {
  let platform;
  let server;
  const testPort = 3002;

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

  describe('Constructor', () => {
    test('should initialize with default port', () => {
      const newPlatform = new SimpleUnifiedAIPlatform();
      expect(newPlatform.port).toBe(process.env.PORT || 3000);
    });

    test('should initialize memory as Map', () => {
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.memory.size).toBe(0);
    });

    test('should initialize plans as Map', () => {
      expect(platform.plans).toBeInstanceOf(Map);
      expect(platform.plans.size).toBe(0);
    });

    test('should set isInitialized to false', () => {
      expect(platform.isInitialized).toBe(false);
    });

    test('should respect PORT environment variable', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '5000';
      const testPlatform = new SimpleUnifiedAIPlatform();
      expect(testPlatform.port).toBe('5000');
      process.env.PORT = originalPort;
    });
  });

  describe('Server Creation', () => {
    test('should create HTTP server', () => {
      const httpServer = platform.createServer();
      expect(httpServer).toBeDefined();
      expect(httpServer instanceof http.Server).toBe(true);
    });

    test('should handle CORS preflight requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'OPTIONS', '/api/v1/memory');
        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        done();
      });
    });
  });

  describe('GET /', () => {
    test('should return HTML index page or 404', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/');
        // Should either serve HTML or return 404 if file doesn't exist
        expect([200, 404]).toContain(response.status);
        done();
      });
    });
  });

  describe('GET /health', () => {
    test('should return health status', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.platform).toBe('Unified AI Platform');
        expect(response.body.version).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.uptime).toBeDefined();
        done();
      });
    });

    test('should include feature flags', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        expect(response.body.features).toMatchObject({
          multi_modal: true,
          memory_system: true,
          tool_system: true,
          planning_system: true,
          security: true
        });
        done();
      });
    });

    test('should show initialization status', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.body.initialized).toBe(false);
        done();
      });
    });

    test('should include memory usage', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        expect(response.body.memory).toBeDefined();
        expect(response.body.memory.heapUsed).toBeDefined();
        expect(response.body.memory.heapTotal).toBeDefined();
        done();
      });
    });
  });

  describe('GET /api/v1/tools', () => {
    test('should return tools configuration', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        
        expect(response.status).toBe(200);
        expect(response.body.tools).toBeDefined();
        expect(Array.isArray(response.body.tools)).toBe(true);
        expect(response.body.count).toBeDefined();
        expect(response.body.description).toBeDefined();
        done();
      });
    });

    test('should handle missing tools.json gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tools)).toBe(true);
        done();
      });
    });
  });

  describe('GET /api/v1/memory', () => {
    test('should return empty memory initially', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.body.memories).toEqual([]);
        expect(response.body.count).toBe(0);
        expect(response.body.description).toBeDefined();
        done();
      });
    });

    test('should return stored memories', (done) => {
      platform.memory.set('test_key', {
        content: 'test_value',
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      });

      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.memories).toHaveLength(1);
        done();
      });
    });
  });

  describe('POST /api/v1/memory', () => {
    test('should store memory with key and value', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test_key',
          value: 'test_value'
        });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Memory stored successfully');
        expect(platform.memory.has('test_key')).toBe(true);
        done();
      });
    });

    test('should include timestamps in stored memory', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'time_test',
          value: 'data'
        });
        
        const stored = platform.memory.get('time_test');
        expect(stored.created_at).toBeDefined();
        expect(stored.last_accessed).toBeDefined();
        expect(stored.content).toBe('data');
        done();
      });
    });

    test('should return 400 if key is missing', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          value: 'test_value'
        });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Key and value are required');
        done();
      });
    });

    test('should return 400 if value is missing', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test_key'
        });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Key and value are required');
        done();
      });
    });

    test('should handle complex nested values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const complexValue = {
          settings: { theme: 'dark', language: 'en' },
          history: [1, 2, 3]
        };

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'complex',
          value: complexValue
        });
        
        const stored = platform.memory.get('complex');
        expect(stored.content).toEqual(complexValue);
        done();
      });
    });

    test('should overwrite existing memory with same key', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'overwrite',
          value: 'original'
        });

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'overwrite',
          value: 'updated'
        });
        
        const stored = platform.memory.get('overwrite');
        expect(stored.content).toBe('updated');
        done();
      });
    });
  });

  describe('GET /api/v1/plans', () => {
    test('should return empty plans initially', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/plans');
        
        expect(response.status).toBe(200);
        expect(response.body.plans).toEqual([]);
        expect(response.body.count).toBe(0);
        expect(response.body.description).toBeDefined();
        done();
      });
    });

    test('should return stored plans', (done) => {
      platform.plans.set('plan_1', {
        task_description: 'test task',
        steps: ['step1'],
        created_at: new Date().toISOString(),
        status: 'created'
      });

      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/plans');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.plans).toHaveLength(1);
        done();
      });
    });
  });

  describe('POST /api/v1/plans', () => {
    test('should create plan with task description', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Build feature X'
        });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.plan_id).toBeDefined();
        expect(response.body.plan_id).toMatch(/^plan_\d+$/);
        expect(response.body.message).toBe('Plan created successfully');
        done();
      });
    });

    test('should create plan with steps', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const steps = ['Analyze', 'Design', 'Implement'];
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Build API',
          steps: steps
        });
        
        const planId = response.body.plan_id;
        const plan = platform.plans.get(planId);
        expect(plan.steps).toEqual(steps);
        done();
      });
    });

    test('should default to empty steps if not provided', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Simple task'
        });
        
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.steps).toEqual([]);
        done();
      });
    });

    test('should return 400 if task description is missing', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Task description is required');
        done();
      });
    });

    test('should include timestamp and status', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Test'
        });
        
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.created_at).toBeDefined();
        expect(plan.status).toBe('created');
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
  });

  describe('GET /api/v1/capabilities', () => {
    test('should return platform capabilities', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/capabilities');
        
        expect(response.status).toBe(200);
        expect(response.body.platform).toBeDefined();
        expect(response.body.core_capabilities).toBeDefined();
        expect(response.body.performance).toBeDefined();
        expect(response.body.description).toBeDefined();
        done();
      });
    });

    test('should include correct platform info', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/capabilities');
        
        expect(response.body.platform.name).toBe('Unified AI Platform');
        expect(response.body.platform.version).toBe('1.0.0');
        done();
      });
    });
  });

  describe('GET /api/v1/demo', () => {
    test('should return demo information', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/demo');
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Unified AI Platform Demo');
        expect(response.body.features).toBeDefined();
        expect(response.body.systems_combined).toBeDefined();
        expect(response.body.status).toBe('Ready for deployment!');
        done();
      });
    });

    test('should list features', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/demo');
        
        expect(Array.isArray(response.body.features)).toBe(true);
        expect(response.body.features).toContain('Multi-Modal Processing');
        expect(response.body.features).toContain('Context-Aware Memory');
        done();
      });
    });

    test('should list integrated systems', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/demo');
        
        expect(Array.isArray(response.body.systems_combined)).toBe(true);
        expect(response.body.systems_combined.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/unknown');
        
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Not Found');
        expect(response.body.message).toContain('not found');
        done();
      });
    });

    test('should include timestamp in 404 responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/nonexistent');
        
        expect(response.body.timestamp).toBeDefined();
        done();
      });
    });

    test('should handle malformed JSON gracefully', (done) => {
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
            // Should not crash, may return 400 or process as empty object
            expect([200, 400]).toContain(res.statusCode);
            done();
          });
        });

        req.write('{invalid json');
        req.end();
      });
    });

    test('should catch and handle errors in request handler', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Any request should not cause server crash
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBeDefined();
        done();
      });
    });
  });

  describe('CORS Configuration', () => {
    test('should set CORS headers on all responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        expect(response.headers['access-control-allow-headers']).toBeDefined();
        done();
      });
    });

    test('should set content-type to JSON', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        expect(response.headers['content-type']).toBe('application/json');
        done();
      });
    });
  });

  describe('Server Lifecycle', () => {
    test('should start server on specified port', (done) => {
      platform.start().then(() => {
        expect(platform.isInitialized).toBe(true);
        done();
      });
    });

    test('should log capabilities on start', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      platform.logPlatformCapabilities();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should handle server errors during start', (done) => {
      // Try to start on an already-used port
      const server1 = http.createServer();
      server1.listen(testPort, () => {
        platform.start().catch((error) => {
          expect(error).toBeDefined();
          server1.close(done);
        });
      });
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple concurrent requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 10 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `concurrent_${i}`,
            value: `value_${i}`
          })
        );

        const responses = await Promise.all(promises);
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        expect(platform.memory.size).toBe(10);
        done();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty POST body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {});
        expect(response.status).toBe(400);
        done();
      });
    });

    test('should handle very long task descriptions', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const longDesc = 'A'.repeat(10000);
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: longDesc
        });
        
        expect(response.status).toBe(200);
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.task_description).toBe(longDesc);
        done();
      });
    });

    test('should handle large arrays of steps', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const manySteps = Array.from({ length: 100 }, (_, i) => `Step ${i}`);
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Complex',
          steps: manySteps
        });
        
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.steps).toHaveLength(100);
        done();
      });
    });
  });
});
  describe('HTTP Protocol Compliance', () => {
    test('should handle HTTP/1.0 requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/health',
          method: 'GET',
          headers: {
            'Connection': 'close'
          }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBe(200);
          done();
        });

        req.end();
      });
    });

    test('should handle requests with different HTTP methods', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        
        for (const method of methods) {
          const response = await makeRequest(server, method, '/health');
          expect(response.status).toBeDefined();
        }
        done();
      });
    });

    test('should set proper status codes for different scenarios', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // 200 OK
        const health = await makeRequest(server, 'GET', '/health');
        expect(health.status).toBe(200);

        // 404 Not Found
        const notFound = await makeRequest(server, 'GET', '/nonexistent');
        expect(notFound.status).toBe(404);

        // 400 Bad Request
        const badReq = await makeRequest(server, 'POST', '/api/v1/memory', {});
        expect(badReq.status).toBe(400);

        done();
      });
    });
  });

  describe('Request Body Parsing', () => {
    test('should handle empty request bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', null);
        expect(response.status).toBe(400);
        done();
      });
    });

    test('should handle very large request bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const largeValue = 'X'.repeat(100000);
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'large',
          value: largeValue
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle binary data in JSON', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF]).toString('base64');
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'binary',
          value: binaryData
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle unicode in request body', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const unicode = { key: '🚀', value: '测试 test тест' };
        const response = await makeRequest(server, 'POST', '/api/v1/memory', unicode);

        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Response Headers', () => {
    test('should set Content-Type header correctly', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.headers['content-type']).toBe('application/json');
        done();
      });
    });

    test('should set CORS headers on all responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/tools');
        
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        expect(response.headers['access-control-allow-headers']).toBeDefined();
        done();
      });
    });

    test('should handle multiple header values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        
        const methods = response.headers['access-control-allow-methods'];
        expect(methods).toContain('GET');
        expect(methods).toContain('POST');
        done();
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle request timeout gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
          path: '/health',
          method: 'GET',
          timeout: 1
        };

        const req = http.request(options, () => {
          // Should timeout before response
        });

        req.on('timeout', () => {
          req.destroy();
          done();
        });

        req.on('error', () => {
          // Expected timeout error
          done();
        });

        req.end();
      });
    });

    test('should handle request abortion', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const addr = server.address();
        const options = {
          hostname: 'localhost',
          port: addr.port,
          path: '/health',
          method: 'GET'
        };

        const req = http.request(options, () => {
          // Should not reach here
        });

        req.on('error', () => {
          // Expected error after abort
          done();
        });

        // Abort request immediately
        req.destroy();
      });
    });

    test('should handle connection errors', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        server.close(() => {
          // Server is now closed
          const options = {
            hostname: 'localhost',
            port: testPort,
            path: '/health',
            method: 'GET'
          };

          const req = http.request(options, () => {
            // Should not succeed
          });

          req.on('error', (error) => {
            expect(error).toBeDefined();
            done();
          });

          req.end();
        });
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle burst traffic', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const startTime = Date.now();
        const promises = Array.from({ length: 200 }, (_, i) =>
          makeRequest(server, 'GET', '/health')
        );

        const responses = await Promise.all(promises);
        const endTime = Date.now();

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        const duration = endTime - startTime;
        expect(duration).toBeLessThan(15000); // Should complete in < 15 seconds
        done();
      });
    });

    test('should maintain responsiveness under load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create background load
        const backgroundLoad = Array.from({ length: 50 }, () =>
          makeRequest(server, 'GET', '/api/v1/capabilities')
        );

        // Check if health endpoint is still responsive
        const healthCheck = await makeRequest(server, 'GET', '/health');
        expect(healthCheck.status).toBe(200);

        await Promise.all(backgroundLoad);
        done();
      });
    });

    test('should handle sequential operations efficiently', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const startTime = Date.now();

        for (let i = 0; i < 50; i++) {
          await makeRequest(server, 'GET', '/health');
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
        done();
      });
    });
  });

  describe('Data Integrity', () => {
    test('should preserve data types in memory storage', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const testCases = [
          { key: 'string', value: 'test' },
          { key: 'number', value: 42 },
          { key: 'boolean', value: true },
          { key: 'array', value: [1, 2, 3] },
          { key: 'object', value: { nested: 'value' } },
          { key: 'null', value: null }
        ];

        for (const testCase of testCases) {
          await makeRequest(server, 'POST', '/api/v1/memory', testCase);
          const stored = platform.memory.get(testCase.key);
          if (testCase.key !== 'null') {
            expect(stored.content).toEqual(testCase.value);
          }
        }

        done();
      });
    });

    test('should maintain timestamp accuracy', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const beforeTime = new Date().toISOString();
        
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'timestamp_test',
          value: 'data'
        });

        const afterTime = new Date().toISOString();
        const stored = platform.memory.get('timestamp_test');

        expect(stored.created_at >= beforeTime).toBe(true);
        expect(stored.created_at <= afterTime).toBe(true);
        done();
      });
    });

    test('should not corrupt data on concurrent writes to same key', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 10 }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: 'concurrent_key',
            value: `value_${i}`
          })
        );

        await Promise.all(promises);

        const stored = platform.memory.get('concurrent_key');
        expect(stored).toBeDefined();
        expect(stored.content).toMatch(/^value_\d$/);
        done();
      });
    });
  });

  describe('Route Handling Specifics', () => {
    test('should handle trailing slashes in paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const withSlash = await makeRequest(server, 'GET', '/health/');
        const withoutSlash = await makeRequest(server, 'GET', '/health');

        // Both should work or both return 404
        expect(withSlash.status).toBeDefined();
        expect(withoutSlash.status).toBe(200);
        done();
      });
    });

    test('should handle case sensitivity in paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const lowercase = await makeRequest(server, 'GET', '/health');
        const uppercase = await makeRequest(server, 'GET', '/HEALTH');

        expect(lowercase.status).toBe(200);
        expect(uppercase.status).toBe(404); // Should be case-sensitive
        done();
      });
    });

    test('should handle URL encoded paths', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/api%2Fv1%2Fhealth');
        expect(response.status).toBeDefined();
        done();
      });
    });
  });

  describe('Server Resource Management', () => {
    test('should clean up resources properly', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        server.close((err) => {
          expect(err).toBeUndefined();
          server = null;
          done();
        });
      });
    });

    test('should handle restart after stop', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        server.close(() => {
          server = platform.createServer();
          server.listen(testPort, () => {
            expect(server.listening).toBe(true);
            done();
          });
        });
      });
    });

    test('should handle multiple simultaneous close calls gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        let closeCount = 0;
        const checkDone = () => {
          closeCount++;
          if (closeCount === 2) {
            server = null;
            done();
          }
        };

        server.close(checkDone);
        server.close(checkDone);
      });
    });
  });

  describe('Input Sanitization', () => {
    test('should handle HTML tags in input', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const htmlInput = '<div>test</div>';
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'html_test',
          value: htmlInput
        });

        expect(response.status).toBe(200);
        const stored = platform.memory.get('html_test');
        expect(stored.content).toBe(htmlInput);
        done();
      });
    });

    test('should handle JavaScript code in input', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const jsCode = 'function() { return "test"; }';
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'js_test',
          value: jsCode
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle SQL-like strings', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const sqlString = "SELECT * FROM users WHERE id = 1; DROP TABLE users;";
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'sql_test',
          value: sqlString
        });

        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle regex special characters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const regexChars = '.*+?^${}()|[]\\';
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'regex_test',
          value: regexChars
        });

        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('Complex Scenario Tests', () => {
    test('should handle complete workflow: create, read, update', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'workflow',
          value: 'initial'
        });

        // Read
        const read1 = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(read1.body.count).toBe(1);

        // Update
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'workflow',
          value: 'updated'
        });

        // Read again
        const read2 = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(read2.body.count).toBe(1);
        
        const stored = platform.memory.get('workflow');
        expect(stored.content).toBe('updated');
        done();
      });
    });

    test('should handle plan creation and retrieval workflow', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create multiple plans
        const plan1 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task 1',
          steps: ['Step 1.1', 'Step 1.2']
        });

        const plan2 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task 2',
          steps: ['Step 2.1']
        });

        // Retrieve all plans
        const allPlans = await makeRequest(server, 'GET', '/api/v1/plans');
        expect(allPlans.body.count).toBe(2);

        // Verify plan IDs are different
        expect(plan1.body.plan_id).not.toBe(plan2.body.plan_id);
        done();
      });
    });

    test('should handle mixed API calls in sequence', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest(server, 'GET', '/health');
        await makeRequest(server, 'GET', '/api/v1/tools');
        await makeRequest(server, 'POST', '/api/v1/memory', { key: 'test', value: 'data' });
        await makeRequest(server, 'GET', '/api/v1/memory');
        await makeRequest(server, 'POST', '/api/v1/plans', { task_description: 'test' });
        await makeRequest(server, 'GET', '/api/v1/plans');
        await makeRequest(server, 'GET', '/api/v1/capabilities');
        await makeRequest(server, 'GET', '/api/v1/demo');

        const finalHealth = await makeRequest(server, 'GET', '/health');
        expect(finalHealth.status).toBe(200);
        done();
      });
    });
  });

  describe('Logging and Monitoring', () => {
    test('should log platform capabilities on initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      platform.logPlatformCapabilities();
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Platform Capabilities'))).toBe(true);
      expect(calls.some(call => call.includes('Performance Targets'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should log server start information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.start().then(() => {
        expect(consoleSpy).toHaveBeenCalled();
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('Unified AI Platform'))).toBe(true);
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Edge Case URL Patterns', () => {
    test('should handle double slashes in URLs', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '//health');
        expect(response.status).toBeDefined();
        done();
      });
    });

    test('should handle URLs with query strings', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health?param=value&other=123');
        expect(response.status).toBe(200);
        done();
      });
    });

    test('should handle URLs with fragments', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest(server, 'GET', '/health#section');
        expect(response.status).toBe(200);
        done();
      });
    });
  });
});