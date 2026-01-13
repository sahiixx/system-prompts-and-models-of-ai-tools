const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findOne({ 'oauth.google.id': profile.id });

          if (!user) {
            // Check if email exists
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
              // Link Google account to existing user
              user.oauth.google = {
                id: profile.id,
                email: profile.emails[0].value
              };
              await user.save();
            } else {
              // Create new user
              user = await User.create({
                email: profile.emails[0].value,
                username: profile.displayName.replace(/\s+/g, '').toLowerCase(),
                profile: {
                  displayName: profile.displayName,
                  avatar: profile.photos[0]?.value
                },
                oauth: {
                  google: {
                    id: profile.id,
                    email: profile.emails[0].value
                  }
                },
                emailVerified: true // Google emails are verified
              });
            }
          }

          logger.info(`Google OAuth login: ${user.email}`);
          return done(null, user);
        } catch (error) {
          logger.error(`Google OAuth error: ${error.message}`);
          return done(error, null);
        }
      }
    )
  );
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findOne({ 'oauth.github.id': profile.id });

          if (!user) {
            // Get primary email
            const email = profile.emails?.find(e => e.primary)?.value || profile.emails[0]?.value;

            if (email) {
              // Check if email exists
              user = await User.findOne({ email });

              if (user) {
                // Link GitHub account to existing user
                user.oauth.github = {
                  id: profile.id,
                  username: profile.username
                };
                await user.save();
              } else {
                // Create new user
                user = await User.create({
                  email,
                  username: profile.username,
                  profile: {
                    displayName: profile.displayName || profile.username,
                    avatar: profile.photos[0]?.value
                  },
                  oauth: {
                    github: {
                      id: profile.id,
                      username: profile.username
                    }
                  },
                  emailVerified: true // GitHub emails are verified
                });
              }
            } else {
              return done(new Error('No email provided by GitHub'), null);
            }
          }

          logger.info(`GitHub OAuth login: ${user.email}`);
          return done(null, user);
        } catch (error) {
          logger.error(`GitHub OAuth error: ${error.message}`);
          return done(error, null);
        }
      }
    )
  );
}

module.exports = passport;
