/**
 * Performance and Stress Tests for UnifiedAIPlatform
 * 
 * These tests cover performance aspects including:
 * - Response time validation
 * - Concurrent request handling
 * - Memory efficiency
 * - Large payload handling
 * - Throughput testing
 * - Scalability considerations
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock configuration
jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Unified AI Platform',
    version: '1.0.0',
    description: 'Test platform'
  },
  core_capabilities: {
    multi_modal: { enabled: true },
    memory_system: { enabled: true },
    tool_system: { enabled: true },
    planning_system: { enabled: true },
    security: { enabled: true }
  },
  operating_modes: {
    development: { debug: true },
    production: { debug: false }
  },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  {
    type: 'function',
    function: {
      name: 'test_tool',
      description: 'A test tool'
    }
  }
]));

describe('UnifiedAIPlatform - Performance Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Response Time', () => {
    test('health endpoint should respond quickly', async () => {
      const start = Date.now();
      await request(platform.app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      // Should respond in under 100ms for simple endpoint
      expect(duration).toBeLessThan(100);
    });

    test('memory GET should be fast', async () => {
      const start = Date.now();
      await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('tools endpoint should respond quickly', async () => {
      const start = Date.now();
      await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('memory POST should be reasonably fast', async () => {
      const start = Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'perf_test', value: 'data' })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle 50 concurrent health checks', async () => {
      const promises = Array.from({ length: 50 }, () =>
        request(platform.app).get('/health')
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    test('should handle 100 concurrent memory writes', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: `data_${i}` })
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(100);
      expect(platform.memory.size).toBe(100);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);
    });

    test('should handle mixed concurrent operations', async () => {
      const operations = [
        ...Array.from({ length: 20 }, () => 
          request(platform.app).get('/health')
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `mix_${i}`, value: 'data' })
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: `Task ${i}` })
        ),
        ...Array.from({ length: 20 }, () =>
          request(platform.app).get('/api/v1/tools')
        ),
      ];

      const start = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - start;

      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(70); // At least 70% success

      expect(duration).toBeLessThan(15000);
    });

    test('should handle rapid sequential requests', async () => {
      const start = Date.now();
      
      for (let i = 0; i < 50; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `seq_${i}`, value: 'data' })
          .expect(200);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Large Payload Handling', () => {
    test('should handle 1MB memory value', async () => {
      const largeValue = 'A'.repeat(1024 * 1024); // 1MB

      const start = Date.now();
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_1mb', value: largeValue })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(5000);
    });

    test('should handle 5MB memory value', async () => {
      const largeValue = 'B'.repeat(5 * 1024 * 1024); // 5MB

      const start = Date.now();
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_5mb', value: largeValue })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(10000);
    });

    test('should handle plan with 1000 steps', async () => {
      const steps = Array.from({ length: 1000 }, (_, i) => `Step ${i + 1}: Do something important`);

      const start = Date.now();
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Large plan', steps })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.success).toBe(true);
      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toHaveLength(1000);
      expect(duration).toBeLessThan(3000);
    });

    test('should handle array with 10000 items', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `Item ${i}`,
        metadata: { index: i, timestamp: Date.now() }
      }));

      const start = Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_array', value: largeArray })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });

    test('should handle deeply nested object (100 levels)', async () => {
      let nested = { value: 'end' };
      for (let i = 0; i < 100; i++) {
        nested = { level: i, nested };
      }

      const start = Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep_nested', value: nested })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory with many operations', async () => {
      const initialHeap = process.memoryUsage().heapUsed;

      // Perform 500 operations
      for (let i = 0; i < 500; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `mem_leak_${i}`, value: 'data' });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowth = finalHeap - initialHeap;

      // Heap growth should be reasonable (less than 100MB)
      expect(heapGrowth).toBeLessThan(100 * 1024 * 1024);
    });

    test('should handle memory churn efficiently', async () => {
      const initialHeap = process.memoryUsage().heapUsed;

      // Create and overwrite memory repeatedly
      for (let i = 0; i < 100; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'churn_key', value: `data_${i}` });
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowth = finalHeap - initialHeap;

      // Should not grow significantly with overwrites
      expect(heapGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    test('should maintain stable memory with read operations', async () => {
      // Pre-populate data
      for (let i = 0; i < 100; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `read_${i}`, value: 'data' });
      }

      const initialHeap = process.memoryUsage().heapUsed;

      // Perform many reads
      for (let i = 0; i < 200; i++) {
        await request(platform.app)
          .get('/api/v1/memory')
          .expect(200);
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowth = finalHeap - initialHeap;

      // Reads should not increase memory significantly
      expect(heapGrowth).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Throughput', () => {
    test('should maintain good throughput for GET requests', async () => {
      const requestCount = 200;
      const start = Date.now();

      const promises = Array.from({ length: requestCount }, () =>
        request(platform.app).get('/health')
      );

      await Promise.all(promises);
      const duration = Date.now() - start;
      const throughput = (requestCount / duration) * 1000; // requests per second

      // Should handle at least 20 requests per second
      expect(throughput).toBeGreaterThan(20);
    });

    test('should maintain throughput for POST requests', async () => {
      const requestCount = 100;
      const start = Date.now();

      const promises = Array.from({ length: requestCount }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `throughput_${i}`, value: 'data' })
      );

      await Promise.all(promises);
      const duration = Date.now() - start;
      const throughput = (requestCount / duration) * 1000;

      // Should handle at least 10 POST requests per second
      expect(throughput).toBeGreaterThan(10);
    });
  });

  describe('Scalability', () => {
    test('should scale to 500 stored memories', async () => {
      const start = Date.now();

      for (let i = 0; i < 500; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `scale_${i}`, value: `data_${i}` });
      }

      const duration = Date.now() - start;

      expect(platform.memory.size).toBe(500);
      expect(duration).toBeLessThan(30000); // Should complete in 30s

      // GET should still be fast with 500 items
      const getStart = Date.now();
      await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      const getDuration = Date.now() - getStart;

      expect(getDuration).toBeLessThan(1000);
    });

    test('should scale to 200 plans', async () => {
      const promises = Array.from({ length: 200 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Plan ${i}`, steps: [`Step 1`, `Step 2`] })
      );

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(platform.plans.size).toBe(200);
      expect(duration).toBeLessThan(20000);
    });

    test('should handle alternating read/write patterns', async () => {
      const operations = [];
      
      for (let i = 0; i < 50; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `alt_${i}`, value: 'data' })
        );
        operations.push(
          request(platform.app).get('/api/v1/memory')
        );
      }

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Resource Cleanup', () => {
    test('should not accumulate event listeners', async () => {
      const initialListeners = process.listenerCount('uncaughtException');

      for (let i = 0; i < 50; i++) {
        await request(platform.app)
          .get('/health')
          .expect(200);
      }

      const finalListeners = process.listenerCount('uncaughtException');

      // Should not accumulate listeners
      expect(finalListeners).toBe(initialListeners);
    });

    test('should handle rapid connection cycling', async () => {
      const cycles = 30;

      for (let i = 0; i < cycles; i++) {
        await request(platform.app)
          .get('/health')
          .expect(200);
      }

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Edge Performance Cases', () => {
    test('should handle empty memory retrieval efficiently', async () => {
      const newPlatform = new UnifiedAIPlatform();
      
      const start = Date.now();
      const response = await request(newPlatform.app)
        .get('/api/v1/memory')
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.count).toBe(0);
      expect(duration).toBeLessThan(50);
    });

    test('should handle plan creation with minimal data', async () => {
      const start = Date.now();
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'X' })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('should handle capabilities endpoint load', async () => {
      const promises = Array.from({ length: 100 }, () =>
        request(platform.app).get('/api/v1/capabilities')
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      responses.forEach(r => expect(r.status).toBe(200));
      expect(duration).toBeLessThan(5000);
    });

    test('should handle demo endpoint under load', async () => {
      const promises = Array.from({ length: 100 }, () =>
        request(platform.app).get('/api/v1/demo')
      );

      const start = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;

      responses.forEach(r => expect(r.status).toBe(200));
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Stress Tests', () => {
    test('should survive sustained load', async () => {
      const duration = 3000; // 3 seconds
      const startTime = Date.now();
      const requests = [];

      while (Date.now() - startTime < duration) {
        requests.push(
          request(platform.app)
            .get('/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(requests);
      expect(responses.length).toBeGreaterThan(0);
      
      // All should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(responses.length);
    });

    test('should handle burst traffic patterns', async () => {
      // Simulate 3 bursts of traffic
      for (let burst = 0; burst < 3; burst++) {
        const burstSize = 50;
        const promises = Array.from({ length: burstSize }, (_, i) =>
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `burst_${burst}_${i}`, value: 'data' })
        );

        const responses = await Promise.all(promises);
        const successCount = responses.filter(r => r.status === 200).length;
        expect(successCount).toBe(burstSize);

        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(platform.memory.size).toBe(150);
    });
  });
});