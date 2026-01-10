const mongoose = require('mongoose');

module.exports = {
  setupTestDB: async () => {
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-tools-hub-test';
    
    await mongoose.connect(testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  },

  closeTestDB: async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  },

  clearCollections: async () => {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  },

  createTestUser: async (User, data = {}) => {
    const defaultData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      ...data
    };

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    defaultData.password = await bcrypt.hash(defaultData.password, salt);

    return await User.create(defaultData);
  },

  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
  }
};
