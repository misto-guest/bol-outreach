#!/bin/bash

# Bol.com Outreach Platform - Deployment Readiness Check

echo "🔍 Checking deployment readiness..."
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized"
    echo "   Run: git init"
    exit 1
else
    echo "✅ Git repository initialized"
fi

# Check for required files
echo ""
echo "📁 Checking required files..."

files=(
    "package.json"
    "src/server.js"
    "src/database.js"
    "src/seller-research.js"
    "src/outreach-engine.js"
    "public/index.html"
    ".env.example"
    "railway.json"
)

all_files_ok=true

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        all_files_ok=false
    fi
done

# Check dependencies
echo ""
echo "📦 Checking dependencies..."

if [ -d "node_modules" ]; then
    echo "  ✅ node_modules exists"
else
    echo "  ⚠️  node_modules not found (run: npm install)"
fi

# Check for GitHub remote
echo ""
echo "🌐 Checking GitHub remote..."

if git remote get-url origin > /dev/null 2>&1; then
    remote_url=$(git remote get-url origin)
    echo "  ✅ Git remote configured: $remote_url"
else
    echo "  ⚠️  No git remote found"
    echo "     To add: git remote add origin https://github.com/YOUR_USERNAME/bol-outreach.git"
fi

# Check package.json scripts
echo ""
echo "🔧 Checking package.json scripts..."

if grep -q '"start"' package.json; then
    echo "  ✅ Start script found"
else
    echo "  ❌ Start script missing in package.json"
    all_files_ok=false
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$all_files_ok" = true ]; then
    echo "✅ All checks passed! Ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Push to GitHub (if not already done):"
    echo "   git push -u origin main"
    echo ""
    echo "2. Deploy on Railway:"
    echo "   → Go to https://railway.app/"
    echo "   → Click 'New Project' → 'Deploy from GitHub repo'"
    echo "   → Select this repository"
    echo "   → Configure environment variables"
    echo "   → Add persistent storage (/data)"
    echo ""
    echo "3. Or use Railway CLI:"
    echo "   railway login"
    echo "   railway init"
    echo "   railway up"
else
    echo "❌ Some checks failed. Please fix the issues above."
    exit 1
fi
