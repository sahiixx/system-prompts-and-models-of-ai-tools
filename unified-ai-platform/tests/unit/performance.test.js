/**
 * Performance and Stress Tests for Unified AI Platform
 * 
 * These tests verify system behavior under various load conditions
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

describe('Performance Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Response Time Tests', () => {
    test('health endpoint should respond quickly', async () => {
      const startTime = Date.now();
      
      await request(platform.app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Should respond in < 100ms
    });

    test('memory read should be fast', async () => {
      // Populate some data
      for (let i = 0; i < 10; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `key_${i}`, value: `value_${i}` });
      }

      const startTime = Date.now();
      
      await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50);
    });

    test('memory write should be performant', async () => {
      const startTime = Date.now();
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'perf_test', value: 'test_value' })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50);
    });

    test('plan creation should be efficient', async () => {
      const startTime = Date.now();
      
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Performance test plan' })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('Throughput Tests', () => {
    test('should handle high request rate', async () => {
      const requestCount = 500;
      const startTime = Date.now();
      
      const promises = Array.from({ length: requestCount }, () =>
        request(platform.app).get('/health')
      );

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const requestsPerSecond = (requestCount / duration) * 1000;
      console.log(`Throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
      
      expect(requestsPerSecond).toBeGreaterThan(50); // At least 50 req/s
    });

    test('should handle sustained load', async () => {
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        await request(platform.app).get('/health');
        requestCount++;
      }

      console.log(`Sustained load: ${requestCount} requests in ${duration}ms`);
      expect(requestCount).toBeGreaterThan(100); // At least 100 requests in 2 seconds
    });
  });

  describe('Memory Scalability Tests', () => {
    test('should handle large number of memory entries', async () => {
      const entryCount = 1000;
      
      for (let i = 0; i < entryCount; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `scale_${i}`, value: `value_${i}` });
      }

      expect(platform.memory.size).toBe(entryCount);

      // Reading should still be fast
      const startTime = Date.now();
      await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200); // Should still be reasonably fast
    });
  });

    test('should handle large memory values', async () => {
      const largeValue = 'X'.repeat(100000); // 100KB string
      
      const startTime = Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_value', value: largeValue })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('should handle deeply nested objects efficiently', async () => {
      let deepObject = { value: 'base' };
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      const startTime = Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'deep_object', value: deepObject })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Plan Scalability Tests', () => {
    test('should handle large number of plans', async () => {
      const planCount = 500;
      
      for (let i = 0; i < planCount; i++) {
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Plan ${i}` });
      }

      expect(platform.plans.size).toBe(planCount);

      // Reading should still be fast
      const startTime = Date.now();
      await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('should handle plans with many steps', async () => {
      const manySteps = Array.from({ length: 1000 }, (_, i) => `Step ${i + 1}`);
      
      const startTime = Date.now();
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Large plan', steps: manySteps })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

  describe('Concurrent Operations Tests', () => {
    test('should handle concurrent reads efficiently', async () => {
      // Pre-populate data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'concurrent_test', value: 'test_value' });

      const concurrentReads = 100;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentReads }, () =>
        request(platform.app).get('/api/v1/memory')
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      console.log(`${concurrentReads} concurrent reads in ${duration}ms`);
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    test('should handle concurrent writes efficiently', async () => {
      const concurrentWrites = 100;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentWrites }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: `value_${i}` })
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(platform.memory.size).toBe(concurrentWrites);
      console.log(`${concurrentWrites} concurrent writes in ${duration}ms`);
      expect(duration).toBeLessThan(3000); // Should complete in < 3 seconds
    });

    test('should handle mixed concurrent operations', async () => {
      const operations = [];
      
      // Mix of reads, writes, and plan operations
      for (let i = 0; i < 50; i++) {
        operations.push(
          request(platform.app).get('/health'),
          request(platform.app).post('/api/v1/memory').send({ key: `mix_${i}`, value: i }),
          request(platform.app).get('/api/v1/memory'),
          request(platform.app).post('/api/v1/plans').send({ task_description: `Task ${i}` })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`${operations.length} mixed operations in ${duration}ms`);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 200; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `leak_${i}`, value: `value_${i}` });
        
        // Periodically clear to simulate real usage
        if (i % 50 === 0) {
          platform.memory.clear();
        }
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);
      expect(memoryIncrease).toBeLessThan(50); // Should not increase by more than 50MB
    });

    test('should handle memory cleanup efficiently', () => {
      // Add many entries
      for (let i = 0; i < 100; i++) {
        platform.memory.set(`cleanup_${i}`, { content: `value_${i}` });
      }

      const sizeBeforeClear = platform.memory.size;
      expect(sizeBeforeClear).toBe(100);

      // Clear all
      const startTime = Date.now();
      platform.memory.clear();
      const clearTime = Date.now() - startTime;

      expect(platform.memory.size).toBe(0);
      expect(clearTime).toBeLessThan(10); // Should be very fast
    });

  describe('Stress Tests', () => {
    test('should survive rapid fire requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        promises.push(
          request(platform.app).get('/health')
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // System should still be responsive
      const finalCheck = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(finalCheck.body.status).toBe('healthy');
    });

    test('should handle error conditions under load', async () => {
      const operations = [];
      
      // Mix of valid and invalid requests
      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          // Invalid request
          operations.push(
            request(platform.app).post('/api/v1/memory').send({})
          );
        } else {
          // Valid request
          operations.push(
            request(platform.app).post('/api/v1/memory').send({ key: `stress_${i}`, value: i })
          );
        }
      }

      const responses = await Promise.all(operations);
      
      const successCount = responses.filter(r => r.status === 200).length;
      const errorCount = responses.filter(r => r.status === 400).length;

      expect(successCount).toBeGreaterThan(60);
      expect(errorCount).toBeGreaterThan(30);

      // System should remain healthy
      const health = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(health.body.status).toBe('healthy');
    });

    test('should maintain data integrity under concurrent stress', async () => {
      const key = 'stress_integrity';
      const operations = [];
      
      // Multiple concurrent writes to same key
      for (let i = 0; i < 50; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key, value: i })
        );
      }

      await Promise.all(operations);

      // Should have exactly one entry with that key
      expect(platform.memory.has(key)).toBe(true);
      
      const stored = platform.memory.get(key);
      expect(stored.content).toBeGreaterThanOrEqual(0);
      expect(stored.content).toBeLessThan(50);
    });
  });

  describe('Latency Tests', () => {
    test('should have consistent latency across endpoints', async () => {
      const endpoints = [
        '/health',
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      const latencies = {};

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        await request(platform.app).get(endpoint);
        latencies[endpoint] = Date.now() - startTime;
      }

      Object.entries(latencies).forEach(([endpoint, latency]) => {
        console.log(`${endpoint}: ${latency}ms`);
        expect(latency).toBeLessThan(100);
      });
    });

    test('should have low latency variance', async () => {
      const iterations = 20;
      const latencies = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await request(platform.app).get('/health');
        latencies.push(Date.now() - startTime);
      }

      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avg, 2), 0) / latencies.length;
      const stdDev = Math.sqrt(variance);

      console.log(`Average latency: ${avg.toFixed(2)}ms, Std Dev: ${stdDev.toFixed(2)}ms`);
      
      // Standard deviation should be low (consistent performance)
      expect(stdDev).toBeLessThan(20);
    });
  });
});