/**
 * Advanced Edge Case Tests for UnifiedAIPlatform
 * 
 * These tests cover unusual and boundary conditions including:
 * - Extreme values and limits
 * - Unusual data types and formats
 * - Timing and race conditions
 * - Resource exhaustion scenarios
 * - Unexpected input combinations
 * - Platform-specific edge cases
 */

const request = require('supertest');
const { UnifiedAIPlatform } = require('../../src/index');

// Mock configuration
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

describe('UnifiedAIPlatform - Edge Cases', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  describe('Extreme Data Types', () => {
    test('should handle boolean values in memory', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_test', value: true })
        .expect(200);

      const stored = platform.memory.get('bool_test');
      expect(stored.content).toBe(true);
    });

    test('should handle numeric zero', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zero', value: 0 })
        .expect(200);

      const stored = platform.memory.get('zero');
      expect(stored.content).toBe(0);
    });

    test('should handle negative numbers', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'negative', value: -12345 })
        .expect(200);

      const stored = platform.memory.get('negative');
      expect(stored.content).toBe(-12345);
    });

    test('should handle floating point numbers', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'float', value: 3.14159 })
        .expect(200);

      const stored = platform.memory.get('float');
      expect(stored.content).toBeCloseTo(3.14159);
    });

    test('should handle very large numbers', async () => {
      const largeNum = Number.MAX_SAFE_INTEGER;
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'large_num', value: largeNum })
        .expect(200);

      const stored = platform.memory.get('large_num');
      expect(stored.content).toBe(largeNum);
    });

    test('should handle very small numbers', async () => {
      const smallNum = Number.MIN_VALUE;
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'small_num', value: smallNum })
        .expect(200);

      const stored = platform.memory.get('small_num');
      expect(stored.content).toBe(smallNum);
    });

    test('should handle Infinity', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'infinity', value: Infinity })
        .expect(200);
    });

    test('should handle empty arrays', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'empty_array', value: [] })
        .expect(200);

      const stored = platform.memory.get('empty_array');
      expect(stored.content).toEqual([]);
    });

    test('should handle empty objects', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'empty_obj', value: {} })
        .expect(200);

      const stored = platform.memory.get('empty_obj');
      expect(stored.content).toEqual({});
    });

    test('should handle arrays with mixed types', async () => {
      const mixed = [1, 'two', true, null, { key: 'value' }, [1, 2]];
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'mixed', value: mixed })
        .expect(200);

      const stored = platform.memory.get('mixed');
      expect(stored.content).toEqual(mixed);
    });

    test('should handle Date objects as strings', async () => {
      const date = new Date().toISOString();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'date', value: date })
        .expect(200);
    });
  });

  describe('Boundary Values', () => {
    test('should handle single character keys', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'a', value: 'test' })
        .expect(200);

      expect(platform.memory.has('a')).toBe(true);
    });

    test('should handle single character values', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'single', value: 'x' })
        .expect(200);

      const stored = platform.memory.get('single');
      expect(stored.content).toBe('x');
    });

    test('should handle plan with single word description', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle plan with empty steps array', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task', steps: [] })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toEqual([]);
    });

    test('should handle plan with single step', async () => {
      const response = await request(platform.app)
        .post('/api/v1/plans')
        .send({ task_description: 'Task', steps: ['Only step'] })
        .expect(200);

      const plan = platform.plans.get(response.body.plan_id);
      expect(plan.steps).toHaveLength(1);
    });

    test('should handle maximum URL length in query', async () => {
      const longQuery = 'a'.repeat(2000);
      const response = await request(platform.app)
        .get(`/health?param=${longQuery}`)
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Special String Cases', () => {
    test('should handle whitespace-only strings', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '   ', value: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle newlines in keys', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'key\nwith\nnewlines', value: 'test' })
        .expect(200);
    });

    test('should handle tabs in values', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'tabs', value: 'value\twith\ttabs' })
        .expect(200);

      const stored = platform.memory.get('tabs');
      expect(stored.content).toContain('\t');
    });

    test('should handle carriage returns', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'cr', value: 'line1\rline2' })
        .expect(200);
    });

    test('should handle form feed characters', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'ff', value: 'page1\fpage2' })
        .expect(200);
    });

    test('should handle backspace characters', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bs', value: 'abc\bdef' })
        .expect(200);
    });

    test('should handle vertical tabs', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'vt', value: 'line1\vline2' })
        .expect(200);
    });

    test('should handle string with only spaces', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'spaces', value: '     ' })
        .expect(200);

      const stored = platform.memory.get('spaces');
      expect(stored.content).toBe('     ');
    });
  });

  describe('Unicode Edge Cases', () => {
    test('should handle various Unicode scripts', async () => {
      const multilang = '英语 العربية עברית हिन्दी 日本語 한국어 ไทย Ελληνικά Русский';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'multilang', value: multilang })
        .expect(200);

      const stored = platform.memory.get('multilang');
      expect(stored.content).toBe(multilang);
    });

    test('should handle Unicode surrogate pairs', async () => {
      const surrogate = '𝕳𝖊𝖑𝖑𝖔 𝖂𝖔𝖗𝖑𝖉';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'surrogate', value: surrogate })
        .expect(200);
    });

    test('should handle combining characters', async () => {
      const combining = 'e\u0301'; // é using combining acute accent
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'combining', value: combining })
        .expect(200);
    });

    test('should handle zero-width joiners', async () => {
      const zwj = 'family\u200D👨‍👩‍👧‍👦';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zwj', value: zwj })
        .expect(200);
    });

    test('should handle bidirectional text', async () => {
      const bidi = 'English text مع نص عربي';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bidi', value: bidi })
        .expect(200);
    });
  });

  describe('Array and Object Edge Cases', () => {
    test('should handle sparse arrays', async () => {
      const sparse = [1, , , 4]; // eslint-disable-line no-sparse-arrays
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'sparse', value: sparse })
        .expect(200);
    });

    test('should handle arrays with holes', async () => {
      const withHoles = new Array(10);
      withHoles[0] = 'first';
      withHoles[9] = 'last';
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'holes', value: withHoles })
        .expect(200);
    });

    test('should handle objects with numeric string keys', async () => {
      const numKeys = { '0': 'zero', '1': 'one', '2': 'two' };
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'num_keys', value: numKeys })
        .expect(200);
    });

    test('should handle objects with special property names', async () => {
      const special = {
        'key with spaces': 'value',
        'key-with-dashes': 'value',
        'key.with.dots': 'value',
        'key[with]brackets': 'value'
      };
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'special_props', value: special })
        .expect(200);
    });

    test('should handle nested empty structures', async () => {
      const nested = {
        empty_array: [],
        empty_object: {},
        nested_empty: {
          more_empty: [],
          even_more: {}
        }
      };
      
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nested_empty', value: nested })
        .expect(200);
    });
  });

  describe('Timing Edge Cases', () => {
    test('should handle rapid identical requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'rapid', value: 'same' })
      );

      await Promise.all(promises);

      // Should have one entry with last write winning
      expect(platform.memory.size).toBeGreaterThan(0);
    });

    test('should handle interleaved read/write operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        operations.push(
          request(platform.app)
            .post('/api/v1/memory')
            .send({ key: `interleave_${i}`, value: 'data' })
        );
        operations.push(
          request(platform.app).get('/api/v1/memory')
        );
      }

      await Promise.all(operations);
      expect(platform.memory.size).toBeGreaterThan(0);
    });

    test('should handle timestamp edge cases in plan IDs', async () => {
      // Create plans in rapid succession
      const start = Date.now();
      const plans = [];
      
      for (let i = 0; i < 50; i++) {
        const response = await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Plan ${i}` })
          .expect(200);
        plans.push(response.body.plan_id);
      }

      // All plan IDs should be unique despite rapid creation
      const uniqueIds = new Set(plans);
      expect(uniqueIds.size).toBe(50);
    });
  });

  describe('HTTP Method Edge Cases', () => {
    test('should handle HEAD requests gracefully', async () => {
      const response = await request(platform.app)
        .head('/health');

      // Should respond without body
      expect([200, 404, 405]).toContain(response.status);
    });

    test('should handle PATCH requests to unsupported endpoints', async () => {
      const response = await request(platform.app)
        .patch('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect([404, 405]).toContain(response.status);
    });

    test('should handle DELETE requests to unsupported endpoints', async () => {
      const response = await request(platform.app)
        .delete('/api/v1/memory/test');

      expect([404, 405]).toContain(response.status);
    });

    test('should handle PUT requests to unsupported endpoints', async () => {
      const response = await request(platform.app)
        .put('/api/v1/memory')
        .send({ key: 'test', value: 'data' });

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('Query Parameter Edge Cases', () => {
    test('should handle malformed query strings', async () => {
      const response = await request(platform.app)
        .get('/health?invalid&&&query===')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    test('should handle array query parameters', async () => {
      const response = await request(platform.app)
        .get('/health?tags[]=a&tags[]=b&tags[]=c')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    test('should handle encoded query parameters', async () => {
      const response = await request(platform.app)
        .get('/health?msg=hello%20world&special=%40%23%24')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Header Edge Cases', () => {
    test('should handle missing User-Agent', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('User-Agent', '')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    test('should handle very long header values', async () => {
      const longValue = 'x'.repeat(5000);
      const response = await request(platform.app)
        .get('/health')
        .set('X-Custom-Header', longValue)
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    test('should handle headers with special characters', async () => {
      const response = await request(platform.app)
        .get('/health')
        .set('X-Special', 'value-with-dashes_and_underscores')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('State Transition Edge Cases', () => {
    test('should handle simultaneous initialization attempts', async () => {
      const newPlatform = new UnifiedAIPlatform();
      
      // Multiple operations before initialization
      const ops = Array.from({ length: 10 }, (_, i) =>
        request(newPlatform.app)
          .post('/api/v1/memory')
          .send({ key: `init_${i}`, value: 'data' })
      );

      await Promise.all(ops);
      expect(newPlatform.memory.size).toBe(10);
    });

    test('should handle operations during platform.stop()', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'before_stop', value: 'data' })
        .expect(200);

      // Start stop process
      const stopPromise = platform.stop();

      // Try to perform operation during stop
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'during_stop', value: 'data' });

      await stopPromise;

      // Operation may succeed or fail depending on timing
      expect([200, 500, 503]).toContain(response.status);
    });
  });

  describe('Resource Limit Edge Cases', () => {
    test('should handle maximum Map size gracefully', async () => {
      // Add many entries to approach limits
      for (let i = 0; i < 1000; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `limit_${i}`, value: `data_${i}` })
          .expect(200);
      }

      // Should still be functional
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(platform.memory.size).toBe(1000);
    });

    test('should handle many plans without degradation', async () => {
      const promises = Array.from({ length: 500 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Plan ${i}` })
      );

      await Promise.all(promises);

      expect(platform.plans.size).toBe(500);

      // Platform should still respond quickly
      const start = Date.now();
      await request(platform.app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Content-Type Edge Cases', () => {
    test('should handle charset in content-type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({ key: 'charset', value: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle case-insensitive content-type', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'APPLICATION/JSON')
        .send({ key: 'case', value: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});