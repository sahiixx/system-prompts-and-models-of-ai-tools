const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send verification email
const sendVerificationEmail = async (user, token) => {
  const transporter = createTransporter();

  const verificationUrl = `${process.env.FRONTEND_URL}/auth.html?verify=${token}`;

  const mailOptions = {
    from: `"AI Tools Hub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Verify Your Email - AI Tools Hub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to AI Tools Hub!</h2>
        <p>Hi ${user.username || 'there'},</p>
        <p>Thank you for registering with AI Tools Hub. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          AI Tools Hub - Discover and compare AI coding tools<br>
          <a href="${process.env.FRONTEND_URL}" style="color: #4F46E5;">Visit our website</a>
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Email send error: ${error.message}`);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, token) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.FRONTEND_URL}/auth.html?reset=${token}`;

  const mailOptions = {
    from: `"AI Tools Hub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Reset Your Password - AI Tools Hub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset Request</h2>
        <p>Hi ${user.username || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          AI Tools Hub - Discover and compare AI coding tools<br>
          <a href="${process.env.FRONTEND_URL}" style="color: #4F46E5;">Visit our website</a>
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Email send error: ${error.message}`);
    return false;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"AI Tools Hub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to AI Tools Hub!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to AI Tools Hub!</h2>
        <p>Hi ${user.username || 'there'},</p>
        <p>Your email has been verified successfully! You can now enjoy all features of AI Tools Hub:</p>
        <ul style="line-height: 1.8;">
          <li>Browse and compare 32+ AI coding tools</li>
          <li>Save your favorite tools</li>
          <li>Rate and review tools</li>
          <li>Create custom collections</li>
          <li>Get personalized recommendations</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard-enhanced.html" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Explore Tools
          </a>
        </div>
        <p>Happy exploring!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          AI Tools Hub - Discover and compare AI coding tools<br>
          <a href="${process.env.FRONTEND_URL}" style="color: #4F46E5;">Visit our website</a>
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Email send error: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
