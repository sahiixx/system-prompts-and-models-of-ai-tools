const logger = require('../utils/logger');

/**
 * WebSocket Service for Real-Time Notifications
 * Handles real-time updates for:
 * - New tool submissions
 * - Review approvals/rejections
 * - User activity
 * - System notifications
 * - Analytics updates
 */
class WebSocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socketId -> userId
    this.setupNamespaces();
  }

  /**
   * Set up Socket.IO namespaces for different notification types
   */
  setupNamespaces() {
    // Main namespace for general notifications
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Handle user authentication
      socket.on('authenticate', (data) => {
        this.authenticateUser(socket, data);
      });

      // Handle room joining
      socket.on('join-room', (room) => {
        this.joinRoom(socket, room);
      });

      socket.on('leave-room', (room) => {
        this.leaveRoom(socket, room);
      });

      // Handle tool view event
      socket.on('tool-view', (data) => {
        this.handleToolView(socket, data);
      });

      // Handle review submission
      socket.on('review-submitted', (data) => {
        this.handleReviewSubmitted(socket, data);
      });

      // Handle favorite action
      socket.on('favorite-toggled', (data) => {
        this.handleFavoriteToggled(socket, data);
      });

      // Handle typing indicator for comments/reviews
      socket.on('typing', (data) => {
        this.handleTyping(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

    // Admin namespace for admin-specific notifications
    this.adminNamespace = this.io.of('/admin');
    this.setupAdminNamespace();

    // Analytics namespace for real-time analytics
    this.analyticsNamespace = this.io.of('/analytics');
    this.setupAnalyticsNamespace();
  }

  /**
   * Set up admin namespace
   */
  setupAdminNamespace() {
    this.adminNamespace.on('connection', (socket) => {
      logger.info(`Admin client connected: ${socket.id}`);

      socket.on('authenticate-admin', (data) => {
        this.authenticateAdmin(socket, data);
      });

      socket.on('disconnect', () => {
        logger.info(`Admin client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Set up analytics namespace
   */
  setupAnalyticsNamespace() {
    this.analyticsNamespace.on('connection', (socket) => {
      logger.info(`Analytics client connected: ${socket.id}`);

      socket.on('subscribe-analytics', (data) => {
        socket.join('analytics-updates');
        logger.info(`Client ${socket.id} subscribed to analytics updates`);
      });

      socket.on('disconnect', () => {
        logger.info(`Analytics client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Authenticate user
   */
  authenticateUser(socket, data) {
    const { userId, token } = data;
    
    // Store user mapping
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);

    socket.userId = userId;
    socket.join(`user-${userId}`);
    
    logger.info(`User ${userId} authenticated on socket ${socket.id}`);
    socket.emit('authenticated', { success: true, userId });
  }

  /**
   * Authenticate admin user
   */
  authenticateAdmin(socket, data) {
    const { userId, role } = data;
    
    if (role === 'admin' || role === 'moderator') {
      socket.userId = userId;
      socket.userRole = role;
      socket.join('admin-notifications');
      
      logger.info(`Admin ${userId} authenticated on admin namespace`);
      socket.emit('admin-authenticated', { success: true });
    } else {
      socket.emit('admin-authenticated', { success: false, error: 'Insufficient permissions' });
    }
  }

  /**
   * Join a room
   */
  joinRoom(socket, room) {
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room: ${room}`);
    socket.emit('room-joined', { room });
  }

  /**
   * Leave a room
   */
  leaveRoom(socket, room) {
    socket.leave(room);
    logger.info(`Socket ${socket.id} left room: ${room}`);
    socket.emit('room-left', { room });
  }

  /**
   * Handle tool view event
   */
  handleToolView(socket, data) {
    const { toolId, toolName } = data;
    
    // Broadcast to analytics room
    this.io.to('analytics').emit('tool-viewed', {
      toolId,
      toolName,
      timestamp: new Date(),
      userId: socket.userId
    });

    // Emit to analytics namespace
    this.analyticsNamespace.to('analytics-updates').emit('view-update', {
      toolId,
      increment: 1,
      timestamp: new Date()
    });
  }

  /**
   * Handle review submission
   */
  handleReviewSubmitted(socket, data) {
    const { toolId, toolName, review } = data;
    
    // Notify tool watchers
    this.io.to(`tool-${toolId}`).emit('new-review', {
      toolId,
      toolName,
      review,
      timestamp: new Date()
    });

    // Notify admins for moderation
    this.adminNamespace.to('admin-notifications').emit('review-pending', {
      toolId,
      toolName,
      review,
      timestamp: new Date()
    });
  }

  /**
   * Handle favorite toggled
   */
  handleFavoriteToggled(socket, data) {
    const { toolId, toolName, isFavorited } = data;
    
    // Emit to analytics
    this.analyticsNamespace.to('analytics-updates').emit('favorite-update', {
      toolId,
      increment: isFavorited ? 1 : -1,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, data) {
    const { toolId, userName } = data;
    
    socket.to(`tool-${toolId}`).emit('user-typing', {
      userName,
      userId: socket.userId
    });
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(socket) {
    const userId = this.socketUsers.get(socket.id);
    
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);
      
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    this.socketUsers.delete(socket.id);
    logger.info(`Client disconnected: ${socket.id}`);
  }

  /**
   * Send notification to specific user
   */
  notifyUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
    logger.info(`Sent ${event} notification to user ${userId}`);
  }

  /**
   * Send notification to multiple users
   */
  notifyUsers(userIds, event, data) {
    userIds.forEach(userId => {
      this.notifyUser(userId, event, data);
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
    logger.info(`Broadcasted ${event} to all clients`);
  }

  /**
   * Broadcast to specific room
   */
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date()
    });
    logger.info(`Broadcasted ${event} to room ${room}`);
  }

  /**
   * Notify admins
   */
  notifyAdmins(event, data) {
    this.adminNamespace.to('admin-notifications').emit(event, {
      ...data,
      timestamp: new Date()
    });
    logger.info(`Sent ${event} notification to admins`);
  }

  /**
   * Update analytics in real-time
   */
  updateAnalytics(data) {
    this.analyticsNamespace.to('analytics-updates').emit('analytics-update', {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Notify about new tool submission
   */
  notifyNewTool(toolData) {
    // Notify all users
    this.broadcast('new-tool', {
      tool: toolData,
      message: `New tool added: ${toolData.name}`
    });

    // Notify admins
    this.notifyAdmins('tool-submitted', {
      tool: toolData,
      requiresApproval: toolData.status === 'pending'
    });
  }

  /**
   * Notify about tool update
   */
  notifyToolUpdate(toolId, toolData) {
    // Notify users watching this tool
    this.broadcastToRoom(`tool-${toolId}`, 'tool-updated', {
      toolId,
      updates: toolData
    });
  }

  /**
   * Notify about review status change
   */
  notifyReviewStatusChange(reviewData) {
    const { userId, toolId, status, reviewId } = reviewData;
    
    // Notify the review author
    this.notifyUser(userId, 'review-status-changed', {
      reviewId,
      toolId,
      status,
      message: `Your review has been ${status}`
    });

    // Notify tool watchers if approved
    if (status === 'approved') {
      this.broadcastToRoom(`tool-${toolId}`, 'review-approved', {
        reviewId,
        toolId
      });
    }
  }

  /**
   * Send system notification
   */
  sendSystemNotification(data) {
    const { type, message, severity, targetUsers } = data;
    
    if (targetUsers && targetUsers.length > 0) {
      this.notifyUsers(targetUsers, 'system-notification', {
        type,
        message,
        severity
      });
    } else {
      this.broadcast('system-notification', {
        type,
        message,
        severity
      });
    }
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount() {
    return this.io.engine.clientsCount;
  }

  /**
   * Get user connection status
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }
}

module.exports = WebSocketService;
