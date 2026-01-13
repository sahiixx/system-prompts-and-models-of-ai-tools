const request = require('supertest');
const { app } = require('../../server');
const mongoose = require('mongoose');
const Tool = require('../../models/Tool');
const User = require('../../models/User');

// Test data
let authToken;
let adminToken;
let testTool;
let testUser;

describe('Tools API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-tools-hub-test');
    }

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

    // Generate tokens
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1d' });
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1d' });

    // Create test tool
    testTool = await Tool.create({
      name: 'Test Tool',
      description: 'A test AI tool',
      category: 'Text Generation',
      url: 'https://test-tool.com',
      pricing: 'Free',
      features: ['Feature 1', 'Feature 2']
    });
  });

  afterAll(async () => {
    // Clean up
    await Tool.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/tools', () => {
    it('should return all tools', async () => {
      const res = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter tools by category', async () => {
      const res = await request(app)
        .get('/api/tools?category=Text Generation')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.every(tool => tool.category === 'Text Generation')).toBe(true);
    });

    it('should search tools by name', async () => {
      const res = await request(app)
        .get('/api/tools?search=Test')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tools/:id', () => {
    it('should return a single tool', async () => {
      const res = await request(app)
        .get(`/api/tools/${testTool._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Tool');
    });

    it('should return 404 for non-existent tool', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/tools/${fakeId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/tools', () => {
    it('should create a new tool (admin only)', async () => {
      const newTool = {
        name: 'New Test Tool',
        description: 'Another test tool',
        category: 'Image Generation',
        url: 'https://new-tool.com',
        pricing: 'Paid',
        features: ['AI-powered', 'Fast']
      };

      const res = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTool)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Test Tool');
    });

    it('should reject creation without authentication', async () => {
      const newTool = {
        name: 'Unauthorized Tool',
        description: 'Should fail',
        category: 'Text Generation'
      };

      await request(app)
        .post('/api/tools')
        .send(newTool)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidTool = {
        name: 'Invalid Tool'
        // Missing required fields
      };

      const res = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTool)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/tools/:id', () => {
    it('should update a tool (admin only)', async () => {
      const updates = {
        name: 'Updated Test Tool',
        description: 'Updated description'
      };

      const res = await request(app)
        .put(`/api/tools/${testTool._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Test Tool');
    });

    it('should reject update without admin role', async () => {
      const updates = { name: 'Should Fail' };

      await request(app)
        .put(`/api/tools/${testTool._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(403);
    });
  });

  describe('DELETE /api/tools/:id', () => {
    it('should delete a tool (admin only)', async () => {
      const toolToDelete = await Tool.create({
        name: 'Tool to Delete',
        description: 'Will be deleted',
        category: 'Text Generation',
        url: 'https://delete-me.com',
        pricing: 'Free'
      });

      const res = await request(app)
        .delete(`/api/tools/${toolToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify deletion
      const deletedTool = await Tool.findById(toolToDelete._id);
      expect(deletedTool).toBeNull();
    });

    it('should reject deletion without admin role', async () => {
      await request(app)
        .delete(`/api/tools/${testTool._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(request(app).get('/api/tools'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).toBe(true);
    }, 30000); // Increase timeout for this test
  });

  describe('Caching', () => {
    it('should return cached data on subsequent requests', async () => {
      const res1 = await request(app)
        .get('/api/tools')
        .expect(200);

      const res2 = await request(app)
        .get('/api/tools')
        .expect(200);

      // Second response should be from cache
      expect(res2.body.fromCache || res2.body.cached).toBeDefined();
    });
  });
});

describe('Authentication API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const duplicateUser = {
        name: 'Duplicate',
        email: 'test@example.com', // Already exists
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const weakPassword = {
        name: 'Test',
        email: 'weak@example.com',
        password: '123' // Too short
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(weakPassword)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const invalidCreds = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(invalidCreds)
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});

describe('Health Check API Tests', () => {
  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('OK');
      expect(res.body.uptime).toBeDefined();
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health metrics', async () => {
      const res = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(res.body.memory).toBeDefined();
      expect(res.body.cpu).toBeDefined();
      expect(res.body.database).toBeDefined();
    });
  });

  describe('GET /api/health/readiness', () => {
    it('should return readiness status', async () => {
      const res = await request(app)
        .get('/api/health/readiness')
        .expect(200);

      expect(res.body.status).toBe('READY');
    });
  });
});
