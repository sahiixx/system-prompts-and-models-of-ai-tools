# Frontend-Backend Integration Guide

Complete guide for integrating the frontend (platform/) with the backend API.

## 📋 Table of Contents

1. [Setup](#setup)
2. [API Client Configuration](#api-client-configuration)
3. [Authentication Integration](#authentication-integration)
4. [WebSocket Integration](#websocket-integration)
5. [Component Examples](#component-examples)
6. [Error Handling](#error-handling)

## 🚀 Setup

### 1. Backend Setup

\`\`\`bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
\`\`\`

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

Update frontend files to use the backend API. The frontend is static HTML/JS, so no build process needed.

## 🔧 API Client Configuration

### Create API Client (api-client.js)

\`\`\`javascript
// /platform/js/api-client.js

class APIClient {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = \`Bearer \${this.token}\`;
    }

    try {
      const response = await fetch(\`\${this.baseURL}\${endpoint}\`, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout() {
    this.clearToken();
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Tools methods
  async getTools(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(\`/tools?\${queryString}\`);
  }

  async getTool(id) {
    return this.request(\`/tools/\${id}\`);
  }

  async getToolStats() {
    return this.request('/tools/stats/overview');
  }

  // Favorites methods
  async getFavorites() {
    return this.request('/favorites');
  }

  async addFavorite(toolId) {
    return this.request(\`/favorites/\${toolId}\`, {
      method: 'POST'
    });
  }

  async removeFavorite(toolId) {
    return this.request(\`/favorites/\${toolId}\`, {
      method: 'DELETE'
    });
  }

  async checkFavorite(toolId) {
    return this.request(\`/favorites/check/\${toolId}\`);
  }

  // Reviews methods
  async getReviews(toolId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(\`/reviews/tool/\${toolId}?\${queryString}\`);
  }

  async createReview(reviewData) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  async updateReview(reviewId, updates) {
    return this.request(\`/reviews/\${reviewId}\`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteReview(reviewId) {
    return this.request(\`/reviews/\${reviewId}\`, {
      method: 'DELETE'
    });
  }

  async markReviewHelpful(reviewId) {
    return this.request(\`/reviews/\${reviewId}/helpful\`, {
      method: 'POST'
    });
  }

  // Collections methods
  async getCollections() {
    return this.request('/collections');
  }

  async getPublicCollections(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(\`/collections/public?\${queryString}\`);
  }

  async getCollection(id) {
    return this.request(\`/collections/\${id}\`);
  }

  async createCollection(collectionData) {
    return this.request('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData)
    });
  }

  async updateCollection(id, updates) {
    return this.request(\`/collections/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteCollection(id) {
    return this.request(\`/collections/\${id}\`, {
      method: 'DELETE'
    });
  }

  async addToolToCollection(collectionId, toolId) {
    return this.request(\`/collections/\${collectionId}/tools/\${toolId}\`, {
      method: 'POST'
    });
  }

  async removeToolFromCollection(collectionId, toolId) {
    return this.request(\`/collections/\${collectionId}/tools/\${toolId}\`, {
      method: 'DELETE'
    });
  }

  // Analytics methods
  async getAnalytics() {
    return this.request('/analytics/overview');
  }

  async getPopularTools(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(\`/analytics/popular?\${queryString}\`);
  }

  async getTrends(days = 7) {
    return this.request(\`/analytics/trends?days=\${days}\`);
  }

  async getRecommendations() {
    return this.request('/analytics/recommendations');
  }

  async trackEvent(eventData) {
    return this.request('/analytics/event', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  // Users methods
  async getUser(id) {
    return this.request(\`/users/\${id}\`);
  }

  async getUserStats(id) {
    return this.request(\`/users/\${id}/stats\`);
  }
}

// Create singleton instance
const api = new APIClient();
\`\`\`

## 🔐 Authentication Integration

### Update auth.html

\`\`\`javascript
// Add to auth.html
const api = new APIClient();

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    showLoading(true);
    const response = await api.login({ email, password });
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(response.user));
    
    // Show success message
    showToast('Login successful! Redirecting...', 'success');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/platform/profile.html';
    }, 1000);
  } catch (error) {
    showToast(error.message || 'Login failed', 'error');
  } finally {
    showLoading(false);
  }
});

// Register Form Handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const name = document.getElementById('registerName').value;

  try {
    showLoading(true);
    const response = await api.register({
      username,
      email,
      password,
      name
    });
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(response.user));
    
    // Show success message
    showToast('Registration successful! Redirecting...', 'success');
    
    // Redirect to profile
    setTimeout(() => {
      window.location.href = '/platform/profile.html';
    }, 1000);
  } catch (error) {
    showToast(error.message || 'Registration failed', 'error');
  } finally {
    showLoading(false);
  }
});
\`\`\`

## 🔌 WebSocket Integration

### Create WebSocket Client (socket-client.js)

\`\`\`javascript
// /platform/js/socket-client.js

class SocketClient {
  constructor(url = 'http://localhost:5000') {
    this.socket = io(url);
    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      
      // Join user room if authenticated
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        this.socket.emit('join-room', \`user_\${user.id}\`);
      }
      
      // Join analytics room
      this.socket.emit('join-room', 'analytics');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('tool-viewed', (data) => {
      this.handleToolViewed(data);
    });

    this.socket.on('review-added', (data) => {
      this.handleReviewAdded(data);
    });

    this.socket.on('analytics:event', (data) => {
      this.handleAnalyticsEvent(data);
    });

    this.socket.on('collection:changed', (data) => {
      this.handleCollectionChanged(data);
    });
  }

  trackToolView(toolId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.socket.emit('tool-view', {
      toolId,
      userId: user.id,
      timestamp: new Date()
    });
  }

  trackNewReview(toolId, rating) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.socket.emit('new-review', {
      toolId,
      userId: user.id,
      rating,
      timestamp: new Date()
    });
  }

  handleToolViewed(data) {
    // Update UI with real-time tool view
    const event = new CustomEvent('tool:viewed', { detail: data });
    window.dispatchEvent(event);
  }

  handleReviewAdded(data) {
    // Update UI with new review
    const event = new CustomEvent('review:added', { detail: data });
    window.dispatchEvent(event);
  }

  handleAnalyticsEvent(data) {
    // Handle analytics events
    const event = new CustomEvent('analytics:event', { detail: data });
    window.dispatchEvent(event);
  }

  handleCollectionChanged(data) {
    // Handle collection updates
    const event = new CustomEvent('collection:changed', { detail: data });
    window.dispatchEvent(event);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Create singleton instance
const socketClient = new SocketClient();
\`\`\`

### Using WebSocket in Pages

\`\`\`javascript
// In your page scripts

// Listen for real-time tool views
window.addEventListener('tool:viewed', (event) => {
  const { toolId, userId, timestamp } = event.detail;
  console.log('Tool viewed:', toolId);
  // Update UI
});

// Listen for new reviews
window.addEventListener('review:added', (event) => {
  const { toolId, rating } = event.detail;
  console.log('New review added:', toolId, rating);
  // Update UI, refresh reviews list, etc.
});

// Track tool view when user visits tool page
socketClient.trackToolView('tool-id-here');
\`\`\`

## 📦 Component Examples

### Favorites Button Component

\`\`\`javascript
class FavoriteButton {
  constructor(toolId, container) {
    this.toolId = toolId;
    this.container = container;
    this.isFavorited = false;
    this.init();
  }

  async init() {
    await this.checkStatus();
    this.render();
    this.attachListeners();
  }

  async checkStatus() {
    try {
      const response = await api.checkFavorite(this.toolId);
      this.isFavorited = response.isFavorited;
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  }

  render() {
    this.container.innerHTML = \`
      <button class="favorite-btn \${this.isFavorited ? 'favorited' : ''}" 
              data-tool-id="\${this.toolId}">
        <i class="fas fa-heart\${this.isFavorited ? '' : '-o'} mr-2"></i>
        \${this.isFavorited ? 'Favorited' : 'Add to Favorites'}
      </button>
    \`;
  }

  attachListeners() {
    const button = this.container.querySelector('.favorite-btn');
    button.addEventListener('click', () => this.toggle());
  }

  async toggle() {
    try {
      if (this.isFavorited) {
        await api.removeFavorite(this.toolId);
        this.isFavorited = false;
        showToast('Removed from favorites', 'info');
      } else {
        await api.addFavorite(this.toolId);
        this.isFavorited = true;
        showToast('Added to favorites', 'success');
      }
      this.render();
      this.attachListeners();
    } catch (error) {
      showToast(error.message || 'Action failed', 'error');
    }
  }
}

// Usage
const favoriteBtn = new FavoriteButton('tool-id', document.getElementById('favorite-container'));
\`\`\`

### Reviews Component

\`\`\`javascript
class ReviewsSection {
  constructor(toolId, container) {
    this.toolId = toolId;
    this.container = container;
    this.reviews = [];
    this.init();
  }

  async init() {
    await this.loadReviews();
    this.render();
  }

  async loadReviews() {
    try {
      const response = await api.getReviews(this.toolId, {
        page: 1,
        limit: 10,
        sort: '-createdAt'
      });
      this.reviews = response.reviews;
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  render() {
    this.container.innerHTML = \`
      <div class="reviews-section">
        <h3>Reviews</h3>
        <div class="reviews-list">
          \${this.reviews.map(review => this.renderReview(review)).join('')}
        </div>
        <button class="btn-write-review">Write a Review</button>
      </div>
    \`;
    this.attachListeners();
  }

  renderReview(review) {
    return \`
      <div class="review-card">
        <div class="review-header">
          <img src="\${review.user.avatar}" alt="\${review.user.username}">
          <div>
            <strong>\${review.user.username}</strong>
            <div class="rating">
              \${this.renderStars(review.rating)}
            </div>
          </div>
        </div>
        <p class="review-comment">\${review.comment}</p>
        <div class="review-actions">
          <button class="btn-helpful" data-id="\${review._id}">
            <i class="fas fa-thumbs-up"></i> Helpful (\${review.helpfulCount || 0})
          </button>
        </div>
      </div>
    \`;
  }

  renderStars(rating) {
    return Array(5).fill(0).map((_, i) => 
      \`<i class="fas fa-star\${i < rating ? ' active' : ''}"></i>\`
    ).join('');
  }

  attachListeners() {
    // Mark helpful buttons
    this.container.querySelectorAll('.btn-helpful').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const reviewId = e.currentTarget.dataset.id;
        try {
          await api.markReviewHelpful(reviewId);
          await this.loadReviews();
          this.render();
          showToast('Thank you for your feedback!', 'success');
        } catch (error) {
          showToast('Error marking review as helpful', 'error');
        }
      });
    });

    // Write review button
    this.container.querySelector('.btn-write-review')?.addEventListener('click', () => {
      this.showReviewForm();
    });
  }

  showReviewForm() {
    // Show modal or form for writing review
    // Implementation depends on your UI framework
  }
}

// Usage
const reviews = new ReviewsSection('tool-id', document.getElementById('reviews-container'));
\`\`\`

## ❌ Error Handling

### Global Error Handler

\`\`\`javascript
// Add to main.js

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = \`toast toast-\${type}\`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Handle authentication errors globally
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  if (error.message && error.message.includes('Authentication required')) {
    showToast('Please login to continue', 'error');
    setTimeout(() => {
      window.location.href = '/platform/auth.html';
    }, 1500);
  }
});

// Check auth status on page load
async function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (!token) return false;

  try {
    const response = await api.getCurrentUser();
    localStorage.setItem('user', JSON.stringify(response.user));
    return true;
  } catch (error) {
    // Token expired or invalid
    api.clearToken();
    localStorage.removeItem('user');
    return false;
  }
}

// Call on protected pages
if (window.location.pathname.includes('profile.html')) {
  checkAuth().then(isAuth => {
    if (!isAuth) {
      window.location.href = '/platform/auth.html';
    }
  });
}
\`\`\`

## 🚀 Deployment

### Production Configuration

Update API base URL for production in `api-client.js`:

\`\`\`javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.yourdomain.com/api'
  : 'http://localhost:5000/api';

const api = new APIClient(API_BASE_URL);
\`\`\`

### CORS Configuration

Ensure backend `.env` has correct frontend URL:

\`\`\`env
FRONTEND_URL=https://yourdomain.com
\`\`\`

---

**Integration Complete! 🎉**

Your frontend is now fully connected to the backend API with real-time WebSocket support.
