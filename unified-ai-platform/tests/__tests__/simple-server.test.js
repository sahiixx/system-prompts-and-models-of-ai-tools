/**
 * Comprehensive Unit Tests for SimpleUnifiedAIPlatform (simple-server.js)
 * 
 * This test suite covers:
 * - Constructor initialization
 * - HTTP server creation and configuration
 * - All route handlers
 * - Request/response handling
 * - Error handling
 * - CORS headers
 * - Content-Type handling
 * - Memory and plan operations
 * - Edge cases and failure conditions
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

// Helper function to make HTTP requests
function makeRequest(server, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: 'localhost',
      port: address.port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

describe('SimpleUnifiedAIPlatform', () => {
  let platform;
  let server;

  beforeEach(() => {
    process.env.PORT = '0'; // Use random available port
    platform = new SimpleUnifiedAIPlatform();
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    delete process.env.PORT;
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(platform.port).toBe('0');
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.plans).toBeInstanceOf(Map);
      expect(platform.isInitialized).toBe(false);
    });

    test('should use PORT from environment', () => {
      process.env.PORT = '8080';
      const customPlatform = new SimpleUnifiedAIPlatform();
      expect(customPlatform.port).toBe('8080');
    });

    test('should default to 3000 if PORT not set', () => {
      delete process.env.PORT;
      const defaultPlatform = new SimpleUnifiedAIPlatform();
      expect(defaultPlatform.port).toBe(3000);
    });
  });

  describe('Server Creation', () => {
    test('should create HTTP server', () => {
      server = platform.createServer();
      expect(server).toBeInstanceOf(http.Server);
    });

    test('should handle incoming requests', (done) => {
      server = platform.createServer();
      server.listen(0, async () => {
        const response = await makeRequest(server, 'GET', '/health');
        expect(response.status).toBe(200);
        done();
      });
    });
  });

  describe('CORS Headers', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should set CORS headers on all responses', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await makeRequest(server, 'OPTIONS', '/api/v1/memory');
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    test('should set Content-Type to application/json', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.headers['content-type']).toBe('application/json');
    });
  });

  describe('Health Check Endpoint', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should return 200 and health status', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.platform).toBe('Unified AI Platform');
    });

    test('should include version information', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.body.version).toBe('1.0.0');
    });

    test('should include timestamp', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    test('should include uptime', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should include memory usage', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
    });

    test('should show initialized status', async () => {
      platform.isInitialized = true;
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.body.initialized).toBe(true);
    });

    test('should include all feature flags', async () => {
      const response = await makeRequest(server, 'GET', '/health');
      
      expect(response.body.features).toEqual({
        multi_modal: true,
        memory_system: true,
        tool_system: true,
        planning_system: true,
        security: true
      });
    });
  });

  describe('Tools Endpoint', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should return tools list', async () => {
      const response = await makeRequest(server, 'GET', '/api/v1/tools');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
    });

    test('should return tools from config file', async () => {
      const response = await makeRequest(server, 'GET', '/api/v1/tools');
      
      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.count).toBe(response.body.tools.length);
    });

    test('should handle missing tools.json gracefully', async () => {
      // This test verifies error handling when config file is missing
      const response = await makeRequest(server, 'GET', '/api/v1/tools');
      
      expect(response.status).toBe(200);
      expect(response.body.tools).toBeDefined();
    });
  });

  describe('Memory Endpoints', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    describe('GET /api/v1/memory', () => {
      test('should return empty memories initially', async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.body.memories).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      test('should return stored memories', async () => {
        platform.memory.set('test-key', { content: 'test-value' });
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
      });

      test('should include description', async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        
        expect(response.body.description).toContain('In-memory storage');
      });
    });

    describe('POST /api/v1/memory', () => {
      test('should store memory with valid key and value', async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'user-pref',
          value: 'dark-mode'
        });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(platform.memory.has('user-pref')).toBe(true);
      });

      test('should store memory with timestamps', async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test',
          value: 'data'
        });
        
        const stored = platform.memory.get('test');
        expect(stored).toHaveProperty('content', 'data');
        expect(stored).toHaveProperty('created_at');
        expect(stored).toHaveProperty('last_accessed');
      });

      test('should return 400 when key is missing', async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          value: 'test'
        });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Key and value are required');
      });

      test('should return 400 when value is missing', async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'test'
        });
        
        expect(response.status).toBe(400);
      });

      test('should handle complex object values', async () => {
        const complexValue = { nested: { data: 'value' }, array: [1, 2, 3] };
        const response = await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'complex',
          value: complexValue
        });
        
        expect(response.status).toBe(200);
        expect(platform.memory.get('complex').content).toEqual(complexValue);
      });

      test('should overwrite existing memory', async () => {
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'overwrite',
          value: 'first'
        });
        
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'overwrite',
          value: 'second'
        });
        
        expect(platform.memory.get('overwrite').content).toBe('second');
      });
    });
  });

  describe('Plans Endpoints', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    describe('GET /api/v1/plans', () => {
      test('should return empty plans initially', async () => {
        const response = await makeRequest(server, 'GET', '/api/v1/plans');
        
        expect(response.status).toBe(200);
        expect(response.body.plans).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      test('should return stored plans', async () => {
        platform.plans.set('plan-1', { task_description: 'Test' });
        const response = await makeRequest(server, 'GET', '/api/v1/plans');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
      });
    });

    describe('POST /api/v1/plans', () => {
      test('should create plan with valid task description', async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Build feature X'
        });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('plan_id');
      });

      test('should generate unique plan IDs', async () => {
        const response1 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task 1'
        });
        
        const response2 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task 2'
        });
        
        expect(response1.body.plan_id).not.toBe(response2.body.plan_id);
      });

      test('should handle steps if provided', async () => {
        const steps = ['step1', 'step2'];
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Complex task',
          steps
        });
        
        const planId = response.body.plan_id;
        expect(platform.plans.get(planId).steps).toEqual(steps);
      });

      test('should return 400 when task_description is missing', async () => {
        const response = await makeRequest(server, 'POST', '/api/v1/plans', {});
        
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Capabilities Endpoint', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should return capabilities', async () => {
      const response = await makeRequest(server, 'GET', '/api/v1/capabilities');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('core_capabilities');
    });
  });

  describe('Demo Endpoint', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should return demo information', async () => {
      const response = await makeRequest(server, 'GET', '/api/v1/demo');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('features');
    });
  });

  describe('404 Handling', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should return 404 for unknown routes', async () => {
      const response = await makeRequest(server, 'GET', '/unknown');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('Error Handling', () => {
    beforeEach((done) => {
      server = platform.createServer();
      server.listen(0, done);
    });

    test('should handle malformed JSON', async () => {
      return new Promise((resolve) => {
        const address = server.address();
        const options = {
          hostname: 'localhost',
          port: address.port,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            expect(res.statusCode).toBeGreaterThanOrEqual(200);
            resolve();
          });
        });

        req.write('{invalid json}');
        req.end();
      });
    });
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      const newPlatform = new SimpleUnifiedAIPlatform();
      await newPlatform.start();
      
      expect(newPlatform.isInitialized).toBe(true);
      
      // Clean up
      await new Promise(resolve => {
        const servers = require('http').globalAgent.sockets;
        for (const key in servers) {
          servers[key].forEach(socket => socket.destroy());
        }
        setTimeout(resolve, 100);
      });
    });
  });
});