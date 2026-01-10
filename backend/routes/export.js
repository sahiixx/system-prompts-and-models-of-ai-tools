const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const { Parser } = require('json2csv');

// @route   GET /api/export/user-data
// @desc    Export user's data (GDPR compliance)
// @access  Private
router.get('/user-data', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const user = await User.findById(userId).select('-password').lean();

    // Get user's reviews
    const reviews = await Review.find({ userId })
      .populate('toolId', 'name category')
      .lean();

    // Get user's favorites
    const favorites = await Favorite.find({ userId })
      .populate('toolId', 'name category url')
      .lean();

    // Compile all data
    const userData = {
      user,
      reviews: reviews.map(r => ({
        tool: r.toolId?.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        status: r.status
      })),
      favorites: favorites.map(f => ({
        tool: f.toolId?.name,
        category: f.toolId?.category,
        url: f.toolId?.url,
        addedAt: f.createdAt
      })),
      exportDate: new Date().toISOString(),
      exportReason: 'User data export request'
    };

    res.json({
      success: true,
      message: 'User data exported successfully',
      data: userData
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/export/user-data/csv
// @desc    Export user's data as CSV
// @access  Private
router.get('/user-data/csv', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's reviews
    const reviews = await Review.find({ userId })
      .populate('toolId', 'name category')
      .lean();

    // Get user's favorites
    const favorites = await Favorite.find({ userId })
      .populate('toolId', 'name category url')
      .lean();

    // Prepare CSV data
    const csvData = {
      reviews: reviews.map(r => ({
        Tool: r.toolId?.name || 'Unknown',
        Rating: r.rating,
        Comment: r.comment,
        Status: r.status,
        Date: new Date(r.createdAt).toLocaleDateString()
      })),
      favorites: favorites.map(f => ({
        Tool: f.toolId?.name || 'Unknown',
        Category: f.toolId?.category || 'N/A',
        URL: f.toolId?.url || 'N/A',
        'Added Date': new Date(f.createdAt).toLocaleDateString()
      }))
    };

    // Generate CSV
    const reviewsParser = new Parser({ fields: ['Tool', 'Rating', 'Comment', 'Status', 'Date'] });
    const favoritesParser = new Parser({ fields: ['Tool', 'Category', 'URL', 'Added Date'] });

    const reviewsCsv = csvData.reviews.length > 0 ? reviewsParser.parse(csvData.reviews) : 'No reviews';
    const favoritesCsv = csvData.favorites.length > 0 ? favoritesParser.parse(csvData.favorites) : 'No favorites';

    const combinedCsv = `=== REVIEWS ===\n${reviewsCsv}\n\n=== FAVORITES ===\n${favoritesCsv}`;

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.csv"`);
    
    res.send(combinedCsv);
  } catch (error) {
    console.error('Error exporting user data as CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/export/tools
// @desc    Export all tools data (Admin only)
// @access  Private/Admin
router.get('/tools', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const format = req.query.format || 'json';

    // Get all tools
    const tools = await Tool.find().lean();

    if (format === 'csv') {
      // Export as CSV
      const fields = ['name', 'description', 'category', 'pricing', 'url', 'averageRating', 'totalReviews', 'views', 'status', 'createdAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(tools);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tools-export-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Export as JSON
      res.json({
        success: true,
        count: tools.length,
        exportDate: new Date().toISOString(),
        data: tools
      });
    }
  } catch (error) {
    console.error('Error exporting tools:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/export/users
// @desc    Export all users data (Admin only)
// @access  Private/Admin
router.get('/users', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const format = req.query.format || 'json';

    // Get all users (without passwords)
    const users = await User.find().select('-password').lean();

    if (format === 'csv') {
      // Export as CSV
      const fields = ['name', 'email', 'role', 'isVerified', 'isActive', 'stats.totalReviews', 'stats.totalCollections', 'createdAt', 'lastLogin'];
      const parser = new Parser({ fields });
      const csv = parser.parse(users);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Export as JSON
      res.json({
        success: true,
        count: users.length,
        exportDate: new Date().toISOString(),
        data: users
      });
    }
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/export/reviews
// @desc    Export all reviews data (Admin only)
// @access  Private/Admin
router.get('/reviews', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const format = req.query.format || 'json';

    // Get all reviews
    const reviews = await Review.find()
      .populate('userId', 'name email')
      .populate('toolId', 'name category')
      .lean();

    if (format === 'csv') {
      // Prepare data for CSV
      const reviewsData = reviews.map(r => ({
        User: r.userId?.name || 'Unknown',
        Email: r.userId?.email || 'N/A',
        Tool: r.toolId?.name || 'Unknown',
        Category: r.toolId?.category || 'N/A',
        Rating: r.rating,
        Comment: r.comment,
        Status: r.status,
        Helpful: r.helpful,
        Date: new Date(r.createdAt).toLocaleDateString()
      }));

      const fields = ['User', 'Email', 'Tool', 'Category', 'Rating', 'Comment', 'Status', 'Helpful', 'Date'];
      const parser = new Parser({ fields });
      const csv = parser.parse(reviewsData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reviews-export-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Export as JSON
      res.json({
        success: true,
        count: reviews.length,
        exportDate: new Date().toISOString(),
        data: reviews
      });
    }
  } catch (error) {
    console.error('Error exporting reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/export/analytics
// @desc    Export analytics data (Admin only)
// @access  Private/Admin
router.get('/analytics', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const format = req.query.format || 'json';

    // Gather analytics data
    const [totalTools, totalUsers, totalReviews, totalFavorites] = await Promise.all([
      Tool.countDocuments(),
      User.countDocuments(),
      Review.countDocuments(),
      Favorite.countDocuments()
    ]);

    // Get tools by category
    const toolsByCategory = await Tool.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top rated tools
    const topRatedTools = await Tool.find()
      .sort({ averageRating: -1 })
      .limit(10)
      .select('name averageRating totalReviews views')
      .lean();

    // Get most viewed tools
    const mostViewedTools = await Tool.find()
      .sort({ views: -1 })
      .limit(10)
      .select('name views category')
      .lean();

    // Get user growth by month
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const analyticsData = {
      overview: {
        totalTools,
        totalUsers,
        totalReviews,
        totalFavorites
      },
      toolsByCategory,
      topRatedTools,
      mostViewedTools,
      userGrowth,
      exportDate: new Date().toISOString()
    };

    if (format === 'json') {
      res.json({
        success: true,
        data: analyticsData
      });
    } else {
      // Export simplified version as CSV
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${Date.now()}.json"`);
      res.send(JSON.stringify(analyticsData, null, 2));
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/export/request-deletion
// @desc    Request account deletion (GDPR compliance)
// @access  Private
router.delete('/request-deletion', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // In a real application, you might want to:
    // 1. Mark the account for deletion
    // 2. Send a confirmation email
    // 3. Keep data for X days before permanent deletion
    // 4. Log the deletion request

    // For now, we'll perform immediate deletion
    await Promise.all([
      User.findByIdAndDelete(userId),
      Review.deleteMany({ userId }),
      Favorite.deleteMany({ userId })
    ]);

    res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
