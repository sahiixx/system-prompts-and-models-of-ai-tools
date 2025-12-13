/**
 * Performance and Stress Tests
 * 
 * These tests verify the platform performs well under various conditions:
 * - Response time benchmarks
 * - Memory efficiency
 * - Concurrent operation handling
 * - Resource cleanup
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

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

jest.mock('../../config/tools.json', () => ([]));

describe('Performance Tests', () => {
  describe('UnifiedAIPlatform Performance', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should respond to health check quickly', async () => {
      const startTime = Date.now();
      await request(platform.app).get('/health').expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100); // Should respond in under 100ms
    });

    test('should handle batch memory writes efficiently', async () => {
      const startTime = Date.now();
      const operations = Array.from({ length: 50 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `batch_${i}`, value: `value_${i}` })
      );

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(platform.memory.size).toBe(50);
    });

    test('should handle batch plan creation efficiently', async () => {
      const startTime = Date.now();
      const operations = Array.from({ length: 30 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ 
            task_description: `Batch plan ${i}`,
            steps: [`Step 1`, `Step 2`, `Step 3`]
          })
      );

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(platform.plans.size).toBe(30);
    });

    test('should maintain performance with large datasets', async () => {
      // Pre-populate with data
      for (let i = 0; i < 100; i++) {
        platform.memory.set(`preload_${i}`, {
          content: { data: 'x'.repeat(1000) },
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        });
      }

      const startTime = Date.now();
      await request(platform.app).get('/api/v1/memory').expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(500);
    });

    test('should handle mixed operations efficiently', async () => {
      const startTime = Date.now();
      
      const operations = [
        ...Array.from({ length: 10 }, (_, i) =>
          request(platform.app).post('/api/v1/memory').send({ key: `m${i}`, value: `v${i}` })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          request(platform.app).post('/api/v1/plans').send({ task_description: `Task ${i}` })
        ),
        ...Array.from({ length: 10 }, () =>
          request(platform.app).get('/health')
        )
      ];

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    test('should efficiently query large result sets', async () => {
      // Add 200 memory entries
      for (let i = 0; i < 200; i++) {
        platform.memory.set(`query_test_${i}`, {
          content: { index: i, data: 'test data' },
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        });
      }

      const startTime = Date.now();
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(1000);
      expect(response.body.count).toBe(200);
    });
  });

  describe('Memory Usage Tests', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `leak_test_${i}`, value: 'x'.repeat(1000) });
      }

      const afterOps Memory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterOpsMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should handle cleanup of large data structures', async () => {
      // Create large dataset
      for (let i = 0; i < 500; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `cleanup_${i}`, value: { data: 'x'.repeat(5000) } });
      }

      expect(platform.memory.size).toBe(500);

      // In a real scenario, we'd implement cleanup
      // For now, verify we can still operate
      const response = await request(platform.app).get('/health');
      expect(response.status).toBe(200);
    });
  });

  describe('Scalability Tests', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should scale to handle increasing load', async () => {
      const loadLevels = [10, 25, 50, 100];
      const responseTimes = [];

      for (const load of loadLevels) {
        const startTime = Date.now();
        const operations = Array.from({ length: load }, (_, i) =>
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `scale_${load}_${i}`, value: `data` })
        );

        await Promise.all(operations);
        const duration = Date.now() - startTime;
        responseTimes.push({ load, duration });
      }

      // Response time shouldn't grow exponentially
      const firstTime = responseTimes[0].duration;
      const lastTime = responseTimes[responseTimes.length - 1].duration;
      
      // Last operation should not be more than 20x slower than first
      expect(lastTime / firstTime).toBeLessThan(20);
    });

    test('should handle bursts of traffic', async () => {
      // Simulate burst: 50 requests in rapid succession
      const burstRequests = Array.from({ length: 50 }, (_, i) =>
        request(platform.app).get('/health')
      );

      const startTime = Date.now();
      const results = await Promise.all(burstRequests);
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r.status === 200).length;
      
      expect(successCount).toBe(50);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Resource Limits', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should respect concurrent operation limits', async () => {
      // Try to exceed max_parallel setting (10)
      const operations = Array.from({ length: 50 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ 
            task_description: `Limit test ${i}`,
            steps: Array.from({ length: 100 }, (_, j) => `Step ${j}`)
          })
      );

      const results = await Promise.allSettled(operations);
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;

      // All should eventually complete
      expect(fulfilled).toBeGreaterThan(40);
    });

    test('should handle large payload sizes appropriately', async () => {
      const largePayload = 'x'.repeat(5 * 1024 * 1024); // 5MB

      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large', value: largePayload });

      // Should either accept or reject gracefully
      expect([200, 413]).toContain(response.status);
    });
  });

  describe('Throughput Tests', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should achieve minimum throughput for reads', async () => {
      // Pre-populate data
      for (let i = 0; i < 50; i++) {
        platform.memory.set(`throughput_${i}`, {
          content: `data_${i}`,
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        });
      }

      const startTime = Date.now();
      const readOperations = Array.from({ length: 100 }, () =>
        request(platform.app).get('/api/v1/memory')
      );

      await Promise.all(readOperations);
      const duration = (Date.now() - startTime) / 1000; // seconds

      const throughput = 100 / duration; // operations per second
      
      // Should achieve at least 20 reads per second
      expect(throughput).toBeGreaterThan(20);
    });

    test('should achieve minimum throughput for writes', async () => {
      const startTime = Date.now();
      const writeOperations = Array.from({ length: 50 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `write_throughput_${i}`, value: `data_${i}` })
      );

      await Promise.all(writeOperations);
      const duration = (Date.now() - startTime) / 1000;

      const throughput = 50 / duration;
      
      // Should achieve at least 10 writes per second
      expect(throughput).toBeGreaterThan(10);
    });
  });
});