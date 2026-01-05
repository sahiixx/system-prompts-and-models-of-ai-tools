const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Tool = require('../models/Tool');
const User = require('../models/User');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/stats', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const [totalTools, totalUsers, totalReviews, pendingReviews] = await Promise.all([
      Tool.countDocuments(),
      User.countDocuments(),
      Review.countDocuments(),
      Review.countDocuments({ status: 'pending' })
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

    // Get user growth by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
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

    // Get top rated tools
    const topRatedTools = await Tool.find()
      .sort({ averageRating: -1 })
      .limit(5)
      .select('name averageRating totalReviews');

    // Get reviews over time (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const reviewsOverTime = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: fourWeeksAgo }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.week': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalTools,
          totalUsers,
          totalReviews,
          pendingReviews
        },
        toolsByCategory,
        userGrowth,
        topRatedTools,
        reviewsOverTime
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/tools
// @desc    Get all tools with filters
// @access  Private/Admin
router.get('/tools', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { search, category, status, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };
    if (sort === 'views') sortOption = { views: -1 };

    const tools = await Tool.find(query)
      .sort(sortOption)
      .select('-__v');

    res.json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/admin/tools
// @desc    Create a new tool
// @access  Private/Admin
router.post('/tools', protect, authorize('admin'), async (req, res) => {
  try {
    const tool = await Tool.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tool created successfully',
      data: tool
    });
  } catch (error) {
    console.error('Error creating tool:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create tool',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/tools/:id
// @desc    Update a tool
// @access  Private/Admin
router.put('/tools/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    res.json({
      success: true,
      message: 'Tool updated successfully',
      data: tool
    });
  } catch (error) {
    console.error('Error updating tool:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update tool',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/tools/:id
// @desc    Delete a tool
// @access  Private/Admin
router.delete('/tools/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const tool = await Tool.findByIdAndDelete(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    // Also delete related reviews and favorites
    await Promise.all([
      Review.deleteMany({ toolId: req.params.id }),
      Favorite.deleteMany({ toolId: req.params.id })
    ]);

    res.json({
      success: true,
      message: 'Tool and related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (role, status, etc.)
// @access  Private/Admin
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updateData = {};

    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private/Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's reviews, favorites, and collections
    await Promise.all([
      Review.deleteMany({ userId: req.params.id }),
      Favorite.deleteMany({ userId: req.params.id })
    ]);

    res.json({
      success: true,
      message: 'User and related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/reviews
// @desc    Get all reviews with filters
// @access  Private/Admin
router.get('/reviews', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { search, status, toolId } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (toolId) {
      query.toolId = toolId;
    }

    const reviews = await Review.find(query)
      .populate('userId', 'name email')
      .populate('toolId', 'name')
      .sort({ createdAt: -1 });

    // Filter by search after population
    let filteredReviews = reviews;
    if (search) {
      filteredReviews = reviews.filter(review => 
        review.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        review.toolId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        review.comment?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      count: filteredReviews.length,
      data: filteredReviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/reviews/:id/approve
// @desc    Approve a review
// @access  Private/Admin
router.put('/reviews/:id/approve', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).populate('userId', 'name email').populate('toolId', 'name');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update tool's average rating
    const tool = await Tool.findById(review.toolId);
    if (tool) {
      const approvedReviews = await Review.find({ 
        toolId: review.toolId,
        status: 'approved'
      });
      
      const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = approvedReviews.length > 0 
        ? (totalRating / approvedReviews.length).toFixed(1)
        : 0;

      tool.averageRating = averageRating;
      tool.totalReviews = approvedReviews.length;
      await tool.save();
    }

    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review
    });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/reviews/:id/reject
// @desc    Reject a review
// @access  Private/Admin
router.put('/reviews/:id/reject', protect, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).populate('userId', 'name email').populate('toolId', 'name');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review rejected successfully',
      data: review
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/reviews/:id
// @desc    Delete a review
// @access  Private/Admin
router.delete('/reviews/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update tool's average rating
    const tool = await Tool.findById(review.toolId);
    if (tool) {
      const approvedReviews = await Review.find({ 
        toolId: review.toolId,
        status: 'approved'
      });
      
      const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = approvedReviews.length > 0 
        ? (totalRating / approvedReviews.length).toFixed(1)
        : 0;

      tool.averageRating = averageRating;
      tool.totalReviews = approvedReviews.length;
      await tool.save();
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/admin/bulk-actions
// @desc    Perform bulk actions on resources
// @access  Private/Admin
router.post('/bulk-actions', protect, authorize('admin'), async (req, res) => {
  try {
    const { action, resourceType, ids } = req.body;

    if (!action || !resourceType || !ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. action, resourceType, and ids array required'
      });
    }

    let result;

    switch (resourceType) {
      case 'tools':
        if (action === 'delete') {
          result = await Tool.deleteMany({ _id: { $in: ids } });
          await Review.deleteMany({ toolId: { $in: ids } });
          await Favorite.deleteMany({ toolId: { $in: ids } });
        } else if (action === 'activate') {
          result = await Tool.updateMany(
            { _id: { $in: ids } },
            { status: 'active' }
          );
        } else if (action === 'deactivate') {
          result = await Tool.updateMany(
            { _id: { $in: ids } },
            { status: 'inactive' }
          );
        }
        break;

      case 'users':
        if (action === 'delete') {
          result = await User.deleteMany({ _id: { $in: ids } });
          await Review.deleteMany({ userId: { $in: ids } });
          await Favorite.deleteMany({ userId: { $in: ids } });
        } else if (action === 'activate') {
          result = await User.updateMany(
            { _id: { $in: ids } },
            { isActive: true }
          );
        } else if (action === 'deactivate') {
          result = await User.updateMany(
            { _id: { $in: ids } },
            { isActive: false }
          );
        }
        break;

      case 'reviews':
        if (action === 'delete') {
          result = await Review.deleteMany({ _id: { $in: ids } });
        } else if (action === 'approve') {
          result = await Review.updateMany(
            { _id: { $in: ids } },
            { status: 'approved' }
          );
        } else if (action === 'reject') {
          result = await Review.updateMany(
            { _id: { $in: ids } },
            { status: 'rejected' }
          );
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid resource type'
        });
    }

    res.json({
      success: true,
      message: `Bulk action completed successfully`,
      data: {
        modifiedCount: result.modifiedCount || result.deletedCount || 0
      }
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
