#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║                   🚀 AI TOOLS HUB - FULL STACK SETUP 🚀                      ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"

# Check if MongoDB is running
echo -e "\n${YELLOW}📦 Checking MongoDB connection...${NC}"
if nc -z localhost 27017 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB is running on localhost:27017${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB not detected on localhost:27017${NC}"
    echo -e "${CYAN}  Starting MongoDB is optional. You can use MongoDB Atlas instead.${NC}"
    echo -e "${CYAN}  Update MONGODB_URI in backend/.env if using Atlas.${NC}"
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend" || exit

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}⚙️  Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${CYAN}  Please update the values in backend/.env before continuing${NC}"
    read -p "Press Enter to continue or Ctrl+C to exit and configure .env..."
fi

# Install backend dependencies
echo -e "\n${YELLOW}📦 Installing backend dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install backend dependencies${NC}"
    exit 1
fi

# Seed database
echo -e "\n${YELLOW}🌱 Seeding database with sample data...${NC}"
read -p "Do you want to seed the database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npm run seed; then
        echo -e "${GREEN}✓ Database seeded successfully${NC}"
    else
        echo -e "${RED}✗ Database seeding failed${NC}"
        echo -e "${CYAN}  You can run 'npm run seed' later to seed the database${NC}"
    fi
fi

# Print access information
echo -e "\n${CYAN}"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                         🎉 SETUP COMPLETE! 🎉"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${GREEN}✓ Backend is ready to start${NC}\n"

echo -e "${YELLOW}📝 QUICK START GUIDE:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}1. Start the Backend:${NC}"
echo -e "   ${CYAN}cd backend${NC}"
echo -e "   ${CYAN}npm run dev${NC}"
echo -e "   ${GREEN}   → Backend will run on http://localhost:5000${NC}\n"

echo -e "${BLUE}2. Start the Frontend (in a new terminal):${NC}"
echo -e "   ${CYAN}cd platform${NC}"
echo -e "   ${CYAN}python3 -m http.server 8000${NC}"
echo -e "   ${GREEN}   → Frontend will run on http://localhost:8000${NC}\n"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}🔗 IMPORTANT LINKS:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}Frontend URLs:${NC}"
echo -e "   Dashboard:       ${GREEN}http://localhost:8000/platform/dashboard-enhanced.html${NC}"
echo -e "   Explore Tools:   ${GREEN}http://localhost:8000/platform/explore.html${NC}"
echo -e "   Authentication:  ${GREEN}http://localhost:8000/platform/auth.html${NC}"
echo -e "   Profile:         ${GREEN}http://localhost:8000/platform/profile.html${NC}"
echo -e "   Analytics:       ${GREEN}http://localhost:8000/platform/analytics.html${NC}"
echo -e "   Admin Dashboard: ${GREEN}http://localhost:8000/platform/admin.html${NC}\n"

echo -e "${BLUE}Backend URLs:${NC}"
echo -e "   API Base:        ${GREEN}http://localhost:5000/api${NC}"
echo -e "   API Docs:        ${GREEN}http://localhost:5000/api-docs${NC}"
echo -e "   Health Check:    ${GREEN}http://localhost:5000/api/health/detailed${NC}\n"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}👥 TEST ACCOUNTS:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}Admin Account:${NC}"
echo -e "   Email:    ${GREEN}admin@aitoolshub.com${NC}"
echo -e "   Password: ${GREEN}Admin@123${NC}"
echo -e "   Role:     ${YELLOW}admin${NC}\n"

echo -e "${BLUE}Moderator Account:${NC}"
echo -e "   Email:    ${GREEN}sarah.johnson@example.com${NC}"
echo -e "   Password: ${GREEN}User@123${NC}"
echo -e "   Role:     ${YELLOW}moderator${NC}\n"

echo -e "${BLUE}Regular Users:${NC}"
echo -e "   Email:    ${GREEN}michael.chen@example.com${NC}"
echo -e "   Password: ${GREEN}User@123${NC}"
echo -e "   (+ 7 more test users with same password)\n"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📊 DATASET INFORMATION:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "   ${GREEN}✓${NC} 60+ AI Tools across 10 categories"
echo -e "   ${GREEN}✓${NC} 10 User accounts (1 admin, 1 moderator, 8 users)"
echo -e "   ${GREEN}✓${NC} 45+ Reviews (approved and pending)"
echo -e "   ${GREEN}✓${NC} 50+ Favorites distributed across users"
echo -e "   ${GREEN}✓${NC} Realistic ratings and view counts\n"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}🎯 NEXT STEPS:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "   1. Start both backend and frontend servers"
echo -e "   2. Visit ${GREEN}http://localhost:8000/platform/auth.html${NC}"
echo -e "   3. Login with admin account to access all features"
echo -e "   4. Explore the admin dashboard at ${GREEN}/platform/admin.html${NC}"
echo -e "   5. Check API documentation at ${GREEN}http://localhost:5000/api-docs${NC}\n"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    ✨ Happy Building! ✨${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
