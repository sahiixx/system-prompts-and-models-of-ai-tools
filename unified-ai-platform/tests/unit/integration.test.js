/**
 * Integration Tests for Unified AI Platform
 * 
 * These tests verify integration between components and end-to-end workflows
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

describe('Integration Tests', () => {
  describe('Express vs Simple Server Compatibility', () => {
    let expressPlatform;
    let simplePlatform;
    let simpleServer;

    beforeEach(() => {
      expressPlatform = new UnifiedAIPlatform();
      simplePlatform = new SimpleUnifiedAIPlatform();
      simplePlatform.port = 3003;
    });

    afterEach((done) => {
      if (simpleServer) {
        simpleServer.close(() => {
          simpleServer = null;
          done();
        });
      } else {
        done();
      }
    });

    test('both servers should return same health check structure', async () => {
      const expressHealth = await request(expressPlatform.app)
        .get('/health')
        .expect(200);

      simpleServer = simplePlatform.createServer();
      simpleServer.listen(3003, async () => {
        const options = {
          hostname: 'localhost',
          port: 3003,
          path: '/health',
          method: 'GET'
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const simpleHealth = JSON.parse(body);
            
            expect(expressHealth.body.status).toBe(simpleHealth.status);
            expect(expressHealth.body.platform).toBe(simpleHealth.platform);
            expect(expressHealth.body.features).toMatchObject(simpleHealth.features);
          });
        });

        req.end();
      });
    });

    test('both servers should handle memory operations consistently', async () => {
      const testData = { key: 'integration_test', value: 'test_value' };

      // Test Express server
      const expressResponse = await request(expressPlatform.app)
        .post('/api/v1/memory')
        .send(testData)
        .expect(200);

      // Test Simple server
      simpleServer = simplePlatform.createServer();
      simpleServer.listen(3003, () => {
        const options = {
          hostname: 'localhost',
          port: 3003,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const simpleResponse = JSON.parse(body);
            
            expect(expressResponse.body.success).toBe(simpleResponse.success);
            expect(expressResponse.body.message).toBe(simpleResponse.message);
          });
        });

        req.write(JSON.stringify(testData));
        req.end();
      });
    });

    test('both servers should handle plan creation consistently', async () => {
      const planData = {
        task_description: 'Integration test plan',
        steps: ['Step 1', 'Step 2']
      };

      // Test Express server
      const expressResponse = await request(expressPlatform.app)
        .post('/api/v1/plans')
        .send(planData)
        .expect(200);

      expect(expressResponse.body.success).toBe(true);
      expect(expressResponse.body.plan_id).toBeDefined();

      // Test Simple server
      simpleServer = simplePlatform.createServer();
      simpleServer.listen(3003, () => {
        const options = {
          hostname: 'localhost',
          port: 3003,
          path: '/api/v1/plans',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const simpleResponse = JSON.parse(body);
            
            expect(simpleResponse.success).toBe(true);
            expect(simpleResponse.plan_id).toBeDefined();
            expect(simpleResponse.plan_id).toMatch(/^plan_\d+$/);
          });
        });

        req.write(JSON.stringify(planData));
        req.end();
      });
    });

    test('both servers should return same error formats', async () => {
      // Test Express server error
      const expressError = await request(expressPlatform.app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      expect(expressError.body.error).toBeDefined();

      // Test Simple server error
      simpleServer = simplePlatform.createServer();
      simpleServer.listen(3003, () => {
        const options = {
          hostname: 'localhost',
          port: 3003,
          path: '/api/v1/memory',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const simpleError = JSON.parse(body);
            expect(simpleError.error).toBeDefined();
            expect(res.statusCode).toBe(400);
          });
        });

        req.write(JSON.stringify({}));
        req.end();
      });
    });
  });

  describe('End-to-End Workflows', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('complete task planning workflow', async () => {
      // 1. Check system health
      const health = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(health.body.status).toBe('healthy');

      // 2. Get available tools
      const tools = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(tools.body.tools).toBeDefined();

      // 3. Store user preferences
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_prefs', value: { theme: 'dark', lang: 'en' } })
        .expect(200);

      // 4. Create a plan
      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({
          task_description: 'Build authentication system',
          steps: [
            'Design database schema',
            'Implement user model',
            'Create authentication endpoints',
            'Add JWT token generation',
            'Write tests'
          ]
        })
        .expect(200);

      // Memory should have increased by 1, plans should be unchanged
      expect(platform.memory.size).toBe(initialMemorySize + 1);
      expect(platform.plans.size).toBe(initialPlansSize);
    });

      // 5. Retrieve the plan
      const plansResponse = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      expect(plansResponse.body.count).toBeGreaterThan(0);
      const plan = plansResponse.body.plans.find(p => p[0] === planId);
      expect(plan).toBeDefined();

      // 6. Verify final system state
      const finalHealth = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(finalHealth.body.status).toBe('healthy');
    });

    test('memory management workflow', async () => {
      // Store multiple memories
      const memories = [
        { key: 'user_id', value: '12345' },
        { key: 'session_token', value: 'abc-def-ghi' },
        { key: 'preferences', value: { theme: 'light', notifications: true } },
        { key: 'last_action', value: 'login' },
        { key: 'timestamp', value: new Date().toISOString() }
      ];

      for (const memory of memories) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send(memory)
          .expect(200);
      }

      // Retrieve all memories
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body.count).toBe(memories.length);

      // Update a memory
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_id', value: '67890' })
        .expect(200);

      // Verify update
      const stored = platform.memory.get('user_id');
      expect(stored.content).toBe('67890');
    });

    test('concurrent operations workflow', async () => {
      // Simulate concurrent user actions
      const operations = [
        request(platform.app).get('/health'),
        request(platform.app).get('/api/v1/tools'),
        request(platform.app).post('/api/v1/memory').send({ key: 'op1', value: 'val1' }),
        request(platform.app).post('/api/v1/memory').send({ key: 'op2', value: 'val2' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'Task 1' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'Task 2' }),
        request(platform.app).get('/api/v1/memory'),
        request(platform.app).get('/api/v1/plans'),
        request(platform.app).get('/api/v1/capabilities'),
        request(platform.app).get('/api/v1/demo')
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify data integrity
      expect(platform.memory.size).toBe(2);
      expect(platform.plans.size).toBe(2);
    });

    test('error recovery workflow', async () => {
      // Make successful request
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test1', value: 'value1' })
        .expect(200);

      // Make failing request
      await request(platform.app)
        .post('/api/v1/memory')
        .send({})
        .expect(400);

      // System should still work
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test2', value: 'value2' })
        .expect(200);

      // Verify both successful memories were stored
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      expect(response.body.count).toBe(2);
    });
  });

  describe('Data Flow Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });
  });

    test('data should flow correctly from input to storage', async () => {
      const testData = {
        key: 'flow_test',
        value: {
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      // Send data
      await request(platform.app)
        .post('/api/v1/memory')
        .send(testData)
        .expect(200);

      // Retrieve and verify
      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      const memories = response.body.memories;
      const storedMemory = memories.find(m => m[0] === 'flow_test');
      
      expect(storedMemory).toBeDefined();
      expect(storedMemory[1].content).toEqual(testData.value);
    });

    test('plans should maintain referential integrity', async () => {
      const planData = {
        task_description: 'Complex task',
        steps: [
          { id: 1, action: 'Step 1', dependencies: [] },
          { id: 2, action: 'Step 2', dependencies: [1] },
          { id: 3, action: 'Step 3', dependencies: [1, 2] }
        ]
      };

      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send(planData)
        .expect(200);

      const planId = response.body.plan_id;
      const storedPlan = platform.plans.get(planId);

      expect(storedPlan.steps).toEqual(planData.steps);
      expect(storedPlan.task_description).toBe(planData.task_description);
    });
  });

  describe('Configuration Integration', () => {
    test('system config should affect platform behavior', async () => {
      const platform = new UnifiedAIPlatform();

      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      // Verify config values are used
      expect(response.body.platform.name).toBe('Unified AI Platform');
      expect(response.body.core_capabilities).toBeDefined();
      expect(response.body.performance).toBeDefined();
    });

    test('tools config should be loaded correctly', async () => {
      const platform = new UnifiedAIPlatform();

      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.count).toBe(response.body.tools.length);
    });
  });
});

  describe('State Management Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });
  }

    test('memory and plans should be independent', async () => {
      // Add memories
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'mem1', value: 'val1' })
        .expect(200);

      // Add plans
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task 1' })
        .expect(200);

      // Verify independence
      expect(platform.memory.size).toBe(1);
      expect(platform.plans.size).toBe(1);

      // Clear memories
      platform.memory.clear();

      // Plans should remain
      expect(platform.plans.size).toBe(1);
    });

    test('state should be consistent across multiple requests', async () => {
      // First request batch
      await Promise.all([
        request(platform.app).post('/api/v1/memory').send({ key: 'a', value: '1' }),
        request(platform.app).post('/api/v1/memory').send({ key: 'b', value: '2' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'T1' })
      ]);

      const state1 = {
        memory: platform.memory.size,
        plans: platform.plans.size
      };

      // Second request batch
      await Promise.all([
        request(platform.app).post('/api/v1/memory').send({ key: 'c', value: '3' }),
        request(platform.app).post('/api/v1/plans').send({ task_description: 'T2' })
      ]);

      const state2 = {
        memory: platform.memory.size,
        plans: platform.plans.size
      };

      // State should have incremented correctly
      expect(state2.memory).toBe(state1.memory + 1);
      expect(state2.plans).toBe(state1.plans + 1);
    });
  });

  describe('Cross-Feature Integration', () => {
    let platform;

    beforeEach(() => {
      platform = new UnifiedAIPlatform();
    });

    test('capabilities endpoint should reflect actual features', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      // Verify that advertised capabilities match reality
      if (response.body.core_capabilities.memory_system.enabled) {
        const memoryTest = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'test', value: 'test' });
        expect(memoryTest.status).toBe(200);
      }

      if (response.body.core_capabilities.planning_system.enabled) {
        const planTest = await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: 'test' });
        expect(planTest.status).toBe(200);
      }

      if (response.body.core_capabilities.tool_system.enabled) {
        const toolsTest = await request(platform.app)
          .get('/api/v1/tools');
        expect(toolsTest.status).toBe(200);
      }
    });

    test('demo endpoint should reflect integrated features', async () => {
      const demoResponse = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      const capsResponse = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      // Demo should mention all enabled capabilities
      const demoContent = JSON.stringify(demoResponse.body).toLowerCase();
      
      if (capsResponse.body.core_capabilities.multi_modal.enabled) {
        expect(demoContent).toContain('multi');
      }

      if (capsResponse.body.core_capabilities.memory_system.enabled) {
        expect(demoContent).toContain('memory');
      }
    });
  });
});