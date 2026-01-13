const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Review = require('../models/Review');
const Tool = require('../models/Tool');
const logger = require('../utils/logger');

// @route   GET /api/reviews/tool/:toolId
// @desc    Get reviews for a tool
// @access  Public
router.get('/tool/:toolId', async (req, res) => {
  try {
    const { sort = '-createdAt', page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reviews = await Review.find({ tool: req.params.toolId })
      .populate('user', 'username profile.displayName profile.avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ tool: req.params.toolId });

    // Calculate average rating
    const stats = await Review.aggregate([
      { $match: { tool: mongoose.Types.ObjectId(req.params.toolId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || { averageRating: 0, count: 0 },
      data: reviews
    });
  } catch (error) {
    logger.error(`Get reviews error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/reviews
// @desc    Create a review
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { tool, rating, comment } = req.body;

    // Validate input
    if (!tool || !rating) {
      return res.status(400).json({ success: false, message: 'Tool and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check if tool exists
    const toolExists = await Tool.findById(tool);
    if (!toolExists) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    // Check if user already reviewed this tool
    const existingReview = await Review.findOne({
      user: req.user.userId,
      tool
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this tool' });
    }

    // Create review
    const review = new Review({
      user: req.user.userId,
      tool,
      rating,
      comment
    });

    await review.save();
    await review.populate('user', 'username profile.displayName profile.avatar');

    // Update tool rating
    const reviews = await Review.find({ tool });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Tool.findByIdAndUpdate(tool, { rating: avgRating.toFixed(1) });

    logger.info(`New review created for tool ${tool} by user ${req.user.userId}`);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('review-added', {
        tool,
        review: review.toJSON(),
        avgRating: avgRating.toFixed(1)
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review
    });
  } catch (error) {
    logger.error(`Create review error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update a review
// @access  Private
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check ownership
    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    review.updatedAt = Date.now();

    await review.save();
    await review.populate('user', 'username profile.displayName profile.avatar');

    // Update tool rating
    const reviews = await Review.find({ tool: review.tool });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Tool.findByIdAndUpdate(review.tool, { rating: avgRating.toFixed(1) });

    logger.info(`Review updated: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    logger.error(`Update review error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete a review
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check ownership
    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const toolId = review.tool;
    await review.remove();

    // Update tool rating
    const reviews = await Review.find({ tool: toolId });
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Tool.findByIdAndUpdate(toolId, { rating: avgRating.toFixed(1) });
    } else {
      await Tool.findByIdAndUpdate(toolId, { rating: 0 });
    }

    logger.info(`Review deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete review error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/reviews/user/:userId
// @desc    Get reviews by user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId })
      .populate('tool', 'name slug')
      .sort('-createdAt');

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    logger.error(`Get user reviews error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
