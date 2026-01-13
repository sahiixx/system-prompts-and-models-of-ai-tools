console.log('Testing imports...');

try {
  console.log('1. Loading express...');
  require('express');
  console.log('✅ express');
  
  console.log('2. Loading dotenv...');
  require('dotenv').config();
  console.log('✅ dotenv');
  
  console.log('3. Loading logger...');
  const logger = require('./utils/logger');
  console.log('✅ logger');
  
  console.log('4. Loading database...');
  const connectDB = require('./config/database');
  console.log('✅ database');
  
  console.log('5. Loading auth routes...');
  const authRoutes = require('./routes/auth');
  console.log('✅ auth routes');
  
  console.log('6. Loading swagger...');
  const { swaggerUi, swaggerSpec } = require('./config/swagger');
  console.log('✅ swagger');
  
  console.log('7. Loading redis cache...');
  const { cache, getCacheStats } = require('./middleware/redisCache');
  console.log('✅ redis cache');
  
  console.log('\n✅ All imports successful!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Import failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
