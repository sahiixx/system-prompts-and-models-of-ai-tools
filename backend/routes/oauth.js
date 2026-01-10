const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth.html?error=google_auth_failed`
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user._id);

      logger.info(`Google OAuth success: ${req.user.email}`);

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth.html?token=${token}&provider=google`);
    } catch (error) {
      logger.error(`Google OAuth callback error: ${error.message}`);
      res.redirect(`${process.env.FRONTEND_URL}/auth.html?error=token_generation_failed`);
    }
  }
);

// @route   GET /api/auth/github
// @desc    Initiate GitHub OAuth
// @access  Public
router.get('/github',
  passport.authenticate('github', {
    scope: ['user:email']
  })
);

// @route   GET /api/auth/github/callback
// @desc    GitHub OAuth callback
// @access  Public
router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth.html?error=github_auth_failed`
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user._id);

      logger.info(`GitHub OAuth success: ${req.user.email}`);

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth.html?token=${token}&provider=github`);
    } catch (error) {
      logger.error(`GitHub OAuth callback error: ${error.message}`);
      res.redirect(`${process.env.FRONTEND_URL}/auth.html?error=token_generation_failed`);
    }
  }
);

// @route   POST /api/auth/link/google
// @desc    Link Google account to existing user
// @access  Private
router.post('/link/google', 
  passport.authenticate('jwt', { session: false }),
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // Link accounts logic here
      res.json({
        success: true,
        message: 'Google account linked successfully'
      });
    } catch (error) {
      logger.error(`Link Google account error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to link Google account'
      });
    }
  }
);

// @route   POST /api/auth/link/github
// @desc    Link GitHub account to existing user
// @access  Private
router.post('/link/github',
  passport.authenticate('jwt', { session: false }),
  passport.authenticate('github', { session: false }),
  async (req, res) => {
    try {
      // Link accounts logic here
      res.json({
        success: true,
        message: 'GitHub account linked successfully'
      });
    } catch (error) {
      logger.error(`Link GitHub account error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to link GitHub account'
      });
    }
  }
);

module.exports = router;
