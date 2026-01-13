const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Tool = require('../models/Tool');
const User = require('../models/User');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

// @route   GET /api/analytics/dashboard
// @desc    Get comprehensive analytics dashboard data
// @access  Private/Admin
router.get('/dashboard', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const startDate = getStartDate(timeRange);
    
    // Parallel queries for better performance
    const [
      toolStats,
      userStats,
      reviewStats,
      favoriteStats,
      topTools,
      topCategories,
      recentActivity,
      growthMetrics
    ] = await Promise.all([
      getToolStats(startDate),
      getUserStats(startDate),
      getReviewStats(startDate),
      getFavoriteStats(startDate),
      getTopTools(),
      getTopCategories(),
      getRecentActivity(10),
      getGrowthMetrics(startDate)
    ]);
    
    res.json({
      success: true,
      timeRange,
      data: {
        overview: {
          tools: toolStats,
          users: userStats,
          reviews: reviewStats,
          favorites: favoriteStats
        },
        topPerformers: {
          tools: topTools,
          categories: topCategories
        },
        recentActivity,
        growth: growthMetrics,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

// @route   GET /api/analytics/tools/performance
// @desc    Get tool performance metrics
// @access  Private/Admin
router.get('/tools/performance', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { toolId, timeRange = '30d' } = req.query;
    const startDate = getStartDate(timeRange);
    
    let query = { status: 'active' };
    if (toolId) query._id = toolId;
    
    const tools = await Tool.find(query);
    
    const performance = await Promise.all(tools.map(async (tool) => {
      const reviews = await Review.find({
        tool: tool._id,
        createdAt: { $gte: startDate }
      });
      
      const favorites = await Favorite.countDocuments({
        tool: tool._id,
        createdAt: { $gte: startDate }
      });
      
      return {
        toolId: tool._id,
        name: tool.name,
        views: tool.metrics.views,
        newReviews: reviews.length,
        avgRecentRating: reviews.length > 0 ? 
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0,
        newFavorites: favorites,
        trendingScore: tool.metrics.trendingScore,
        conversionRate: ((favorites / tool.metrics.views) * 100).toFixed(2) + '%'
      };
    }));
    
    res.json({
      success: true,
      timeRange,
      data: performance.sort((a, b) => b.trendingScore - a.trendingScore)
    });
    
  } catch (error) {
    console.error('Tool performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tool performance'
    });
  }
});

// @route   GET /api/analytics/users/engagement
// @desc    Get user engagement metrics
// @access  Private/Admin
router.get('/users/engagement', protect, authorize('admin'), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const startDate = getStartDate(timeRange);
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: startDate }
    });
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    const engagementData = await User.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'user',
          as: 'reviews'
        }
      },
      {
        $lookup: {
          from: 'favorites',
          localField: '_id',
          foreignField: 'user',
          as: 'favorites'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          reviewCount: { $size: '$reviews' },
          favoriteCount: { $size: '$favorites' },
          engagementScore: {
            $add: [
              { $multiply: [{ $size: '$reviews' }, 3] },
              { $size: '$favorites' }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: 20 }
    ]);
    
    res.json({
      success: true,
      timeRange,
      data: {
        activeUsers,
        newUsers,
        topEngagedUsers: engagementData,
        averageEngagement: engagementData.length > 0 ?
          (engagementData.reduce((sum, u) => sum + u.engagementScore, 0) / engagementData.length).toFixed(1) : 0
      }
    });
    
  } catch (error) {
    console.error('User engagement analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user engagement'
    });
  }
});

// @route   GET /api/analytics/revenue
// @desc    Get revenue projections and tool pricing analytics
// @access  Private/Admin
router.get('/revenue', protect, authorize('admin'), async (req, res) => {
  try {
    const tools = await Tool.find({ status: 'active' });
    
    const pricingBreakdown = {
      free: tools.filter(t => t.pricing.model === 'free').length,
      freemium: tools.filter(t => t.pricing.model === 'freemium').length,
      paid: tools.filter(t => t.pricing.model === 'paid').length,
      enterprise: tools.filter(t => t.pricing.model === 'enterprise').length
    };
    
    const categories = await Tool.aggregate([
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$metrics.averageRating' },
          totalReviews: { $sum: '$metrics.totalReviews' },
          paidTools: {
            $sum: {
              $cond: [{ $in: ['$pricing.model', ['paid', 'enterprise']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        pricingBreakdown,
        categoryInsights: categories,
        totalTools: tools.length,
        monetizationRate: ((pricingBreakdown.paid + pricingBreakdown.enterprise) / tools.length * 100).toFixed(1) + '%'
      }
    });
    
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching revenue analytics'
    });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get trending topics and categories
// @access  Public
router.get('/trends', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const startDate = getStartDate(period);
    
    // Trending categories
    const trendingCategories = await Tool.aggregate([
      { $match: { status: 'active', createdAt: { $gte: startDate } } },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$metrics.averageRating' },
          totalViews: { $sum: '$metrics.views' }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 10 }
    ]);
    
    // Trending tags
    const trendingTags = await Tool.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          totalViews: { $sum: '$metrics.views' }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 15 }
    ]);
    
    // Trending tools
    const trendingTools = await Tool.find({ status: 'active' })
      .sort({ 'metrics.trendingScore': -1 })
      .limit(10)
      .select('name description category metrics');
    
    res.json({
      success: true,
      period,
      data: {
        categories: trendingCategories,
        tags: trendingTags,
        tools: trendingTools
      }
    });
    
  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trends'
    });
  }
});

// Helper Functions

function getStartDate(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7));
    case '30d':
      return new Date(now.setDate(now.getDate() - 30));
    case '90d':
      return new Date(now.setDate(now.getDate() - 90));
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setDate(now.getDate() - 30));
  }
}

async function getToolStats(startDate) {
  const total = await Tool.countDocuments({ status: 'active' });
  const newTools = await Tool.countDocuments({
    createdAt: { $gte: startDate },
    status: 'active'
  });
  const avgRating = await Tool.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: null, avg: { $avg: '$metrics.averageRating' } } }
  ]);
  
  return {
    total,
    new: newTools,
    averageRating: avgRating[0]?.avg?.toFixed(1) || 0
  };
}

async function getUserStats(startDate) {
  const total = await User.countDocuments();
  const newUsers = await User.countDocuments({
    createdAt: { $gte: startDate }
  });
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: startDate }
  });
  
  return {
    total,
    new: newUsers,
    active: activeUsers
  };
}

async function getReviewStats(startDate) {
  const total = await Review.countDocuments({ status: 'approved' });
  const newReviews = await Review.countDocuments({
    createdAt: { $gte: startDate }
  });
  const pending = await Review.countDocuments({ status: 'pending' });
  
  return {
    total,
    new: newReviews,
    pending
  };
}

async function getFavoriteStats(startDate) {
  const total = await Favorite.countDocuments();
  const newFavorites = await Favorite.countDocuments({
    createdAt: { $gte: startDate }
  });
  
  return {
    total,
    new: newFavorites
  };
}

async function getTopTools() {
  return await Tool.find({ status: 'active' })
    .sort({ 'metrics.averageRating': -1, 'metrics.totalReviews': -1 })
    .limit(10)
    .select('name description metrics category');
}

async function getTopCategories() {
  return await Tool.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgRating: { $avg: '$metrics.averageRating' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
}

async function getRecentActivity(limit) {
  const reviews = await Review.find({ status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name')
    .populate('tool', 'name')
    .select('rating title createdAt');
  
  return reviews.map(r => ({
    type: 'review',
    user: r.user.name,
    tool: r.tool.name,
    rating: r.rating,
    timestamp: r.createdAt
  }));
}

async function getGrowthMetrics(startDate) {
  const periods = [7, 14, 21, 28];
  const growth = [];
  
  for (const days of periods) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    
    const tools = await Tool.countDocuments({
      createdAt: { $gte: periodStart },
      status: 'active'
    });
    
    const users = await User.countDocuments({
      createdAt: { $gte: periodStart }
    });
    
    const reviews = await Review.countDocuments({
      createdAt: { $gte: periodStart }
    });
    
    growth.push({
      period: `${days}d`,
      tools,
      users,
      reviews
    });
  }
  
  return growth;
}

module.exports = router;
