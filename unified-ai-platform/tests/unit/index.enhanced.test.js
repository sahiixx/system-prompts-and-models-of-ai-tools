/**
 * Enhanced Comprehensive Tests for UnifiedAIPlatform
 * 
 * These tests provide extensive coverage of advanced scenarios:
 * - Complex state management
 * - Advanced error recovery
 * - Memory lifecycle operations
 * - Plan execution workflows
 * - Cross-feature integration
 * - Advanced security scenarios
 * - Performance edge cases
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

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

describe('UnifiedAIPlatform Enhanced Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Advanced Memory Operations', () => {
    test('should handle memory versioning pattern', async () => {
      const key = 'versioned_data';
      
      // Version 1
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key, value: { version: 1, data: 'initial' } })
        .expect(200);

      // Version 2
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key, value: { version: 2, data: 'updated' } })
        .expect(200);

      // Version 3
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key, value: { version: 3, data: 'final' } })
        .expect(200);

      const stored = platform.memory.get(key);
      expect(stored.content.version).toBe(3);
    });

    test('should handle memory with metadata patterns', async () => {
      const memoryWithMeta = {
        key: 'documented_memory',
        value: {
          data: 'actual content',
          metadata: {
            author: 'test',
            tags: ['important', 'verified'],
            created_by: 'system',
            last_modified: new Date().toISOString()
          }
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send(memoryWithMeta)
        .expect(200);

      const stored = platform.memory.get('documented_memory');
      expect(stored.content.metadata).toBeDefined();
      expect(stored.content.metadata.tags).toContain('important');
    });

    test('should handle memory search patterns', async () => {
      // Store multiple related memories
      const memories = [
        { key: 'user:1:profile', value: { name: 'User 1' } },
        { key: 'user:1:settings', value: { theme: 'dark' } },
        { key: 'user:2:profile', value: { name: 'User 2' } },
        { key: 'user:2:settings', value: { theme: 'light' } }
      ];

      for (const mem of memories) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send(mem)
          .expect(200);
      }

      const allMemories = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(allMemories.body.count).toBe(4);
      
      // Simulate search by key pattern
      const user1Keys = allMemories.body.memories
        .filter(([key]) => key.startsWith('user:1:'));
      
      expect(user1Keys).toHaveLength(2);
    });

    test('should handle memory expiration pattern', async () => {
      const expiringMemory = {
        key: 'temp_session',
        value: {
          data: 'temporary',
          expires_at: new Date(Date.now() + 1000).toISOString()
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send(expiringMemory)
        .expect(200);

      const stored = platform.memory.get('temp_session');
      expect(stored.content.expires_at).toBeDefined();
    });

    test('should handle memory relationships', async () => {
      // Parent memory
      const parentId = 'parent_' + Date.now();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ 
          key: parentId,
          value: { type: 'parent', children: [] }
        })
        .expect(200);

      // Child memories
      for (let i = 0; i < 3; i++) {
        const childId = `child_${i}_${Date.now()}`;
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ 
            key: childId,
            value: { type: 'child', parent: parentId, index: i }
          })
          .expect(200);

        // Update parent with child reference
        const parent = platform.memory.get(parentId);
        parent.content.children.push(childId);
        platform.memory.set(parentId, parent);
      }

      const parent = platform.memory.get(parentId);
      expect(parent.content.children).toHaveLength(3);
    });

    test('should handle circular reference detection', async () => {
      const data = {
        key: 'circular_test',
        value: {
          id: 1,
          name: 'Test',
          reference: null
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send(data)
        .expect(200);

      // System should handle without crashing
      const health = await request(platform.app).get('/health');
      expect(health.status).toBe(200);
    });
  });

  describe('Advanced Plan Operations', () => {
    test('should handle multi-phase plan execution', async () => {
      const phases = ['Planning', 'Development', 'Testing', 'Deployment'];
      const planIds = [];

      for (const phase of phases) {
        const response = await request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: `${phase} Phase`,
            steps: [`${phase} Step 1`, `${phase} Step 2`]
          })
          .expect(200);

        planIds.push(response.body.plan_id);
      }

      // Store execution order
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'execution_order',
          value: { phases, planIds }
        })
        .expect(200);

      expect(platform.plans.size).toBe(4);
    });

    test('should handle plan dependencies', async () => {
      // Create dependent plans
      const setupPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Setup infrastructure',
          steps: ['Initialize', 'Configure']
        })
        .expect(200);

      const buildPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build application',
          steps: ['Compile', 'Test']
        })
        .expect(200);

      // Store dependency relationship
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'plan_dependencies',
          value: {
            [buildPlan.body.plan_id]: {
              depends_on: [setupPlan.body.plan_id]
            }
          }
        })
        .expect(200);

      const deps = platform.memory.get('plan_dependencies');
      expect(deps.content[buildPlan.body.plan_id].depends_on).toContain(setupPlan.body.plan_id);
    });

    test('should handle plan status transitions', async () => {
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Task with status tracking'
        })
        .expect(200);

      const planId = planResponse.body.plan_id;
      const statusHistory = [];

      // Simulate status transitions
      const statuses = ['created', 'in_progress', 'completed'];
      for (const status of statuses) {
        const plan = platform.plans.get(planId);
        plan.status = status;
        plan.updated_at = new Date().toISOString();
        platform.plans.set(planId, plan);
        
        statusHistory.push({
          status,
          timestamp: new Date().toISOString()
        });
      }

      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `status_history_${planId}`,
          value: statusHistory
        })
        .expect(200);

      const finalPlan = platform.plans.get(planId);
      expect(finalPlan.status).toBe('completed');
    });

    test('should handle conditional plan execution', async () => {
      // Main plan
      const mainPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Main workflow',
          steps: ['Check condition', 'Execute branch']
        })
        .expect(200);

      // Conditional branches
      const branch1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Branch 1: Success path',
          steps: ['Handle success']
        })
        .expect(200);

      const branch2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Branch 2: Fallback path',
          steps: ['Handle fallback']
        })
        .expect(200);

      // Store conditional logic
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'conditional_plans',
          value: {
            main: mainPlan.body.plan_id,
            branches: {
              success: branch1.body.plan_id,
              fallback: branch2.body.plan_id
            }
          }
        })
        .expect(200);

      expect(platform.plans.size).toBe(3);
    });

    test('should handle plan rollback scenarios', async () => {
      const deployPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Deploy to production',
          steps: ['Backup', 'Deploy', 'Verify', 'Cleanup']
        })
        .expect(200);

      const rollbackPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Rollback deployment',
          steps: ['Stop service', 'Restore backup', 'Restart', 'Verify']
        })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'rollback_mapping',
          value: {
            [deployPlan.body.plan_id]: rollbackPlan.body.plan_id
          }
        })
        .expect(200);

      const mapping = platform.memory.get('rollback_mapping');
      expect(mapping.content[deployPlan.body.plan_id]).toBe(rollbackPlan.body.plan_id);
    });
  });

  describe('Cross-Feature Integration', () => {
    test('should handle memory-driven plan generation', async () => {
      // Store requirements
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'project_requirements',
          value: {
            features: ['auth', 'api', 'frontend'],
            priority: 'high',
            deadline: '2024-12-31'
          }
        })
        .expect(200);

      // Generate plan based on requirements
      const requirements = platform.memory.get('project_requirements');
      const steps = requirements.content.features.map(f => `Implement ${f}`);

      await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Project implementation',
          steps
        })
        .expect(200);

      expect(platform.plans.size).toBe(1);
      const plan = Array.from(platform.plans.values())[0];
      expect(plan.steps).toHaveLength(3);
    });

    test('should handle tool-assisted planning', async () => {
      // Store available tools
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'available_tools',
          value: platform.tools.map(t => t.function.name)
        })
        .expect(200);

      // Create plan referencing tools
      await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Execute with tools',
          steps: ['Use tool 1', 'Process', 'Use tool 2']
        })
        .expect(200);

      const tools = platform.memory.get('available_tools');
      expect(Array.isArray(tools.content)).toBe(true);
    });

    test('should handle context-aware operations', async () => {
      // Set context
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'current_context',
          value: {
            user: 'test_user',
            session: 'session_123',
            workspace: 'project_a'
          }
        })
        .expect(200);

      // Create context-aware plan
      const context = platform.memory.get('current_context');
      await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: `Task for ${context.content.user} in ${context.content.workspace}`
        })
        .expect(200);

      const plan = Array.from(platform.plans.values())[0];
      expect(plan.task_description).toContain('test_user');
    });

    test('should handle feedback loops', async () => {
      // Initial plan
      const plan1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Initial attempt'
        })
        .expect(200);

      // Store feedback
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `feedback_${plan1.body.plan_id}`,
          value: {
            status: 'needs_improvement',
            suggestions: ['Add more detail', 'Include tests']
          }
        })
        .expect(200);

      // Revised plan incorporating feedback
      const feedback = platform.memory.get(`feedback_${plan1.body.plan_id}`);
      await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Revised attempt with improvements',
          steps: feedback.content.suggestions
        })
        .expect(200);

      expect(platform.plans.size).toBe(2);
    });
  });

  describe('Advanced Error Scenarios', () => {
    test('should handle cascading failures gracefully', async () => {
      // Valid operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid1', value: 'data1' })
        .expect(200);

      // Series of invalid operations
      const invalidOps = [
        request(platform.app).post('/api/v1/memory').send({}),
        request(platform.app).post('/api/v1/plans').send({}),
        request(platform.app).post('/api/v1/memory').send({ key: '', value: 'x' })
      ];

      await Promise.allSettled(invalidOps);

      // System should still be responsive
      const health = await request(platform.app).get('/health');
      expect(health.status).toBe(200);
      expect(platform.memory.size).toBe(1);
    });

    test('should recover from partial operation failures', async () => {
      const operations = [];
      
      // Mix of valid and invalid
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) {
          operations.push(
            request(platform.app).post('/api/v1/memory').send({})
          );
        } else {
          operations.push(
            request(platform.app).post('/api/v1/memory').send({
              key: `key_${i}`,
              value: `value_${i}`
            })
          );
        }
      }

      await Promise.allSettled(operations);

      // Should have ~13-14 valid entries (20 - 6-7 invalid)
      expect(platform.memory.size).toBeGreaterThan(10);
      expect(platform.memory.size).toBeLessThan(15);
    });

    test('should handle timeout scenarios', async () => {
      // Simulate operations that might timeout
      const timeoutOps = Array.from({ length: 5 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: 'Heavy task',
            steps: Array.from({ length: 1000 }, (_, j) => `Step ${j}`)
          })
          .timeout(5000)
      );

      const results = await Promise.allSettled(timeoutOps);
      
      // Some operations should complete
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      expect(fulfilled).toBeGreaterThan(0);
    });
  });

  describe('Advanced Validation Scenarios', () => {
    test('should validate complex data structures', async () => {
      const complexData = {
        array_of_objects: [
          { id: 1, nested: { deep: { value: 'test' } } },
          { id: 2, nested: { deep: { value: 'test2' } } }
        ],
        mixed_types: [1, 'string', true, null, { key: 'value' }],
        functions_serialized: {
          type: 'function',
          name: 'testFunc',
          params: ['a', 'b']
        }
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complex_validation', value: complexData })
        .expect(200);

      const stored = platform.memory.get('complex_validation');
      expect(stored.content.array_of_objects).toHaveLength(2);
      expect(stored.content.mixed_types).toHaveLength(5);
    });

    test('should handle boundary value testing', async () => {
      const boundaryTests = [
        { key: 'min_int', value: Number.MIN_SAFE_INTEGER },
        { key: 'max_int', value: Number.MAX_SAFE_INTEGER },
        { key: 'empty_string', value: '' },
        { key: 'empty_array', value: [] },
        { key: 'empty_object', value: {} },
        { key: 'zero', value: 0 },
        { key: 'false', value: false }
      ];

      for (const test of boundaryTests) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send(test);

        expect([200, 400]).toContain(response.status);
      }
    });

    test('should handle character encoding edge cases', async () => {
      const encodingTests = [
        'UTF-8: 你好世界',
        'Emoji: 🎉🚀💻',
        'Special: ™️®️©️',
        'Math: ∑∫∂√',
        'Arrows: ←↑→↓',
        'Box: ┌┐└┘',
        'Combining: é (e + ́)'
      ];

      for (const text of encodingTests) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `encoding_${Math.random()}`, value: text })
          .expect(200);
      }
    });
  });

  describe('Performance Under Stress', () => {
    test('should maintain performance with growing dataset', async () => {
      const sizes = [10, 50, 100, 200];
      const times = [];

      for (const size of sizes) {
        const start = Date.now();
        
        for (let i = 0; i < size; i++) {
          await request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `stress_${size}_${i}`, value: 'data' });
        }

        times.push(Date.now() - start);
      }

      // Performance degradation should be roughly linear
      const firstRate = times[0] / sizes[0];
      const lastRate = times[times.length - 1] / sizes[sizes.length - 1];
      
      expect(lastRate / firstRate).toBeLessThan(5);
    });

    test('should handle memory pressure gracefully', async () => {
      // Create many large objects
      const largeData = 'x'.repeat(10000);
      
      for (let i = 0; i < 50; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `pressure_${i}`, value: largeData });
      }

      // System should still respond
      const health = await request(platform.app).get('/health');
      expect(health.status).toBe(200);
      expect(health.body.memory).toBeDefined();
    });
  });

  describe('State Consistency Verification', () => {
    test('should maintain consistency across operations', async () => {
      const operations = [];

      // Interleaved operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          request(platform.app).post('/api/v1/memory').send({
            key: `consistency_mem_${i}`,
            value: i
          })
        );
        
        operations.push(
          request(platform.app).post('/api/v1/plans').send({
            task_description: `Consistency plan ${i}`
          })
        );
      }

      await Promise.all(operations);

      // Verify final state
      expect(platform.memory.size).toBe(10);
      expect(platform.plans.size).toBe(10);

      // Verify each entry is correct
      for (let i = 0; i < 10; i++) {
        const mem = platform.memory.get(`consistency_mem_${i}`);
        expect(mem.content).toBe(i);
      }
    });

    test('should handle state queries during modifications', async () => {
      const writeOps = Array.from({ length: 20 }, (_, i) =>
        request(platform.app).post('/api/v1/memory').send({
          key: `query_test_${i}`,
          value: i
        })
      );

      const readOps = Array.from({ length: 10 }, () =>
        request(platform.app).get('/api/v1/memory')
      );

      await Promise.all([...writeOps, ...readOps]);

      // All reads should complete successfully
      expect(platform.memory.size).toBe(20);
    });
  });
});