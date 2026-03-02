# Bol.com Outreach Platform - Deployment Complete Guide

## ✅ GitHub Repository Created

**Repository URL:** https://github.com/misto-guest/bol-outreach

### GitHub Setup (COMPLETED)
- ✅ Repository created under misto-guest account
- ✅ All code pushed to main branch
- ✅ Remote configured: origin → https://github.com/misto-guest/bol-outreach.git
- ✅ Latest commit: `b7aa745 Add quick deployment guide and readiness check script`

---

## 🚂 Railway Deployment (Manual Steps Required)

### Why Manual Deployment?
Railway requires browser-based authentication which cannot be fully automated via CLI. Follow these steps to complete deployment:

### Step 1: Login to Railway
1. Go to https://railway.app/login
2. Sign in with your GitHub account (recommended) or email

### Step 2: Create New Project
1. Click "New Project" button
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub (if first time)
4. Select repository: `misto-guest/bol-outreach`
5. Click "Deploy Now"

### Step 3: Configure Environment Variables
In your Railway project, go to "Variables" tab and add:

```bash
# Required
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/bol-outreach.db
SESSION_SECRET=<generate-a-random-32-char-string>

# Optional (if using AdsPower)
ADPOWER_API_ENDPOINT=http://127.0.0.1:50325
ADPOWER_API_KEY=your_api_key_here

# Optional (for email notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Bol.com Outreach <noreply@yourdomain.com>
```

### Step 4: Add Persistent Storage Volume
1. Go to your service settings
2. Click "Volumes" → "Add Volume"
3. Configure:
   - **Mount Path:** `/data`
   - **Size:** 1GB (minimum, scalable)
4. Save changes

### Step 5: Configure Domain
1. Go to "Settings" → "Domains"
2. Railway provides a default domain: `your-app.up.railway.app`
3. Or add custom domain if preferred
4. Note the production URL

### Step 6: Deploy
1. Railway will auto-deploy when variables are set
2. Watch deployment logs in real-time
3. Wait for "SUCCESS" status
4. Health check configured at `/api/health`

---

## 🔍 Post-Deployment Verification

### 1. Test Health Endpoint
```bash
curl https://your-app.up.railway.app/api/health
```
Expected: `{"status":"ok","database":"connected"}`

### 2. Access Dashboard
Open in browser: `https://your-app.up.railway.app`
- ✅ Dashboard should load
- ✅ UI should be functional
- ✅ Navigation should work

### 3. Test API Endpoints
```bash
# List sellers
curl https://your-app.up.railway.app/api/sellers

# Health check
curl https://your-app.up.railway.app/api/health
```

### 4. Verify Database Persistence
1. Create a test seller in the dashboard
2. Wait 5 minutes
3. Refresh page - seller should persist
4. Check database file in Railway volume

---

## 📊 Production Details

### GitHub Repository
- **URL:** https://github.com/misto-guest/bol-outreach
- **Branch:** main
- **Status:** ✅ Pushed and ready

### Railway Dashboard
- **URL:** https://railway.app/dashboard
- **Project:** (will be created during deployment)
- **Status:** ⏳ Awaiting manual setup

### Production URL
- **Will be:** `https://your-app.up.railway.app` (after deployment)
- **Custom domain:** Optional via Railway settings

---

## 🔄 Future Updates

### How to Update the Application
```bash
# 1. Make changes locally
cd /Users/northsea/clawd-dmitry/bol-outreach

# 2. Commit changes
git add .
git commit -m "Your update message"

# 3. Push to GitHub
git push origin main

# 4. Railway auto-deploys
# (If auto-deploy enabled, otherwise manually trigger in Railway dashboard)
```

### Manual Trigger in Railway
1. Go to Railway project
2. Click on your service
3. Click "Deployments" tab
4. Click "Redeploy" on latest commit

---

## 🛠️ Troubleshooting

### Common Issues

**Deployment Fails:**
- Check build logs in Railway
- Verify `package.json` has correct start script
- Ensure `npm start` command exists

**Database Errors:**
- Verify `/data` volume is mounted
- Check `DATABASE_PATH` env var points to `/data/bol-outreach.db`
- Ensure volume has write permissions

**App Won't Start:**
- Check `PORT` env var is set to `3000`
- Verify `NODE_ENV=production`
- Check deployment logs for errors

**Health Check Fails:**
- App may still be starting (wait 2-3 minutes)
- Check if `/api/health` endpoint exists
- Review app logs for startup errors

---

## 📝 Deployment Checklist

- [x] GitHub repository created
- [x] Code pushed to GitHub
- [ ] Login to Railway
- [ ] Create Railway project
- [ ] Connect GitHub repo
- [ ] Configure environment variables
- [ ] Add persistent volume (/data)
- [ ] Configure domain
- [ ] Deploy application
- [ ] Verify health endpoint
- [ ] Test dashboard
- [ ] Test database persistence
- [ ] Document production URL

---

## 🎯 Next Steps

1. Complete Railway manual setup (Steps 1-6 above)
2. Test all features on production URL
3. Monitor Railway logs for any issues
4. Set up custom domain if needed
5. Configure SSL (automatic with Railway)
6. Set up monitoring/alerts if desired

---

**Generated:** 2025-02-10
**Repository:** https://github.com/misto-guest/bol-outreach
**Status:** GitHub ✅ | Railway ⏳ (Manual setup required)
