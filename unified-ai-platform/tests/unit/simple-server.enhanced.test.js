/**
 * Enhanced Tests for SimpleUnifiedAIPlatform
 * 
 * Comprehensive tests covering advanced scenarios for the HTTP-based server:
 * - Advanced state management
 * - Complex workflows
 * - Edge case handling
 * - Performance scenarios
 * - Error recovery
 */

const http = require('http');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

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

describe('SimpleUnifiedAIPlatform Enhanced Tests', () => {
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

  describe('Advanced Memory Patterns', () => {
    test('should handle memory with complex metadata', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const complexMemory = {
          key: 'user_profile',
          value: {
            user: {
              id: 'user123',
              name: 'Test User',
              preferences: {
                theme: 'dark',
                language: 'en',
                notifications: {
                  email: true,
                  push: false
                }
              }
            },
            metadata: {
              created: new Date().toISOString(),
              version: 1,
              tags: ['active', 'verified']
            }
          }
        };

        await makeRequest(server, 'POST', '/api/v1/memory', complexMemory);

        const stored = platform.memory.get('user_profile');
        expect(stored.content.user.preferences.theme).toBe('dark');
        expect(stored.content.metadata.tags).toContain('verified');
        
        done();
      });
    });

    test('should support memory namespacing pattern', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const namespaces = ['app:config', 'user:settings', 'session:data'];

        for (const ns of namespaces) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: `${ns}:item1`,
            value: { namespace: ns, data: 'test' }
          });
        }

        expect(platform.memory.size).toBe(3);
        expect(platform.memory.has('app:config:item1')).toBe(true);
        
        done();
      });
    });

    test('should handle memory key collision resolution', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const key = 'collision_test';

        // First write
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key,
          value: { version: 1, data: 'first' }
        });

        // Second write (should overwrite)
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key,
          value: { version: 2, data: 'second' }
        });

        const stored = platform.memory.get(key);
        expect(stored.content.version).toBe(2);
        expect(stored.content.data).toBe('second');
        
        done();
      });
    });

    test('should handle bulk memory operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const bulkData = Array.from({ length: 50 }, (_, i) => ({
          key: `bulk_${i}`,
          value: { index: i, data: `item_${i}` }
        }));

        for (const item of bulkData) {
          await makeRequest(server, 'POST', '/api/v1/memory', item);
        }

        expect(platform.memory.size).toBe(50);
        
        // Verify random samples
        expect(platform.memory.get('bulk_10').content.index).toBe(10);
        expect(platform.memory.get('bulk_25').content.index).toBe(25);
        
        done();
      });
    });
  });

  describe('Advanced Plan Workflows', () => {
    test('should handle hierarchical plan structures', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Parent plan
        const parent = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Parent project',
          steps: ['Init', 'Execute', 'Finalize']
        });

        // Child plans
        const children = [];
        for (let i = 0; i < 3; i++) {
          const child = await makeRequest(server, 'POST', '/api/v1/plans', {
            task_description: `Child task ${i}`,
            steps: [`Child ${i} step 1`, `Child ${i} step 2`]
          });
          children.push(child.body.plan_id);
        }

        // Store hierarchy
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'plan_hierarchy',
          value: {
            parent: parent.body.plan_id,
            children
          }
        });

        expect(platform.plans.size).toBe(4);
        const hierarchy = platform.memory.get('plan_hierarchy');
        expect(hierarchy.content.children).toHaveLength(3);
        
        done();
      });
    });

    test('should handle plan execution tracking', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const planResp = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Tracked execution',
          steps: ['Step 1', 'Step 2', 'Step 3']
        });

        const planId = planResp.body.plan_id;
        const executionLog = [];

        // Simulate step execution
        const plan = platform.plans.get(planId);
        for (let i = 0; i < plan.steps.length; i++) {
          executionLog.push({
            step: plan.steps[i],
            status: 'completed',
            timestamp: new Date().toISOString(),
            duration_ms: Math.random() * 1000
          });
        }

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: `execution_log_${planId}`,
          value: executionLog
        });

        const log = platform.memory.get(`execution_log_${planId}`);
        expect(log.content).toHaveLength(3);
        
        done();
      });
    });

    test('should handle plan retry mechanisms', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const originalPlan = await makeRequest(server, 'POST', '/api/v1/plans', {
          task_description: 'Task with retries'
        });

        // Simulate retries
        const retryHistory = [];
        for (let attempt = 1; attempt <= 3; attempt++) {
          retryHistory.push({
            attempt,
            planId: originalPlan.body.plan_id,
            timestamp: new Date().toISOString(),
            status: attempt < 3 ? 'failed' : 'success'
          });
        }

        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: `retry_history_${originalPlan.body.plan_id}`,
          value: retryHistory
        });

        const history = platform.memory.get(`retry_history_${originalPlan.body.plan_id}`);
        expect(history.content).toHaveLength(3);
        expect(history.content[2].status).toBe('success');
        
        done();
      });
    });
  });

  describe('Data Consistency Scenarios', () => {
    test('should maintain consistency during rapid updates', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const key = 'rapid_update_test';
        
        // Rapid sequential updates
        for (let i = 0; i < 20; i++) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key,
            value: { counter: i, timestamp: Date.now() }
          });
        }

        const final = platform.memory.get(key);
        expect(final.content.counter).toBe(19);
        
        done();
      });
    });

    test('should handle interleaved read/write operations', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const operations = [];

        for (let i = 0; i < 10; i++) {
          // Write
          operations.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `interleave_${i}`,
              value: i
            })
          );

          // Read
          operations.push(
            makeRequest(server, 'GET', '/api/v1/memory')
          );
        }

        const results = await Promise.all(operations);
        const writes = results.filter((_, i) => i % 2 === 0);
        const reads = results.filter((_, i) => i % 2 === 1);

        // All writes should succeed
        writes.forEach(w => expect(w.status).toBe(200));
        
        // All reads should succeed
        reads.forEach(r => expect(r.status).toBe(200));
        
        done();
      });
    });

    test('should maintain data integrity under load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const writeOps = [];

        // Concurrent writes with verification data
        for (let i = 0; i < 30; i++) {
          writeOps.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `integrity_${i}`,
              value: {
                index: i,
                checksum: `check_${i}`,
                timestamp: Date.now()
              }
            })
          );
        }

        await Promise.all(writeOps);

        // Verify all data
        for (let i = 0; i < 30; i++) {
          const stored = platform.memory.get(`integrity_${i}`);
          expect(stored.content.index).toBe(i);
          expect(stored.content.checksum).toBe(`check_${i}`);
        }
        
        done();
      });
    });
  });

  describe('Error Recovery Mechanisms', () => {
    test('should recover from malformed request sequences', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Valid request
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'before_error',
          value: 'valid'
        });

        // Malformed requests
        await makeRequest(server, 'POST', '/api/v1/memory', {
          invalid: 'structure'
        });

        try {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: 'test',
            value: undefined
          });
        } catch (e) {
          // Expected to fail
        }

        // Valid request after errors
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'after_error',
          value: 'recovered'
        });

        // System should have recovered
        expect(platform.memory.has('before_error')).toBe(true);
        expect(platform.memory.has('after_error')).toBe(true);
        
        done();
      });
    });

    test('should handle connection interruptions gracefully', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Simulate interrupted request
        const addr = server.address();
        const req = http.request({
          hostname: 'localhost',
          port: addr.port,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        req.write('{"key": "interrupted"');
        req.destroy(); // Interrupt

        // Give server time to handle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Server should still be operational
        const health = await makeRequest(server, 'GET', '/health');
        expect(health.status).toBe(200);
        
        done();
      });
    });
  });

  describe('Performance Optimization Scenarios', () => {
    test('should handle request bursts efficiently', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const burstSize = 50;
        const startTime = Date.now();

        const requests = Array.from({ length: burstSize }, (_, i) =>
          makeRequest(server, 'POST', '/api/v1/memory', {
            key: `burst_${i}`,
            value: `data_${i}`
          })
        );

        await Promise.all(requests);
        const duration = Date.now() - startTime;

        // Should complete burst in reasonable time
        expect(duration).toBeLessThan(5000);
        expect(platform.memory.size).toBe(burstSize);
        
        done();
      });
    });

    test('should optimize repeated identical requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Populate data
        await makeRequest(server, 'POST', '/api/v1/memory', {
          key: 'cached_data',
          value: 'test'
        });

        const readCount = 20;
        const startTime = Date.now();

        const reads = Array.from({ length: readCount }, () =>
          makeRequest(server, 'GET', '/api/v1/memory')
        );

        const results = await Promise.all(reads);
        const duration = Date.now() - startTime;

        // All reads should succeed
        results.forEach(r => expect(r.status).toBe(200));
        
        // Should be fast (< 50ms per read average)
        expect(duration / readCount).toBeLessThan(50);
        
        done();
      });
    });
  });

  describe('Advanced Validation', () => {
    test('should validate complex nested structures', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const complexStructure = {
          key: 'nested_validation',
          value: {
            level1: {
              level2: {
                level3: {
                  array: [1, 2, { nested: true }],
                  string: 'deep value'
                }
              },
              parallel: {
                data: 'side branch'
              }
            }
          }
        };

        await makeRequest(server, 'POST', '/api/v1/memory', complexStructure);

        const stored = platform.memory.get('nested_validation');
        expect(stored.content.level1.level2.level3.array[2].nested).toBe(true);
        
        done();
      });
    });

    test('should handle all JSON primitive types', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const primitives = {
          string: 'text',
          number: 42,
          boolean: true,
          null_value: null,
          array: [1, 2, 3],
          object: { key: 'value' }
        };

        for (const [key, value] of Object.entries(primitives)) {
          await makeRequest(server, 'POST', '/api/v1/memory', {
            key: `primitive_${key}`,
            value
          });
        }

        expect(platform.memory.size).toBe(6);
        
        done();
      });
    });

    test('should handle special numeric values', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const specialNumbers = [
          { key: 'zero', value: 0 },
          { key: 'negative', value: -42 },
          { key: 'float', value: 3.14159 },
          { key: 'large', value: Number.MAX_SAFE_INTEGER },
          { key: 'small', value: Number.MIN_SAFE_INTEGER }
        ];

        for (const item of specialNumbers) {
          await makeRequest(server, 'POST', '/api/v1/memory', item);
        }

        expect(platform.memory.get('zero').content).toBe(0);
        expect(platform.memory.get('float').content).toBeCloseTo(3.14159);
        
        done();
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle sustained high load', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const iterations = 5;
        const operationsPerIteration = 20;

        for (let i = 0; i < iterations; i++) {
          const ops = Array.from({ length: operationsPerIteration }, (_, j) =>
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `stress_${i}_${j}`,
              value: `iteration_${i}_item_${j}`
            })
          );

          await Promise.all(ops);
        }

        expect(platform.memory.size).toBe(iterations * operationsPerIteration);
        
        // System should still be responsive
        const health = await makeRequest(server, 'GET', '/health');
        expect(health.status).toBe(200);
        
        done();
      });
    });

    test('should handle mixed operation stress', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const operations = [];

        for (let i = 0; i < 30; i++) {
          operations.push(
            makeRequest(server, 'POST', '/api/v1/memory', {
              key: `mixed_mem_${i}`,
              value: i
            })
          );

          operations.push(
            makeRequest(server, 'POST', '/api/v1/plans', {
              task_description: `Mixed plan ${i}`
            })
          );

          operations.push(
            makeRequest(server, 'GET', '/health')
          );
        }

        const results = await Promise.all(operations);
        
        // All operations should complete
        results.forEach(r => expect(r.status).toBeLessThan(500));
        
        done();
      });
    });
  });

  describe('Endpoint Consistency', () => {
    test('should provide consistent response structure', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const endpoints = [
          { path: '/health', method: 'GET' },
          { path: '/api/v1/tools', method: 'GET' },
          { path: '/api/v1/memory', method: 'GET' },
          { path: '/api/v1/plans', method: 'GET' },
          { path: '/api/v1/capabilities', method: 'GET' },
          { path: '/api/v1/demo', method: 'GET' }
        ];

        for (const endpoint of endpoints) {
          const response = await makeRequest(server, endpoint.method, endpoint.path);
          
          expect(response.status).toBe(200);
          expect(typeof response.body).toBe('object');
          expect(response.headers['content-type']).toBe('application/json');
        }
        
        done();
      });
    });

    test('should maintain CORS consistency', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const paths = [
          '/health',
          '/api/v1/tools',
          '/api/v1/memory',
          '/api/v1/plans'
        ];

        for (const path of paths) {
          const response = await makeRequest(server, 'GET', path);
          
          expect(response.headers['access-control-allow-origin']).toBe('*');
          expect(response.headers['access-control-allow-methods']).toBeDefined();
        }
        
        done();
      });
    });
  });
});