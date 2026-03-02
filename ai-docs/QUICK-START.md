# Quick Start: Deploy to Railway (3 Minutes)

## GitHub Repository ✅
**Created:** https://github.com/misto-guest/bol-outreach
**Status:** Code pushed and ready

## Deploy to Railway (Manual - 3 minutes)

### 1. Go to Railway
**URL:** https://railway.app/new

### 2. Click "Deploy from GitHub repo"
- Authorize Railway if needed
- Select: `misto-guest/bol-outreach`
- Click "Deploy Now"

### 3. Add Variables (in Variables tab)
```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/bol-outreach.db
SESSION_SECRET=CHANGE_THIS_TO_RANDOM_STRING
```

### 4. Add Volume (in Settings → Volumes)
- Mount path: `/data`
- Size: 1GB

### 5. Wait for Deploy
- Railway auto-deploys
- Takes ~2-3 minutes
- Watch logs in real-time

### 6. Access Your App
- Production URL shown in Railway dashboard
- Format: `https://your-app.up.railway.app`

## Done! 🚀

Your app is now live on Railway with:
- ✅ Auto SSL certificate
- ✅ Persistent database
- ✅ Auto-restart on failure
- ✅ Health checks
- ✅ GitHub auto-deploy

---

**Need help?** See `DEPLOYMENT-COMPLETE.md` for full documentation.
