require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/database');

console.log('🔧 Loading routes...');
// Import routes
const authRoutes = require('./routes/auth');
const toolsRoutes = require('./routes/tools');
const usersRoutes = require('./routes/users');
const favoritesRoutes = require('./routes/favorites');
const reviewsRoutes = require('./routes/reviews');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
console.log('✓ All routes loaded');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔧 Setting up middleware...');
// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('dev'));
console.log('✓ Middleware configured');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

console.log('🔧 Registering API routes...');
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);
console.log('✓ Routes registered');

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

// Connect DB and start server
console.log('🔧 Connecting to MongoDB...');
connectDB().then(() => {
  console.log('✓ Database connected');
  console.log(`🔧 Starting server on port ${PORT}...`);
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 AI TOOLS HUB - BACKEND SERVER RUNNING');
    console.log('='.repeat(70));
    console.log(`📡 Server:          http://localhost:${PORT}`);
    console.log(`🏥 Health Check:    http://localhost:${PORT}/health`);
    console.log(`📊 Analytics API:   http://localhost:${PORT}/api/analytics`);
    console.log(`🛠️  Tools API:       http://localhost:${PORT}/api/tools`);
    console.log(`👤 Auth API:        http://localhost:${PORT}/api/auth`);
    console.log(`👨‍💼 Admin API:       http://localhost:${PORT}/api/admin`);
    console.log(`⚙️  Environment:     ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database:        MongoDB (Connected)`);
    console.log(`📦 Tools in DB:     23 AI tools`);
    console.log(`👥 Users in DB:     10 users`);
    console.log(`⭐ Reviews in DB:   68+ reviews`);
    console.log('='.repeat(70));
    console.log('\n💡 Test Credentials:');
    console.log('   Admin:     admin@aitoolshub.com / admin123');
    console.log('   Moderator: sarah@example.com / password123');
    console.log('   User:      michael@example.com / password123');
    console.log('\n' + '='.repeat(70) + '\n');
  });
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
