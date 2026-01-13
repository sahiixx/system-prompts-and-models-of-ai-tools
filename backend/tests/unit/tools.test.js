const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const Tool = require('../models/Tool');

describe('Tools API', () => {
  beforeAll(async () => {
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-tools-hub-test';
    await mongoose.connect(testDbUri);
  });

  afterAll(async () => {
    await Tool.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  beforeEach(async () => {
    await Tool.deleteMany({});
    
    // Create sample tools
    await Tool.create([
      {
        name: 'Cursor',
        slug: 'cursor',
        description: 'AI-powered code editor',
        type: 'ide',
        pricing: 'freemium',
        status: 'active',
        features: [{ feature: 'code_completion' }]
      },
      {
        name: 'GitHub Copilot',
        slug: 'github-copilot',
        description: 'AI pair programmer',
        type: 'ide',
        pricing: 'paid',
        status: 'active',
        features: [{ feature: 'code_completion' }, { feature: 'chat_interface' }]
      }
    ]);
  });

  describe('GET /api/tools', () => {
    it('should get all tools', async () => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter tools by type', async () => {
      const response = await request(app)
        .get('/api/tools?type=ide')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].type).toBe('ide');
    });

    it('should filter tools by pricing', async () => {
      const response = await request(app)
        .get('/api/tools?pricing=paid')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].pricing).toBe('paid');
    });

    it('should search tools by name', async () => {
      const response = await request(app)
        .get('/api/tools?search=cursor')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Cursor');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/tools?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.pages).toBe(2);
    });

    it('should sort tools', async () => {
      const response = await request(app)
        .get('/api/tools?sort=name&order=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].name).toBe('Cursor');
    });
  });

  describe('GET /api/tools/statistics', () => {
    it('should get tools statistics', async () => {
      const response = await request(app)
        .get('/api/tools/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.active).toBe(2);
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.byPricing).toBeDefined();
    });
  });

  describe('GET /api/tools/:slug', () => {
    it('should get a single tool by slug', async () => {
      const response = await request(app)
        .get('/api/tools/cursor')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Cursor');
      expect(response.body.data.slug).toBe('cursor');
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(app)
        .get('/api/tools/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Tool not found');
    });

    it('should increment view count', async () => {
      await request(app).get('/api/tools/cursor');
      await request(app).get('/api/tools/cursor');

      const tool = await Tool.findOne({ slug: 'cursor' });
      expect(tool.views).toBe(2);
    });
  });

  describe('GET /api/tools/:slug/similar', () => {
    it('should get similar tools', async () => {
      const response = await request(app)
        .get('/api/tools/cursor/similar')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});
