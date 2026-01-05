const mongoose = require('mongoose');

const ToolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a tool name'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  longDescription: {
    type: String,
    maxlength: [2000, 'Long description cannot be more than 2000 characters']
  },
  type: {
    type: String,
    required: [true, 'Please specify the tool type'],
    enum: ['ide', 'web', 'agent', 'cli', 'plugin', 'other']
  },
  status: {
    type: String,
    enum: ['active', 'beta', 'discontinued', 'coming-soon'],
    default: 'active'
  },
  pricing: {
    model: {
      type: String,
      enum: ['free', 'freemium', 'paid', 'enterprise'],
      default: 'freemium'
    },
    price: String,
    details: String
  },
  features: [{
    name: String,
    description: String,
    available: {
      type: Boolean,
      default: true
    }
  }],
  models: [{
    name: String,
    provider: String,
    capabilities: [String]
  }],
  website: {
    type: String,
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please provide a valid URL'
    ]
  },
  documentation: String,
  github: String,
  logo: String,
  screenshots: [String],
  tags: [String],
  category: [String],
  integrations: [String],
  languages: [String],
  platforms: [String],
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    trending: {
      type: Boolean,
      default: false
    },
    trendingScore: {
      type: Number,
      default: 0
    }
  },
  aiRecommendationScore: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for search
ToolSchema.index({ name: 'text', description: 'text', tags: 'text' });
ToolSchema.index({ slug: 1 });
ToolSchema.index({ type: 1, status: 1 });
ToolSchema.index({ 'metrics.views': -1, 'metrics.trending': -1 });

// Virtual for reviews
ToolSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'tool'
});

// Middleware to update metrics
ToolSchema.methods.updateMetrics = async function() {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ tool: this._id });
  
  this.metrics.totalReviews = reviews.length;
  
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    this.metrics.averageRating = sum / reviews.length;
  }
  
  await this.save();
};

// Calculate trending score
ToolSchema.methods.calculateTrendingScore = function() {
  const daysOld = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  const viewScore = this.metrics.views / 100;
  const ratingScore = this.metrics.averageRating * 20;
  const favoriteScore = this.metrics.favorites * 2;
  const recencyBonus = Math.max(0, 30 - daysOld);
  
  this.metrics.trendingScore = viewScore + ratingScore + favoriteScore + recencyBonus;
  this.metrics.trending = this.metrics.trendingScore > 100;
  
  return this.metrics.trendingScore;
};

module.exports = mongoose.model('Tool', ToolSchema);
