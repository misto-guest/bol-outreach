# 🚀 DEPLOY NOW - Quick Start Guide

## Your Bol.com Outreach Platform is Ready for Production!

This guide will help you deploy to **Railway** (recommended) in ~5 minutes.

---

## Step 1: Create GitHub Repository (2 minutes)

1. Go to https://github.com/new
2. Repository name: `bol-outreach`
3. Make it **Public** (or Private - either works)
4. Click **"Create repository"**
5. **Don't** initialize with README or .gitignore (we already have them)

## Step 2: Push to GitHub (1 minute)

Run these commands in your terminal:

```bash
cd /Users/northsea/clawd-dmitry/bol-outreach

# Remove old remote (points to wrong repo)
git remote remove origin

# Add your new GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/bol-outreach.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

---

## Step 3: Deploy to Railway (3 minutes)

### Option A: Railway Dashboard (Recommended)

1. Go to https://railway.app/
2. Click **"Login"** → **"Continue with GitHub"**
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Find and select `bol-outreach` repository
5. Railway will detect Node.js automatically
6. Click **"Deploy Now"**

### Option B: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login (opens browser)
railway login

# Initialize and deploy
railway init
railway up
```

---

## Step 4: Configure Railway (1 minute)

After deployment starts, configure these settings:

### 1. Environment Variables

Go to **"Variables"** tab in Railway and add:

```env
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/bol-outreach.db
```

### 2. Persistent Storage

Go to **"Storage"** tab:
- Click **"New Volume"**
- Mount path: `/data`
- This keeps your database safe across deployments

---

## Step 5: Access Your Application! 🎉

Railway will provide a public URL like:
```
https://bol-outreach-production.up.railway.app
```

Open it in your browser and verify:
- ✅ Dashboard loads
- ✅ Can access all pages
- ✅ No errors in console

---

## Your Production URL

**Once deployed, your app will be accessible at:**
```
https://your-app-name.up.railway.app
```

**No authentication required** - the app is public for now.

---

## Environment Configuration

The app is configured with these defaults:

| Setting | Value |
|---------|-------|
| Port | 3000 |
| Database | SQLite (/data/bol-outreach.db) |
| Environment | Production |
| SSL | Automatic (Railway provides) |

---

## What's Included

✅ Complete seller intelligence platform
✅ Puppeteer for web scraping
✅ SQLite database with persistent storage
✅ Full dashboard UI
✅ Campaign management
✅ Message templates
✅ Approval queue
✅ Analytics dashboard

---

## Post-Deployment Checklist

After deployment, test these features:

- [ ] Dashboard loads correctly
- [ ] Seller discovery works (try keywords: "electronics, gadgets")
- [ ] Create a message template
- [ ] Create a campaign
- [ ] Check analytics page
- [ ] View approval queue

---

## Monitoring & Logs

### View Logs
```bash
# Via CLI
railway logs

# Or in Railway Dashboard
# Go to "Deployments" → "View Logs"
```

### Metrics Dashboard
Railway provides built-in monitoring:
- CPU usage
- Memory usage
- Request counts
- Response times

Access: Railway Dashboard → Your Project → **"Metrics"**

---

## Updates & Maintenance

### Deploy Updates
```bash
# Make changes to code
git add .
git commit -m "Your update message"
git push

# Railway auto-deploys on push!
```

### Database Backup
```bash
# Via CLI
railway shell
cp /data/bol-outreach.db /data/backup-$(date +%Y%m%d).db
```

---

## Troubleshooting

### App Won't Start
1. Check environment variables are set correctly
2. Verify persistent storage is mounted at `/data`
3. Check logs for errors

### Database Issues
1. Ensure storage volume is created
2. Check `DATABASE_PATH` variable points to `/data/bol-outreach.db`

### Puppeteer Errors
Railway has built-in Chromium support. If you see errors:
- Check logs for specific error messages
- Verify build completed successfully

---

## Next Steps

### Optional Enhancements:

1. **Add Authentication** - Protect your app with login
2. **Custom Domain** - Connect your own domain (Railway → Settings → Domains)
3. **Email Notifications** - Configure email settings
4. **AdsPower Integration** - Add environment variables for multi-profile outreach
5. **Automated Backups** - Set up cron jobs for database backups

---

## Cost Information

**Railway Free Tier:**
- $5 free credit per month
- 512MB RAM
- Shared CPU
- Perfect for testing/development

**Railway Paid Plans:**
- **Starter ($5/mo)**: 1GB RAM, better performance
- **Standard ($20/mo)**: 2GB RAM, dedicated CPU
- Recommended for production use

---

## Need Help?

**Documentation:**
- `PRODUCTION-DEPLOYMENT.md` - Detailed deployment guide
- `README.md` - Project documentation
- `DEPLOYMENT-GUIDE.md` - Comprehensive deployment options

**Railway Docs:**
https://docs.railway.app/

---

## Summary: Deploy in 5 Minutes

1. ✅ Create GitHub repo
2. ✅ Push code
3. ✅ Connect to Railway
4. ✅ Configure environment & storage
5. 🎉 **App is live!**

**Status:** ✅ Ready to Deploy

**Current directory:** `/Users/northsea/clawd-dmitry/bol-outreach`

**Next command:** `git push -u origin main` (after creating GitHub repo)

---

*Created: 2026-02-10*
*Platform: Railway*
*Status: Production Ready*
