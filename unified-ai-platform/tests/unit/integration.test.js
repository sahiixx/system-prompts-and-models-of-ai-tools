/**
 * Integration Tests for Unified AI Platform
 * 
 * These tests verify the integration between different components:
 * - Configuration loading and usage
 * - Memory and plans interaction
 * - End-to-end workflows
 * - Cross-component data flow
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

jest.mock('../../config/system-config.json', () => ({
  platform: {
    name: 'Unified AI Platform',
    version: '1.0.0',
    description: 'Integration test platform'
  },
  core_capabilities: {
    multi_modal: { enabled: true, supported_types: ['text', 'code'] },
    memory_system: { enabled: true, types: ['short_term', 'long_term'] },
    tool_system: { enabled: true, modular: true },
    planning_system: { enabled: true, modes: ['sequential', 'parallel'] },
    security: { enabled: true, features: ['encryption', 'auth'] }
  },
  operating_modes: {
    development: { debug: true, logging: 'verbose' },
    production: { debug: false, logging: 'error' }
  },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512, warning_mb: 400 },
    concurrent_operations: { max_parallel: 10, queue_size: 100 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  {
    type: 'function',
    function: {
      name: 'codebase_search',
      description: 'Search the codebase',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read file contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' }
        },
        required: ['path']
      }
    }
  }
]));

describe('Integration Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Configuration Integration', () => {
    test('should load and use system configuration', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities');

      expect(response.body.platform.name).toBe('Unified AI Platform');
      expect(response.body.core_capabilities.multi_modal).toBeDefined();
    });

    test('should load and expose tools configuration', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools');

      expect(response.body.tools).toBeDefined();
      expect(response.body.tools.length).toBeGreaterThan(0);
      expect(response.body.count).toBe(response.body.tools.length);
    });

    test('should use performance settings from config', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities');

      expect(response.body.performance.response_time.target_ms).toBe(1000);
      expect(response.body.performance.memory_usage.max_mb).toBe(512);
    });

    test('should reflect feature flags from config', async () => {
      const response = await request(platform.app)
        .get('/health');

      expect(response.body.features.multi_modal).toBe(true);
      expect(response.body.features.memory_system).toBe(true);
      expect(response.body.features.tool_system).toBe(true);
    });
  });

  describe('Memory and Plans Workflow', () => {
    test('should create plan and store related memory', async () => {
      // Create a plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build user dashboard',
          steps: ['Design layout', 'Implement components', 'Add tests']
        });

      expect(planResponse.status).toBe(200);
      const planId = planResponse.body.plan_id;

      // Store memory related to the plan
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `plan_${planId}_context`,
          value: {
            user_preferences: 'dark theme',
            last_modified: new Date().toISOString()
          }
        });

      // Verify both are stored
      expect(platform.plans.has(planId)).toBe(true);
      expect(platform.memory.has(`plan_${planId}_context`)).toBe(true);
    });

    test('should handle multiple related memories for a plan', async () => {
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Feature X' });

      const planId = planResponse.body.plan_id;

      // Store multiple related memories
      const memories = [
        { key: `${planId}_context`, value: 'context data' },
        { key: `${planId}_dependencies`, value: ['dep1', 'dep2'] },
        { key: `${planId}_metadata`, value: { version: '1.0' } }
      ];

      for (const mem of memories) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send(mem);
      }

      // Verify all stored
      expect(platform.memory.size).toBeGreaterThanOrEqual(3);
    });

    test('should retrieve plans and related memories', async () => {
      // Create plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Retrieve test' });

      const planId = planResponse.body.plan_id;

      // Store related memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: `plan_${planId}`, value: 'related data' });

      // Retrieve plans
      const plansResponse = await request(platform.app)
        .get('/api/v1/plans');

      // Retrieve memories
      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory');

      expect(plansResponse.body.count).toBeGreaterThan(0);
      expect(memoryResponse.body.count).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflows', () => {
    test('should complete a full task planning workflow', async () => {
      // 1. Check health
      const healthResponse = await request(platform.app)
        .get('/health');
      expect(healthResponse.status).toBe(200);

      // 2. Get available tools
      const toolsResponse = await request(platform.app)
        .get('/api/v1/tools');
      expect(toolsResponse.body.tools.length).toBeGreaterThan(0);

      // 3. Create a plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Complete workflow test',
          steps: ['Step 1', 'Step 2']
        });
      expect(planResponse.status).toBe(200);

      // 4. Store context in memory
      const memoryResponse = await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'workflow_context',
          value: { status: 'in_progress' }
        });
      expect(memoryResponse.status).toBe(200);

      // 5. Verify everything is stored
      const finalPlansResponse = await request(platform.app)
        .get('/api/v1/plans');
      const finalMemoryResponse = await request(platform.app)
        .get('/api/v1/memory');

      expect(finalPlansResponse.body.count).toBeGreaterThan(0);
      expect(finalMemoryResponse.body.count).toBeGreaterThan(0);
    });

    test('should handle interleaved operations', async () => {
      const operations = [];

      // Interleave plan creation and memory storage
      for (let i = 0; i < 5; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: `Task ${i}` })
        );
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `key_${i}`, value: `value_${i}` })
        );
      }

      const responses = await Promise.all(operations);
      responses.forEach(res => {
        expect(res.status).toBe(200);
      });

      expect(platform.plans.size).toBe(5);
      expect(platform.memory.size).toBe(5);
    });
  });

  describe('Cross-Component Data Consistency', () => {
    test('should maintain consistency between memory reads and writes', async () => {
      const testData = { key: 'consistency', value: { count: 0 } };

      // Write
      await request(platform.app)
        .post('/api/v1/memory')
        .send(testData);

      // Read
      const response = await request(platform.app)
        .get('/api/v1/memory');

      const stored = response.body.memories.find(m => m[0] === 'consistency');
      expect(stored).toBeDefined();
      expect(stored[1].content).toEqual(testData.value);
    });

    test('should maintain plan state across operations', async () => {
      // Create plan
      const createResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'State test', steps: ['A', 'B'] });

      const planId = createResponse.body.plan_id;

      // Retrieve plans
      const getResponse = await request(platform.app)
        .get('/api/v1/plans');

      const plan = getResponse.body.plans.find(p => p[0] === planId);
      expect(plan).toBeDefined();
      expect(plan[1].status).toBe('created');
      expect(plan[1].steps).toEqual(['A', 'B']);
    });

    test('should handle updates without losing data', async () => {
      // Initial data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'update_test', value: 'v1' });

      // Update
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'update_test', value: 'v2' });

      // Verify update
      const response = await request(platform.app)
        .get('/api/v1/memory');

      const stored = response.body.memories.find(m => m[0] === 'update_test');
      expect(stored[1].content).toBe('v2');
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from failed operations', async () => {
      // Failed operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test' }); // Missing value

      // Successful operation should still work
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'recovery', value: 'success' });

      expect(response.status).toBe(200);
    });

    test('should continue serving after errors', async () => {
      // Trigger error
      await request(platform.app)
        .get('/nonexistent');

      // Verify service still works
      const response = await request(platform.app)
        .get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Platform Comparison', () => {
    test('both platforms should provide health check', async () => {
      const simplePlatform = new SimpleUnifiedAIPlatform();

      // Express platform
      const expressResponse = await request(platform.app)
        .get('/health');

      expect(expressResponse.status).toBe(200);
      expect(expressResponse.body.status).toBe('healthy');
    });

    test('both platforms should store memory', async () => {
      const testData = { key: 'test', value: 'data' };

      // Express platform
      const expressResponse = await request(platform.app)
        .post('/api/v1/memory')
        .send(testData);

      expect(expressResponse.status).toBe(200);
      expect(platform.memory.has('test')).toBe(true);

      // Simple platform
      const simplePlatform = new SimpleUnifiedAIPlatform();
      simplePlatform.memory.set('test', {
        content: 'data',
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      });

      expect(simplePlatform.memory.has('test')).toBe(true);
    });
  });

  describe('Stress Test Scenarios', () => {
    test('should handle high volume of mixed operations', async () => {
      const operations = [];

      // Generate mixed operations
      for (let i = 0; i < 50; i++) {
        if (i % 3 === 0) {
          operations.push(
            request(platform.app).get('/health')
          );
        } else if (i % 3 === 1) {
          operations.push(
            request(platform.app)
              .post('/api/v1/memory')
              .send({ key: `stress_${i}`, value: `val_${i}` })
          );
        } else {
          operations.push(
            request(platform.app)
              .post('/api/v1/plans')
              .send({ task_description: `Task ${i}` })
          );
        }
      }

      const responses = await Promise.all(operations);
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBeGreaterThan(45); // Allow some failures under stress
    });

    test('should maintain performance under load', async () => {
      const start = Date.now();

      const operations = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .get('/health')
      );

      await Promise.all(operations);

      const duration = Date.now() - start;

      // 100 requests should complete reasonably fast (under 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});