require('dotenv').config();
const mongoose = require('mongoose');
const Tool = require('../models/Tool');
const User = require('../models/User');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tools-hub');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

async function addIndexes() {
  try {
    console.log('🔧 Adding database indexes for performance optimization...\n');
    
    await connectDB();

    // Tool indexes
    console.log('📊 Adding Tool indexes...');
    await Tool.collection.createIndex({ name: 'text', description: 'text', tags: 'text' });
    await Tool.collection.createIndex({ type: 1, status: 1 });
    await Tool.collection.createIndex({ category: 1 });
    await Tool.collection.createIndex({ 'pricing.model': 1 });
    await Tool.collection.createIndex({ 'metrics.views': -1 });
    await Tool.collection.createIndex({ 'metrics.favorites': -1 });
    await Tool.collection.createIndex({ 'metrics.trending': -1 });
    await Tool.collection.createIndex({ createdAt: -1 });
    await Tool.collection.createIndex({ platforms: 1 });
    console.log('✅ Tool indexes added');

    // User indexes
    console.log('📊 Adding User indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    console.log('✅ User indexes added');

    // Review indexes
    console.log('📊 Adding Review indexes...');
    await Review.collection.createIndex({ tool: 1, user: 1 }, { unique: true });
    await Review.collection.createIndex({ tool: 1, rating: -1 });
    await Review.collection.createIndex({ createdAt: -1 });
    await Review.collection.createIndex({ status: 1 });
    console.log('✅ Review indexes added');

    // Favorite indexes
    console.log('📊 Adding Favorite indexes...');
    await Favorite.collection.createIndex({ user: 1, tool: 1 }, { unique: true });
    await Favorite.collection.createIndex({ user: 1 });
    await Favorite.collection.createIndex({ tool: 1 });
    console.log('✅ Favorite indexes added');

    // List all indexes
    console.log('\n📋 Index Summary:');
    const toolIndexes = await Tool.collection.getIndexes();
    const userIndexes = await User.collection.getIndexes();
    const reviewIndexes = await Review.collection.getIndexes();
    const favoriteIndexes = await Favorite.collection.getIndexes();

    console.log(`\n🔧 Tool Indexes (${Object.keys(toolIndexes).length}):`);
    Object.keys(toolIndexes).forEach(idx => console.log(`   - ${idx}`));

    console.log(`\n👤 User Indexes (${Object.keys(userIndexes).length}):`);
    Object.keys(userIndexes).forEach(idx => console.log(`   - ${idx}`));

    console.log(`\n⭐ Review Indexes (${Object.keys(reviewIndexes).length}):`);
    Object.keys(reviewIndexes).forEach(idx => console.log(`   - ${idx}`));

    console.log(`\n❤️ Favorite Indexes (${Object.keys(favoriteIndexes).length}):`);
    Object.keys(favoriteIndexes).forEach(idx => console.log(`   - ${idx}`));

    console.log('\n✨ All indexes added successfully!');
    console.log('🚀 Database optimized for better performance');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    process.exit(1);
  }
}

addIndexes();
