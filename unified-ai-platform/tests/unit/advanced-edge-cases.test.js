/**
 * Advanced Edge Cases Tests for Unified AI Platform
 * 
 * These tests focus on:
 * - Boundary conditions
 * - Race conditions
 * - Resource exhaustion
 * - Data type coercion
 * - Network failures simulation
 * - Platform limits
 * - Unusual but valid inputs
 * - Complex error scenarios
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
  { type: 'function', function: { name: 'test_tool', description: 'Test' } }
]));

describe('Advanced Edge Cases - UnifiedAIPlatform', () => {
  let platform;

  beforeEach(() => {
    platform = new UnifiedAIPlatform();
  });

  afterEach(() => {
    platform.memory.clear();
    platform.plans.clear();
  });

  describe('Boundary Conditions', () => {
    test('should handle empty string keys', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '', value: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle whitespace-only keys', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '   ', value: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle single character keys', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'a', value: 'test' })
        .expect(200);

      expect(platform.memory.has('a')).toBe(true);
    });

    test('should handle maximum length keys', async () => {
      const maxKey = 'k'.repeat(1000);
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: maxKey, value: 'test' })
        .expect(200);

      expect(platform.memory.has(maxKey)).toBe(true);
    });

    test('should handle zero as a value', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'zero', value: 0 })
        .expect(200);

      const stored = platform.memory.get('zero');
      expect(stored.content).toBe(0);
    });

    test('should handle false as a value', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'false_val', value: false })
        .expect(200);

      const stored = platform.memory.get('false_val');
      expect(stored.content).toBe(false);
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

    test('should handle minimum integer', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'min_int', value: Number.MIN_SAFE_INTEGER })
        .expect(200);

      const stored = platform.memory.get('min_int');
      expect(stored.content).toBe(Number.MIN_SAFE_INTEGER);
    });

    test('should handle maximum integer', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'max_int', value: Number.MAX_SAFE_INTEGER })
        .expect(200);

      const stored = platform.memory.get('max_int');
      expect(stored.content).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should handle floating point precision', async () => {
      const preciseValue = 0.1 + 0.2;
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'float', value: preciseValue })
        .expect(200);

      const stored = platform.memory.get('float');
      expect(stored.content).toBeCloseTo(0.3);
    });

    test('should handle negative numbers', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'negative', value: -999 })
        .expect(200);

      const stored = platform.memory.get('negative');
      expect(stored.content).toBe(-999);
    });
  });

  describe('Type Coercion Edge Cases', () => {
    test('should handle numeric strings', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'num_string', value: '123' })
        .expect(200);

      const stored = platform.memory.get('num_string');
      expect(stored.content).toBe('123');
      expect(typeof stored.content).toBe('string');
    });

    test('should handle boolean strings', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'bool_string', value: 'true' })
        .expect(200);

      const stored = platform.memory.get('bool_string');
      expect(stored.content).toBe('true');
      expect(typeof stored.content).toBe('string');
    });

    test('should handle null string', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'null_string', value: 'null' })
        .expect(200);

      const stored = platform.memory.get('null_string');
      expect(stored.content).toBe('null');
    });

    test('should handle undefined string', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'undefined_string', value: 'undefined' })
        .expect(200);

      const stored = platform.memory.get('undefined_string');
      expect(stored.content).toBe('undefined');
    });

    test('should handle NaN values', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'nan_test', value: NaN });

      // NaN cannot be serialized to JSON, so this may fail
      expect([200, 400]).toContain(response.status);
    });

    test('should handle Infinity', async () => {
      const response = await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'infinity', value: Infinity });

      // Infinity may not serialize properly
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Race Conditions', () => {
    test('should handle simultaneous writes to same key', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: 'race_key', value: `value_${i}` })
      );

      await Promise.all(promises);

      // Last write should win
      expect(platform.memory.size).toBe(1);
      const stored = platform.memory.get('race_key');
      expect(stored.content).toMatch(/^value_\d$/);
    });

    test('should handle simultaneous plan creations', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Task ${i}` })
      );

      const responses = await Promise.all(promises);
      const planIds = responses.map(r => r.body.plan_id);
      const uniqueIds = new Set(planIds);

      // All IDs should be unique
      expect(uniqueIds.size).toBe(20);
    });

    test('should handle read while writing', async () => {
      // Start a long write
      const writePromise = request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'read_write_test', value: 'X'.repeat(10000) });

      // Immediately try to read
      const readPromise = request(platform.app)
        .get('/api/v1/memory');

      const [writeRes, readRes] = await Promise.all([writePromise, readPromise]);

      expect(writeRes.status).toBe(200);
      expect(readRes.status).toBe(200);
    });

    test('should handle delete during iteration', async () => {
      // Add multiple items
      for (let i = 0; i < 10; i++) {
        platform.memory.set(`delete_test_${i}`, { content: `data_${i}` });
      }

      // Read all
      const readPromise = request(platform.app).get('/api/v1/memory');

      // Delete some during read
      platform.memory.delete('delete_test_0');
      platform.memory.delete('delete_test_1');

      const response = await readPromise;
      expect(response.status).toBe(200);
    });
  });

  describe('Resource Exhaustion', () => {
    test('should handle creation of many plans', async () => {
      const planCount = 1000;
      
      for (let i = 0; i < planCount; i++) {
        await request(platform.app)
          .post('/api/v1/plans')
          .send({ task_description: `Plan ${i}` });
      }

      expect(platform.plans.size).toBe(planCount);
    }, 30000); // Extend timeout for this test

    test('should handle many memory entries', async () => {
      const entryCount = 500;

      for (let i = 0; i < entryCount; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `entry_${i}`, value: `data_${i}` });
      }

      expect(platform.memory.size).toBe(entryCount);
    }, 30000);

    test('should handle alternating create/delete cycles', async () => {
      for (let i = 0; i < 100; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `cycle_${i}`, value: 'data' });
        
        if (i > 0) {
          platform.memory.delete(`cycle_${i - 1}`);
        }
      }

      // Should have roughly constant size
      expect(platform.memory.size).toBeLessThan(10);
    });
  });

  describe('Special Characters in Data', () => {
    test('should handle newlines in values', async () => {
      const multiline = 'Line 1\nLine 2\nLine 3';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'multiline', value: multiline })
        .expect(200);

      const stored = platform.memory.get('multiline');
      expect(stored.content).toBe(multiline);
    });

    test('should handle tabs in values', async () => {
      const tabbed = 'Col1\tCol2\tCol3';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'tabbed', value: tabbed })
        .expect(200);

      const stored = platform.memory.get('tabbed');
      expect(stored.content).toBe(tabbed);
    });

    test('should handle carriage returns', async () => {
      const withCR = 'Text\r\nWith\r\nCRLF';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'crlf', value: withCR })
        .expect(200);

      expect(platform.memory.has('crlf')).toBe(true);
    });

    test('should handle backslashes', async () => {
      const backslashes = 'C:\\Users\\Test\\File.txt';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'path', value: backslashes })
        .expect(200);

      const stored = platform.memory.get('path');
      expect(stored.content).toBe(backslashes);
    });

    test('should handle quotes in values', async () => {
      const quotes = 'He said "Hello" and she said \'Hi\'';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'quotes', value: quotes })
        .expect(200);

      const stored = platform.memory.get('quotes');
      expect(stored.content).toBe(quotes);
    });

    test('should handle backticks', async () => {
      const backticks = 'Template `${variable}` string';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'template', value: backticks })
        .expect(200);

      const stored = platform.memory.get('template');
      expect(stored.content).toBe(backticks);
    });
  });

  describe('Complex Data Structures', () => {
    test('should handle arrays of objects', async () => {
      const complex = [
        { id: 1, name: 'Item 1', tags: ['a', 'b'] },
        { id: 2, name: 'Item 2', tags: ['c', 'd'] }
      ];

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complex_array', value: complex })
        .expect(200);

      const stored = platform.memory.get('complex_array');
      expect(stored.content).toEqual(complex);
    });

    test('should handle objects with arrays', async () => {
      const complex = {
        users: ['Alice', 'Bob'],
        roles: ['admin', 'user'],
        permissions: [
          { resource: 'posts', actions: ['read', 'write'] },
          { resource: 'comments', actions: ['read'] }
        ]
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'complex_obj', value: complex })
        .expect(200);

      const stored = platform.memory.get('complex_obj');
      expect(stored.content).toEqual(complex);
    });

    test('should handle mixed type arrays', async () => {
      const mixed = [1, 'string', true, null, { key: 'value' }, [1, 2, 3]];

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'mixed', value: mixed })
        .expect(200);

      const stored = platform.memory.get('mixed');
      expect(stored.content).toEqual(mixed);
    });

    test('should handle sparse arrays', async () => {
      const sparse = [1, , , 4, , 6]; // eslint-disable-line no-sparse-arrays

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'sparse', value: sparse })
        .expect(200);

      const stored = platform.memory.get('sparse');
      expect(Array.isArray(stored.content)).toBe(true);
    });
  });

  describe('Timestamp and Date Handling', () => {
    test('should handle ISO date strings', async () => {
      const isoDate = new Date().toISOString();
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'iso_date', value: isoDate })
        .expect(200);

      const stored = platform.memory.get('iso_date');
      expect(stored.content).toBe(isoDate);
    });

    test('should include timestamps in stored data', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'timestamp_test', value: 'data' })
        .expect(200);

      const stored = platform.memory.get('timestamp_test');
      expect(stored.created_at).toBeDefined();
      expect(stored.last_accessed).toBeDefined();
      expect(new Date(stored.created_at).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should handle different date formats', async () => {
      const dates = {
        iso: new Date().toISOString(),
        utc: new Date().toUTCString(),
        locale: new Date().toLocaleString(),
        timestamp: Date.now()
      };

      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'dates', value: dates })
        .expect(200);

      const stored = platform.memory.get('dates');
      expect(stored.content).toEqual(dates);
    });
  });

  describe('Query Parameter Edge Cases', () => {
    test('should handle routes with query parameters', async () => {
      const response = await request(platform.app)
        .get('/health?debug=true&verbose=1');

      expect(response.status).toBe(200);
    });

    test('should handle special characters in query params', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools?filter=%3Cscript%3E');

      expect(response.status).toBe(200);
    });

    test('should handle empty query parameters', async () => {
      const response = await request(platform.app)
        .get('/health?');

      expect(response.status).toBe(200);
    });

    test('should handle multiple same-name parameters', async () => {
      const response = await request(platform.app)
        .get('/api/v1/tools?tag=a&tag=b&tag=c');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from invalid JSON', async () => {
      // First invalid request
      await request(platform.app)
        .post('/api/v1/memory')
        .set('Content-Type', 'application/json')
        .send('{invalid}')
        .expect(400);

      // Should still accept valid requests
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'recovery', value: 'test' })
        .expect(200);

      expect(platform.memory.has('recovery')).toBe(true);
    });

    test('should maintain state after errors', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'before_error', value: 'data' })
        .expect(200);

      // Cause error
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: null })
        .expect(400);

      // Original data should still exist
      expect(platform.memory.has('before_error')).toBe(true);
    });

    test('should handle errors in error handlers', async () => {
      // Access completely invalid route
      const response = await request(platform.app)
        .get('/this/route/does/not/exist/at/all');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Platform Limits', () => {
    test('should respect maximum concurrent operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `limit_${i}`, value: `data_${i}` })
      );

      const responses = await Promise.all(operations);
      const successCount = responses.filter(r => r.status === 200).length;

      // All should succeed (or fail gracefully)
      expect(successCount).toBeGreaterThan(0);
    });

    test('should handle request when approaching memory limits', async () => {
      // Create large data
      const largeData = 'X'.repeat(100000);
      
      for (let i = 0; i < 10; i++) {
        await request(platform.app)
          .post('/api/v1/memory')
          .send({ key: `large_${i}`, value: largeData });
      }

      // Should still respond to health check
      const response = await request(platform.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Unusual but Valid Inputs', () => {
    test('should handle keys with dots', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user.preferences.theme', value: 'dark' })
        .expect(200);

      expect(platform.memory.has('user.preferences.theme')).toBe(true);
    });

    test('should handle keys with dashes', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'api-key-value', value: 'secret' })
        .expect(200);

      expect(platform.memory.has('api-key-value')).toBe(true);
    });

    test('should handle keys with underscores', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: 'user_session_id', value: '123' })
        .expect(200);

      expect(platform.memory.has('user_session_id')).toBe(true);
    });

    test('should handle numeric keys as strings', async () => {
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: '12345', value: 'numeric key' })
        .expect(200);

      expect(platform.memory.has('12345')).toBe(true);
    });

    test('should handle UUID-like keys', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await request(platform.app)
        .post('/api/v1/memory')
        .send({ key: uuid, value: 'uuid data' })
        .expect(200);

      expect(platform.memory.has(uuid)).toBe(true);
    });
  });
});

describe('Advanced Edge Cases - SimpleUnifiedAIPlatform', () => {
  let platform;
  let server;
  const testPort = 3006;

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

  describe('Boundary Conditions - Simple Server', () => {
    test('should handle empty key', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const response = await makeRequest('POST', '/api/v1/memory', {
          key: '',
          value: 'test'
        });

        expect(response.status).toBe(400);
        done();
      });
    });

    test('should handle zero value', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest('POST', '/api/v1/memory', {
          key: 'zero',
          value: 0
        });

        const stored = platform.memory.get('zero');
        expect(stored.content).toBe(0);
        done();
      });
    });

    test('should handle false value', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        await makeRequest('POST', '/api/v1/memory', {
          key: 'false_val',
          value: false
        });

        const stored = platform.memory.get('false_val');
        expect(stored.content).toBe(false);
        done();
      });
    });
  });

  describe('Race Conditions - Simple Server', () => {
    test('should handle concurrent writes', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const promises = Array.from({ length: 10 }, (_, i) =>
          makeRequest('POST', '/api/v1/memory', {
            key: 'race',
            value: `value_${i}`
          })
        );

        await Promise.all(promises);
        expect(platform.memory.size).toBe(1);
        done();
      });
    });
  });

  describe('Special Characters - Simple Server', () => {
    test('should handle newlines', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const multiline = 'Line1\nLine2\nLine3';
        await makeRequest('POST', '/api/v1/memory', {
          key: 'multiline',
          value: multiline
        });

        const stored = platform.memory.get('multiline');
        expect(stored.content).toBe(multiline);
        done();
      });
    });

    test('should handle Unicode characters', (done) => {
      server = platform.createServer();
      server.listen(testPort, async () => {
        const unicode = '日本語テキスト';
        await makeRequest('POST', '/api/v1/memory', {
          key: 'unicode',
          value: unicode
        });

        const stored = platform.memory.get('unicode');
        expect(stored.content).toBe(unicode);
        done();
      });
    });
  });
});