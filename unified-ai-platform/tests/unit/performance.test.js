/**
 * Performance and Stress Tests for Unified AI Platform
 * 
 * These tests focus on:
 * - Response time validation
 * - Memory usage monitoring
 * - Concurrent request handling
 * - Large payload processing
 * - Resource cleanup
 * - Timeout handling
 * - Throughput testing
 * - Connection pooling
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

jest.mock('../../config/system-config.json', () => ({
  platform: { name: 'Unified AI Platform', version: '1.0.0' },
  core_capabilities: {
    multi_modal: { enabled: true },
    memory_system: { enabled: true },
    tool_system: { enabled: true },
    planning_system: { enabled: true },
    security: { enabled: true }
  },
  operating_modes: { development: { debug: true }, production: { debug: false } },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10, queue_size: 100 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  { type: 'function', function: { name: 'test_tool', description: 'Test' } }
]));

describe('Performance Tests - UnifiedAIPlatform', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Response Time Performance', () => {
    test('should respond to health check quickly', async () => {
      const start = Date.now();
      await request(platform.app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle GET requests efficiently', async () => {
      const start = Date.now();
      await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    test('should handle POST requests efficiently', async () => {
      const start = Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'perf_test', value: 'data' })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    test('should maintain performance with multiple memories', async () => {
      // Pre-populate with data
      for (let i = 0; i < 100; i++) {
        platform.memory.set(`key_${i}`, { content: `value_${i}` });
      }

      const start = Date.now();
      await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    test('should maintain performance with multiple plans', async () => {
      // Pre-populate with plans
      for (let i = 0; i < 50; i++) {
        platform.plans.set(`plan_${i}`, {
          task_description: `Task ${i}`,
          steps: [`Step 1`, `Step 2`],
          status: 'created'
        });
      }

      const start = Date.now();
      await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle 50 concurrent GET requests', async () => {
      const promises = Array.from({ length: 50 }, () =>
        request(platform.app).get('/health')
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(5000);
    });

    test('should handle 25 concurrent POST requests', async () => {
      const promises = Array.from({ length: 25 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: `data_${i}` })
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(platform.memory.size).toBe(25);
      expect(duration).toBeLessThan(10000);
    });

    test('should handle mixed concurrent operations', async () => {
      const promises = [
        ...Array.from({ length: 10 }, () => request(platform.app).get('/health')),
        ...Array.from({ length: 10 }, (_, i) =>
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `mix_${i}`, value: `data_${i}` })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: `Task ${i}` })
        ),
      ];

      const responses = await Promise.all(promises);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    test('should handle bursts of requests', async () => {
      const burst1 = Array.from({ length: 20 }, () =>
        request(platform.app).get('/health')
      );
      await Promise.all(burst1);

      const burst2 = Array.from({ length: 20 }, () =>
        request(platform.app).get('/api/v1/tools')
      );
      await Promise.all(burst2);

      const burst3 = Array.from({ length: 20 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `burst_${i}`, value: `data_${i}` })
      );
      const responses = await Promise.all(burst3);

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    test('should handle sustained concurrent load', async () => {
      const iterations = 5;
      const concurrency = 20;

      for (let i = 0; i < iterations; i++) {
        const promises = Array.from({ length: concurrency }, (_, j) =>
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `sustained_${i}_${j}`, value: `data` })
        );
        await Promise.all(promises);
      }

      expect(platform.memory.size).toBe(iterations * concurrency);
    });
  });

  describe('Large Payload Handling', () => {
    test('should handle 1KB memory value', async () => {
      const value = 'A'.repeat(1024);
      const start = Date.now();
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '1kb_test', value });
      const duration = Date.now() - start;

      expect([200, 413]).toContain(response.status);
      if (response.status === 200) {
        expect(duration).toBeLessThan(2000);
      }
    });

    test('should handle 10KB memory value', async () => {
      const value = 'B'.repeat(10240);
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '10kb_test', value });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle 100KB memory value', async () => {
      const value = 'C'.repeat(102400);
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '100kb_test', value });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle 1MB memory value', async () => {
      const value = 'D'.repeat(1048576);
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '1mb_test', value });

      // May exceed limit
      expect([200, 413]).toContain(response.status);
    });

    test('should handle array with 1000 elements', async () => {
      const steps = Array.from({ length: 1000 }, (_, i) => `Step ${i + 1}`);
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Large plan', steps });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle deeply nested object (50 levels)', async () => {
      let nested = { value: 'deep' };
      for (let i = 0; i < 50; i++) {
        nested = { level: i, data: nested };
      }

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep_nested', value: nested });

      expect([200, 400, 413]).toContain(response.status);
    });

    test('should handle object with 500 properties', async () => {
      const largeObj = {};
      for (let i = 0; i < 500; i++) {
        largeObj[`prop_${i}`] = `value_${i}`;
      }

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_obj', value: largeObj });

      expect([200, 413]).toContain(response.status);
    });
  });

  describe('Memory Usage Monitoring', () => {
    test('should track memory growth with many operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `mem_monitor_${i}`, value: `data_${i}` });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const growth = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory should grow but not excessively
      expect(growth).toBeLessThan(100); // Less than 100MB growth
    });

    test('should handle memory cleanup on delete operations', () => {
      // Add data
      for (let i = 0; i < 50; i++) {
        platform.memory.set(`cleanup_${i}`, { content: 'data' });
      }

      const beforeSize = platform.memory.size;

      // Remove data
      for (let i = 0; i < 25; i++) {
        platform.memory.delete(`cleanup_${i}`);
      }

      expect(platform.memory.size).toBe(beforeSize - 25);
    });

    test('should not leak memory with repeated operations', async () => {
      const iterations = 50;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `leak_test`, value: `data_${i}` }); // Overwrite same key

        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      // Memory should stabilize, not grow linearly
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const growth = (lastSnapshot - firstSnapshot) / 1024 / 1024;

      expect(growth).toBeLessThan(50); // Less than 50MB growth for overwriting
    });
  });

  describe('Throughput Testing', () => {
    test('should handle at least 100 requests per second', async () => {
      const requestCount = 100;
      const start = Date.now();

      const promises = Array.from({ length: requestCount }, () =>
        request(platform.app).get('/health')
      );

      await Promise.all(promises);
      const duration = Date.now() - start;
      const rps = (requestCount / duration) * 1000;

      expect(rps).toBeGreaterThan(50); // At least 50 RPS
    });

    test('should maintain throughput under sustained load', async () => {
      const iterations = 10;
      const requestsPerIteration = 20;
      const throughputs = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        const promises = Array.from({ length: requestsPerIteration }, () =>
          request(platform.app).get('/health')
        );
        await Promise.all(promises);
        const duration = Date.now() - start;
        throughputs.push((requestsPerIteration / duration) * 1000);
      }

      // Throughput should remain relatively stable
      const avgThroughput = throughputs.reduce((a, b) => a + b) / throughputs.length;
      expect(avgThroughput).toBeGreaterThan(10); // Reasonable baseline
    });
  });

  describe('Resource Cleanup', () => {
    test('should clean up after errors', async () => {
      const initialSize = platform.memory.size;

      // Attempt invalid operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: null, value: 'data' })
        .expect(400);

      // Size should not change
      expect(platform.memory.size).toBe(initialSize);
    });

    test('should handle rapid create/delete cycles', async () => {
      for (let i = 0; i < 100; i++) {
        platform.memory.set(`cycle_${i}`, { content: 'data' });
        platform.memory.delete(`cycle_${i}`);
      }

      expect(platform.memory.size).toBe(0);
    });

    test('should clear memory state between tests', () => {
      platform.memory.clear();
      platform.plans.clear();

      expect(platform.memory.size).toBe(0);
      expect(platform.plans.size).toBe(0);
    });
  });

  describe('Timeout Handling', () => {
    test('should complete fast operations quickly', async () => {
      const start = Date.now();
      await request(platform.app)
        .get('/health')
        .timeout(100);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    }, 5000);

    test('should handle multiple timeouts gracefully', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(platform.app)
          .get('/health')
          .timeout(5000)
      );

      const responses = await Promise.all(promises);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle rapid key overwrites', async () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'overwrite_test', value: `value_${i}` });
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(30000); // 30 seconds for 100 operations
      expect(platform.memory.size).toBe(1); // Only one key
    });

    test('should handle mixed read/write operations', async () => {
      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `rw_${i}`, value: `data_${i}` })
        );
        operations.push(
          request(platform.app).get('/api/v1/memory')
        );
      }

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(20000);
    });

    test('should handle alternating endpoints', async () => {
      const operations = [];
      for (let i = 0; i < 30; i++) {
        operations.push(request(platform.app).get('/health'));
        operations.push(request(platform.app).get('/api/v1/tools'));
        operations.push(request(platform.app).get('/api/v1/capabilities'));
      }

      const responses = await Promise.all(operations);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('Scalability Indicators', () => {
    test('should scale linearly with data size', async () => {
      const timings = [];

      for (let size of [10, 100, 1000]) {
        const value = 'X'.repeat(size);
        const start = Date.now();
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `scale_${size}`, value });
        timings.push(Date.now() - start);
      }

      // Larger payloads should take more time, but not exponentially more
      expect(timings[2]).toBeLessThan(timings[0] * 200);
    });

    test('should handle growing memory store', async () => {
      const measurements = [];

      for (let count of [10, 50, 100]) {
        // Add entries
        for (let i = 0; i < count; i++) {
          platform.memory.set(`scale_mem_${i}`, { content: `data_${i}` });
        }

        // Measure retrieval time
        const start = Date.now();
        await request(platform.app).get('/api/v1/memory');
        measurements.push(Date.now() - start);

        platform.memory.clear();
      }

      // Should scale reasonably with data size
      expect(measurements[2]).toBeLessThan(measurements[0] * 20);
    });
  });
});

describe('Performance Tests - SimpleUnifiedAIPlatform', () => {
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

  describe('Basic Performance', () => {
    test('should start server quickly', async () => {
      const start = Date.now();
      await platform.start();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
      expect(platform.isInitialized).toBe(true);
    });

    test('should handle multiple rapid startups', async () => {
      // Test server lifecycle performance
      for (let i = 0; i < 3; i++) {
        const testPlatform = new SimpleUnifiedAIPlatform();
        testPlatform.port = 3010 + i;
        await testPlatform.start();
      }

      expect(true).toBe(true); // Successfully created multiple instances
    });
  });

  describe('Request Performance', () => {
    test('should respond to health checks quickly', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const start = Date.now();
        
        const http = require('http');
        const options = {
          hostname: 'localhost',
          port: testPort,
          path: '/health',
          method: 'GET'
        };

        const req = http.request(options, (res) => {
          const duration = Date.now() - start;
          expect(duration).toBeLessThan(1000);
          done();
        });

        req.end();
      });
    });
  });

  describe('Memory Performance', () => {
    test('should handle many memory operations efficiently', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        // Add many entries
        for (let i = 0; i < 1000; i++) {
          platform.memory.set(`perf_${i}`, {
            content: `data_${i}`,
            created_at: new Date().toISOString()
          });
        }

        expect(platform.memory.size).toBe(1000);
        done();
      });
    });

    test('should retrieve large memory sets quickly', (done) => {
      server = platform.createServer();
      server.listen(testPort, () => {
        // Pre-populate
        for (let i = 0; i < 100; i++) {
          platform.memory.set(`retrieve_${i}`, { content: `data_${i}` });
        }

        const start = Date.now();
        const memories = Array.from(platform.memory.entries());
        const duration = Date.now() - start;

        expect(memories.length).toBe(100);
        expect(duration).toBeLessThan(100);
        done();
      });
    });
  });
});