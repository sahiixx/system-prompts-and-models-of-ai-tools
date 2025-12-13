/**
 * Integration Tests for Unified AI Platform
 * 
 * These tests focus on:
 * - End-to-end workflows
 * - Multi-step operations
 * - State management across operations
 * - API endpoint interactions
 * - Complex business logic flows
 * - Data consistency
 * - Cross-feature integration
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');
const { SimpleUnifiedAIPlatform } = require('../../src/simple-server');
const http = require('http');

jest.mock('../../config/system-config.json', () => ({
  platform: { name: 'Unified AI Platform', version: '1.0.0' },
  core_capabilities: {
    multi_modal: { enabled: true },
    memory_system: { enabled: true },
    tool_system: { enabled: true },
    planning_system: { enabled: true },
    security: { enabled: true }
  },
  operating_modes: { development: { debug: true }, production: { debug: false } },
  performance: {
    response_time: { target_ms: 1000, max_ms: 5000 },
    memory_usage: { max_mb: 512 },
    concurrent_operations: { max_parallel: 10, queue_size: 100 }
  }
}));

jest.mock('../../config/tools.json', () => ([
  { type: 'function', function: { name: 'read_file', description: 'Read file' } },
  { type: 'function', function: { name: 'write_file', description: 'Write file' } },
  { type: 'function', function: { name: 'execute_command', description: 'Execute' } }
]));

describe('Integration Tests - Complete Workflows', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  afterEach(() => {
    platform.memory.clear();
    platform.plans.clear();
  });

  describe('Memory and Planning Integration', () => {
    test('should use memory to inform plan creation', async () => {
      // Step 1: Store user preferences
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_language', value: 'Python' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_framework', value: 'Django' })
        .expect(200);

      // Step 2: Create plan that could reference memory
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build web application',
          steps: [
            'Set up Python environment',
            'Install Django',
            'Create project structure'
          ]
        })
        .expect(200);

      // Step 3: Verify both systems have data
      const memoryResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(memoryResponse.body.count).toBe(2);
      expect(plansResponse.body.count).toBe(1);

      // Verify plan exists
      const plan = platform.plans.get(planResponse.body.plan_id);
      expect(plan.steps).toHaveLength(3);
    });

    test('should maintain state across multiple operations', async () => {
      // Simulate a complete workflow
      const workflow = [
        { type: 'memory', key: 'project_name', value: 'MyApp' },
        { type: 'memory', key: 'project_type', value: 'API' },
        { type: 'plan', description: 'Design MyApp API', steps: ['Define endpoints', 'Design schema'] },
        { type: 'memory', key: 'design_complete', value: 'true' },
        { type: 'plan', description: 'Implement MyApp API', steps: ['Code endpoints', 'Write tests'] }
      ];

      for (const item of workflow) {
        if (item.type === 'memory') {
          await request(platform.app)
            .post('/api/v1/memory')
            .send({ key: item.key, value: item.value })
            .expect(200);
        } else if (item.type === 'plan') {
          await request(platform.app)
            .post('/api/v1/plans')
            .send({ task_description: item.description, steps: item.steps })
            .expect(200);
        }
      }

      // Verify final state
      expect(platform.memory.size).toBe(3);
      expect(platform.plans.size).toBe(2);

      const designComplete = platform.memory.get('design_complete');
      expect(designComplete.content).toBe('true');
    });

    test('should handle complex multi-phase workflow', async () => {
      // Phase 1: Requirements gathering
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'requirements', value: ['Auth', 'CRUD', 'Search'] })
        .expect(200);

      const phase1Plan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Requirements Analysis',
          steps: ['Review requirements', 'Create user stories']
        })
        .expect(200);

      // Phase 2: Design
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'architecture', value: 'Microservices' })
        .expect(200);

      const phase2Plan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'System Design',
          steps: ['Design architecture', 'Create API specs']
        })
        .expect(200);

      // Phase 3: Implementation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'tech_stack', value: 'Node.js + PostgreSQL' })
        .expect(200);

      const phase3Plan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Implementation',
          steps: ['Set up services', 'Implement APIs', 'Write tests']
        })
        .expect(200);

      // Verify all phases are captured
      expect(platform.memory.size).toBe(3);
      expect(platform.plans.size).toBe(3);

      // Verify plan IDs are unique
      const planIds = [phase1Plan.body.plan_id, phase2Plan.body.plan_id, phase3Plan.body.plan_id];
      const uniqueIds = new Set(planIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Tool Discovery and Usage Workflow', () => {
    test('should discover tools then create plan using them', async () => {
      // Step 1: Discover available tools
      const toolsResponse = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(toolsResponse.body.tools).toBeDefined();
      const toolNames = toolsResponse.body.tools.map(t => t.function.name);

      // Step 2: Store tool preferences
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'preferred_tools', value: toolNames })
        .expect(200);

      // Step 3: Create plan that references tools
      await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Use tools to complete task',
          steps: toolNames.map(name => `Execute ${name}`)
        })
        .expect(200);

      expect(platform.plans.size).toBe(1);
    });

    test('should validate tool availability before planning', async () => {
      // Get available tools
      const toolsResponse = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      const availableTools = toolsResponse.body.tools.map(t => t.function.name);

      // Attempt to create plan with valid tools
      const validPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Valid tool usage',
          steps: availableTools.map(t => `Use ${t}`)
        })
        .expect(200);

      expect(validPlan.body.success).toBe(true);
    });
  });

  describe('Health Check and Capabilities Flow', () => {
    test('should verify platform health before operations', async () => {
      // Step 1: Check health
      const healthResponse = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // Step 2: Get capabilities
      const capabilitiesResponse = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(capabilitiesResponse.body.core_capabilities).toBeDefined();

      // Step 3: Proceed with operations if healthy
      if (healthResponse.body.status === 'healthy') {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'operation_start', value: new Date().toISOString() })
          .expect(200);
      }

      expect(platform.memory.has('operation_start')).toBe(true);
    });

    test('should use capabilities to determine available operations', async () => {
      const capabilitiesResponse = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      const capabilities = capabilitiesResponse.body.core_capabilities;

      // Conditionally execute based on capabilities
      if (capabilities.memory_system.enabled) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'memory_enabled', value: 'true' })
          .expect(200);
      }

      if (capabilities.planning_system.enabled) {
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: 'Planning enabled task' })
          .expect(200);
      }

      expect(platform.memory.size).toBeGreaterThan(0);
      expect(platform.plans.size).toBeGreaterThan(0);
    });
  });

  describe('State Consistency', () => {
    test('should maintain consistent state during failures', async () => {
      // Add valid data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'valid_key', value: 'valid_value' })
        .expect(200);

      const beforeSize = platform.memory.size;

      // Attempt invalid operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: null, value: 'invalid' })
        .expect(400);

      // State should be unchanged
      expect(platform.memory.size).toBe(beforeSize);
    });

    test('should rollback partial failures', async () => {
      const initialMemorySize = platform.memory.size;
      const initialPlansSize = platform.plans.size;

      // Valid memory operation
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'rollback_test', value: 'data' })
        .expect(200);

      // Invalid plan operation
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: '' })
        .expect(400);

      // Memory should have increased by 1, plans should be unchanged
      expect(platform.memory.size).toBe(initialMemorySize + 1);
      expect(platform.plans.size).toBe(initialPlansSize);
    });

    test('should maintain data integrity across concurrent updates', async () => {
      // Create initial state
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'counter', value: 0 })
        .expect(200);

      // Simulate concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `concurrent_${i}`, value: i })
      );

      await Promise.all(updates);

      // All updates should succeed
      expect(platform.memory.size).toBe(11); // initial + 10 updates
    });
  });

  describe('Cross-Feature Workflows', () => {
    test('should combine memory, planning, and tools', async () => {
      // Step 1: Get available tools
      const toolsResponse = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      // Step 2: Store tool configuration in memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'tool_config',
          value: {
            tools: toolsResponse.body.tools.map(t => t.function.name),
            enabled: true
          }
        })
        .expect(200);

      // Step 3: Create execution plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Execute tools with configuration',
          steps: [
            'Load tool configuration',
            'Validate tools',
            'Execute tool chain'
          ]
        })
        .expect(200);

      // Step 4: Store execution status
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: 'execution_status',
          value: {
            plan_id: planResponse.body.plan_id,
            status: 'in_progress',
            started_at: new Date().toISOString()
          }
        })
        .expect(200);

      // Verify complete workflow state
      expect(platform.memory.size).toBe(2);
      expect(platform.plans.size).toBe(1);
      
      const toolConfig = platform.memory.get('tool_config');
      const execStatus = platform.memory.get('execution_status');
      
      expect(toolConfig.content.enabled).toBe(true);
      expect(execStatus.content.plan_id).toBe(planResponse.body.plan_id);
    });

    test('should handle iterative refinement workflow', async () => {
      // Iteration 1
      const plan1 = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Initial implementation',
          steps: ['Step 1', 'Step 2']
        })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'iteration_1_feedback', value: 'Needs improvement' })
        .expect(200);

      // Iteration 2
      const plan2 = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Refined implementation',
          steps: ['Step 1 improved', 'Step 2 improved', 'Step 3 added']
        })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'iteration_2_feedback', value: 'Much better' })
        .expect(200);

      // Verify progression
      expect(platform.plans.size).toBe(2);
      expect(platform.memory.size).toBe(2);

      const refinedPlan = platform.plans.get(plan2.body.plan_id);
      expect(refinedPlan.steps).toHaveLength(3);
    });
  });

  describe('Session Management Workflows', () => {
    test('should simulate a complete user session', async () => {
      // Session start
      const sessionId = `session_${Date.now()}`;
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: sessionId,
          value: {
            started_at: new Date().toISOString(),
            user: 'test_user',
            status: 'active'
          }
        })
        .expect(200);

      // User creates plans
      const taskIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: `User task ${i + 1}`,
            steps: [`Execute step ${i + 1}`]
          })
          .expect(200);
        taskIds.push(response.body.plan_id);
      }

      // Store task references in session
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `${sessionId}_tasks`,
          value: taskIds
        })
        .expect(200);

      // Session end
      await request(platform.app)
        .post('/api/v1/memory')
        .send({
          key: `${sessionId}_end`,
          value: {
            ended_at: new Date().toISOString(),
            tasks_completed: taskIds.length
          }
        })
        .expect(200);

      // Verify session data
      const sessionData = platform.memory.get(sessionId);
      const sessionTasks = platform.memory.get(`${sessionId}_tasks`);
      const sessionEnd = platform.memory.get(`${sessionId}_end`);

      expect(sessionData).toBeDefined();
      expect(sessionTasks.content).toHaveLength(3);
      expect(sessionEnd.content.tasks_completed).toBe(3);
    });

    test('should handle multiple concurrent sessions', async () => {
      const sessionCount = 5;
      const sessions = [];

      // Create multiple sessions
      for (let i = 0; i < sessionCount; i++) {
        const sessionId = `concurrent_session_${i}`;
        await request(platform.app)
          .post('/api/v1/memory')
          .send({
            key: sessionId,
            value: { id: sessionId, created: new Date().toISOString() }
          })
          .expect(200);

        // Each session creates a plan
        await request(platform.app)
          .post('/api/v1/plans')
          .send({
            task_description: `Task for ${sessionId}`,
            steps: [`Step for session ${i}`]
          })
          .expect(200);

        sessions.push(sessionId);
      }

      // Verify all sessions exist
      expect(platform.memory.size).toBe(sessionCount);
      expect(platform.plans.size).toBe(sessionCount);

      // Verify each session is independent
      sessions.forEach(sessionId => {
        expect(platform.memory.has(sessionId)).toBe(true);
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should recover from partial failures in workflow', async () => {
      // Step 1: Success
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'step_1', value: 'completed' })
        .expect(200);

      // Step 2: Failure
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: '' })
        .expect(400);

      // Step 3: Recovery - try again with valid data
      const recoveryPlan = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Recovery task' })
        .expect(200);

      // Step 4: Continue workflow
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'recovered', value: 'true' })
        .expect(200);

      // Verify recovery
      expect(platform.memory.size).toBe(2);
      expect(platform.plans.size).toBe(1);
      expect(platform.memory.get('recovered').content).toBe('true');
    });

    test('should maintain system health after errors', async () => {
      // Cause multiple errors
      for (let i = 0; i < 5; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: null, value: 'invalid' })
          .expect(400);
      }

      // System should still be healthy
      const healthResponse = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // Should still accept valid requests
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'after_errors', value: 'success' })
        .expect(200);

      expect(platform.memory.has('after_errors')).toBe(true);
    });
  });

  describe('Data Migration Workflows', () => {
    test('should support exporting and importing data', async () => {
      // Create initial data
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'export_test_1', value: 'data1' })
        .expect(200);

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'export_test_2', value: 'data2' })
        .expect(200);

      // Export data
      const exportResponse = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const exportedData = exportResponse.body.memories;

      // Clear platform
      platform.memory.clear();
      expect(platform.memory.size).toBe(0);

      // Re-import data
      for (const [key, value] of exportedData) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key, value: value.content })
          .expect(200);
      }

      // Verify data restored
      expect(platform.memory.size).toBe(2);
      expect(platform.memory.has('export_test_1')).toBe(true);
      expect(platform.memory.has('export_test_2')).toBe(true);
    });
  });
});

describe('Integration Tests - SimpleUnifiedAIPlatform', () => {
  let platform;
  let server;
  const testPort = 3005;

  function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const addr = server.address();
      const options = {
        hostname: 'localhost',
        port: addr.port,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: body ? JSON.parse(body) : {}
            });
          } catch (e) {
            resolve({ status: res.statusCode, body: body });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  beforeEach(() => {
    platform = new SimpleUnifiedAIPlatform();
    platform.port = testPort;
  });

  afterEach((done) => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    } else {
      done();
    }
  });

  describe('Complete Workflow - Simple Server', () => {
    test('should handle end-to-end workflow', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Step 1: Check health
        const health = await makeRequest('GET', '/health');
        expect(health.status).toBe(200);

        // Step 2: Store memory
        await makeRequest('POST', '/api/v1/memory', {
          key: 'workflow_test',
          value: 'data'
        });

        // Step 3: Create plan
        const plan = await makeRequest('POST', '/api/v1/plans', {
          task_description: 'Test task'
        });

        // Step 4: Verify state
        expect(platform.memory.size).toBe(1);
        expect(platform.plans.size).toBe(1);
        expect(plan.body.success).toBe(true);

        done();
      });
    });

    test('should maintain state across multiple requests', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        // Multiple operations
        await makeRequest('POST', '/api/v1/memory', { key: 'k1', value: 'v1' });
        await makeRequest('POST', '/api/v1/memory', { key: 'k2', value: 'v2' });
        await makeRequest('POST', '/api/v1/plans', { task_description: 'Task 1' });
        await makeRequest('POST', '/api/v1/plans', { task_description: 'Task 2' });

        // Verify final state
        const memoryResponse = await makeRequest('GET', '/api/v1/memory');
        const plansResponse = await makeRequest('GET', '/api/v1/plans');

        expect(memoryResponse.body.count).toBe(2);
        expect(plansResponse.body.count).toBe(2);

        done();
      });
    });
  });
});