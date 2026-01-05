const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Favorite = require('../models/Favorite');
const Tool = require('../models/Tool');
const logger = require('../utils/logger');

// @route   GET /api/favorites
// @desc    Get user's favorites
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.userId })
      .populate('tool')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (error) {
    logger.error(`Get favorites error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/favorites/:toolId
// @desc    Add tool to favorites
// @access  Private
router.post('/:toolId', authenticate, async (req, res) => {
  try {
    // Check if tool exists
    const tool = await Tool.findById(req.params.toolId);
    if (!tool) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: req.user.userId,
      tool: req.params.toolId
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Tool already in favorites' });
    }

    // Create favorite
    const favorite = new Favorite({
      user: req.user.userId,
      tool: req.params.toolId
    });

    await favorite.save();
    logger.info(`Tool favorited: ${tool.name} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Tool added to favorites',
      data: favorite
    });
  } catch (error) {
    logger.error(`Add favorite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/favorites/:toolId
// @desc    Remove tool from favorites
// @access  Private
router.delete('/:toolId', authenticate, async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({
      user: req.user.userId,
      tool: req.params.toolId
    });

    if (!favorite) {
      return res.status(404).json({ success: false, message: 'Favorite not found' });
    }

    logger.info(`Tool unfavorited: ${req.params.toolId} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Tool removed from favorites'
    });
  } catch (error) {
    logger.error(`Remove favorite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/favorites/check/:toolId
// @desc    Check if tool is favorited
// @access  Private
router.get('/check/:toolId', authenticate, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      user: req.user.userId,
      tool: req.params.toolId
    });

    res.json({
      success: true,
      isFavorited: !!favorite
    });
  } catch (error) {
    logger.error(`Check favorite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
