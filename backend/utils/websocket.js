const logger = require('../utils/logger');

/**
 * Initialize WebSocket handlers for real-time notifications
 * @param {Object} io - Socket.io instance
 */
function initializeWebSocketHandlers(io) {
  
  io.on('connection', (socket) => {
    logger.info(`New WebSocket connection: ${socket.id}`);
    
    // Track user identity
    let userId = null;
    
    // Authentication
    socket.on('authenticate', (data) => {
      userId = data.userId;
      socket.join(`user:${userId}`);
      logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      
      socket.emit('authenticated', {
        success: true,
        message: 'Successfully authenticated'
      });
    });
    
    // Join tool-specific room
    socket.on('join-tool', (toolId) => {
      socket.join(`tool:${toolId}`);
      logger.info(`Socket ${socket.id} joined tool room: ${toolId}`);
      
      socket.emit('joined-tool', {
        toolId,
        message: 'Joined tool room'
      });
    });
    
    // Leave tool room
    socket.on('leave-tool', (toolId) => {
      socket.leave(`tool:${toolId}`);
      logger.info(`Socket ${socket.id} left tool room: ${toolId}`);
    });
    
    // Tool view tracking
    socket.on('tool-view', async (data) => {
      const { toolId, userId } = data;
      
      try {
        // Update tool metrics
        const Tool = require('../models/Tool');
        await Tool.findByIdAndUpdate(toolId, {
          $inc: { 'metrics.views': 1 }
        });
        
        // Broadcast to analytics room
        io.to('analytics').emit('tool-viewed', {
          toolId,
          userId,
          timestamp: new Date()
        });
        
      } catch (error) {
        logger.error('Error tracking tool view:', error);
      }
    });
    
    // New review notification
    socket.on('review-submitted', (data) => {
      const { toolId, review } = data;
      
      // Notify all users watching this tool
      io.to(`tool:${toolId}`).emit('new-review', {
        toolId,
        review: {
          id: review.id,
          rating: review.rating,
          title: review.title,
          user: review.user.name,
          timestamp: new Date()
        }
      });
      
      // Notify admins
      io.to('admin').emit('review-pending', {
        toolId,
        reviewId: review.id,
        status: 'pending'
      });
      
      logger.info(`New review notification sent for tool ${toolId}`);
    });
    
    // Review moderation
    socket.on('review-moderated', (data) => {
      const { reviewId, status, toolId } = data;
      
      // Notify the review author
      io.to(`user:${data.userId}`).emit('review-status-updated', {
        reviewId,
        status,
        message: status === 'approved' ? 
          'Your review has been approved!' : 
          'Your review needs revision.'
      });
      
      // Notify tool watchers if approved
      if (status === 'approved') {
        io.to(`tool:${toolId}`).emit('review-approved', {
          toolId,
          reviewId
        });
      }
    });
    
    // Favorite notification
    socket.on('tool-favorited', (data) => {
      const { toolId, userId } = data;
      
      // Update tool metrics
      io.to(`tool:${toolId}`).emit('favorite-added', {
        toolId,
        count: data.newCount
      });
    });
    
    // Tool update notification
    socket.on('tool-updated', (data) => {
      const { toolId, updates } = data;
      
      // Notify all users who favorited this tool
      io.to(`tool:${toolId}`).emit('tool-info-updated', {
        toolId,
        updates,
        message: 'Tool information has been updated',
        timestamp: new Date()
      });
      
      logger.info(`Tool update notification sent for ${toolId}`);
    });
    
    // Admin-specific events
    socket.on('join-admin', (data) => {
      if (data.isAdmin) {
        socket.join('admin');
        logger.info(`Admin socket ${socket.id} joined admin room`);
        
        // Send current pending reviews count
        socket.emit('admin-stats', {
          pendingReviews: data.pendingReviews || 0
        });
      }
    });
    
    // Analytics room
    socket.on('join-analytics', () => {
      socket.join('analytics');
      logger.info(`Socket ${socket.id} joined analytics room`);
    });
    
    // User activity tracking
    socket.on('user-activity', (data) => {
      const { action, metadata } = data;
      
      // Broadcast to analytics
      io.to('analytics').emit('activity-logged', {
        userId,
        action,
        metadata,
        timestamp: new Date()
      });
    });
    
    // Typing indicator for comments
    socket.on('typing-comment', (data) => {
      const { toolId, userName } = data;
      
      socket.to(`tool:${toolId}`).emit('user-typing', {
        userName,
        isTyping: true
      });
    });
    
    socket.on('stop-typing-comment', (data) => {
      const { toolId, userName } = data;
      
      socket.to(`tool:${toolId}`).emit('user-typing', {
        userName,
        isTyping: false
      });
    });
    
    // Real-time search suggestions
    socket.on('search-query', async (data) => {
      const { query } = data;
      
      if (query.length < 2) return;
      
      try {
        const Tool = require('../models/Tool');
        const suggestions = await Tool.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { tags: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ],
          status: 'active'
        })
        .select('name description category type')
        .limit(5);
        
        socket.emit('search-suggestions', {
          query,
          suggestions
        });
        
      } catch (error) {
        logger.error('Error fetching search suggestions:', error);
      }
    });
    
    // Trending tools update
    socket.on('request-trending', async () => {
      try {
        const Tool = require('../models/Tool');
        const trending = await Tool.find({ status: 'active' })
          .sort({ 'metrics.trendingScore': -1 })
          .limit(5)
          .select('name description metrics');
        
        socket.emit('trending-tools', {
          tools: trending,
          timestamp: new Date()
        });
        
      } catch (error) {
        logger.error('Error fetching trending tools:', error);
      }
    });
    
    // Collection sharing notification
    socket.on('collection-shared', (data) => {
      const { collectionId, sharedWithUserIds, userName } = data;
      
      sharedWithUserIds.forEach(targetUserId => {
        io.to(`user:${targetUserId}`).emit('collection-shared-with-you', {
          collectionId,
          sharedBy: userName,
          message: `${userName} shared a collection with you`,
          timestamp: new Date()
        });
      });
    });
    
    // System notifications (admin broadcasts)
    socket.on('system-notification', (data) => {
      if (data.isAdmin) {
        io.emit('system-message', {
          message: data.message,
          type: data.type || 'info',
          timestamp: new Date()
        });
        
        logger.info(`System notification broadcast: ${data.message}`);
      }
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (userId) {
        // Notify relevant rooms about user going offline
        socket.broadcast.emit('user-offline', {
          userId,
          timestamp: new Date()
        });
      }
    });
    
    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error on ${socket.id}:`, error);
    });
    
  });
  
  // Periodic broadcasts
  setInterval(async () => {
    try {
      const Tool = require('../models/Tool');
      const Review = require('../models/Review');
      
      // Broadcast daily stats
      const totalTools = await Tool.countDocuments({ status: 'active' });
      const totalReviews = await Review.countDocuments({ status: 'approved' });
      const avgRating = await Review.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]);
      
      io.to('analytics').emit('platform-stats', {
        totalTools,
        totalReviews,
        avgRating: avgRating[0]?.avg || 0,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Error broadcasting periodic stats:', error);
    }
  }, 300000); // Every 5 minutes
  
  logger.info('WebSocket handlers initialized');
}

module.exports = { initializeWebSocketHandlers };
