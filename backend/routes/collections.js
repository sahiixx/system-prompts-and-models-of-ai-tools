const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Collection schema embedded in this file for simplicity
const collectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tools: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Collection = mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

// @route   GET /api/collections
// @desc    Get user's collections
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user.userId })
      .populate('tools', 'name slug type pricing status')
      .sort('-createdAt');

    res.json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    logger.error(`Get collections error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/collections/public
// @desc    Get public collections
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collections = await Collection.find({ isPublic: true })
      .populate('user', 'username profile.displayName profile.avatar')
      .populate('tools', 'name slug type pricing status')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Collection.countDocuments({ isPublic: true });

    res.json({
      success: true,
      count: collections.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: collections
    });
  } catch (error) {
    logger.error(`Get public collections error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/collections/:id
// @desc    Get collection by ID
// @access  Public/Private
router.get('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('user', 'username profile.displayName profile.avatar')
      .populate('tools');

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // Check access rights
    if (!collection.isPublic && collection.user._id.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    logger.error(`Get collection error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/collections
// @desc    Create new collection
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, tools, isPublic, tags } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Collection name is required' });
    }

    const collection = new Collection({
      user: req.user.userId,
      name,
      description,
      tools: tools || [],
      isPublic: isPublic || false,
      tags: tags || []
    });

    await collection.save();
    await collection.populate('tools', 'name slug type pricing status');

    logger.info(`New collection created: ${name} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      data: collection
    });
  } catch (error) {
    logger.error(`Create collection error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/collections/:id
// @desc    Update collection
// @access  Private
router.put('/:id', authenticate, async (req, res) => {
  try {
    let collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // Check ownership
    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, description, tools, isPublic, tags } = req.body;

    if (name) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (tools) collection.tools = tools;
    if (isPublic !== undefined) collection.isPublic = isPublic;
    if (tags) collection.tags = tags;
    collection.updatedAt = Date.now();

    await collection.save();
    await collection.populate('tools', 'name slug type pricing status');

    logger.info(`Collection updated: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Collection updated successfully',
      data: collection
    });
  } catch (error) {
    logger.error(`Update collection error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/collections/:id
// @desc    Delete collection
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // Check ownership
    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await collection.remove();
    logger.info(`Collection deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete collection error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/collections/:id/tools/:toolId
// @desc    Add tool to collection
// @access  Private
router.post('/:id/tools/:toolId', authenticate, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // Check ownership
    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check if tool already in collection
    if (collection.tools.includes(req.params.toolId)) {
      return res.status(400).json({ success: false, message: 'Tool already in collection' });
    }

    collection.tools.push(req.params.toolId);
    collection.updatedAt = Date.now();
    await collection.save();

    logger.info(`Tool ${req.params.toolId} added to collection ${req.params.id}`);

    res.json({
      success: true,
      message: 'Tool added to collection',
      data: collection
    });
  } catch (error) {
    logger.error(`Add tool to collection error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/collections/:id/tools/:toolId
// @desc    Remove tool from collection
// @access  Private
router.delete('/:id/tools/:toolId', authenticate, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // Check ownership
    if (collection.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    collection.tools = collection.tools.filter(
      toolId => toolId.toString() !== req.params.toolId
    );
    collection.updatedAt = Date.now();
    await collection.save();

    logger.info(`Tool ${req.params.toolId} removed from collection ${req.params.id}`);

    res.json({
      success: true,
      message: 'Tool removed from collection',
      data: collection
    });
  } catch (error) {
    logger.error(`Remove tool from collection error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
