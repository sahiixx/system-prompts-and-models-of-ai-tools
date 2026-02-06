const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Tool = require('../models/Tool');

// @route   POST /api/tools/compare
// @desc    Compare multiple tools side by side
// @access  Public
router.post('/compare', async (req, res) => {
  try {
    const { toolIds } = req.body;
    
    if (!toolIds || !Array.isArray(toolIds) || toolIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 tool IDs to compare'
      });
    }
    
    if (toolIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 tools can be compared at once'
      });
    }
    
    const tools = await Tool.find({ _id: { $in: toolIds } })
      .populate('createdBy', 'name email');
    
    if (tools.length !== toolIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some tools were not found'
      });
    }
    
    // Build comparison data
    const comparison = {
      tools: tools.map(tool => ({
        id: tool._id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        category: tool.category,
        pricing: tool.pricing,
        features: tool.features,
        rating: tool.metrics.averageRating,
        reviews: tool.metrics.totalReviews,
        platforms: tool.platforms,
        languages: tool.languages,
        integrations: tool.integrations,
        apiAvailable: tool.apiAvailable,
        status: tool.status
      })),
      comparisonMatrix: buildComparisonMatrix(tools),
      summary: generateComparisonSummary(tools)
    };
    
    res.json({
      success: true,
      count: tools.length,
      data: comparison
    });
    
  } catch (error) {
    console.error('Tool comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during comparison'
    });
  }
});

// @route   GET /api/tools/recommendations
// @desc    Get personalized tool recommendations
// @access  Private
router.get('/recommendations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's favorite tools to understand preferences
    const Favorite = require('../models/Favorite');
    const Review = require('../models/Review');
    
    const favorites = await Favorite.find({ user: userId })
      .populate('tool');
    
    const reviews = await Review.find({ user: userId })
      .populate('tool');
    
    // Extract categories and tags from user's interactions
    const userCategories = new Set();
    const userTags = new Set();
    
    [...favorites, ...reviews].forEach(item => {
      const tool = item.tool;
      if (tool) {
        tool.category?.forEach(cat => userCategories.add(cat));
        tool.tags?.forEach(tag => userTags.add(tag));
      }
    });
    
    // Find similar tools user hasn't interacted with
    const interactedToolIds = [
      ...favorites.map(f => f.tool._id),
      ...reviews.map(r => r.tool._id)
    ];
    
    const recommendations = await Tool.find({
      _id: { $nin: interactedToolIds },
      $or: [
        { category: { $in: Array.from(userCategories) } },
        { tags: { $in: Array.from(userTags) } }
      ],
      status: 'active'
    })
      .sort({ 'metrics.averageRating': -1, 'metrics.trending': -1 })
      .limit(10);
    
    // Calculate recommendation scores
    const scoredRecommendations = recommendations.map(tool => {
      let score = 0;
      
      // Category match bonus
      const categoryMatches = tool.category?.filter(cat => 
        userCategories.has(cat)
      ).length || 0;
      score += categoryMatches * 3;
      
      // Tag match bonus
      const tagMatches = tool.tags?.filter(tag => 
        userTags.has(tag)
      ).length || 0;
      score += tagMatches * 2;
      
      // Rating bonus
      score += (tool.metrics.averageRating || 0) * 1.5;
      
      // Popularity bonus
      score += Math.log(tool.metrics.views + 1) * 0.5;
      
      // Trending bonus
      if (tool.metrics.trending) score += 5;
      
      return {
        tool,
        score,
        reason: generateRecommendationReason(tool, userCategories, userTags)
      };
    });
    
    // Sort by score
    scoredRecommendations.sort((a, b) => b.score - a.score);
    
    res.json({
      success: true,
      count: scoredRecommendations.length,
      data: scoredRecommendations.map(r => ({
        ...r.tool.toObject(),
        recommendationScore: r.score,
        reason: r.reason
      }))
    });
    
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recommendations'
    });
  }
});

// @route   GET /api/tools/trending
// @desc    Get trending AI tools
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    
    let query = { status: 'active' };
    if (category) query.category = category;
    
    // Calculate trending score for recent activity
    const tools = await Tool.find(query)
      .sort({ 'metrics.trendingScore': -1, 'metrics.views': -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: tools.length,
      data: tools
    });
    
  } catch (error) {
    console.error('Trending tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending tools'
    });
  }
});

// @route   GET /api/tools/similar/:id
// @desc    Get similar tools based on categories and tags
// @access  Public
router.get('/similar/:id', async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }
    
    // Find similar tools
    const similar = await Tool.find({
      _id: { $ne: tool._id },
      $or: [
        { category: { $in: tool.category } },
        { tags: { $in: tool.tags } },
        { type: tool.type }
      ],
      status: 'active'
    })
      .sort({ 'metrics.averageRating': -1 })
      .limit(6);
    
    res.json({
      success: true,
      count: similar.length,
      data: similar
    });
    
  } catch (error) {
    console.error('Similar tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching similar tools'
    });
  }
});

// Helper Functions

function buildComparisonMatrix(tools) {
  const matrix = {};
  
  // Features comparison
  const allFeatures = new Set();
  tools.forEach(tool => {
    tool.features?.forEach(f => allFeatures.add(f.name));
  });
  
  matrix.features = Array.from(allFeatures).map(featureName => ({
    name: featureName,
    availability: tools.map(tool => {
      const feature = tool.features?.find(f => f.name === featureName);
      return {
        toolId: tool._id,
        available: feature ? feature.available : false,
        description: feature?.description || ''
      };
    })
  }));
  
  // Pricing comparison
  matrix.pricing = tools.map(tool => ({
    toolId: tool._id,
    model: tool.pricing.model,
    price: tool.pricing.price,
    details: tool.pricing.details
  }));
  
  // Platform comparison
  const allPlatforms = new Set();
  tools.forEach(tool => {
    tool.platforms?.forEach(p => allPlatforms.add(p));
  });
  
  matrix.platforms = Array.from(allPlatforms).map(platform => ({
    name: platform,
    support: tools.map(tool => ({
      toolId: tool._id,
      supported: tool.platforms?.includes(platform) || false
    }))
  }));
  
  return matrix;
}

function generateComparisonSummary(tools) {
  const summary = {
    priceRange: {
      free: tools.filter(t => t.pricing.model === 'free').length,
      freemium: tools.filter(t => t.pricing.model === 'freemium').length,
      paid: tools.filter(t => t.pricing.model === 'paid').length
    },
    avgRating: (tools.reduce((sum, t) => sum + (t.metrics.averageRating || 0), 0) / tools.length).toFixed(1),
    totalReviews: tools.reduce((sum, t) => sum + (t.metrics.totalReviews || 0), 0),
    apiAvailable: tools.filter(t => t.apiAvailable).length,
    mostCommonCategory: findMostCommon(tools.flatMap(t => t.category || [])),
    bestRated: tools.reduce((best, tool) => 
      (tool.metrics.averageRating || 0) > (best.metrics.averageRating || 0) ? tool : best
    ).name
  };
  
  return summary;
}

function generateRecommendationReason(tool, userCategories, userTags) {
  const reasons = [];
  
  const matchingCategories = tool.category?.filter(cat => userCategories.has(cat));
  if (matchingCategories && matchingCategories.length > 0) {
    reasons.push(`Matches your interest in ${matchingCategories.join(', ')}`);
  }
  
  if (tool.metrics.averageRating >= 4.5) {
    reasons.push('Highly rated by users');
  }
  
  if (tool.metrics.trending) {
    reasons.push('Currently trending');
  }
  
  const matchingTags = tool.tags?.filter(tag => userTags.has(tag));
  if (matchingTags && matchingTags.length > 2) {
    reasons.push(`Similar features you like`);
  }
  
  return reasons.length > 0 ? reasons.join('. ') : 'Popular in the community';
}

function findMostCommon(arr) {
  if (!arr || arr.length === 0) return 'N/A';
  
  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
}

module.exports = router;
