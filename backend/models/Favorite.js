const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
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
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate favorites
FavoriteSchema.index({ user: 1, tool: 1 }, { unique: true });

// Update tool favorite count
FavoriteSchema.post('save', async function() {
  const Tool = mongoose.model('Tool');
  const count = await mongoose.model('Favorite').countDocuments({ tool: this.tool });
  await Tool.findByIdAndUpdate(this.tool, { 'metrics.favorites': count });
});

FavoriteSchema.post('remove', async function() {
  const Tool = mongoose.model('Tool');
  const count = await mongoose.model('Favorite').countDocuments({ tool: this.tool });
  await Tool.findByIdAndUpdate(this.tool, { 'metrics.favorites': count });
});

module.exports = mongoose.model('Favorite', FavoriteSchema);
