/**
 * Integration Tests for SimpleUnifiedAIPlatform
 * 
 * These tests cover integrated workflows for the HTTP-based server:
 * - Multi-step workflows
 * - State management
 * - Real-world usage scenarios
 * - Performance under load
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

describe('SimpleUnifiedAIPlatform Integration Tests', () => {
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

  describe('Complete Workflow Scenarios', () => {
    test('should handle full application lifecycle', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // 1. Check system health
        const health = await makeRequest(server, 'GET', '/health');
        expect(health.status).toBe(200);
        expect(health.body.status).toBe('healthy');

        // 2. Get capabilities
        const capabilities = await makeRequest(server, 'GET', '/api/v1/capabilities');
        expect(capabilities.status).toBe(200);

        // 3. Load tools
        const tools = await makeRequest(server, 'GET', '/api/v1/tools');
        expect(tools.status).toBe(200);

        // 4. Store initial configuration
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'config',
          value: { environment: 'test', version: '1.0.0' }
        });

        // 5. Create project plan
        const plan = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Setup test environment',
          steps: ['Configure', 'Initialize', 'Validate']
        });
        expect(plan.status).toBe(200);

        // 6. Verify all data
        const memCheck = await makeRequest(server, 'GET', '/api/v1/memory');
        const planCheck = await makeRequest(server, 'GET', '/api/v1/plans');
        
        expect(memCheck.body.count).toBe(1);
        expect(planCheck.body.count).toBe(1);
        
        done();
      });
    });

    test('should support iterative development workflow', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Iteration 1: Initial setup
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'iteration',
          value: 1
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Iteration 1: Basic features'
        });

        // Iteration 2: Add features
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'iteration',
          value: 2
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Iteration 2: Enhanced features'
        });

        // Iteration 3: Polish
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'iteration',
          value: 3
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Iteration 3: Polish and optimize'
        });

        // Verify progression
        expect(platform.memory.get('iteration').content).toBe(3);
        expect(platform.plans.size).toBe(3);
        
        done();
      });
    });

    test('should handle user session workflow', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const sessionId = 'session_' + Date.now();

        // Session start
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: `${sessionId}_start`,
          value: new Date().toISOString()
        });

        // User actions
        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'User task 1'
        });

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: `${sessionId}_preferences`,
          value: { theme: 'dark', language: 'en' }
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'User task 2'
        });

        // Session end
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: `${sessionId}_end`,
          value: new Date().toISOString()
        });

        // Verify session data
        expect(platform.memory.size).toBe(3);
        expect(platform.plans.size).toBe(2);
        
        done();
      });
    });
  });

  describe('Concurrent Operation Scenarios', () => {
    test('should handle mixed concurrent requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const requests = [];

        // Mix of different operation types
        for (let i = 0; i < 5; i++) {
          requests.push(makeRequest(server, 'POST', '/api/v1/memory', {
            key: `concurrent_mem_${i}`,
            value: `data_${i}`
          }));
        }

        for (let i = 0; i < 3; i++) {
          requests.push(makeRequest(server, 'POST', '/api/v1/plans', {
            task_description: `Concurrent plan ${i}`
          }));
        }

        requests.push(makeRequest(server, 'GET', '/health'));
        requests.push(makeRequest(server, 'GET', '/api/v1/tools'));
        requests.push(makeRequest(server, 'GET', '/api/v1/demo'));

        const results = await Promise.all(requests);
        
        results.forEach(result => {
          expect(result.status).toBeLessThan(400);
        });

        expect(platform.memory.size).toBe(5);
        expect(platform.plans.size).toBe(3);
        
        done();
      });
    });

    test('should maintain data consistency under load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const operations = [];

        // Create 50 memory entries concurrently
        for (let i = 0; i < 50; i++) {
          operations.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `load_${i}`,
              value: { index: i, timestamp: Date.now() }
            })
          );
        }

        await Promise.all(operations);

        // Verify all entries
        const check = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(check.body.count).toBe(50);
        expect(platform.memory.size).toBe(50);
        
        done();
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from invalid operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Valid operation
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'valid1',
          value: 'data1'
        });

        // Invalid operations
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: '',
          value: 'invalid'
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: ''
        });

        // More valid operations
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'valid2',
          value: 'data2'
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Valid plan'
        });

        // System should still be operational
        const health = await makeRequest(server, 'GET', '/health');
        expect(health.status).toBe(200);

        expect(platform.memory.size).toBe(2);
        expect(platform.plans.size).toBe(1);
        
        done();
      });
    });

    test('should handle rapid state changes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const key = 'rapid_change';

        // Rapidly update same key
        for (let i = 0; i < 20; i++) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: key,
            value: `version_${i}`
          });
        }

        // Should have final value
        const stored = platform.memory.get(key);
        expect(stored.content).toMatch(/^version_\d+$/);
        expect(platform.memory.size).toBe(1);
        
        done();
      });
    });
  });

  describe('Complex Data Flow', () => {
    test('should handle nested workflow dependencies', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Setup phase
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'phase',
          value: 'setup'
        });

        const setupPlan = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Setup infrastructure',
          steps: ['Configure servers', 'Setup database', 'Deploy monitoring']
        });

        // Development phase
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'phase',
          value: 'development'
        });

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'setup_plan_id',
          value: setupPlan.body.plan_id
        });

        const devPlan = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Implement features',
          steps: ['Feature A', 'Feature B', 'Feature C']
        });

        // Testing phase
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'phase',
          value: 'testing'
        });

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'dev_plan_id',
          value: devPlan.body.plan_id
        });

        await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Test and validate',
          steps: ['Unit tests', 'Integration tests', 'E2E tests']
        });

        // Verify complete workflow
        expect(platform.memory.size).toBe(3);
        expect(platform.plans.size).toBe(3);
        expect(platform.memory.get('phase').content).toBe('testing');
        
        done();
      });
    });

    test('should handle data relationships', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Create related data structures
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'project_metadata',
          value: {
            name: 'Test Project',
            owner: 'test_user',
            created: new Date().toISOString()
          }
        });

        const plan1 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Backend development'
        });

        const plan2 = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Frontend development'
        });

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'project_plans',
          value: {
            backend: plan1.body.plan_id,
            frontend: plan2.body.plan_id
          }
        });

        // Verify relationships
        const projectPlans = platform.memory.get('project_plans');
        expect(projectPlans.content.backend).toBeDefined();
        expect(projectPlans.content.frontend).toBeDefined();
        expect(platform.plans.has(projectPlans.content.backend)).toBe(true);
        expect(platform.plans.has(projectPlans.content.frontend)).toBe(true);
        
        done();
      });
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle sustained load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const startTime = Date.now();
        const operations = [];

        // Simulate sustained load
        for (let i = 0; i < 100; i++) {
          operations.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `perf_${i}`,
              value: { data: 'x'.repeat(1000) }
            })
          );
        }

        await Promise.all(operations);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete in reasonable time
        expect(duration).toBeLessThan(10000); // 10 seconds
        expect(platform.memory.size).toBe(100);
        
        done();
      });
    });

    test('should maintain response times under concurrent load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const responseTimes = [];

        for (let i = 0; i < 20; i++) {
          const start = Date.now();
          await makeRequest(server, 'GET', '/health');
          const responseTime = Date.now() - start;
          responseTimes.push(responseTime);
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        
        // Average response time should be reasonable
        expect(avgResponseTime).toBeLessThan(100); // 100ms average
        
        done();
      });
    });
  });

  describe('Resource Management', () => {
    test('should handle large dataset operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Store large dataset
        for (let i = 0; i < 200; i++) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: `dataset_${i}`,
            value: {
              index: i,
              data: 'x'.repeat(500),
              metadata: {
                created: new Date().toISOString(),
                tags: ['test', 'large', 'dataset']
              }
            }
          });
        }

        // Query should still work
        const response = await makeRequest(server, 'GET', '/api/v1/memory');
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(200);
        
        done();
      });
    });
  });

  describe('API Consistency', () => {
    test('should maintain consistent response structure', (done) => {
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
          expect(response.headers['content-type']).toBe('application/json');
          expect(typeof response.body).toBe('object');
        }
        
        done();
      });
    });

    test('should provide consistent error formats', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const invalidRequests = [
          { method: 'GET', path: '/api/v1/nonexistent' },
          { method: 'POST', path: '/api/v1/memory', data: {} },
          { method: 'POST', path: '/api/v1/plans', data: {} }
        ];

        for (const req of invalidRequests) {
          const response = await makeRequest(server, req.method, req.path, req.data);
          
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.error || response.body.message).toBeDefined();
        }
        
        done();
      });
    });
  });
});