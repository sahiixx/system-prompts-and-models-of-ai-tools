# 🚀 Complete Deployment Guide - AI Tools Hub

## Overview

This guide covers deploying both frontend and backend of the AI Tools Hub platform to various hosting providers.

---

## 📋 Pre-Deployment Checklist

### Required Environment Variables (Backend)

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
FRONTEND_URL=https://your-frontend-domain.com

# Email (Optional but recommended)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@aitoolshub.com

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-api.com/api/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://your-api.com/api/auth/github/callback

# Redis (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

---

## 🌐 Frontend Deployment

### Option 1: GitHub Pages (Automatic) ⭐ RECOMMENDED

**Easiest method - auto-deploys on push to main**

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `root`
   - Click Save

2. **Automatic Deployment**:
   - Push to `main` branch
   - GitHub Actions runs automatically
   - Site deploys to: `https://[username].github.io/[repo-name]/`

3. **Custom Domain** (Optional):
   - Add `CNAME` file in `platform/` with your domain
   - Update DNS settings

### Option 2: Netlify

1. **Connect Repository**:
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login
   netlify login
   
   # Deploy
   cd platform
   netlify deploy --prod
   ```

2. **Continuous Deployment**:
   - Go to Netlify dashboard
   - Add new site from Git
   - Select repository
   - Build settings:
     - Base directory: `platform`
     - Build command: (leave empty)
     - Publish directory: `.`

### Option 3: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd platform
vercel --prod
```

---

## 🖥️ Backend Deployment

### Option 1: Heroku ⭐ RECOMMENDED FOR BEGINNERS

**Step 1: Install Heroku CLI**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
curl https://cli-assets.heroku.com/install.sh | sh

# Windows
# Download from: https://devcenter.heroku.com/articles/heroku-cli
```

**Step 2: Login and Create App**
```bash
heroku login
heroku create ai-tools-hub-api
```

**Step 3: Add MongoDB**
```bash
# Option A: MongoDB Atlas (Recommended)
# Get connection string from https://www.mongodb.com/cloud/atlas

# Option B: Heroku MongoDB add-on
heroku addons:create mongolab:sandbox
```

**Step 4: Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set FRONTEND_URL=https://your-frontend-url.com
heroku config:set MONGODB_URI=your_mongodb_connection_string
```

**Step 5: Deploy**
```bash
cd backend
git push heroku main

# Or from subdirectory
git subtree push --prefix backend heroku main
```

**Step 6: Check Logs**
```bash
heroku logs --tail
```

### Option 2: Railway 🚄 MODERN & EASY

**Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

**Step 2: Login and Initialize**
```bash
railway login
cd backend
railway init
```

**Step 3: Add Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set FRONTEND_URL=https://your-frontend-url.com
railway variables set MONGODB_URI=your_mongodb_connection_string
```

**Step 4: Deploy**
```bash
railway up
```

**Or use Railway Dashboard**:
1. Go to https://railway.app
2. Create new project
3. Connect GitHub repository
4. Select `backend` directory
5. Add environment variables
6. Deploy automatically

### Option 3: Vercel (Serverless)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Deploy**
```bash
cd backend
vercel --prod
```

**Step 3: Configure Environment**
- Go to Vercel dashboard
- Add environment variables
- Redeploy

### Option 4: AWS EC2 (Full Control)

**Step 1: Launch EC2 Instance**
- Ubuntu 22.04 LTS
- t2.micro (free tier)
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

**Step 2: Connect and Setup**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2
```

**Step 3: Clone and Setup App**
```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo/backend
npm install

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start server.js --name ai-tools-api
pm2 startup
pm2 save
```

**Step 4: Setup Nginx**
```bash
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/ai-tools-api

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/ai-tools-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 5: Setup SSL (Let's Encrypt)**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 5: DigitalOcean App Platform

1. **Create App**:
   - Go to DigitalOcean dashboard
   - Apps → Create App
   - Connect GitHub repository

2. **Configure**:
   - Select `backend` directory
   - Runtime: Node.js
   - Build Command: `npm install`
   - Run Command: `npm start`

3. **Add Environment Variables**:
   - Add all required variables in dashboard

4. **Deploy**:
   - Click "Create Resources"

---

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create Account**: https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: Free tier (M0)
3. **Create Database User**:
   - Username and password
   - Read and write privileges
4. **Whitelist IP**:
   - Allow access from anywhere: `0.0.0.0/0`
   - Or specific IPs for security
5. **Get Connection String**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/ai-tools-hub?retryWrites=true&w=majority
   ```
6. **Add to Environment Variables**

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Included)

The repository includes `.github/workflows/deploy.yml` which:

1. **On Push to Main**:
   - Runs backend tests
   - Deploys frontend to GitHub Pages
   - Deploys backend to Heroku (if configured)

2. **Configure Secrets**:
   - Go to repo Settings → Secrets → Actions
   - Add required secrets:
     - `HEROKU_API_KEY`
     - `HEROKU_APP_NAME`
     - `HEROKU_EMAIL`
     - `RAILWAY_TOKEN` (if using Railway)
     - `VERCEL_TOKEN` (if using Vercel)

---

## 📊 Monitoring & Logging

### Heroku

```bash
# View logs
heroku logs --tail

# Monitor
heroku ps
```

### PM2 (EC2/VPS)

```bash
# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart ai-tools-api
```

### Railway

- Built-in monitoring in dashboard
- View logs in real-time

---

## 🔒 Security Checklist

- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (SSL certificate)
- [ ] Whitelist specific IP addresses in MongoDB
- [ ] Use environment variables (never commit secrets)
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Regular security updates
- [ ] Monitor error logs
- [ ] Backup database regularly

---

## 🧪 Testing Deployment

### Frontend
```bash
curl https://your-frontend-url.com/platform/dashboard-enhanced.html
```

### Backend
```bash
# Health check
curl https://your-api-url.com/health

# Test auth endpoint
curl -X POST https://your-api-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser"}'
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Build Fails**
- Check Node.js version (need 18+)
- Run `npm install` locally first
- Check package.json scripts

**2. Database Connection Fails**
- Verify MongoDB URI format
- Check IP whitelist
- Ensure user has correct permissions

**3. CORS Errors**
- Update `FRONTEND_URL` in backend .env
- Check CORS configuration in server.js

**4. 502 Bad Gateway**
- Backend not running
- Check logs: `heroku logs --tail` or `pm2 logs`
- Verify PORT environment variable

---

## 📞 Support

**Issues**: https://github.com/sahiixx/system-prompts-and-models-of-ai-tools/issues  
**Discussions**: https://github.com/sahiixx/system-prompts-and-models-of-ai-tools/discussions

---

## ✅ Post-Deployment

- [ ] Test all API endpoints
- [ ] Test frontend pages
- [ ] Test authentication flow
- [ ] Test OAuth (if configured)
- [ ] Test email sending (if configured)
- [ ] Monitor error logs
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure backup strategy
- [ ] Update documentation with live URLs

---

**Last Updated**: January 2026  
**Version**: 1.0.0
