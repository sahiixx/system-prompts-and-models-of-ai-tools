/**
 * Integration Tests for UnifiedAIPlatform
 * 
 * These tests cover integrated workflows and multi-step operations:
 * - Memory and Plans integration
 * - Cross-endpoint workflows
 * - State management across operations
 * - Complex real-world scenarios
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

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
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        }
      }
    }
  }
]));

describe('UnifiedAIPlatform Integration Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Memory and Plans Integration', () => {
    test('should create plan with memory context', async () => {
      // Store user preferences in memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ 
          key: 'user_context', 
          value: { role: 'developer', experience: 'senior' } 
        })
        .expect(200);

      // Create a plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Implement authentication system',
          steps: ['Design schema', 'Implement endpoints', 'Add tests']
        })
        .expect(200);

      // Verify both memory and plan exist
      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memoryResponse.body.count).toBe(1);
      expect(plansResponse.body.count).toBe(1);
      expect(planResponse.body.plan_id).toBeDefined();
    });

    test('should handle workflow: store memory -> create plan -> query both', async () => {
      // Step 1: Store multiple memories
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'project_name', value: 'AI Platform' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'tech_stack', value: ['Node.js', 'Express', 'Jest'] })
        .expect(200);

      // Step 2: Create related plan
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Build AI Platform features',
          steps: ['Setup', 'Develop', 'Test', 'Deploy']
        })
        .expect(200);

      // Step 3: Verify all data
      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memoryResponse.body.count).toBe(2);
      expect(plansResponse.body.count).toBe(1);
    });

    test('should maintain state across multiple operations', async () => {
      // Create initial state
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'session_id', value: 'session_123' })
        .expect(200);

      // Create multiple plans in sequence
      const plan1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Phase 1' })
        .expect(200);

      const plan2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Phase 2' })
        .expect(200);

      // Verify state persistence
      expect(platform.memory.size).toBe(1);
      expect(platform.plans.size).toBe(2);
      expect(plan1.body.plan_id).not.toBe(plan2.body.plan_id);
    });
  });

  describe('Multi-Endpoint Workflows', () => {
    test('should handle complete project workflow', async () => {
      // 1. Check health
      const health = await request(platform.app)
        .get('/health')
        .expect(200);
      expect(health.body.status).toBe('healthy');

      // 2. Get available tools
      const tools = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);
      expect(tools.body.tools).toBeDefined();

      // 3. Store project requirements in memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ 
          key: 'requirements', 
          value: {
            features: ['auth', 'api', 'db'],
            deadline: '2024-12-31'
          }
        })
        .expect(200);

      // 4. Create execution plan
      const plan = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Implement requirements',
          steps: ['Setup', 'Implement auth', 'Implement API', 'Setup DB', 'Test']
        })
        .expect(200);

      // 5. Verify capabilities
      const capabilities = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);
      
      expect(capabilities.body.core_capabilities).toBeDefined();
      expect(plan.body.plan_id).toBeDefined();
    });

    test('should support iterative plan refinement', async () => {
      // Initial plan
      const plan1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Initial draft',
          steps: ['Step 1', 'Step 2']
        })
        .expect(200);

      // Store feedback in memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ 
          key: `feedback_${plan1.body.plan_id}`, 
          value: 'Add more detail to steps'
        })
        .expect(200);

      // Refined plan
      const plan2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Refined version',
          steps: ['Step 1a', 'Step 1b', 'Step 2a', 'Step 2b', 'Step 2c']
        })
        .expect(200);

      expect(platform.plans.size).toBe(2);
      const allPlans = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);
      
      expect(allPlans.body.count).toBe(2);
    });
  });

  describe('Concurrent Workflow Operations', () => {
    test('should handle concurrent mixed operations', async () => {
      const operations = [
        request(platform.app).post('/api/v1/memory').send({ key: 'm1', value: 'v1' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'Task 1' }),
        request(platform.app).post('/api/v1/memory').send({ key: 'm2', value: 'v2' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'Task 2' }),
        request(platform.app).get('/api/v1/tools'),
        request(platform.app).get('/health')
      ];

      const results = await Promise.all(operations);
      
      results.forEach(result => {
        expect(result.status).toBeLessThan(400);
      });

      expect(platform.memory.size).toBe(2);
      expect(platform.plans.size).toBe(2);
    });

    test('should maintain data integrity under concurrent load', async () => {
      const memoryOps = Array.from({ length: 20 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `load_test_${i}`, value: `data_${i}` })
      );

      const planOps = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Concurrent task ${i}` })
      );

      await Promise.all([...memoryOps, ...planOps]);

      expect(platform.memory.size).toBe(20);
      expect(platform.plans.size).toBe(10);

      // Verify data integrity
      const memoryCheck = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      
      expect(memoryCheck.body.count).toBe(20);
    });
  });

  describe('State Recovery and Consistency', () => {
    test('should maintain consistent state after errors', async () => {
      // Valid operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid', value: 'data' })
        .expect(200);

      // Invalid operation (should fail)
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'data' })
        .expect(400);

      // Another valid operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid2', value: 'data2' })
        .expect(200);

      // State should only have valid entries
      expect(platform.memory.size).toBe(2);
      expect(platform.memory.has('valid')).toBe(true);
      expect(platform.memory.has('valid2')).toBe(true);
      expect(platform.memory.has('')).toBe(false);
    });

    test('should handle alternating success and failure operations', async () => {
      const operations = [
        request(platform.app).post('/api/v1/memory').send({ key: 'k1', value: 'v1' }),
        request(platform.app).post('/api/v1/memory').send({ key: '', value: 'invalid' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'Valid plan' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: '' }),
        request(platform.app).post('/api/v1/memory').send({ key: 'k2', value: 'v2' })
      ];

      await Promise.allSettled(operations);

      expect(platform.memory.size).toBe(2);
      expect(platform.plans.size).toBe(1);
    });
  });

  describe('Complex Data Scenarios', () => {
    test('should handle deeply nested memory objects', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              level4: {
                data: 'deep value',
                array: [1, 2, { nested: true }]
              }
            }
          }
        },
        metadata: {
          created: new Date().toISOString(),
          tags: ['important', 'nested', 'complex']
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complex_structure', value: complexData })
        .expect(200);

      const stored = platform.memory.get('complex_structure');
      expect(stored.content).toEqual(complexData);
      expect(stored.content.level1.level2.level3.level4.data).toBe('deep value');
    });

    test('should handle plans with complex step structures', async () => {
      const complexSteps = Array.from({ length: 50 }, (_, i) => ({
        step_id: `step_${i}`,
        description: `Detailed step ${i}`,
        substeps: [`sub_${i}_1`, `sub_${i}_2`],
        dependencies: i > 0 ? [`step_${i - 1}`] : []
      }));

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ 
          task_description: 'Complex multi-step project',
          steps: complexSteps
        })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toHaveLength(50);
      expect(plan.steps[25].substeps).toHaveLength(2);
    });
  });

  describe('API Response Consistency', () => {
    test('should return consistent timestamp formats', async () => {
      const responses = await Promise.all([
        request(platform.app).get('/health'),
        request(platform.app).post('/api/v1/memory').send({ key: 'test', value: 'data' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'test' })
      ]);

      responses.forEach(response => {
        if (response.body.timestamp || response.body.created_at) {
          const timestamp = response.body.timestamp || response.body.created_at;
          expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
      });
    });

    test('should maintain consistent error response format', async () => {
      const errorResponses = await Promise.all([
        request(platform.app).get('/api/v1/nonexistent'),
        request(platform.app).post('/api/v1/memory').send({}),
        request(platform.app).post('/api/v1/plans').send({})
      ]);

      errorResponses.forEach(response => {
        expect(response.body.error || response.body.message).toBeDefined();
        if (response.body.timestamp) {
          expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        }
      });
    });
  });

  describe('Resource Cleanup', () => {
    test('should handle large dataset cleanup', async () => {
      // Create large dataset
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `cleanup_${i}`, value: `value_${i}` })
      );

      await Promise.all(promises);
      expect(platform.memory.size).toBe(100);

      // Clear would be implemented in actual cleanup method
      // For now, verify we can query all
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);
      
      expect(response.body.count).toBe(100);
    });
  });
});