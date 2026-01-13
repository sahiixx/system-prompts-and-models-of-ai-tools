/**
 * Integration Tests for Unified AI Platform
 * 
 * These tests verify the integration between different components:
 * - Memory and planning system interaction
 * - Configuration loading and application
 * - End-to-end request flows
 * - Component communication
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');

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
  { type: 'function', function: { name: 'test_tool', description: 'A test tool' } }
]));

describe('Platform Integration Tests', () => {
  describe('Memory and Planning Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should create plan and store related memory', async () => {
      // Store memory about task context
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'task_context', value: 'User wants to build a web app' })
        .expect(200);

      // Create plan based on context
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build web application',
          steps: ['Setup', 'Development', 'Testing']
        })
        .expect(200);

      const planId = planResponse.body.plan_id;

      // Store plan reference in memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'active_plan_id', value: planId })
        .expect(200);

      // Verify both systems have data
      const memoryResponse = await request(platform.app).get('/api/v1/memory');
      const plansResponse = await request(platform.app).get('/api/v1/plans');

      expect(memoryResponse.body.count).toBe(2);
      expect(plansResponse.body.count).toBe(1);
    });

    test('should handle workflow: context → plan → execution tracking', async () => {
      // 1. Store initial context
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_goal', value: 'Optimize database queries' });

      // 2. Create execution plan
      const planResp = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Database optimization',
          steps: ['Analyze', 'Index', 'Optimize', 'Test']
        });

      // 3. Store progress
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'current_step', value: 0 });

      // 4. Verify complete workflow setup
      const memory = await request(platform.app).get('/api/v1/memory');
      const plans = await request(platform.app).get('/api/v1/plans');

      expect(memory.body.count).toBe(2);
      expect(plans.body.count).toBe(1);
      
      const plan = platform.plans.get(planResp.body.plan_id);
      expect(plan.steps.length).toBe(4);
    });
  });

  describe('Configuration Integration', () => {
    test('should apply configuration to platform capabilities', async () => {
      const platform = new UnifiedAIPlatform();
      
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.core_capabilities.multi_modal.enabled).toBe(true);
      expect(response.body.core_capabilities.memory_system.enabled).toBe(true);
      expect(response.body.core_capabilities.tool_system.enabled).toBe(true);
    });

    test('should reflect configuration in health check', async () => {
      const platform = new UnifiedAIPlatform();
      
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      const features = response.body.features;
      expect(features.multi_modal).toBe(true);
      expect(features.memory_system).toBe(true);
      expect(features.tool_system).toBe(true);
      expect(features.planning_system).toBe(true);
      expect(features.security).toBe(true);
    });
  });

  describe('End-to-End Request Flows', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should handle complete task execution flow', async () => {
      // 1. Check system health
      const healthResp = await request(platform.app).get('/health');
      expect(healthResp.status).toBe(200);

      // 2. Get available tools
      const toolsResp = await request(platform.app).get('/api/v1/tools');
      expect(toolsResp.body.tools).toBeDefined();

      // 3. Store user preferences
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'preferences', value: { theme: 'dark', lang: 'en' } });

      // 4. Create execution plan
      const planResp = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complete task', steps: ['Step1', 'Step2'] });

      // 5. Verify all operations succeeded
      expect(planResp.body.success).toBe(true);
      expect(platform.memory.size).toBe(1);
      expect(platform.plans.size).toBe(1);
    });

    test('should maintain state across multiple requests', async () => {
      // Simulate user session
      const sessionId = 'test_session_123';

      // Store session data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: `session_${sessionId}`, value: { user: 'test', started: new Date() } });

      // Create multiple plans in session
      for (let i = 0; i < 3; i++) {
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` });
      }

      // Verify session state
      const memoryResp = await request(platform.app).get('/api/v1/memory');
      const plansResp = await request(platform.app).get('/api/v1/plans');

      expect(memoryResp.body.count).toBe(1);
      expect(plansResp.body.count).toBe(3);

      // Verify session data integrity
      const sessionData = platform.memory.get(`session_${sessionId}`);
      expect(sessionData.content.user).toBe('test');
    });
  });

  describe('Error Recovery and Resilience', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should recover from failed memory write and continue', async () => {
      // Valid operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid', value: 'data' })
        .expect(200);

      // Invalid operation (should fail but not crash)
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'bad' })
        .expect(400);

      // System should still be operational
      const healthResp = await request(platform.app).get('/health');
      expect(healthResp.status).toBe(200);

      // Valid data should still be retrievable
      const memoryResp = await request(platform.app).get('/api/v1/memory');
      expect(memoryResp.body.count).toBe(1);
    });

    test('should handle mixed success/failure in concurrent operations', async () => {
      const operations = [
        // Valid operations
        request(platform.app).post('/api/v1/memory').send({ key: 'k1', value: 'v1' }),
        request(platform.app).post('/api/v1/memory').send({ key: 'k2', value: 'v2' }),
        // Invalid operations
        request(platform.app).post('/api/v1/memory').send({ key: '', value: 'bad' }),
        request(platform.app).post('/api/v1/memory').send({ value: 'no_key' }),
        // More valid operations
        request(platform.app).post('/api/v1/memory').send({ key: 'k3', value: 'v3' }),
      ];

      const results = await Promise.all(operations);
      
      const successCount = results.filter(r => r.status === 200).length;
      const failCount = results.filter(r => r.status === 400).length;

      expect(successCount).toBe(3);
      expect(failCount).toBe(2);

      // Platform should still be healthy
      const healthResp = await request(platform.app).get('/health');
      expect(healthResp.status).toBe(200);
    });
  });

  describe('Data Consistency', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should maintain data consistency across operations', async () => {
      // Create multiple related data points
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'project', value: 'MyApp' });

      const plan1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Build MyApp frontend' });

      const plan2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Build MyApp backend' });

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'plan_ids', value: [plan1.body.plan_id, plan2.body.plan_id] });

      // Verify data consistency
      const memoryData = platform.memory.get('plan_ids');
      expect(memoryData.content.length).toBe(2);

      const plansResp = await request(platform.app).get('/api/v1/plans');
      expect(plansResp.body.count).toBe(2);

      // Verify both plan IDs exist
      memoryData.content.forEach(planId => {
        expect(platform.plans.has(planId)).toBe(true);
      });
    });

    test('should maintain timestamp consistency', async () => {
      const beforeTime = new Date();

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'time_test', value: 'data' });

      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Time test task' });

      const afterTime = new Date();

      // Check memory timestamp
      const memoryData = platform.memory.get('time_test');
      const memoryTime = new Date(memoryData.created_at);
      expect(memoryTime >= beforeTime).toBe(true);
      expect(memoryTime <= afterTime).toBe(true);

      // Check plan timestamp
      const plans = Array.from(platform.plans.values());
      const planTime = new Date(plans[0].created_at);
      expect(planTime >= beforeTime).toBe(true);
      expect(planTime <= afterTime).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('should handle high-throughput scenario', async () => {
      const startTime = Date.now();
      const operations = [];

      // Create 50 operations (mix of memory and plans)
      for (let i = 0; i < 25; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `perf_${i}`, value: `value_${i}` })
        );
        
        operations.push(
          request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: `Task ${i}` })
        );
      }

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);

      // Verify all data was stored
      expect(platform.memory.size).toBe(25);
      expect(platform.plans.size).toBe(25);
    });
  });
});