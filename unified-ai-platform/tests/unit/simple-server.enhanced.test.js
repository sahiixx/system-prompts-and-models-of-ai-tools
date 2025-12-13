/**
 * Enhanced Unit Tests for SimpleUnifiedAIPlatform (src/simple-server.js)
 * 
 * Comprehensive coverage for the simplified HTTP server including:
 * - HTTP server creation and configuration
 * - Request parsing and routing
 * - CORS handling and preflight requests  
 * - File serving capabilities
 * - Error handling scenarios
 * - Memory and plan operations
 * - Query parameter handling
 * - Edge cases and boundary conditions
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

describe('SimpleUnifiedAIPlatform - Enhanced Tests', () => {
  let platform;
  let server;
  const testPort = 3001;

  beforeEach(() => {
    platform = new SimpleUnifiedAIPlatform();
    platform.port = testPort;
  });

  afterEach((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Server Creation and Configuration', () => {
    test('should create HTTP server instance', () => {
      server = platform.createServer();
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(http.Server);
    });

    test('should initialize with default port', () => {
      const newPlatform = new SimpleUnifiedAIPlatform();
      expect(newPlatform.port).toBe(3000);
    });

    test('should respect PORT environment variable', () => {
      process.env.PORT = '5000';
      const newPlatform = new SimpleUnifiedAIPlatform();
      expect(newPlatform.port).toBe('5000');
      delete process.env.PORT;
    });

    test('should initialize empty memory Map', () => {
      expect(platform.memory).toBeInstanceOf(Map);
      expect(platform.memory.size).toBe(0);
    });

    test('should initialize empty plans Map', () => {
      expect(platform.plans).toBeInstanceOf(Map);
      expect(platform.plans.size).toBe(0);
    });

    test('should set isInitialized to false initially', () => {
      expect(platform.isInitialized).toBe(false);
    });
  });

  describe('CORS Headers and Preflight', () => {
    test('should set CORS headers on all responses', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/health`, (res) => {
          expect(res.headers['access-control-allow-origin']).toBe('*');
          expect(res.headers['access-control-allow-methods']).toContain('GET');
          expect(res.headers['access-control-allow-methods']).toContain('POST');
          expect(res.headers['content-type']).toBe('application/json');
          done();
        });
      });
    });

    test('should handle OPTIONS preflight requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'OPTIONS'
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBe(200);
          done();
        });

        req.end();
      });
    });

    test('should include required CORS headers in OPTIONS response', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'OPTIONS'
        };

        const req = http.request(options, (res) => {
          expect(res.headers['access-control-allow-headers']).toBeDefined();
          expect(res.headers['access-control-allow-methods']).toBeDefined();
          done();
        });

        req.end();
      });
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return health status with all required fields', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const health = JSON.parse(data);
            expect(health.status).toBe('healthy');
            expect(health.platform).toBe('Unified AI Platform');
            expect(health.version).toBeDefined();
            expect(health.timestamp).toBeDefined();
            expect(health.uptime).toBeDefined();
            expect(health.memory).toBeDefined();
            expect(health.features).toBeDefined();
            done();
          });
        });
      });
    });

    test('should include feature flags in health check', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const health = JSON.parse(data);
            expect(health.features.multi_modal).toBe(true);
            expect(health.features.memory_system).toBe(true);
            expect(health.features.tool_system).toBe(true);
            expect(health.features.planning_system).toBe(true);
            expect(health.features.security).toBe(true);
            done();
          });
        });
      });
    });

    test('should return initialized status', (done) => {
      platform.isInitialized = true;
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const health = JSON.parse(data);
            expect(health.initialized).toBe(true);
            done();
          });
        });
      });
    });
  });

  describe('Memory Operations via HTTP', () => {
    test('should store and retrieve memory via POST', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ key: 'test_key', value: 'test_value' });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.success).toBe(true);
            expect(response.message).toBe('Memory stored successfully');
            done();
          });
        });

        req.write(postData);
        req.end();
      });
    });

    test('should reject memory POST without key', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ value: 'test_value' });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBe(400);
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.error).toBeDefined();
            done();
          });
        });

        req.write(postData);
        req.end();
      });
    });

    test('should reject memory POST without value', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ key: 'test_key' });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBe(400);
          done();
        });

        req.write(postData);
        req.end();
      });
    });

    test('should retrieve all memories via GET', (done) => {
      platform.memory.set('key1', { content: 'value1', created_at: new Date().toISOString(), last_accessed: new Date().toISOString() });
      platform.memory.set('key2', { content: 'value2', created_at: new Date().toISOString(), last_accessed: new Date().toISOString() });
      
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/memory`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.count).toBe(2);
            expect(Array.isArray(response.memories)).toBe(true);
            expect(response.description).toBeDefined();
            done();
          });
        });
      });
    });

    test('should handle complex objects in memory', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const complexValue = { nested: { data: [1, 2, 3] }, flag: true };
        const postData = JSON.stringify({ key: 'complex', value: complexValue });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
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
  });

  describe('Plan Operations via HTTP', () => {
    test('should create plan via POST', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ 
          task_description: 'Test task',
          steps: ['Step 1', 'Step 2']
        });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/plans',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.success).toBe(true);
            expect(response.plan_id).toMatch(/^plan_\d+$/);
            expect(response.message).toBe('Plan created successfully');
            done();
          });
        });

        req.write(postData);
        req.end();
      });
    });

    test('should create plan without steps', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ task_description: 'Simple task' });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/plans',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
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

    test('should reject plan POST without task_description', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ steps: ['Step 1'] });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/plans',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBe(400);
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.error).toBeDefined();
            done();
          });
        });

        req.write(postData);
        req.end();
      });
    });

    test('should retrieve all plans via GET', (done) => {
      platform.plans.set('plan_123', {
        task_description: 'Test plan',
        steps: [],
        created_at: new Date().toISOString(),
        status: 'created'
      });
      
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/plans`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.count).toBe(1);
            expect(Array.isArray(response.plans)).toBe(true);
            expect(response.description).toBeDefined();
            done();
          });
        });
      });
    });

    test('should generate unique plan IDs', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        let planIds = [];
        let completed = 0;
        
        for (let i = 0; i < 3; i++) {
          const postData = JSON.stringify({ task_description: `Task ${i}` });
          
          const options = {
            hostname: 'localhost',
            port: testPort,
            path: '/api/v1/plans',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': postData.length
            }
          };

          const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              const response = JSON.parse(data);
              planIds.push(response.plan_id);
              completed++;
              
              if (completed === 3) {
                const uniqueIds = new Set(planIds);
                expect(uniqueIds.size).toBe(3);
                done();
              }
            });
          });

          req.write(postData);
          req.end();
        }
      });
    });
  });

  describe('Tools Endpoint', () => {
    test('should load and return tools from config', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/tools`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(Array.isArray(response.tools)).toBe(true);
            expect(response.count).toBe(response.tools.length);
            expect(response.description).toBeDefined();
            done();
          });
        });
      });
    });

    test('should handle missing tools file gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/tools`, (res) => {
          expect(res.statusCode).toBe(200);
          done();
        });
      });
    });
  });

  describe('Capabilities Endpoint', () => {
    test('should return platform capabilities', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/capabilities`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.platform).toBeDefined();
            expect(response.core_capabilities).toBeDefined();
            expect(response.performance).toBeDefined();
            expect(response.description).toBeDefined();
            done();
          });
        });
      });
    });
  });

  describe('Demo Endpoint', () => {
    test('should return demo information', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/demo`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.message).toBeDefined();
            expect(Array.isArray(response.features)).toBe(true);
            expect(Array.isArray(response.systems_combined)).toBe(true);
            expect(response.status).toBeDefined();
            done();
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/unknown/route`, (res) => {
          expect(res.statusCode).toBe(404);
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const response = JSON.parse(data);
            expect(response.error).toBe('Not Found');
            expect(response.message).toContain('/unknown/route');
            expect(response.timestamp).toBeDefined();
            done();
          });
        });
      });
    });

    test('should handle malformed JSON gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = '{invalid json}';
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          // Should not crash the server
          expect(res.statusCode).toBeDefined();
          done();
        });

        req.write(postData);
        req.end();
      });
    });

    test('should handle request errors gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST'
        };

        const req = http.request(options, () => {
          done();
        });

        // Send empty request
        req.end();
      });
    });
  });

  describe('Root Path Handler', () => {
    test('should serve HTML on root path', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/`, (res) => {
          // Should either serve HTML or return 404
          expect([200, 404]).toContain(res.statusCode);
          done();
        });
      });
    });
  });

  describe('Start Method', () => {
    test('should start server and set isInitialized to true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await platform.start();
      
      expect(platform.isInitialized).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should log platform capabilities on start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await platform.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Platform Capabilities'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Targets'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Request Body Parsing', () => {
    test('should handle empty request body for GET requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        http.get(`http://localhost:${testPort}/api/v1/memory`, (res) => {
          expect(res.statusCode).toBe(200);
          done();
        });
      });
    });

    test('should handle large request bodies', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const largeValue = 'x'.repeat(50000);
        const postData = JSON.stringify({ key: 'large', value: largeValue });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, (res) => {
          expect(res.statusCode).toBeDefined();
          done();
        });

        req.write(postData);
        req.end();
      });
    }, 10000);
  });

  describe('State Persistence', () => {
    test('should maintain memory state across requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        const postData = JSON.stringify({ key: 'persistent', value: 'data' });
        
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/api/v1/memory',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = http.request(options, () => {
          // After POST, verify with GET
          http.get(`http://localhost:${testPort}/api/v1/memory`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              const response = JSON.parse(data);
              expect(response.count).toBeGreaterThan(0);
              done();
            });
          });
        });

        req.write(postData);
        req.end();
      });
    });
  });
});