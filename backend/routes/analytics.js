const express = require('express');
const router = express.Router();
const Tool = require('../models/Tool');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const { protect, optional } = require('../middleware/auth');

// @route   GET /api/analytics/overview
// @desc    Get overall platform analytics
// @access  Public
router.get('/overview', async (req, res) => {
  try {
    const totalTools = await Tool.countDocuments();
    const totalReviews = await Review.countDocuments();
    const totalFavorites = await Favorite.countDocuments();
    
    const avgRating = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const toolsByType = await Tool.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const toolsByPricing = await Tool.aggregate([
      { $group: { _id: '$pricing', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        totalTools,
        totalReviews,
        totalFavorites,
        averageRating: avgRating[0]?.avgRating || 0,
        toolsByType: toolsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        toolsByPricing: toolsByPricing.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get overview analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/popular
// @desc    Get most popular tools
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10, timeframe = '30' } = req.query;
    
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(timeframe));

    // Get tools with most favorites in timeframe
    const popularByFavorites = await Favorite.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: '$tool', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'tools',
          localField: '_id',
          foreignField: '_id',
          as: 'tool'
        }
      },
      { $unwind: '$tool' }
    ]);

    // Get tools with most reviews
    const popularByReviews = await Review.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: '$tool', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'tools',
          localField: '_id',
          foreignField: '_id',
          as: 'tool'
        }
      },
      { $unwind: '$tool' }
    ]);

    res.json({
      success: true,
      popular: {
        byFavorites: popularByFavorites,
        byReviews: popularByReviews
      }
    });
  } catch (error) {
    console.error('Get popular analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get trending tools and statistics
// @access  Public
router.get('/trends', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Aggregate activity by day
    const dailyActivity = await Favorite.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          favorites: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyReviews = await Review.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          reviews: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Merge daily data
    const trends = [];
    const datesMap = {};

    dailyActivity.forEach(item => {
      datesMap[item._id] = { date: item._id, favorites: item.favorites, reviews: 0, avgRating: 0 };
    });

    dailyReviews.forEach(item => {
      if (datesMap[item._id]) {
        datesMap[item._id].reviews = item.reviews;
        datesMap[item._id].avgRating = item.avgRating;
      } else {
        datesMap[item._id] = {
          date: item._id,
          favorites: 0,
          reviews: item.reviews,
          avgRating: item.avgRating
        };
      }
    });

    Object.values(datesMap).forEach(item => trends.push(item));
    trends.sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Get trends analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/recommendations
// @desc    Get AI-powered tool recommendations
// @access  Private (optional)
router.get('/recommendations', optional, async (req, res) => {
  try {
    let recommendations = [];

    if (req.user) {
      // Get user's favorites
      const userFavorites = await Favorite.find({ user: req.user._id })
        .populate('tool');
      
      const favoritedTools = userFavorites.map(f => f.tool);
      
      // Extract common features and types
      const commonFeatures = {};
      const commonTypes = {};
      
      favoritedTools.forEach(tool => {
        if (tool.type) {
          commonTypes[tool.type] = (commonTypes[tool.type] || 0) + 1;
        }
        if (tool.features) {
          tool.features.forEach(feature => {
            commonFeatures[feature] = (commonFeatures[feature] || 0) + 1;
          });
        }
      });

      // Find similar tools
      const topType = Object.keys(commonTypes).sort((a, b) => 
        commonTypes[b] - commonTypes[a]
      )[0];

      const topFeatures = Object.keys(commonFeatures)
        .sort((a, b) => commonFeatures[b] - commonFeatures[a])
        .slice(0, 3);

      const favoritedIds = favoritedTools.map(t => t._id);

      recommendations = await Tool.find({
        _id: { $nin: favoritedIds },
        $or: [
          { type: topType },
          { features: { $in: topFeatures } }
        ]
      })
        .sort('-rating -favorites')
        .limit(10);
    } else {
      // For anonymous users, show popular tools
      recommendations = await Tool.find()
        .sort('-rating -favorites')
        .limit(10);
    }

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/analytics/event
// @desc    Track analytics event
// @access  Private (optional)
router.post('/event', optional, async (req, res) => {
  try {
    const { type, toolId, metadata } = req.body;
    
    // In a real implementation, you would store these events
    // For now, we'll just acknowledge them
    
    // Emit to WebSocket for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('analytics:event', {
        type,
        toolId,
        userId: req.user?._id,
        timestamp: new Date(),
        metadata
      });
    }

    res.json({
      success: true,
      message: 'Event tracked'
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
