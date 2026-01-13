/**
 * Data Integrity and Edge Case Tests
 * 
 * These tests focus on:
 * - Data consistency and integrity
 * - Race conditions
 * - Edge cases in data structures
 * - Memory management
 * - State consistency
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

describe('Data Integrity Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Memory Consistency', () => {
    test('should maintain memory consistency across concurrent writes', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `concurrent_${i}`, value: { index: i } })
        );
      }

      await Promise.all(promises);

      // Verify all memories are stored correctly
      for (let i = 0; i < 50; i++) {
        const stored = platform.memory.get(`concurrent_${i}`);
        expect(stored).toBeDefined();
        expect(stored.content.index).toBe(i);
      }
    });

    test('should handle memory updates correctly', async () => {
      // Initial write
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'update_test', value: 'version1' })
        .expect(200);

      // Update
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'update_test', value: 'version2' })
        .expect(200);

      const stored = platform.memory.get('update_test');
      expect(stored.content).toBe('version2');
    });

    test('should maintain timestamp integrity on updates', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'v1' })
        .expect(200);

      const firstTimestamp = platform.memory.get('timestamp_test').created_at;

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'v2' })
        .expect(200);

      const secondTimestamp = platform.memory.get('timestamp_test').created_at;

      // Should have updated timestamp
      expect(new Date(secondTimestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(firstTimestamp).getTime()
      );
    });
  });

  describe('Plan Consistency', () => {
    test('should maintain plan integrity across concurrent creations', async () => {
      const promises = Array.from({ length: 30 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}`, steps: [`Step ${i}`] })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.plan_id).toBeDefined();
        
        const plan = platform.plans.get(response.body.plan_id);
        expect(plan.task_description).toBe(`Task ${index}`);
      });

      expect(platform.plans.size).toBe(30);
    });

    test('should preserve plan data structure integrity', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Complex task',
          steps: ['Step 1', 'Step 2', 'Step 3']
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      
      expect(plan).toMatchObject({
        task_description: 'Complex task',
        steps: ['Step 1', 'Step 2', 'Step 3'],
        status: 'created'
      });
      
      expect(plan.created_at).toBeDefined();
      expect(typeof plan.created_at).toBe('string');
    });

    test('should handle empty steps array correctly', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'No steps task' })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual([]);
      expect(Array.isArray(plan.steps)).toBe(true);
    });
  });

  describe('Data Type Preservation', () => {
    test('should preserve number types', async () => {
      const testData = {
        integer: 42,
        float: 3.14159,
        negative: -100,
        zero: 0,
        scientific: 1e10
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'numbers', value: testData })
        .expect(200);

      const stored = platform.memory.get('numbers');
      expect(stored.content).toEqual(testData);
      expect(typeof stored.content.integer).toBe('number');
      expect(typeof stored.content.float).toBe('number');
    });

    test('should preserve boolean types', async () => {
      const testData = {
        trueValue: true,
        falseValue: false
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'booleans', value: testData })
        .expect(200);

      const stored = platform.memory.get('booleans');
      expect(stored.content.trueValue).toBe(true);
      expect(stored.content.falseValue).toBe(false);
      expect(typeof stored.content.trueValue).toBe('boolean');
    });

    test('should handle null values appropriately', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'null_test', value: null })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should preserve array structures', async () => {
      const testArray = [
        [1, 2, 3],
        ['a', 'b', 'c'],
        [true, false],
        [{ nested: 'object' }]
      ];

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'arrays', value: testArray })
        .expect(200);

      const stored = platform.memory.get('arrays');
      expect(stored.content).toEqual(testArray);
      expect(Array.isArray(stored.content)).toBe(true);
      expect(Array.isArray(stored.content[0])).toBe(true);
    });

    test('should preserve nested object structures', async () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [1, 2, 3],
              boolean: true
            }
          }
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nested', value: nested })
        .expect(200);

      const stored = platform.memory.get('nested');
      expect(stored.content).toEqual(nested);
      expect(stored.content.level1.level2.level3.value).toBe('deep');
    });
  });

  describe('Memory Retrieval Integrity', () => {
    test('should return complete memory entries', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complete_test', value: 'data' })
        .expect(200);

      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const entries = response.body.memories;
      const testEntry = entries.find(([k]) => k === 'complete_test');
      
      expect(testEntry).toBeDefined();
      expect(testEntry[1]).toHaveProperty('content');
      expect(testEntry[1]).toHaveProperty('created_at');
      expect(testEntry[1]).toHaveProperty('last_accessed');
    });

    test('should return memories in consistent format', async () => {
      const keys = ['mem1', 'mem2', 'mem3'];
      for (const key of keys) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key, value: `value_${key}` })
          .expect(200);
      }

      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body).toHaveProperty('memories');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
      expect(Array.isArray(response.body.memories)).toBe(true);
      expect(response.body.count).toBe(keys.length);
    });
  });

  describe('Plan Retrieval Integrity', () => {
    test('should return complete plan entries', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Test task',
          steps: ['Step 1', 'Step 2']
        })
        .expect(200);

      const planId = response.body.plan_id;

      const getResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      const planEntry = getResponse.body.plans.find(([id]) => id === planId);
      
      expect(planEntry).toBeDefined();
      expect(planEntry[1]).toHaveProperty('task_description');
      expect(planEntry[1]).toHaveProperty('steps');
      expect(planEntry[1]).toHaveProperty('created_at');
      expect(planEntry[1]).toHaveProperty('status');
    });

    test('should return plans in consistent format', async () => {
      for (let i = 0; i < 5; i++) {
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
          .expect(200);
      }

      const response = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(response.body).toHaveProperty('plans');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('description');
      expect(Array.isArray(response.body.plans)).toBe(true);
      expect(response.body.count).toBe(5);
    });
  });

  describe('Edge Cases in Data Operations', () => {
    test('should handle maximum string length values', async () => {
      const maxString = 'a'.repeat(1000000); // 1 million characters
      
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'max_string', value: maxString });

      expect([200, 413]).toContain(response.status);
    });

    test('should handle objects with many properties', async () => {
      const manyProps = {};
      for (let i = 0; i < 1000; i++) {
        manyProps[`prop_${i}`] = `value_${i}`;
      }

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'many_props', value: manyProps })
        .expect(200);

      const stored = platform.memory.get('many_props');
      expect(Object.keys(stored.content).length).toBe(1000);
    });

    test('should handle repeated key-value pairs', async () => {
      const key = 'repeated';
      
      for (let i = 0; i < 10; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key, value: `version_${i}` })
          .expect(200);
      }

      // Should only have one entry with the last value
      const stored = platform.memory.get(key);
      expect(stored.content).toBe('version_9');
      
      // Memory size should be 1, not 10
      expect(platform.memory.size).toBe(1);
    });

    test('should handle special number values', async () => {
      const specialNumbers = {
        infinity: Infinity,
        negInfinity: -Infinity,
        maxSafe: Number.MAX_SAFE_INTEGER,
        minSafe: Number.MIN_SAFE_INTEGER,
        epsilon: Number.EPSILON
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'special_nums', value: specialNumbers })
        .expect(200);

      const stored = platform.memory.get('special_nums');
      expect(stored.content.infinity).toBe(Infinity);
      expect(stored.content.negInfinity).toBe(-Infinity);
    });
  });

  describe('State Isolation', () => {
    test('should isolate memory from plans', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'memory_data' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'test' })
        .expect(200);

      // Verify they are in separate stores
      expect(platform.memory.size).toBe(1);
      expect(platform.plans.size).toBe(1);
      
      // Clearing memory should not affect plans
      platform.memory.clear();
      expect(platform.memory.size).toBe(0);
      expect(platform.plans.size).toBe(1);
    });

    test('should maintain separate counters for memory and plans', async () => {
      const memPromises = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `mem_${i}`, value: `val_${i}` })
      );

      const planPromises = Array.from({ length: 5 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
      );

      await Promise.all([...memPromises, ...planPromises]);

      const memResponse = await request(platform.app).get('/api/v1/memory');
      const planResponse = await request(platform.app).get('/api/v1/plans');

      expect(memResponse.body.count).toBe(10);
      expect(planResponse.body.count).toBe(5);
    });
  });

  describe('Idempotency', () => {
    test('should handle identical sequential requests consistently', async () => {
      const payload = { key: 'idempotent', value: 'test' };
      
      const response1 = await request(platform.app)
        .post('/api/v1/memory')
        .send(payload)
        .expect(200);

      const response2 = await request(platform.app)
        .post('/api/v1/memory')
        .send(payload)
        .expect(200);

      // Both should succeed
      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      
      // Should still only have one entry
      expect(platform.memory.size).toBe(1);
    });

    test('should handle concurrent identical requests', async () => {
      const payload = { key: 'concurrent_identical', value: 'test' };
      
      const promises = Array.from({ length: 10 }, () =>
        request(platform.app)
          .post('/api/v1/memory')
          .send(payload)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should only have one entry
      expect(platform.memory.size).toBe(1);
    });
  });
});