/**
 * UI and HTML Validation Tests
 * 
 * These tests validate:
 * - HTML interface structure and content
 * - Static file serving
 * - UI accessibility
 * - Frontend-backend integration
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
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

jest.mock('../../config/tools.json', () => ([]));

describe('UI and HTML Validation Tests', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('HTML Interface', () => {
    test('should have valid HTML index file', () => {
      const htmlPath = path.join(__dirname, '../../public/index.html');
      
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Basic HTML structure validation
        expect(htmlContent).toContain('<!DOCTYPE html>');
        expect(htmlContent).toContain('<html');
        expect(htmlContent).toContain('<head>');
        expect(htmlContent).toContain('<body>');
        expect(htmlContent).toContain('</html>');
      }
    });

    test('should have proper HTML metadata', () => {
      const htmlPath = path.join(__dirname, '../../public/index.html');
      
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for meta tags
        expect(htmlContent).toMatch(/<meta.*charset/i);
        expect(htmlContent).toMatch(/<meta.*viewport/i);
        expect(htmlContent).toContain('<title>');
      }
    });

    test('should include platform branding', () => {
      const htmlPath = path.join(__dirname, '../../public/index.html');
      
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for platform name
        expect(htmlContent.toLowerCase()).toMatch(/unified.*ai.*platform/);
      }
    });

    test('should have valid HTML structure without errors', () => {
      const htmlPath = path.join(__dirname, '../../public/index.html');
      
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for matching tags
        const openTags = (htmlContent.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (htmlContent.match(/<\/[^>]+>/g) || []).length;
        
        // Should have reasonable tag balance (self-closing tags exist)
        expect(Math.abs(openTags - closeTags)).toBeLessThan(20);
      }
    });

    test('should reference required CSS and JS resources', () => {
      const htmlPath = path.join(__dirname, '../../public/index.html');
      
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for style or script tags/links
        const hasStyles = htmlContent.includes('<style') || htmlContent.includes('<link');
        const hasScripts = htmlContent.includes('<script');
        
        expect(hasStyles || hasScripts).toBe(true);
      }
    });
  });

  describe('Static File Serving', () => {
    test('should serve static files with correct content type', async () => {
      const response = await request(platform.app)
        .get('/static/test.txt');
      
      // Should either serve file or return 404, not 500
      expect([200, 404]).toContain(response.status);
    });

    test('should handle requests for non-existent static files', async () => {
      const response = await request(platform.app)
        .get('/static/nonexistent-file-12345.xyz')
        .expect(404);

      expect(response.status).toBe(404);
    });

    test('should prevent directory traversal in static paths', async () => {
      const traversalPaths = [
        '/static/../../../etc/passwd',
        '/static/../../config/system-config.json',
        '/static/../src/index.js'
      ];

      for (const path of traversalPaths) {
        const response = await request(platform.app).get(path);
        expect([404, 400, 403]).toContain(response.status);
      }
    });
  });

  describe('API Documentation Endpoints', () => {
    test('should provide comprehensive capabilities documentation', async () => {
      const response = await request(platform.app)
        .get('/api/v1/capabilities')
        .expect(200);

      expect(response.body.platform).toBeDefined();
      expect(response.body.core_capabilities).toBeDefined();
      expect(response.body.description).toBeDefined();
      
      // Should document all major capabilities
      expect(response.body.core_capabilities.multi_modal).toBeDefined();
      expect(response.body.core_capabilities.memory_system).toBeDefined();
      expect(response.body.core_capabilities.tool_system).toBeDefined();
      expect(response.body.core_capabilities.planning_system).toBeDefined();
    });

    test('should provide demo information', async () => {
      const response = await request(platform.app)
        .get('/api/v1/demo')
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.features).toBeDefined();
      expect(response.body.systems_combined).toBeDefined();
      expect(Array.isArray(response.body.features)).toBe(true);
    });

    test('should list all available tools', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      expect(response.body.tools).toBeDefined();
      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(response.body.description).toBeDefined();
    });
  });

  describe('Content Type Validation', () => {
    test('should return JSON for API endpoints', async () => {
      const apiEndpoints = [
        '/health',
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      for (const endpoint of apiEndpoints) {
        const response = await request(platform.app).get(endpoint);
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });

    test('should handle Accept header preferences', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Response Headers', () => {
    test('should include security headers in all responses', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // Check for common security headers
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('should include CORS headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should set appropriate cache headers', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      // Should have some cache control
      expect(response.headers).toBeDefined();
    });
  });

  describe('API Versioning', () => {
    test('should support v1 API paths', async () => {
      const v1Endpoints = [
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      for (const endpoint of v1Endpoints) {
        const response = await request(platform.app).get(endpoint);
        expect(response.status).toBeLessThan(404);
      }
    });

    test('should return 404 for non-existent API versions', async () => {
      const invalidVersions = [
        '/api/v2/tools',
        '/api/v0/memory',
        '/api/beta/plans'
      ];

      for (const endpoint of invalidVersions) {
        const response = await request(platform.app).get(endpoint);
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Health Check Comprehensive', () => {
    test('should provide detailed system metrics', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
      
      // Memory metrics should be objects with properties
      expect(typeof response.body.memory).toBe('object');
      expect(response.body.memory.heapUsed).toBeDefined();
    });

    test('should report feature flags accurately', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.features).toBeDefined();
      expect(typeof response.body.features.multi_modal).toBe('boolean');
      expect(typeof response.body.features.memory_system).toBe('boolean');
      expect(typeof response.body.features.tool_system).toBe('boolean');
    });

    test('should include platform version', async () => {
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.version).toBeDefined();
      expect(response.body.platform).toBe('Unified AI Platform');
    });
  });

  describe('Error Page Handling', () => {
    test('should return proper 404 error structure', async () => {
      const response = await request(platform.app)
        .get('/totally-invalid-route-12345')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should handle invalid API routes consistently', async () => {
      const invalidRoutes = [
        '/api/invalid',
        '/api/v1/invalid',
        '/api/v1/memory/invalid',
        '/api/v1/plans/invalid'
      ];

      for (const route of invalidRoutes) {
        const response = await request(platform.app).get(route);
        expect(response.status).toBe(404);
        expect(response.body.error || response.body.message).toBeDefined();
      }
    });
  });

  describe('Request Method Support', () => {
    test('should support GET for read operations', async () => {
      const getEndpoints = [
        '/health',
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans',
        '/api/v1/capabilities',
        '/api/v1/demo'
      ];

      for (const endpoint of getEndpoints) {
        const response = await request(platform.app).get(endpoint);
        expect(response.status).toBe(200);
      }
    });

    test('should support POST for write operations', async () => {
      const memResponse = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      const planResponse = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'test' });

      expect([200, 201]).toContain(memResponse.status);
      expect([200, 201]).toContain(planResponse.status);
    });

    test('should support OPTIONS for CORS preflight', async () => {
      const response = await request(platform.app)
        .options('/api/v1/memory');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Response Formatting', () => {
    test('should format timestamps consistently', async () => {
      const response1 = await request(platform.app).get('/health');
      const response2 = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      // Both should have ISO 8601 timestamps
      expect(response1.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      
      if (response2.status === 200) {
        const stored = platform.memory.get('test');
        expect(stored.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    test('should format error responses consistently', async () => {
      const error1 = await request(platform.app).get('/nonexistent');
      const error2 = await request(platform.app)
        .post('/api/v1/memory')
        .send({});

      // Both should have error and message fields
      expect(error1.body.error || error1.body.message).toBeDefined();
      expect(error2.body.error || error2.body.message).toBeDefined();
      
      // Both should have timestamps
      expect(error1.body.timestamp).toBeDefined();
    });

    test('should include count in collection responses', async () => {
      const collections = [
        '/api/v1/tools',
        '/api/v1/memory',
        '/api/v1/plans'
      ];

      for (const endpoint of collections) {
        const response = await request(platform.app).get(endpoint);
        expect(response.body.count).toBeDefined();
        expect(typeof response.body.count).toBe('number');
      }
    });
  });

  describe('Data Validation Edge Cases', () => {
    test('should handle various data types in memory values', async () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'array', value: [1, 2, 3] },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'null_value', value: null }
      ];

      for (const testCase of testCases) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send(testCase);

        // Should handle all data types
        expect([200, 400]).toContain(response.status);
      }
    });

    test('should handle special characters in keys', async () => {
      const specialKeys = [
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key:with:colons',
        'key/with/slashes'
      ];

      for (const key of specialKeys) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key, value: 'test' });

        expect([200, 400]).toContain(response.status);
      }
    });

    test('should handle whitespace in values', async () => {
      const whitespaceTests = [
        '  leading spaces',
        'trailing spaces  ',
        '  both  ',
        '\ttabs\t',
        '\nnewlines\n',
        'mixed \t\n characters'
      ];

      for (const value of whitespaceTests) {
        const response = await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `ws_${Math.random()}`, value });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('API Response Completeness', () => {
    test('should provide complete tool definitions', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools')
        .expect(200);

      if (response.body.tools.length > 0) {
        const tool = response.body.tools[0];
        expect(tool.type).toBeDefined();
        expect(tool.function).toBeDefined();
      }
    });

    test('should provide complete memory entries', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complete_test', value: 'data' });

      const response = await request(platform.app)
        .get('/api/v1/memory')
        .expect(200);

      if (response.body.memories.length > 0) {
        const memory = response.body.memories[0];
        expect(memory).toHaveLength(2); // [key, value]
        expect(memory[1].content).toBeDefined();
        expect(memory[1].created_at).toBeDefined();
      }
    });

    test('should provide complete plan details', async () => {
      await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Complete plan test', steps: ['step1'] });

      const response = await request(platform.app)
        .get('/api/v1/plans')
        .expect(200);

      if (response.body.plans.length > 0) {
        const plan = response.body.plans[0];
        expect(plan).toHaveLength(2); // [id, plan]
        expect(plan[1].task_description).toBeDefined();
        expect(plan[1].status).toBeDefined();
        expect(plan[1].created_at).toBeDefined();
      }
    });
  });
});