# 🚀 Full-Stack Deployment Guide

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- MongoDB running (locally or MongoDB Atlas)
- Python 3 (for frontend server)

### Installation

```bash
# 1. Run the setup script
./setup.sh

# 2. Start the backend (Terminal 1)
cd backend
npm run dev

# 3. Start the frontend (Terminal 2)
cd platform
python3 -m http.server 8000
```

### Access the Application

**Frontend:**
- Main Dashboard: http://localhost:8000/platform/dashboard-enhanced.html
- Explore Tools: http://localhost:8000/platform/explore.html
- Admin Dashboard: http://localhost:8000/platform/admin.html

**Backend:**
- API: http://localhost:5000/api
- API Docs: http://localhost:5000/api-docs
- Health: http://localhost:5000/api/health/detailed

---

## Complete Setup Guide

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd webapp

# Install backend dependencies
cd backend
npm install

# Create environment file
cp .env.example .env
```

### Step 2: Configure Environment

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:8000

# Use local MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-tools-hub

# Or use MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-tools-hub

JWT_SECRET=your-secret-key-change-this
JWT_EXPIRE=7d

# Optional: Redis for caching
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 3: Seed Database

```bash
cd backend
npm run seed
```

This will create:
- 60+ AI tools across 10 categories
- 10 user accounts (admin, moderator, regular users)
- 45+ realistic reviews
- 50+ favorites
- Proper ratings and view counts

### Step 4: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd platform
python3 -m http.server 8000
# Frontend runs on http://localhost:8000
```

Alternative frontend servers:
```bash
# Using npm http-server
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

---

## Test Accounts

### Admin Account
- **Email:** admin@aitoolshub.com
- **Password:** Admin@123
- **Access:** Full admin dashboard, manage all tools/users/reviews

### Moderator Account
- **Email:** sarah.johnson@example.com
- **Password:** User@123
- **Access:** Review moderation, basic management

### Regular User Accounts
- **Email:** michael.chen@example.com
- **Email:** emily.rodriguez@example.com
- **Email:** david.kim@example.com
- **Password:** User@123 (all users)

---

## Database Contents

### Tools (60+)
- **Text Generation:** ChatGPT, Claude, Gemini, Jasper AI, Copy.ai
- **Image Generation:** DALL-E 3, Midjourney, Stable Diffusion, Adobe Firefly
- **Code Assistant:** GitHub Copilot, Cursor, Tabnine, Replit AI
- **Video Generation:** Runway Gen-2, Pika Labs, Synthesia, HeyGen
- **Audio Tools:** ElevenLabs, Murf AI, Soundraw, AIVA
- **Data Analysis:** Julius AI, Tableau AI, DataRobot
- **Design Tools:** Canva AI, Figma AI, Uizard, Galileo AI
- **Productivity:** Notion AI, Grammarly, Otter.ai, Reclaim AI
- **Research:** Perplexity AI, Consensus, Elicit, Semantic Scholar
- **Marketing:** HubSpot AI, Lately AI, Surfer SEO, Phrasee

### Features per Tool
- Comprehensive descriptions
- Multiple features and tags
- Pricing information (Free, Freemium, Paid)
- Official URLs
- Categories and tags
- Status (active/inactive/pending)

### Reviews (45+)
- Realistic 4-5 star reviews
- Detailed comments
- Approved and pending status
- Helpful vote counts
- Distributed across popular tools

---

## API Documentation

### Access Swagger UI
http://localhost:5000/api-docs

### Available Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Tools
- `GET /api/tools` - List all tools (with filters)
- `GET /api/tools/:id` - Get single tool
- `POST /api/tools` - Create tool (admin)
- `PUT /api/tools/:id` - Update tool (admin)
- `DELETE /api/tools/:id` - Delete tool (admin)

#### Reviews
- `GET /api/reviews` - List reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

#### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/tools` - Manage tools
- `GET /api/admin/users` - Manage users
- `GET /api/admin/reviews` - Moderate reviews
- `POST /api/admin/bulk-actions` - Bulk operations

#### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Full system metrics
- `GET /api/health/metrics` - Prometheus metrics
- `GET /api/cache/stats` - Cache statistics

---

## Features Overview

### Frontend Features
✅ Enhanced Dashboard with Charts
✅ Advanced Tool Search & Filtering
✅ Tool Comparison Modal
✅ User Authentication & Profiles
✅ Favorites & Collections
✅ Review System (5-star ratings)
✅ Admin Dashboard
✅ Analytics Dashboard
✅ PWA Support (Offline Mode)
✅ Dark/Light Theme
✅ Responsive Design

### Backend Features
✅ REST API (50+ endpoints)
✅ MongoDB Database
✅ JWT Authentication
✅ OAuth 2.0 (Google, GitHub)
✅ Redis Caching (60-80% faster)
✅ User-Based Rate Limiting
✅ Email Verification
✅ Password Reset
✅ GDPR Data Export
✅ Swagger Documentation
✅ Health Monitoring
✅ Prometheus Metrics
✅ Winston Logging
✅ Comprehensive Testing (105+ tests)

---

## Development Commands

### Backend
```bash
cd backend

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Seed database
npm run seed

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/unit/auth.test.js

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## Production Deployment

### Environment Variables
Update `.env` for production:

```env
NODE_ENV=production
PORT=5000

# Use MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ai-tools-hub

# Strong JWT secret
JWT_SECRET=<generate-strong-secret>

# Production URLs
FRONTEND_URL=https://your-domain.com

# Redis (recommended for production)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# OAuth credentials
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Deployment Platforms

**Backend Options:**
- Heroku (use `Procfile`)
- Railway (use `railway.json`)
- Vercel (use `vercel.json`)
- AWS/DigitalOcean (Docker ready)
- Render, Fly.io, etc.

**Frontend Options:**
- GitHub Pages (static)
- Netlify
- Vercel
- Cloudflare Pages

### Build for Production
```bash
# Backend
cd backend
npm install --production
npm start

# Frontend
cd platform
# Serve static files with any web server
```

---

## Monitoring & Observability

### Health Checks
- Basic: http://localhost:5000/api/health
- Detailed: http://localhost:5000/api/health/detailed
- Readiness: http://localhost:5000/api/health/readiness
- Liveness: http://localhost:5000/api/health/liveness

### Prometheus Metrics
http://localhost:5000/api/health/metrics

### Cache Statistics
http://localhost:5000/api/cache/stats

### Logs
Logs are stored in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Error logs only

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or use MongoDB Atlas
# Update MONGODB_URI in .env
```

### Port Already in Use
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Redis Connection Issues
Redis is optional. If not available:
- Caching falls back to in-memory
- Rate limiting falls back to in-memory
- All features work without Redis

### Reset Database
```bash
cd backend
npm run seed
# This will clear and re-seed all data
```

---

## Support & Resources

### Documentation
- API Docs: http://localhost:5000/api-docs
- COMPLETE_IMPLEMENTATION_REPORT.md
- FULL_STACK_GUIDE.md
- DEPLOYMENT_GUIDE_COMPLETE.md

### Repository
https://github.com/sahiixx/system-prompts-and-models-of-ai-tools

### Pull Request
https://github.com/sahiixx/system-prompts-and-models-of-ai-tools/pull/115

---

## Quick Reference

### Start Everything
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd platform && python3 -m http.server 8000
```

### Access Points
- Frontend: http://localhost:8000/platform/
- Backend API: http://localhost:5000/api
- API Docs: http://localhost:5000/api-docs
- Admin: http://localhost:8000/platform/admin.html

### Login Credentials
- Admin: admin@aitoolshub.com / Admin@123
- User: michael.chen@example.com / User@123

---

**Status:** ✅ Complete & Production Ready
**Version:** 2.0.0
**Last Updated:** January 5, 2026
