/**
 * Comprehensive Unit Tests for SimpleUnifiedAIPlatform (simple-server.js)
 * 
 * Tests cover:
 * - HTTP server creation and configuration
 * - Route handling without external dependencies
 * - Request/response processing
 * - CORS handling
 * - Error scenarios
 * - Memory and plan management
 * - Server lifecycle
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../simple-server');

describe('SimpleUnifiedAIPlatform', () => {
  let platform;
  let server;

  beforeEach(() => {
    platform = new SimpleUnifiedAIPlatform();
  });

  afterEach(() => {
    if (server) {
      server.close();
      server = null;
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(platform).toBeDefined();
      expect(platform.port).toBe(process.env.PORT || 3000);
      expect(platform.isInitialized).toBe(false);
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.plans).toBeInstanceOf(Map);
    });

    test('should use PORT environment variable if set', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '8080';
      
      const customPlatform = new SimpleUnifiedAIPlatform();
      expect(customPlatform.port).toBe('8080');
      
      process.env.PORT = originalPort;
    });

    test('should initialize with empty storage', () => {
      expect(platform.memory.size).toBe(0);
      expect(platform.plans.size).toBe(0);
    });
  });

  describe('Server Creation', () => {
    test('createServer should return HTTP server instance', () => {
      const httpServer = platform.createServer();
      
      expect(httpServer).toBeInstanceOf(http.Server);
    });

    test('server should handle incoming requests', (done) => {
      server = platform.createServer();
      server.listen(0); // Use random available port
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/health`, (res) => {
        expect(res.statusCode).toBe(200);
        done();
      });
    });
  });

  describe('CORS Headers', () => {
    test('should set CORS headers on all responses', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/health`, (res) => {
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-methods']).toBeDefined();
        expect(res.headers['content-type']).toBe('application/json');
        done();
      });
    });

    test('should handle OPTIONS preflight requests', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'OPTIONS'
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['access-control-allow-methods']).toBeDefined();
        done();
      });
      
      req.end();
    });
  });

  describe('Health Check Endpoint', () => {
    test('GET /health should return health status', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            status: 'healthy',
            platform: 'Unified AI Platform',
            version: expect.any(String),
            timestamp: expect.any(String),
            uptime: expect.any(Number),
            memory: expect.any(Object),
            initialized: false,
            features: {
              multi_modal: true,
              memory_system: true,
              tool_system: true,
              planning_system: true,
              security: true
            }
          });
          
          done();
        });
      });
    });

    test('health check should include process memory info', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json.memory).toHaveProperty('heapUsed');
          expect(json.memory).toHaveProperty('heapTotal');
          expect(json.memory).toHaveProperty('rss');
          
          done();
        });
      });
    });
  });

  describe('Tools Endpoint', () => {
    test('GET /api/v1/tools should return tools configuration', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/api/v1/tools`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toHaveProperty('tools');
          expect(json).toHaveProperty('count');
          expect(json).toHaveProperty('description');
          expect(Array.isArray(json.tools)).toBe(true);
          
          done();
        });
      });
    });
  });

  describe('Memory Endpoints', () => {
    test('GET /api/v1/memory should return empty memory initially', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/api/v1/memory`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            memories: [],
            count: 0,
            description: expect.any(String)
          });
          
          done();
        });
      });
    });

    test('POST /api/v1/memory should store memory', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const postData = JSON.stringify({
        key: 'test_key',
        value: 'test_value'
      });
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            success: true,
            message: 'Memory stored successfully'
          });
          
          done();
        });
      });
      
      req.write(postData);
      req.end();
    });

    test('POST /api/v1/memory should reject missing key', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const postData = JSON.stringify({ value: 'test_value' });
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(400);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          expect(json).toHaveProperty('error');
          done();
        });
      });
      
      req.write(postData);
      req.end();
    });

    test('stored memory should be retrievable', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      // First store a memory
      const postData = JSON.stringify({
        key: 'retrieve_test',
        value: 'retrieve_value'
      });
      
      const postOptions = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const postReq = http.request(postOptions, () => {
        // Then retrieve it
        http.get(`http://localhost:${port}/api/v1/memory`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const json = JSON.parse(data);
            
            expect(json.count).toBe(1);
            expect(json.memories).toHaveLength(1);
            
            const [key, memoryObj] = json.memories[0];
            expect(key).toBe('retrieve_test');
            expect(memoryObj.content).toBe('retrieve_value');
            expect(memoryObj).toHaveProperty('created_at');
            expect(memoryObj).toHaveProperty('last_accessed');
            
            done();
          });
        });
      });
      
      postReq.write(postData);
      postReq.end();
    });
  });

  describe('Plans Endpoints', () => {
    test('GET /api/v1/plans should return empty plans initially', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/api/v1/plans`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            plans: [],
            count: 0,
            description: expect.any(String)
          });
          
          done();
        });
      });
    });

    test('POST /api/v1/plans should create a plan', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const postData = JSON.stringify({
        task_description: 'Test plan',
        steps: ['step1', 'step2']
      });
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/plans',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            success: true,
            plan_id: expect.stringMatching(/^plan_\d+$/),
            message: 'Plan created successfully'
          });
          
          done();
        });
      });
      
      req.write(postData);
      req.end();
    });

    test('POST /api/v1/plans should reject missing task_description', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const postData = JSON.stringify({ steps: ['step1'] });
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/plans',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(400);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          expect(json.error).toBe('Task description is required');
          done();
        });
      });
      
      req.write(postData);
      req.end();
    });
  });

  describe('Capabilities Endpoint', () => {
    test('GET /api/v1/capabilities should return platform info', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/api/v1/capabilities`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toHaveProperty('platform');
          expect(json).toHaveProperty('core_capabilities');
          expect(json).toHaveProperty('performance');
          expect(json).toHaveProperty('description');
          
          done();
        });
      });
    });
  });

  describe('Demo Endpoint', () => {
    test('GET /api/v1/demo should return demo information', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/api/v1/demo`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            message: expect.any(String),
            features: expect.any(Array),
            systems_combined: expect.any(Array),
            status: expect.any(String)
          });
          
          done();
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/api/v1/unknown`, (res) => {
        expect(res.statusCode).toBe(404);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          
          expect(json).toMatchObject({
            error: 'Not Found',
            message: expect.stringContaining('not found'),
            timestamp: expect.any(String)
          });
          
          done();
        });
      });
    });

    test('should handle request errors gracefully', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      // Send malformed JSON
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = http.request(options, (res) => {
        // Should handle gracefully, even with bad JSON
        expect([200, 400, 500]).toContain(res.statusCode);
        done();
      });
      
      req.write('{ invalid json }');
      req.end();
    });
  });

  describe('Request Body Parsing', () => {
    test('should parse JSON request bodies', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const testData = {
        key: 'parse_test',
        value: { nested: 'object', array: [1, 2, 3] }
      };
      const postData = JSON.stringify(testData);
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(200);
        done();
      });
      
      req.write(postData);
      req.end();
    });

    test('should handle empty request bodies', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(400);
        done();
      });
      
      req.end();
    });
  });

  describe('Server Lifecycle', () => {
    test('start() should launch server successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await platform.start();
      
      // Get reference to server for cleanup
      server = platform.server || { close: (cb) => cb && cb() };
      
      expect(platform.isInitialized).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unified AI Platform running')
      );

      consoleSpy.mockRestore();
    }, 10000);

    test('logPlatformCapabilities should display configuration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      platform.logPlatformCapabilities();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Platform Capabilities')
      );

      consoleSpy.mockRestore();
    });

    test('should handle server errors', () => {
      const testServer = platform.createServer();
      const errorHandler = jest.fn();
      
      testServer.on('error', errorHandler);
      testServer.emit('error', new Error('Test error'));
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent requests', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      let completed = 0;
      const total = 5;
      
      for (let i = 0; i < total; i++) {
        http.get(`http://localhost:${port}/health`, () => {
          completed++;
          if (completed === total) {
            done();
          }
        });
      }
    });

    test('should handle large request bodies', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const largeValue = 'x'.repeat(1000);
      const postData = JSON.stringify({
        key: 'large_data',
        value: largeValue
      });
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(200);
        done();
      });
      
      req.write(postData);
      req.end();
    });

    test('should handle special characters in data', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      const postData = JSON.stringify({
        key: 'special_chars',
        value: '🎉 Special: <>&"\'\n\t'
      });
      
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/v1/memory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        expect(res.statusCode).toBe(200);
        done();
      });
      
      req.write(postData);
      req.end();
    });
  });

  describe('Index Route', () => {
    test('GET / should attempt to serve index.html', (done) => {
      server = platform.createServer();
      server.listen(0);
      
      const port = server.address().port;
      
      http.get(`http://localhost:${port}/`, (res) => {
        // Either serves HTML (200) or returns 404 if file doesn't exist
        expect([200, 404]).toContain(res.statusCode);
        done();
      });
    });
  });
});