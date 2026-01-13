const express = require('express');
const router = express.Router();
const Tool = require('../models/Tool');
const { authenticate, optional } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const logger = require('../utils/logger');

// @route   GET /api/tools
// @desc    Get all tools with filtering, sorting, pagination
// @access  Public
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    const {
      type,
      pricing,
      status,
      search,
      sort = 'name',
      order = 'asc',
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    const query = {};
    
    if (type) query.type = type;
    if (pricing) query.pricing = pricing;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'features.feature': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sort]: sortOrder };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tools = await Tool.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Tool.countDocuments(query);

    res.json({
      success: true,
      count: tools.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: tools
    });
  } catch (error) {
    logger.error(`Get tools error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tools/statistics
// @desc    Get tools statistics
// @access  Public
router.get('/statistics', cacheMiddleware(600), async (req, res) => {
  try {
    const total = await Tool.countDocuments();
    const active = await Tool.countDocuments({ status: 'active' });
    
    const byType = await Tool.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const byPricing = await Tool.aggregate([
      { $group: { _id: '$pricing', count: { $sum: 1 } } }
    ]);

    const byStatus = await Tool.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Feature adoption
    const featureStats = await Tool.aggregate([
      { $unwind: '$features' },
      { $group: { _id: '$features.feature', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        activePercentage: ((active / total) * 100).toFixed(1),
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPricing: byPricing.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topFeatures: featureStats
      }
    });
  } catch (error) {
    logger.error(`Get statistics error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tools/:slug
// @desc    Get single tool by slug
// @access  Public
router.get('/:slug', cacheMiddleware(300), async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug });

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    // Increment view count
    tool.views = (tool.views || 0) + 1;
    await tool.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to('analytics').emit('tool-viewed', {
        slug: tool.slug,
        name: tool.name,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: tool
    });
  } catch (error) {
    logger.error(`Get tool error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tools
// @desc    Create new tool (Admin only)
// @access  Private/Admin
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user is admin (simplified - add proper role checking)
    const tool = new Tool(req.body);
    await tool.save();

    logger.info(`New tool created: ${tool.name}`);

    res.status(201).json({
      success: true,
      message: 'Tool created successfully',
      data: tool
    });
  } catch (error) {
    logger.error(`Create tool error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tools/:slug
// @desc    Update tool (Admin only)
// @access  Private/Admin
router.put('/:slug', authenticate, async (req, res) => {
  try {
    const tool = await Tool.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true, runValidators: true }
    );

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    logger.info(`Tool updated: ${tool.name}`);

    res.json({
      success: true,
      message: 'Tool updated successfully',
      data: tool
    });
  } catch (error) {
    logger.error(`Update tool error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/tools/:slug
// @desc    Delete tool (Admin only)
// @access  Private/Admin
router.delete('/:slug', authenticate, async (req, res) => {
  try {
    const tool = await Tool.findOneAndDelete({ slug: req.params.slug });

    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    logger.info(`Tool deleted: ${tool.name}`);

    res.json({
      success: true,
      message: 'Tool deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete tool error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tools/:slug/similar
// @desc    Get similar tools based on type and features
// @access  Public
router.get('/:slug/similar', cacheMiddleware(300), async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug });
    
    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    const similarTools = await Tool.find({
      _id: { $ne: tool._id },
      $or: [
        { type: tool.type },
        { 'features.feature': { $in: tool.features.map(f => f.feature) } }
      ]
    })
    .limit(6)
    .select('name slug description type pricing status rating');

    res.json({
      success: true,
      data: similarTools
    });
  } catch (error) {
    logger.error(`Get similar tools error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
