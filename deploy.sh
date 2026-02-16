#!/bin/bash

# Bol.com Outreach - One-Click Deployment Script
# Automates: Git Push → Railway Deploy → Verification

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Bol.com Outreach - One-Click Deploy${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
PROJECT_DIR="/Users/northsea/clawd-dmitry/bol-outreach"
PRODUCTION_URL="https://bol-outreach-production.up.railway.app"
TEST_SCRIPT="/Users/northsea/clawd-dmitry/verify_bol_deployment.sh"

# Change to project directory
cd "$PROJECT_DIR" || {
    echo -e "${RED}❌ Failed to access project directory${NC}"
    exit 1
}
echo -e "${GREEN}✅ Project directory: $PROJECT_DIR${NC}"

# Check git status
echo ""
echo -e "${BLUE}Step 1: Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    git status --short
    echo ""
    read -p "Commit and push changes? (y/N): " -n 1 -r confirm
    if [ "$confirm" = "y" ]; then
        echo "Enter commit message:"
        read -r commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo -e "${RED}❌ Aborting deployment${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Working directory clean${NC}"
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo -e "${GREEN}✅ Current branch: $BRANCH${NC}"

# Check if Railway CLI is available
echo ""
echo -e "${BLUE}Step 2: Checking Railway CLI...${NC}"
if ! command -v railway &>/dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install with: brew install railway"
    exit 1
fi
echo -e "${GREEN}✅ Railway CLI available${NC}"

# Check if Railway is authenticated
if ! railway whoami &>/dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not authenticated${NC}"
    echo "Please run: railway login"
    exit 1
fi
echo -e "${GREEN}✅ Railway CLI authenticated${NC}"

# Push to GitHub
echo ""
echo -e "${BLUE}Step 3: Pushing to GitHub...${NC}"
git push origin "$BRANCH" || {
    echo -e "${RED}❌ Git push failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Pushed to GitHub${NC}"

# Trigger Railway deployment
echo ""
echo -e "${BLUE}Step 4: Triggering Railway deployment...${NC}"
railway up --detach || {
    echo -e "${RED}❌ Railway deployment failed${NC}"
    echo "Please check Railway dashboard"
    exit 1
}
echo -e "${GREEN}✅ Deployment started${NC}"

# Wait for deployment to complete
echo ""
echo -e "${BLUE}Step 5: Monitoring deployment (up to 5 minutes)...${NC}"
for i in {1..10}; do
    echo -n "Check $i/10... "
    
    # Wait 30 seconds between checks
    sleep 30
    
    # Test if endpoint is working
    RESPONSE=$(curl -sf -X POST "$PRODUCTION_URL/api/campaigns/2/sellers" \
        -H "Content-Type: application/json" \
        -d '{"sellerIds":[1,2]}' 2>/dev/null || echo "error")
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo ""
        echo -e "${GREEN}Response preview:${NC}"
        echo "$RESPONSE" | head -5
        echo ""
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo ""
        echo "Production URL: $PRODUCTION_URL"
        
        # Run full test suite
        echo ""
        echo -e "${BLUE}Running full test suite...${NC}"
        if [ -f "$TEST_SCRIPT" ]; then
            "$TEST_SCRIPT"
        else
            echo -e "${YELLOW}⚠️  Test script not found${NC}"
        fi
        
        exit 0
    elif echo "$RESPONSE" | grep -q "Cannot POST"; then
        echo -e "${YELLOW}Still deploying...${NC}"
    else
        echo -e "${YELLOW}Unexpected response${NC}"
    fi
done

# Deployment took too long
echo ""
echo -e "${YELLOW}⚠️  Deployment taking longer than expected${NC}"
echo ""
echo "Next steps:"
echo "  1. Check Railway dashboard: https://railway.app/project/304d57d9-0378-4065-91ad-140105e7071c"
echo "  2. Check deployment logs"
echo "  3. Run test manually: $TEST_SCRIPT"
echo ""
echo "To check deployment status later, run:"
echo "  ./deploy.sh"
