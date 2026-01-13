/**
 * Integration Tests for API Endpoints
 * 
 * These tests validate end-to-end API workflows including:
 * - Multi-step operations
 * - Data persistence across requests
 * - API interaction patterns
 * - Complete user workflows
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

describe('API Integration Tests', () => {
  let platform;
  let app;

  beforeAll(async () => {
    platform = new UnifiedAIPlatform();
    app = platform.app;
  });

  afterAll(async () => {
    if (platform) {
      await platform.stop();
    }
  });

  describe('Complete Memory Workflow', () => {
    test('should store, retrieve, and update memory in sequence', async () => {
      // Store initial memory
      const storeResponse = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'workflow_test', value: 'initial_value' })
        .expect(200);

      expect(storeResponse.body.success).toBe(true);

      // Retrieve memory
      const getResponse = await request(app)
        .get('/api/v1/memory')
        .expect(200);

      expect(getResponse.body.memories).toEqual(
        expect.arrayContaining([
          expect.arrayContaining(['workflow_test', expect.any(Object)])
        ])
      );

      // Update memory
      const updateResponse = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'workflow_test', value: 'updated_value' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Verify update
      const verifyResponse = await request(app)
        .get('/api/v1/memory')
        .expect(200);

      const memory = verifyResponse.body.memories.find(m => m[0] === 'workflow_test');
      expect(memory[1].content).toBe('updated_value');
    });

    test('should handle multiple memory operations concurrently', async () => {
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        operations.push(
          request(app)
            .post('/api/v1/memory')
            .send({ key: `concurrent_${i}`, value: `value_${i}` })
        );
      }

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all stored
      const getResponse = await request(app)
        .get('/api/v1/memory')
        .expect(200);

      expect(getResponse.body.count).toBeGreaterThanOrEqual(20);
    });

    test('should maintain memory consistency across operations', async () => {
      const key = 'consistency_test';
      
      // Store initial value
      await request(app)
        .post('/api/v1/memory')
        .send({ key, value: { counter: 0 } })
        .expect(200);

      // Update multiple times
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/v1/memory')
          .send({ key, value: { counter: i } })
          .expect(200);
      }

      // Verify final state
      const response = await request(app)
        .get('/api/v1/memory')
        .expect(200);

      const memory = response.body.memories.find(m => m[0] === key);
      expect(memory[1].content.counter).toBe(5);
    });
  });

  describe('Complete Planning Workflow', () => {
    test('should create and retrieve plans in sequence', async () => {
      // Create plan
      const createResponse = await request(app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Integration test plan',
          steps: ['Step 1', 'Step 2', 'Step 3']
        })
        .expect(200);

      const planId = createResponse.body.plan_id;
      expect(planId).toBeDefined();

      // Retrieve plans
      const getResponse = await request(app)
        .get('/api/v1/plans')
        .expect(200);

      const plan = getResponse.body.plans.find(p => p[0] === planId);
      expect(plan).toBeDefined();
      expect(plan[1].task_description).toBe('Integration test plan');
      expect(plan[1].steps).toHaveLength(3);
    });

    test('should create multiple plans with different configurations', async () => {
      const planConfigs = [
        { task_description: 'Simple task', steps: [] },
        { task_description: 'Complex task', steps: Array(10).fill('Step') },
        { task_description: 'Medium task', steps: ['A', 'B', 'C'] }
      ];

      const planIds = [];

      for (const config of planConfigs) {
        const response = await request(app)
          .post('/api/v1/plans')
          .send(config)
          .expect(200);

        planIds.push(response.body.plan_id);
      }

      // Verify all plans exist
      const getResponse = await request(app)
        .get('/api/v1/plans')
        .expect(200);

      expect(getResponse.body.count).toBeGreaterThanOrEqual(3);
      
      planIds.forEach(id => {
        const plan = getResponse.body.plans.find(p => p[0] === id);
        expect(plan).toBeDefined();
      });
    });

    test('should handle rapid plan creation', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/v1/plans')
          .send({ task_description: `Rapid plan ${i}` })
      );

      const responses = await Promise.all(promises);
      
      const planIds = responses.map(r => r.body.plan_id);
      const uniqueIds = new Set(planIds);
      
      expect(uniqueIds.size).toBe(50); // All IDs should be unique
    });
  });

  describe('Cross-Feature Integration', () => {
    test('should access all endpoints in sequence', async () => {
      // Health check
      const health = await request(app).get('/health').expect(200);
      expect(health.body.status).toBe('healthy');

      // Capabilities
      const capabilities = await request(app).get('/api/v1/capabilities').expect(200);
      expect(capabilities.body.platform).toBeDefined();

      // Tools
      const tools = await request(app).get('/api/v1/tools').expect(200);
      expect(tools.body.tools).toBeDefined();

      // Memory
      const memory = await request(app).get('/api/v1/memory').expect(200);
      expect(memory.body.memories).toBeDefined();

      // Plans
      const plans = await request(app).get('/api/v1/plans').expect(200);
      expect(plans.body.plans).toBeDefined();

      // Demo
      const demo = await request(app).get('/api/v1/demo').expect(200);
      expect(demo.body.message).toBeDefined();
    });

    test('should handle mixed GET and POST operations', async () => {
      // Create memory
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'mixed_test', value: 'data' })
        .expect(200);

      // Create plan
      await request(app)
        .post('/api/v1/plans')
        .send({ task_description: 'Mixed test plan' })
        .expect(200);

      // Get both
      const memoryResponse = await request(app).get('/api/v1/memory').expect(200);
      const plansResponse = await request(app).get('/api/v1/plans').expect(200);

      expect(memoryResponse.body.count).toBeGreaterThan(0);
      expect(plansResponse.body.count).toBeGreaterThan(0);
    });

    test('should maintain system health during heavy operations', async () => {
      // Perform many operations
      const operations = [];
      
      for (let i = 0; i < 30; i++) {
        operations.push(
          request(app)
            .post('/api/v1/memory')
            .send({ key: `health_${i}`, value: `value_${i}` })
        );
      }

      await Promise.all(operations);

      // Check health after load
      const health = await request(app).get('/health').expect(200);
      
      expect(health.body.status).toBe('healthy');
      expect(health.body.features.memory_system).toBe(true);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from bad requests and continue serving', async () => {
      // Send bad request
      await request(app)
        .post('/api/v1/memory')
        .send({ invalid: 'data' })
        .expect(400);

      // Verify system still works
      const health = await request(app).get('/health').expect(200);
      expect(health.body.status).toBe('healthy');

      // Verify can still perform valid operations
      const response = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'recovery_test', value: 'works' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle alternating valid and invalid requests', async () => {
      const requests = [];

      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          // Valid request
          requests.push(
            request(app)
              .post('/api/v1/memory')
              .send({ key: `alt_${i}`, value: `value_${i}` })
              .expect(200)
          );
        } else {
          // Invalid request
          requests.push(
            request(app)
              .post('/api/v1/memory')
              .send({})
              .expect(400)
          );
        }
      }

      await Promise.all(requests);

      // Verify valid data was stored
      const response = await request(app).get('/api/v1/memory').expect(200);
      const validKeys = response.body.memories.filter(m => m[0].startsWith('alt_'));
      expect(validKeys.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Data Integrity', () => {
    test('should preserve complex data structures', async () => {
      const complexData = {
        user: {
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: {
              email: true,
              push: false,
              sms: true
            }
          },
          history: [
            { action: 'login', timestamp: '2025-01-01T00:00:00Z' },
            { action: 'update', timestamp: '2025-01-01T01:00:00Z' }
          ],
          metadata: {
            version: '1.0.0',
            tags: ['premium', 'verified']
          }
        }
      };

      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'complex_data', value: complexData })
        .expect(200);

      const response = await request(app).get('/api/v1/memory').expect(200);
      const stored = response.body.memories.find(m => m[0] === 'complex_data');

      expect(stored[1].content).toEqual(complexData);
    });

    test('should handle special characters in keys and values', async () => {
      const specialCases = [
        { key: 'key-with-dashes', value: 'value with spaces' },
        { key: 'key_with_underscores', value: 'value\nwith\nnewlines' },
        { key: 'key.with.dots', value: 'value\twith\ttabs' },
        { key: 'key/with/slashes', value: 'value"with"quotes' }
      ];

      for (const testCase of specialCases) {
        const response = await request(app)
          .post('/api/v1/memory')
          .send(testCase)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      const getResponse = await request(app).get('/api/v1/memory').expect(200);
      expect(getResponse.body.count).toBeGreaterThanOrEqual(specialCases.length);
    });

    test('should handle unicode and emoji in data', async () => {
      const unicodeData = {
        key: 'unicode_test',
        value: {
          text: '你好世界 Hello мир 🌍🚀✨',
          emoji: '😀😃😄😁😆😅🤣😂',
          symbols: '©®™€£¥'
        }
      };

      await request(app)
        .post('/api/v1/memory')
        .send(unicodeData)
        .expect(200);

      const response = await request(app).get('/api/v1/memory').expect(200);
      const stored = response.body.memories.find(m => m[0] === 'unicode_test');

      expect(stored[1].content).toEqual(unicodeData.value);
    });
  });

  describe('Timestamp Validation', () => {
    test('should generate valid ISO 8601 timestamps', async () => {
      await request(app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'data' })
        .expect(200);

      const response = await request(app).get('/api/v1/memory').expect(200);
      const memory = response.body.memories.find(m => m[0] === 'timestamp_test');

      expect(memory[1].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(memory[1].last_accessed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify timestamps are valid dates
      expect(new Date(memory[1].created_at).toString()).not.toBe('Invalid Date');
      expect(new Date(memory[1].last_accessed).toString()).not.toBe('Invalid Date');
    });

    test('should generate timestamps in correct sequence', async () => {
      const response1 = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'seq_1', value: 'first' })
        .expect(200);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await request(app)
        .post('/api/v1/memory')
        .send({ key: 'seq_2', value: 'second' })
        .expect(200);

      const getResponse = await request(app).get('/api/v1/memory').expect(200);
      
      const mem1 = getResponse.body.memories.find(m => m[0] === 'seq_1');
      const mem2 = getResponse.body.memories.find(m => m[0] === 'seq_2');

      const time1 = new Date(mem1[1].created_at).getTime();
      const time2 = new Date(mem2[1].created_at).getTime();

      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });
});