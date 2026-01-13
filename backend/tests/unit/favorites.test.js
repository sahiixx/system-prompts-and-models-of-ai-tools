const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Favorite = require('../models/Favorite');

describe('Favorites API', () => {
  let token;
  let userId;
  let toolId;

  beforeAll(async () => {
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-tools-hub-test';
    await mongoose.connect(testDbUri);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Tool.deleteMany({});
    await Favorite.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Tool.deleteMany({});
    await Favorite.deleteMany({});

    // Create test user and get token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      });
    
    token = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Create test tool
    const tool = await Tool.create({
      name: 'Test Tool',
      slug: 'test-tool',
      description: 'Test description',
      type: 'ide',
      pricing: 'free',
      status: 'active'
    });
    toolId = tool._id;
  });

  describe('GET /api/favorites', () => {
    it('should get user favorites (empty)', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should get user favorites with items', async () => {
      // Add favorite
      await request(app)
        .post(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tool.name).toBe('Test Tool');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/favorites/:toolId', () => {
    it('should add tool to favorites', async () => {
      const response = await request(app)
        .post(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tool added to favorites');
    });

    it('should fail to add non-existent tool', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/favorites/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Tool not found');
    });

    it('should fail to add already favorited tool', async () => {
      // Add first time
      await request(app)
        .post(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`);

      // Try to add again
      const response = await request(app)
        .post(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Tool already in favorites');
    });
  });

  describe('DELETE /api/favorites/:toolId', () => {
    beforeEach(async () => {
      // Add favorite
      await request(app)
        .post(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`);
    });

    it('should remove tool from favorites', async () => {
      const response = await request(app)
        .delete(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tool removed from favorites');
    });

    it('should fail to remove non-favorited tool', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/favorites/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Favorite not found');
    });
  });

  describe('GET /api/favorites/check/:toolId', () => {
    it('should check if tool is favorited (false)', async () => {
      const response = await request(app)
        .get(`/api/favorites/check/${toolId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isFavorited).toBe(false);
    });

    it('should check if tool is favorited (true)', async () => {
      // Add favorite
      await request(app)
        .post(`/api/favorites/${toolId}`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app)
        .get(`/api/favorites/check/${toolId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isFavorited).toBe(true);
    });
  });
});
