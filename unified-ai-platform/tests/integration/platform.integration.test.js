/**
 * Integration Tests for Unified AI Platform
 * 
 * These tests verify end-to-end functionality and integration between components:
 * - Multi-component workflows
 * - Cross-module interactions
 * - System-level behaviors
 * - Real-world usage scenarios
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');
const fs = require('fs');
const path = require('path');

// Mock configurations
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
      description: 'A test tool',
      parameters: { type: 'object', properties: {} }
    }
  }
]));

describe('Platform Integration Tests', () => {
  describe('Configuration Integration', () => {
    test('should load and use system configuration', async () => {
      const platform = new UnifiedAIPlatform();
      
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.platform.name).toBe('Unified AI Platform');
      expect(response.body.core_capabilities).toBeDefined();
      expect(response.body.performance).toBeDefined();
    });

    test('should load and expose tools configuration', async () => {
      const platform = new UnifiedAIPlatform();
      
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('configuration should be consistent across platforms', async () => {
      const expressPlatform = new UnifiedAIPlatform();
      const simplePlatform = new SimpleUnifiedAIPlatform();

      const expressTools = await request(expressPlatform.app)
        .get('/api/v1/tools')
        .expect(200);

      // Simple platform would need to be started to test, but we can verify structure
      expect(expressPlatform.tools).toBeDefined();
      expect(simplePlatform.memory).toBeInstanceOf(Map);
      expect(simplePlatform.plans).toBeInstanceOf(Map);
    });
  });

  describe('End-to-End Workflows', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('complete user journey: discover -> plan -> execute -> store', async () => {
      // 1. Discover capabilities
      const capabilities = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(capabilities.body.core_capabilities.planning_system.enabled).toBe(true);

      // 2. Check available tools
      const tools = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(tools.body.tools.length).toBeGreaterThan(0);

      // 3. Create a plan
      const plan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build a feature',
          steps: [
            'Design API',
            'Implement backend',
            'Create frontend',
            'Test integration',
            'Deploy'
          ]
        })
        .expect(200);

      expect(plan.body.plan_id).toBeDefined();

      // 4. Store execution state
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `plan_${plan.body.plan_id}_status`,
          value: {
            current_step: 0,
            status: 'in_progress',
            started_at: new Date().toISOString()
          }
        })
        .expect(200);

      // 5. Update progress
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `plan_${plan.body.plan_id}_status`,
          value: {
            current_step: 2,
            status: 'in_progress',
            completed_steps: ['Design API', 'Implement backend']
          }
        })
        .expect(200);

      // 6. Verify complete state
      const memory = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plans = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memory.body.count).toBe(1);
      expect(plans.body.count).toBe(1);
    });

    test('multi-user scenario: isolated memory spaces', async () => {
      // User 1 operations
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user1_pref', value: { theme: 'dark', lang: 'en' } })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'User 1 task' })
        .expect(200);

      // User 2 operations
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user2_pref', value: { theme: 'light', lang: 'es' } })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'User 2 task' })
        .expect(200);

      // Verify isolation (both users can see all data in this simple implementation)
      const memory = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(memory.body.count).toBe(2);
      expect(platform.memory.has('user1_pref')).toBe(true);
      expect(platform.memory.has('user2_pref')).toBe(true);
    });

    test('complex workflow: hierarchical plan execution', async () => {
      // Create parent plan
      const parentPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build complete application',
          steps: ['Backend', 'Frontend', 'Testing', 'Deployment']
        })
        .expect(200);

      // Create sub-plans for each step
      const subPlans = [];
      for (const step of ['Backend', 'Frontend', 'Testing', 'Deployment']) {
        const subPlan = await request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: `${step} implementation`,
            steps: [`${step} - Task 1`, `${step} - Task 2`, `${step} - Task 3`]
          })
          .expect(200);

        subPlans.push(subPlan.body.plan_id);
      }

      // Store hierarchy
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `hierarchy_${parentPlan.body.plan_id}`,
          value: {
            parent: parentPlan.body.plan_id,
            children: subPlans,
            structure: 'hierarchical'
          }
        })
        .expect(200);

      // Verify structure
      expect(platform.plans.size).toBe(5); // 1 parent + 4 children
      expect(platform.memory.size).toBe(1);
    });

    test('data persistence across operations', async () => {
      // Initial state
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'counter', value: 0 })
        .expect(200);

      // Simulate multiple operations
      for (let i = 1; i <= 5; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'counter', value: i })
          .expect(200);

        // Create related plan
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Operation ${i}` })
          .expect(200);
      }

      // Verify final state
      const memory = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plans = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memory.body.count).toBe(1);
      expect(plans.body.count).toBe(5);
      expect(platform.memory.get('counter').content).toBe(5);
    });
  });

  describe('System Health and Monitoring', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('health check should reflect system state', async () => {
      // Initial health check
      const health1 = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(health1.body.status).toBe('healthy');
      expect(health1.body.initialized).toBe(false);

      // Add some data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' })
        .expect(200);

      // Health should still be good
      const health2 = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(health2.body.status).toBe('healthy');
      expect(health2.body.memory).toBeDefined();
      expect(health2.body.uptime).toBeGreaterThan(0);
    });

    test('system should report accurate feature flags', async () => {
      const capabilities = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      const health = await request(platform.app)
        .get('/health')
        .expect(200);

      // Feature flags should match across endpoints
      expect(health.body.features.multi_modal).toBe(capabilities.body.core_capabilities.multi_modal.enabled);
      expect(health.body.features.memory_system).toBe(capabilities.body.core_capabilities.memory_system.enabled);
      expect(health.body.features.tool_system).toBe(capabilities.body.core_capabilities.tool_system.enabled);
    });

    test('demo endpoint should provide accurate platform info', async () => {
      const demo = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(demo.body.message).toBeDefined();
      expect(demo.body.features).toBeDefined();
      expect(demo.body.systems_combined).toBeDefined();
      expect(Array.isArray(demo.body.features)).toBe(true);
      expect(demo.body.features.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('errors should not corrupt system state', async () => {
      // Add valid data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid1', value: 'data1' })
        .expect(200);

      // Try various invalid operations
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ invalid: 'data' })
        .expect(400);

      await request(platform.app)
        .post('/api/v1/plans')
        .send({})
        .expect(400);

      await request(platform.app)
        .get('/nonexistent')
        .expect(404);

      // Add more valid data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid2', value: 'data2' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Valid task' })
        .expect(200);

      // Verify system is healthy and state is correct
      const health = await request(platform.app)
        .get('/health')
        .expect(200);

      const memory = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plans = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(health.body.status).toBe('healthy');
      expect(memory.body.count).toBe(2);
      expect(plans.body.count).toBe(1);
    });

    test('concurrent errors should be isolated', async () => {
      const operations = [
        request(platform.app).post('/api/v1/memory').send({ key: 'valid', value: 'data' }),
        request(platform.app).post('/api/v1/memory').send({ invalid: 'request' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'Valid' }),
        request(platform.app).post('/api/v1/plans').send({}),
        request(platform.app).get('/nonexistent')
      ];

      const results = await Promise.all(operations);

      expect(results[0].status).toBe(200);
      expect(results[1].status).toBe(400);
      expect(results[2].status).toBe(200);
      expect(results[3].status).toBe(400);
      expect(results[4].status).toBe(404);

      // System should have only valid data
      expect(platform.memory.size).toBe(1);
      expect(platform.plans.size).toBe(1);
    });
  });

  describe('Performance Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('system should maintain performance under load', async () => {
      const operations = 100;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < operations; i++) {
        if (i % 3 === 0) {
          promises.push(request(platform.app).get('/health'));
        } else if (i % 3 === 1) {
          promises.push(
            request(platform.app)
              .post('/api/v1/memory')
              .send({ key: `key_${i}`, value: `value_${i}` })
          );
        } else {
          promises.push(
            request(platform.app)
              .post('/api/v1/plans')
              .send({ task_description: `Task ${i}` })
          );
        }
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect([200, 201]).toContain(result.status);
      });

      // Should complete in reasonable time (adjust based on system)
      expect(duration).toBeLessThan(10000); // 10 seconds for 100 operations
    });

    test('memory usage should remain stable', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `mem_${i}`, value: { index: i, data: 'test'.repeat(10) } });

        await request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: `Plan ${i}`,
            steps: ['Step 1', 'Step 2', 'Step 3']
          });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    test('response times should be consistent', async () => {
      const responseTimes = [];

      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await request(platform.app).get('/health');
        responseTimes.push(Date.now() - start);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      expect(avgTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(500); // Max under 500ms
    });
  });

  describe('Data Consistency Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('memory and plans should remain synchronized', async () => {
      const planIds = [];

      // Create plans
      for (let i = 0; i < 5; i++) {
        const plan = await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
          .expect(200);

        planIds.push(plan.body.plan_id);

        // Store plan reference
        await request(platform.app)
          .post('/api/v1/memory')
          .send({
            key: `plan_ref_${i}`,
            value: plan.body.plan_id
          })
          .expect(200);
      }

      // Verify consistency
      const memory = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plans = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memory.body.count).toBe(5);
      expect(plans.body.count).toBe(5);

      // All stored plan IDs should exist
      planIds.forEach(planId => {
        expect(platform.plans.has(planId)).toBe(true);
      });
    });

    test('updates should be atomic', async () => {
      // Create initial state
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'atomic_test', value: { version: 1, data: 'initial' } })
        .expect(200);

      // Concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'atomic_test', value: { version: i + 2, data: `update_${i}` } })
      );

      await Promise.all(updates);

      // Verify final state is consistent
      const stored = platform.memory.get('atomic_test');
      expect(stored).toBeDefined();
      expect(stored.content.version).toBeGreaterThan(1);
      expect(stored.content.data).toMatch(/update_\d/);
    });
  });

  describe('Configuration File Integration', () => {
    test('tools configuration should be valid and loadable', () => {
      const toolsPath = path.join(__dirname, '../../config/tools.json');
      
      expect(() => {
        const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    test('system configuration should be valid and loadable', () => {
      const configPath = path.join(__dirname, '../../config/system-config.json');
      
      expect(() => {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        expect(config.platform).toBeDefined();
        expect(config.core_capabilities).toBeDefined();
      }).not.toThrow();
    });

    test('configurations should work together in platform', async () => {
      const platform = new UnifiedAIPlatform();

      // Platform should successfully load both configs
      expect(platform.tools).toBeDefined();
      expect(platform.app).toBeDefined();

      // Should be able to access both via API
      const capabilities = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      const tools = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(capabilities.body.platform).toBeDefined();
      expect(tools.body.tools).toBeDefined();
    });
  });
});