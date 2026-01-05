# AI Tools Hub - Full-Stack Backend API

Complete REST API with WebSocket support for the AI Tools Hub platform. Built with Node.js, Express, MongoDB, Redis, and Socket.io.

## 🚀 Features

### Core Features
- ✅ **User Authentication** - JWT-based auth with bcrypt password hashing
- ✅ **User Registration & Login** - Secure signup/signin with validation
- ✅ **Password Reset** - Email-based password recovery
- ✅ **Profile Management** - Update user profiles and avatars

### Tool Management
- ✅ **Tools CRUD** - Full create, read, update, delete operations
- ✅ **Advanced Filtering** - Search, filter by type/status/pricing
- ✅ **Pagination & Sorting** - Efficient data loading
- ✅ **Statistics** - Real-time tool analytics

### Social Features
- ✅ **Favorites System** - Save and manage favorite tools
- ✅ **Reviews & Ratings** - 5-star ratings with detailed reviews
- ✅ **Helpful Reviews** - Vote on helpful reviews
- ✅ **Custom Collections** - Create and share tool collections

### Real-Time Features
- ✅ **WebSocket Support** - Live updates via Socket.io
- ✅ **Real-time Analytics** - Track tool views and interactions
- ✅ **Live Notifications** - Instant updates for user actions
- ✅ **Collaboration** - Real-time collection updates

### Advanced Features
- ✅ **AI Recommendations** - ML-based tool suggestions
- ✅ **Trending Tools** - Track popular and trending tools
- ✅ **Usage Analytics** - Comprehensive platform statistics
- ✅ **Rate Limiting** - Protection against API abuse
- ✅ **Caching Layer** - Redis-based caching for performance

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB >= 6.0
- Redis >= 7.0 (optional, for rate limiting and caching)

## 🛠️ Installation

### 1. Clone & Install

\`\`\`bash
cd backend
npm install
\`\`\`

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your configuration:

\`\`\`env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:8000

# Database
MONGODB_URI=mongodb://localhost:27017/ai-tools-hub
MONGODB_USERNAME=admin
MONGODB_PASSWORD=your_password
MONGODB_DATABASE=ai-tools-hub

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
\`\`\`

### 3. Database Setup

Start MongoDB:

\`\`\`bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0

# Or use local MongoDB
mongod --dbpath /path/to/data
\`\`\`

### 4. Start Server

\`\`\`bash
# Development
npm run dev

# Production
npm start
\`\`\`

The server will start on `http://localhost:5000`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
\`\`\`

### Using Docker Only

\`\`\`bash
# Build image
docker build -t ai-tools-backend .

# Run container
docker run -d -p 5000:5000 \
  --name ai-tools-api \
  --env-file .env \
  ai-tools-backend
\`\`\`

## 📚 API Documentation

### Base URL
\`\`\`
http://localhost:5000/api
\`\`\`

### Authentication Endpoints

#### Register User
\`\`\`http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
\`\`\`

#### Login
\`\`\`http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
\`\`\`

#### Get Current User
\`\`\`http
GET /api/auth/me
Authorization: Bearer <token>
\`\`\`

#### Update Profile
\`\`\`http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "bio": "Full-stack developer",
  "avatar": "https://example.com/avatar.jpg"
}
\`\`\`

### Tools Endpoints

#### Get All Tools
\`\`\`http
GET /api/tools?page=1&limit=12&search=cursor&type=IDE&pricing=Free&sort=-rating
\`\`\`

#### Get Single Tool
\`\`\`http
GET /api/tools/:id
\`\`\`

#### Create Tool (Admin Only)
\`\`\`http
POST /api/tools
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "AI Assistant",
  "description": "Advanced AI coding assistant",
  "type": "IDE",
  "pricing": "Free",
  "features": ["autocomplete", "chat", "code-generation"],
  "status": "active"
}
\`\`\`

#### Update Tool (Admin Only)
\`\`\`http
PUT /api/tools/:id
Authorization: Bearer <admin_token>
\`\`\`

#### Delete Tool (Admin Only)
\`\`\`http
DELETE /api/tools/:id
Authorization: Bearer <admin_token>
\`\`\`

#### Get Statistics
\`\`\`http
GET /api/tools/stats/overview
\`\`\`

### Favorites Endpoints

#### Get User Favorites
\`\`\`http
GET /api/favorites
Authorization: Bearer <token>
\`\`\`

#### Add to Favorites
\`\`\`http
POST /api/favorites/:toolId
Authorization: Bearer <token>
\`\`\`

#### Remove from Favorites
\`\`\`http
DELETE /api/favorites/:toolId
Authorization: Bearer <token>
\`\`\`

#### Check if Favorited
\`\`\`http
GET /api/favorites/check/:toolId
Authorization: Bearer <token>
\`\`\`

### Reviews Endpoints

#### Get Tool Reviews
\`\`\`http
GET /api/reviews/tool/:toolId?page=1&limit=10&sort=-createdAt
\`\`\`

#### Create Review
\`\`\`http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "tool": "tool_id_here",
  "rating": 5,
  "comment": "Excellent tool!",
  "pros": ["Fast", "Easy to use"],
  "cons": ["Limited features"]
}
\`\`\`

#### Update Review
\`\`\`http
PUT /api/reviews/:id
Authorization: Bearer <token>
\`\`\`

#### Delete Review
\`\`\`http
DELETE /api/reviews/:id
Authorization: Bearer <token>
\`\`\`

#### Mark Review as Helpful
\`\`\`http
POST /api/reviews/:id/helpful
Authorization: Bearer <token>
\`\`\`

### Collections Endpoints

#### Get User Collections
\`\`\`http
GET /api/collections
Authorization: Bearer <token>
\`\`\`

#### Get Public Collections
\`\`\`http
GET /api/collections/public?page=1&limit=12
\`\`\`

#### Create Collection
\`\`\`http
POST /api/collections
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Favorites",
  "description": "Best AI tools for coding",
  "isPublic": true,
  "color": "#6366f1",
  "icon": "🚀"
}
\`\`\`

#### Update Collection
\`\`\`http
PUT /api/collections/:id
Authorization: Bearer <token>
\`\`\`

#### Delete Collection
\`\`\`http
DELETE /api/collections/:id
Authorization: Bearer <token>
\`\`\`

#### Add Tool to Collection
\`\`\`http
POST /api/collections/:id/tools/:toolId
Authorization: Bearer <token>
\`\`\`

#### Remove Tool from Collection
\`\`\`http
DELETE /api/collections/:id/tools/:toolId
Authorization: Bearer <token>
\`\`\`

### Analytics Endpoints

#### Get Overview
\`\`\`http
GET /api/analytics/overview
\`\`\`

#### Get Popular Tools
\`\`\`http
GET /api/analytics/popular?limit=10&timeframe=30
\`\`\`

#### Get Trends
\`\`\`http
GET /api/analytics/trends?days=7
\`\`\`

#### Get Recommendations
\`\`\`http
GET /api/analytics/recommendations
Authorization: Bearer <token>
\`\`\`

#### Track Event
\`\`\`http
POST /api/analytics/event
Content-Type: application/json

{
  "type": "tool_view",
  "toolId": "tool_id_here",
  "metadata": {}
}
\`\`\`

### User Endpoints

#### Get User Profile
\`\`\`http
GET /api/users/:id
\`\`\`

#### Get User Statistics
\`\`\`http
GET /api/users/:id/stats
\`\`\`

## 🔌 WebSocket Events

### Client → Server Events

\`\`\`javascript
// Connect to WebSocket
const socket = io('http://localhost:5000');

// Join room
socket.emit('join-room', 'analytics');

// Track tool view
socket.emit('tool-view', {
  toolId: 'tool_id_here',
  userId: 'user_id_here'
});

// Track new review
socket.emit('new-review', {
  toolId: 'tool_id_here',
  rating: 5,
  userId: 'user_id_here'
});
\`\`\`

### Server → Client Events

\`\`\`javascript
// Listen for tool views
socket.on('tool-viewed', (data) => {
  console.log('Tool viewed:', data);
});

// Listen for new reviews
socket.on('review-added', (data) => {
  console.log('New review:', data);
});

// Listen for analytics events
socket.on('analytics:event', (data) => {
  console.log('Analytics event:', data);
});

// Listen for collection updates
socket.on('collection:changed', (data) => {
  console.log('Collection updated:', data);
});
\`\`\`

## 🗄️ Database Schema

### User Model
\`\`\`javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  name: String,
  avatar: String,
  bio: String,
  role: String (user/admin),
  favorites: [ObjectId],
  collections: [ObjectId],
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Tool Model
\`\`\`javascript
{
  name: String,
  description: String,
  type: String,
  pricing: String,
  status: String,
  features: [String],
  rating: Number,
  reviewCount: Number,
  favorites: Number,
  tags: [String],
  website: String,
  logo: String,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Review Model
\`\`\`javascript
{
  user: ObjectId,
  tool: ObjectId,
  rating: Number (1-5),
  comment: String,
  pros: [String],
  cons: [String],
  helpfulCount: Number,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Favorite Model
\`\`\`javascript
{
  user: ObjectId,
  tool: ObjectId,
  createdAt: Date
}
\`\`\`

### Collection Model
\`\`\`javascript
{
  name: String,
  description: String,
  user: ObjectId,
  tools: [{
    toolId: String,
    addedAt: Date
  }],
  isPublic: Boolean,
  color: String,
  icon: String,
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
\`\`\`

## 📊 Monitoring

### Health Check
\`\`\`http
GET /health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2024-01-05T10:30:00.000Z",
  "uptime": 3600,
  "connections": 5
}
\`\`\`

### Logs
Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

## 🔒 Security Features

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting (configurable)
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation
- ✅ MongoDB injection prevention
- ✅ XSS protection

## 📈 Performance

- ✅ Redis caching layer
- ✅ MongoDB indexing
- ✅ Gzip compression
- ✅ Query optimization
- ✅ Connection pooling
- ✅ Rate limiting

## 🚀 Deployment

### Production Build

\`\`\`bash
# Set production environment
export NODE_ENV=production

# Start with PM2
pm2 start server.js --name ai-tools-api

# Or use Docker
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

### Environment Variables for Production

Ensure all sensitive variables are properly set:
- `JWT_SECRET` - Strong random string (min 32 chars)
- `MONGODB_URI` - Production MongoDB connection
- `REDIS_URL` - Production Redis connection
- `FRONTEND_URL` - Production frontend URL

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📧 Support

For support, email support@aitools.hub or open an issue on GitHub.

## 🔗 Links

- **Frontend**: [../platform](../platform)
- **Documentation**: [API Docs](http://localhost:5000/api)
- **Repository**: [GitHub](https://github.com/sahiixx/system-prompts-and-models-of-ai-tools)

---

**Built with ❤️ using Node.js, Express, MongoDB, and Socket.io**
