#!/bin/bash

# ============================================
# Bol.com Outreach Platform - Quick Deploy Script
# ============================================
# This script helps you quickly deploy to Railway
# ============================================

set -e  # Exit on error

echo "🚀 Bol.com Outreach Platform - Quick Deployment"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${BLUE}→ Initializing Git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit - Production ready"
    echo -e "${GREEN}✓ Git repository initialized${NC}"
else
    echo -e "${GREEN}✓ Git repository already exists${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Deployment Options:${NC}"
echo ""
echo "1. Railway (Recommended) - Easiest, best for Puppeteer"
echo "2. Render - Good free tier"
echo "3. Self-Hosted VPS - Most control"
echo ""

read -p "Choose deployment option (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}→ Deploying to Railway...${NC}"
        echo ""
        echo "Steps to deploy to Railway:"
        echo ""
        echo "1. Create a GitHub repository and push this code:"
        echo "   git remote add origin https://github.com/YOUR_USERNAME/bol-outreach.git"
        echo "   git push -u origin main"
        echo ""
        echo "2. Go to https://railway.app/"
        echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
        echo "4. Select your repository"
        echo "5. Add environment variables:"
        echo "   - NODE_ENV=production"
        echo "   - PORT=3000"
        echo "   - DATABASE_PATH=./data/bol-outreach.db"
        echo ""
        echo "6. Add persistent storage:"
        echo "   - Go to 'Storage' → 'Add Volume'"
        echo "   - Mount path: /app/data"
        echo ""
        echo -e "${GREEN}✓ Your app will be live at: https://your-app-name.railway.app${NC}"
        echo ""
        echo -e "${YELLOW}📖 Full guide: See DEPLOYMENT-GUIDE.md${NC}"
        ;;
    2)
        echo ""
        echo -e "${BLUE}→ Deploying to Render...${NC}"
        echo ""
        echo "Steps to deploy to Render:"
        echo ""
        echo "1. Create a GitHub repository and push this code:"
        echo "   git remote add origin https://github.com/YOUR_USERNAME/bol-outreach.git"
        echo "   git push -u origin main"
        echo ""
        echo "2. Go to https://render.com/"
        echo "3. Click 'New' → 'Web Service'"
        echo "4. Connect your GitHub repository"
        echo "5. Use these settings:"
        echo "   - Environment: Node"
        echo "   - Build Command: npm install"
        echo "   - Start Command: node src/server.js"
        echo ""
        echo "6. Add environment variables:"
        echo "   - NODE_ENV=production"
        echo "   - PORT=3000"
        echo "   - DATABASE_PATH=/opt/render/project/data/bol-outreach.db"
        echo ""
        echo -e "${GREEN}✓ Your app will be live at: https://your-app-name.onrender.com${NC}"
        echo ""
        echo -e "${YELLOW}📖 Full guide: See DEPLOYMENT-GUIDE.md${NC}"
        ;;
    3)
        echo ""
        echo -e "${BLUE}→ Self-Hosted VPS Deployment${NC}"
        echo ""
        echo "For self-hosted deployment, see the complete guide:"
        echo ""
        echo -e "${YELLOW}→ Open DEPLOYMENT-GUIDE.md${NC}"
        echo ""
        echo "Quick overview:"
        echo "1. Get a VPS (DigitalOcean, Linode, etc.)"
        echo "2. SSH into your server"
        echo "3. Run: apt update && apt upgrade -y"
        echo "4. Install Node.js: curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
        echo "5. Install PM2: npm install -g pm2"
        echo "6. Upload your files: scp -r ./* root@your-server-ip:/var/www/bol-outreach/"
        echo "7. Start with PM2: pm2 start src/server.js --name bol-outreach"
        echo "8. Setup Nginx reverse proxy (see guide)"
        echo "9. Setup SSL with Let's Encrypt (see guide)"
        echo ""
        echo -e "${YELLOW}📖 Full guide: See DEPLOYMENT-GUIDE.md${NC}"
        ;;
    *)
        echo ""
        echo -e "${YELLOW}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Ready to deploy!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Documentation:"
echo "  → DEPLOYMENT-GUIDE.md (Step-by-step deployment)"
echo "  → QA-TEST-REPORT.md (Complete test results)"
echo "  → COMPLETION-SUMMARY.md (Project overview)"
echo "  → USER-GUIDE.md (How to use the platform)"
echo ""
echo -e "${BLUE}Good luck! 🚀${NC}"
echo ""
