const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tool: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide review content'],
    maxlength: [1000, 'Review cannot be more than 1000 characters']
  },
  pros: [String],
  cons: [String],
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  }
}, {
  timestamps: true
});

// Index for efficient queries
ReviewSchema.index({ tool: 1, user: 1 }, { unique: true });
ReviewSchema.index({ tool: 1, rating: -1 });
ReviewSchema.index({ createdAt: -1 });

// Update tool metrics after review save
ReviewSchema.post('save', async function() {
  const Tool = mongoose.model('Tool');
  const tool = await Tool.findById(this.tool);
  if (tool) {
    await tool.updateMetrics();
  }
});

// Update tool metrics after review delete
ReviewSchema.post('remove', async function() {
  const Tool = mongoose.model('Tool');
  const tool = await Tool.findById(this.tool);
  if (tool) {
    await tool.updateMetrics();
  }
});

module.exports = mongoose.model('Review', ReviewSchema);
