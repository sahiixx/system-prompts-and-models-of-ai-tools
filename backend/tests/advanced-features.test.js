const request = require('supertest');
const { app, server } = require('../server');
const connectDB = require('../config/database');
const mongoose = require('mongoose');

describe('Advanced Features Integration Tests', () => {
  let authToken;
  let testToolId;

  beforeAll(async () => {
    // Ensure database connection
    await connectDB();
    
    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@aitoolshub.com',
        password: 'Admin@123'
      });
    
    authToken = loginRes.body.token;

    // Get a test tool ID
    const toolsRes = await request(app).get('/api/tools?limit=1');
    testToolId = toolsRes.body.data[0]._id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    server.close();
  });

  describe('Tool Comparison API', () => {
    test('POST /api/comparison/compare - Should compare tools', async () => {
      const toolsRes = await request(app).get('/api/tools?limit=3');
      const toolIds = toolsRes.body.data.map(t => t._id);

      const res = await request(app)
        .post('/api/comparison/compare')
        .send({ toolIds });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('comparison');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data.comparison).toBeInstanceOf(Array);
    });

    test('POST /api/comparison/compare - Should validate tool IDs', async () => {
      const res = await request(app)
        .post('/api/comparison/compare')
        .send({ toolIds: ['invalid-id'] });

      expect(res.status).toBe(400);
    });

    test('GET /api/comparison/trending - Should get trending tools', async () => {
      const res = await request(app).get('/api/comparison/trending?limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
    });

    test('GET /api/comparison/similar/:id - Should get similar tools', async () => {
      const res = await request(app).get(`/api/comparison/similar/${testToolId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/comparison/recommendations - Should get personalized recommendations', async () => {
      const res = await request(app)
        .get('/api/comparison/recommendations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('recommendations');
      expect(res.body.data).toHaveProperty('reasoning');
    });
  });

  describe('Advanced Analytics API', () => {
    test('GET /api/advanced-analytics/dashboard - Should get dashboard data', async () => {
      const res = await request(app)
        .get('/api/advanced-analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('overview');
      expect(res.body.data).toHaveProperty('topTools');
      expect(res.body.data).toHaveProperty('recentActivity');
    });

    test('GET /api/advanced-analytics/tools/performance - Should get tool performance', async () => {
      const res = await request(app)
        .get('/api/advanced-analytics/tools/performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/advanced-analytics/users/engagement - Should get user engagement', async () => {
      const res = await request(app)
        .get('/api/advanced-analytics/users/engagement')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('activeUsers');
    });

    test('GET /api/advanced-analytics/trends - Should get trends', async () => {
      const res = await request(app)
        .get('/api/advanced-analytics/trends?period=7d')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trends');
    });
  });

  describe('Extended Tool API', () => {
    test('GET /api/tools - Should return paginated tools', async () => {
      const res = await request(app).get('/api/tools?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('pages');
    });

    test('GET /api/tools - Should filter by category', async () => {
      const res = await request(app).get('/api/tools?category=Development');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every(t => t.category.includes('Development'))).toBe(true);
    });

    test('GET /api/tools - Should filter by type', async () => {
      const res = await request(app).get('/api/tools?type=ide');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every(t => t.type === 'ide')).toBe(true);
    });

    test('GET /api/tools - Should filter by pricing', async () => {
      const res = await request(app).get('/api/tools?pricing=free');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every(t => t.pricing.model === 'free')).toBe(true);
    });

    test('GET /api/tools - Should sort by multiple fields', async () => {
      const res = await request(app).get('/api/tools?sort=-metrics.views,name');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify sorting
      for (let i = 1; i < res.body.data.length; i++) {
        const prev = res.body.data[i - 1];
        const curr = res.body.data[i];
        expect(prev.metrics.views).toBeGreaterThanOrEqual(curr.metrics.views);
      }
    });

    test('GET /api/tools/search - Should search tools', async () => {
      const res = await request(app).get('/api/tools/search?q=code');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/tools/:id - Should get single tool', async () => {
      const res = await request(app).get(`/api/tools/${testToolId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data).toHaveProperty('name');
    });
  });

  describe('Performance & Caching', () => {
    test('GET /api/cache/stats - Should return cache statistics', async () => {
      const res = await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hits');
      expect(res.body).toHaveProperty('misses');
      expect(res.body).toHaveProperty('hitRate');
    });

    test('Cached requests should be faster', async () => {
      // First request (uncached)
      const start1 = Date.now();
      await request(app).get('/api/tools?limit=20');
      const time1 = Date.now() - start1;

      // Second request (cached)
      const start2 = Date.now();
      await request(app).get('/api/tools?limit=20');
      const time2 = Date.now() - start2;

      // Cached request should be faster (allowing some variance)
      expect(time2).toBeLessThanOrEqual(time1 * 1.5);
    });
  });

  describe('Health & Monitoring', () => {
    test('GET /api/health - Should return basic health', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('GET /api/health/detailed - Should return detailed health', async () => {
      const res = await request(app).get('/api/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('services');
      expect(res.body.services).toHaveProperty('database');
      expect(res.body.services).toHaveProperty('redis');
    });

    test('GET /api/health/stats - Should return system stats', async () => {
      const res = await request(app).get('/api/health/stats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('cpu');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('Rate Limiting', () => {
    test('Should apply rate limits correctly', async () => {
      const requests = [];
      
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        requests.push(request(app).get('/api/tools?limit=1'));
      }

      const responses = await Promise.all(requests);
      
      // Check for rate limit headers
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(lastResponse.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Error Handling', () => {
    test('Should handle 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });

    test('Should handle invalid tool ID', async () => {
      const res = await request(app).get('/api/tools/invalid-id');

      expect(res.status).toBe(500);
    });

    test('Should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/comparison/compare')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(res.status).toBe(400);
    });
  });
});

// Export for use in other test files
module.exports = { authToken: null };
