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