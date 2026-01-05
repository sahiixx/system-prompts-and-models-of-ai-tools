const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      return !this.oauthProvider;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  username: {
    type: String,
    trim: true,
    maxlength: [30, 'Username cannot be more than 30 characters']
  },
  profile: {
    displayName: String,
    avatar: String,
    bio: String
  },
  oauth: {
    google: {
      id: String,
      email: String
    },
    github: {
      id: String,
      username: String
    }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'auto'],
      default: 'dark'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  stats: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalCollections: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for favorites
UserSchema.virtual('favorites', {
  ref: 'Favorite',
  localField: '_id',
  foreignField: 'user'
});

// Virtual for reviews
UserSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'user'
});

// Virtual for collections
UserSchema.virtual('collections', {
  ref: 'Collection',
  localField: '_id',
  foreignField: 'user'
});

module.exports = mongoose.model('User', UserSchema);
