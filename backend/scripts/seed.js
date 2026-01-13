require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

const usersData = require('../data/users');
const toolsData = require('../data/tools');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('\x1b[32m✓ MongoDB Connected: %s\x1b[0m', mongoose.connection.host);
  } catch (error) {
    console.error('\x1b[31m✗ MongoDB Connection Error:\x1b[0m', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    console.log('\x1b[1m\n════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1mAI TOOLS HUB - DATABASE SEEDING\x1b[0m');
    console.log('\x1b[1m════════════════════════════════════════════════════════════\n\x1b[0m');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('\x1b[33m\n📦 Clearing existing data...\x1b[0m');
    await User.deleteMany({});
    console.log('\x1b[36m  ✓ Users cleared\x1b[0m');
    await Tool.deleteMany({});
    console.log('\x1b[36m  ✓ Tools cleared\x1b[0m');
    await Review.deleteMany({});
    console.log('\x1b[36m  ✓ Reviews cleared\x1b[0m');
    await Favorite.deleteMany({});
    console.log('\x1b[36m  ✓ Favorites cleared\x1b[0m');
    console.log('\x1b[32m✓ Database cleared successfully\n\x1b[0m');

    // Seed users
    console.log('\x1b[33m👥 Seeding users...\x1b[0m');
    const createdUsers = await User.create(usersData);
    createdUsers.forEach(user => {
      console.log(`\x1b[36m  ✓ Created user: ${user.name} (${user.role})\x1b[0m`);
    });
    console.log(`\x1b[32m✓ Seeded ${createdUsers.length} users\n\x1b[0m`);

    // Seed tools (with createdBy reference)
    console.log('\x1b[33m🛠️  Seeding tools...\x1b[0m');
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const toolsWithCreator = toolsData.map(tool => ({
      ...tool,
      createdBy: adminUser._id
    }));
    const createdTools = await Tool.create(toolsWithCreator);
    createdTools.forEach(tool => {
      console.log(`\x1b[36m  ✓ Created tool: ${tool.name} (${tool.type})\x1b[0m`);
    });
    console.log(`\x1b[32m✓ Seeded ${createdTools.length} tools\n\x1b[0m`);

    // Generate reviews dynamically
    console.log('\x1b[33m⭐ Seeding reviews...\x1b[0m');
    const reviewTemplates = [
      {
        ratings: [5, 5, 4, 5],
        titles: [
          "Excellent tool!",
          "Game changer for productivity",
          "Highly recommended",
          "Best in class"
        ],
        contents: [
          "This tool has completely transformed how I work. The AI capabilities are impressive and the interface is intuitive.",
          "I've been using this for months now and it keeps getting better. Worth every penny!",
          "The features are well thought out and the performance is excellent. Highly recommend to anyone.",
          "This has become an essential part of my workflow. Can't imagine working without it now."
        ],
        pros: [
          ["Easy to use", "Powerful features", "Great support"],
          ["Fast performance", "Regular updates", "Good documentation"],
          ["Intuitive interface", "Reliable", "Good value"],
          ["Feature-rich", "Active development", "Great community"]
        ],
        cons: [
          ["Could use more templates", "Pricing is a bit high"],
          ["Learning curve for advanced features"],
          ["Would like mobile app"],
          ["Some features in beta"]
        ]
      },
      {
        ratings: [4, 4, 3, 4],
        titles: [
          "Very good with room for improvement",
          "Solid choice",
          "Good but not perfect",
          "Worth trying"
        ],
        contents: [
          "Overall a great tool with some minor issues. The core functionality works well but there are areas for improvement.",
          "Does what it promises. Some features could be more polished but it's reliable.",
          "Good tool for the price. Has most of what I need though missing a few advanced features.",
          "Happy with the purchase. It solves my main use case effectively."
        ],
        pros: [
          ["Good core features", "Responsive team"],
          ["Reliable performance", "Fair pricing"],
          ["Easy onboarding", "Good documentation"],
          ["Regular updates", "Active community"]
        ],
        cons: [
          ["Missing some features", "UI could be better"],
          ["Limited integrations", "Occasional bugs"],
          ["Slow support response", "Limited customization"],
          ["Performance issues with large files"]
        ]
      }
    ];

    const reviews = [];
    const regularUsers = createdUsers.filter(u => u.role === 'user');
    
    // Create 2-4 reviews for each tool
    for (const tool of createdTools) {
      const numReviews = Math.floor(Math.random() * 3) + 2; // 2-4 reviews
      const usedUsers = new Set();
      
      for (let i = 0; i < numReviews && i < regularUsers.length; i++) {
        // Get a random user who hasn't reviewed this tool yet
        let randomUser;
        do {
          randomUser = regularUsers[Math.floor(Math.random() * regularUsers.length)];
        } while (usedUsers.has(randomUser._id.toString()) && usedUsers.size < regularUsers.length);
        
        usedUsers.add(randomUser._id.toString());
        
        const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
        const index = Math.floor(Math.random() * template.ratings.length);
        
        reviews.push({
          user: randomUser._id,
          tool: tool._id,
          rating: template.ratings[index],
          title: template.titles[index],
          content: template.contents[index],
          pros: template.pros[index],
          cons: template.cons[index],
          helpfulCount: Math.floor(Math.random() * 20),
          verified: Math.random() > 0.3, // 70% verified
          status: 'approved'
        });
      }
    }

    const createdReviews = await Review.create(reviews);
    console.log(`\x1b[32m✓ Seeded ${createdReviews.length} reviews\n\x1b[0m`);

    // Update tool metrics based on reviews
    console.log('\x1b[33m📊 Updating tool metrics...\x1b[0m');
    for (const tool of createdTools) {
      const toolReviews = createdReviews.filter(r => r.tool.toString() === tool._id.toString());
      if (toolReviews.length > 0) {
        const sum = toolReviews.reduce((acc, review) => acc + review.rating, 0);
        tool.metrics.averageRating = sum / toolReviews.length;
        tool.metrics.totalReviews = toolReviews.length;
      }
      
      // Add random views and favorites
      tool.metrics.views = Math.floor(Math.random() * 20000) + 1000;
      tool.metrics.favorites = Math.floor(Math.random() * 3000) + 100;
      
      // Calculate trending score
      tool.calculateTrendingScore();
      
      await tool.save();
    }
    console.log('\x1b[32m✓ Updated metrics for all tools\n\x1b[0m');

    // Seed favorites
    console.log('\x1b[33m❤️  Seeding favorites...\x1b[0m');
    const favorites = [];
    for (const user of regularUsers) {
      // Each user favorites 2-5 random tools
      const numFavorites = Math.floor(Math.random() * 4) + 2;
      const shuffledTools = [...createdTools].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < numFavorites && i < shuffledTools.length; i++) {
        if (user && user._id && shuffledTools[i] && shuffledTools[i]._id) {
          favorites.push({
            user: user._id,
            tool: shuffledTools[i]._id
          });
        }
      }
    }
    if (favorites.length > 0) {
      await Favorite.create(favorites);
      console.log(`\x1b[32m✓ Seeded ${favorites.length} favorites\n\x1b[0m`);
    } else {
      console.log(`\x1b[33m⚠ No favorites to seed\n\x1b[0m`);
    }

    // Final summary
    console.log('\x1b[1m════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1m✅ SEEDING COMPLETED SUCCESSFULLY\x1b[0m');
    console.log('\x1b[1m════════════════════════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[32m\n📊 Database Summary:\x1b[0m`);
    console.log(`   • Users: ${createdUsers.length}`);
    console.log(`   • Tools: ${createdTools.length}`);
    console.log(`   • Reviews: ${createdReviews.length}`);
    console.log(`   • Favorites: ${favorites.length}`);
    console.log(`\n\x1b[36m🔐 Test Credentials:\x1b[0m`);
    console.log(`   Admin:     admin@aitoolshub.com / admin123`);
    console.log(`   Moderator: sarah@example.com / password123`);
    console.log(`   User:      michael@example.com / password123`);
    console.log(`\n\x1b[33m🚀 You can now start the server with: npm start\x1b[0m`);
    console.log('\x1b[1m════════════════════════════════════════════════════════════\n\x1b[0m');

  } catch (error) {
    console.error('\x1b[31m\n✗ Seeding failed:\x1b[0m', error.message);
    console.error(error);
  } finally {
    mongoose.connection.close();
  }
};

seedDatabase();
