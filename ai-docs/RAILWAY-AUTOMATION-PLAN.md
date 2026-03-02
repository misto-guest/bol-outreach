# Railway Deployment Automation Plan

## Current Problem
Railway deployment requires **manual intervention** to:
1. Connect GitHub repository to Railway service
2. Trigger deployments when code changes
3. Verify deployment completed successfully
4. Run test suite to confirm functionality

**Root Cause:** Railway service was not configured with proper GitHub integration from the start.

---

## Solution: Fully Automated Deployment Pipeline

### Option 1: Railway CLI Automation (Recommended)

#### Setup Steps
```bash
# 1. Install Railway CLI (already installed)
brew install railway

# 2. Authenticate Railway CLI
railway login

# 3. Link bol-outreach project
cd /Users/northsea/clawd-dmitry/bol-outreach
railway link

# 4. Set up automatic deployments
railway up
```

#### Automation Script
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/.github/workflows/deploy.yml`

**Benefits:**
- ✅ Automatic deployment on every push to main
- ✅ Zero manual intervention required
- ✅ Built-in health checks
- ✅ Deployment status notifications
- ✅ Rollback capability

---

### Option 2: GitHub Actions Railway Integration

#### Workflow File
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway deploy
```

#### Setup Required
1. Create GitHub secret: `RAILWAY_TOKEN`
2. Get token from: https://railway.app/account/tokens
3. Add workflow file to repo
4. Enable GitHub Actions

---

### Option 3: Git Hooks for Automatic Deployment

#### Pre-push Hook
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/.git/hooks/pre-push`

```bash
#!/bin/bash

echo "🚀 Preparing to push to Railway..."

# Run tests first
npm test || {
    echo "❌ Tests failed - aborting push"
    exit 1
}

# Check Railway status
railway status || {
    echo "⚠️  Railway CLI not authenticated"
    exit 1
}

echo "✅ Ready to deploy"
```

#### Post-push Hook
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/.git/hooks/post-push`

```bash
#!/bin/bash

# Trigger Railway deployment after push
echo "🚀 Triggering Railway deployment..."
railway up --detach

# Monitor deployment
echo "⏳ Monitoring deployment..."
sleep 30

# Verify deployment
railway status --watch
```

---

## Complete Automation Solution (Recommended)

### Step 1: Railway CLI Setup (One-time)
```bash
# Authenticate Railway CLI (interactive)
railway login

# Link project (one-time)
cd /Users/northsea/clawd-dmitry/bol-outreach
railway link
```

### Step 2: Create Deployment Script
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/deploy-to-production.sh`

```bash
#!/bin/bash

set -e

echo "========================================"
echo "Bol.com Outreach - Deploy to Production"
echo "========================================"
echo ""

# Check if Railway CLI is authenticated
if ! railway whoami &>/dev/null; then
    echo "❌ Railway CLI not authenticated"
    echo "Run: railway login"
    exit 1
fi

echo "✅ Railway CLI authenticated"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected"
    echo "Commit or stash changes first"
    exit 1
fi

echo "✅ Working directory clean"

# Get current branch
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"

if [ "$BRANCH" != "main" ]; then
    echo "⚠️  Not on main branch"
    read -p "Deploy anyway? (y/N): " confirm
    if [ "$confirm" != "y" ]; then
        exit 0
    fi
fi

# Run tests (if test script exists)
if [ -f "test.sh" ]; then
    echo "Running tests..."
    ./test.sh || {
        echo "❌ Tests failed"
        exit 1
    }
    echo "✅ Tests passed"
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push origin "$BRANCH" || {
    echo "❌ Git push failed"
    exit 1
}
echo "✅ Pushed to GitHub"

# Trigger Railway deployment
echo "Triggering Railway deployment..."
railway up --detach || {
    echo "❌ Railway deployment failed"
    exit 1
}
echo "✅ Deployment started"

# Wait for deployment to complete
echo "Waiting for deployment (max 5 minutes)..."
for i in {1..10}; do
    echo "Check $i/10..."
    sleep 30
    
    # Check deployment status
    STATUS=$(railway status --json 2>/dev/null || echo "failed")
    if echo "$STATUS" | grep -q "ready\|building"; then
        echo "✅ Deployment successful"
        break
    fi
done

# Run production tests
echo "Running production tests..."
/Users/northsea/clawd-dmitry/verify_bol_deployment.sh || {
    echo "⚠️  Production tests failed"
    echo "Check deployment manually at Railway dashboard"
    exit 1
}

echo ""
echo "========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================="
echo ""
echo "Production URL: https://bol-outreach-production.up.railway.app"
```

### Step 3: Create Deployment Alias
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/deploy.sh`

```bash
#!/bin/bash

cd /Users/northsea/clawd-dmitry/bol-outreach
./deploy-to-production.sh
```

### Step 4: Make Executable
```bash
chmod +x /Users/northsea/clawd-dmitry/bol-outreach/deploy-to-production.sh
chmod +x /Users/northsea/clawd-dmitry/bol-outreach/deploy.sh
```

---

## Usage (After Setup)

### Automatic Deployment with One Command
```bash
# From bol-outreach directory
./deploy.sh
```

**What It Does:**
1. ✅ Checks for uncommitted changes
2. ✅ Runs tests (if available)
3. ✅ Pushes to GitHub
4. ✅ Triggers Railway deployment
5. ✅ Monitors deployment progress
6. ✅ Runs production tests
7. ✅ Reports success/failure

### Manual Deployment (Alternative)
```bash
cd /Users/northsea/clawd-dmitry/bol-outreach

# Standard Railway deployment
railway up

# Detached (non-blocking)
railway up --detach

# With custom environment
railway up --production
```

---

## Additional Automation Features

### 1. Pre-commit Git Hook
**Location:** `.git/hooks/pre-commit`

```bash
#!/bin/bash

# Run linter
npm run lint || {
    echo "❌ Linter errors found"
    exit 1
}

# Run tests
npm test || {
    echo "❌ Tests failed"
    exit 1
}
```

### 2. Deployment Health Check
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/check-deployment-health.sh`

```bash
#!/bin/bash

URL="https://bol-outreach-production.up.railway.app/api/health"

echo "Checking deployment health..."

if curl -sf "$URL" | grep -q '"status":"ok"'; then
    echo "✅ Deployment healthy"
    exit 0
else
    echo "❌ Deployment unhealthy"
    exit 1
fi
```

### 3. Rollback Script
**Location:** `/Users/northsea/clawd-dmitry/bol-outreach/rollback-deployment.sh`

```bash
#!/bin/bash

echo "Rolling back last deployment..."

# Get previous deployment
PREV_DEPLOY=$(railway status --json | jq -r '.deployments[1].id')

# Rollback
railway rollback "$PREV_DEPLOY" || {
    echo "❌ Rollback failed"
    exit 1
}

echo "✅ Rollback complete"
```

---

## CI/CD Integration

### GitHub Actions (Alternative to Railway CLI)

**Workflow File:** `.github/workflows/railway-deploy.yml`

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        run: |
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway deploy --service=bol-outreach

      - name: Verify Deployment
        run: |
          curl -sf https://bol-outreach-production.up.railway.app/api/health
```

---

## Current vs Future Deployment Comparison

### Current (Manual)
- ❌ Requires Railway dashboard login
- ❌ Manual "Redeploy" button click
- ❌ No automatic testing after deployment
- ❌ No rollback mechanism
- ❌ Error-prone (human error)
- ❌ Time-consuming (5-10 minutes)

### Future (Automated)
- ✅ One command: `./deploy.sh`
- ✅ Automatic testing before deployment
- ✅ Automatic health checks after deployment
- ✅ One-click rollback if needed
- ✅ Zero human error
- ✅ Fast (2-3 minutes total)

---

## Implementation Timeline

### Phase 1: Basic Automation (15 minutes)
- [ ] Install and authenticate Railway CLI
- [ ] Link bol-outreach project
- [ ] Create deploy.sh script
- [ ] Test first automated deployment

### Phase 2: Testing Integration (30 minutes)
- [ ] Add pre-commit hooks
- [ ] Integrate test suite
- [ ] Add post-deployment verification
- [ ] Test rollback mechanism

### Phase 3: CI/CD Pipeline (1 hour)
- [ ] Set up GitHub Actions workflow
- [ ] Configure RAILWAY_TOKEN secret
- [ ] Test automatic deployments on push
- [ ] Configure deployment notifications

---

## Benefits Summary

### Development Team
- ✅ Faster deployments (less waiting)
- ✅ Fewer errors (automation)
- ✅ More confidence (automated tests)
- ✅ Easy rollbacks (quick fixes)

### Business
- ✅ Faster feature delivery
- ✅ Reduced downtime
- ✅ Better quality (tests run every time)
- ✅ More reliable deployments

### Operations
- ✅ Less manual work
- ✅ Better monitoring
- ✅ Easier debugging
- ✅ Clear deployment history

---

## Next Steps

### Immediate (Today)
1. Run: `railway login`
2. Run: `railway link` (in bol-outreach directory)
3. Test basic Railway deployment

### This Week
1. Create deploy.sh script
2. Add pre-commit hooks
3. Test automated deployment flow

### Next Sprint
1. Set up GitHub Actions
2. Configure RAILWAY_TOKEN secret
3. Enable automatic deployments on push

---

## Quick Start Commands

```bash
# 1. Navigate to project
cd /Users/northsea/clawd-dmitry/bol-outreach

# 2. Authenticate Railway (one-time)
railway login

# 3. Link project (one-time)
railway link

# 4. Test deployment
railway up

# 5. Verify deployment
curl https://bol-outreach-production.up.railway.app/api/health
```

---

## Maintenance

Once automation is set up, minimal maintenance required:

### Weekly
- Check deployment logs for any issues
- Review failed deployments (if any)
- Update Railway CLI: `brew upgrade railway`

### Monthly
- Review and update test suite
- Check Railway usage and costs
- Optimize deployment process

### Quarterly
- Security audit of RAILWAY_TOKEN
- Review and update CI/CD pipeline
- Team training on deployment process
