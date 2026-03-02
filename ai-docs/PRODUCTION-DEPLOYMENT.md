# Bol.com Outreach Platform - Production Deployment Guide

## Quick Deploy via Railway (Recommended)

### Option 1: Railway Dashboard (Easiest)

**Step 1: Push to GitHub**
```bash
cd /Users/northsea/clawd-dmitry/bol-outreach

# Create a new GitHub repository at github.com/new
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/bol-outreach.git
git branch -M main
git push -u origin main
```

**Step 2: Deploy on Railway**

1. Go to [railway.app](https://railway.app/)
2. Sign up/login (recommended: use "Continue with GitHub")
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `bol-outreach` repository
5. Railway will auto-detect Node.js and start deploying

**Step 3: Configure Environment Variables**

In your Railway project, go to **"Variables"** tab and add:

```env
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/bol-outreach.db
```

**Optional (for integrations):**
```env
ADPOWER_API_ENDPOINT=http://127.0.0.1:50325
ADPOWER_API_KEY=your_api_key_here
```

**Step 4: Configure Persistent Storage**

1. Go to **"Storage"** tab in Railway
2. Click **"New Volume"**
3. Mount path: `/data`
4. This ensures your SQLite database persists across deployments

**Step 5: Access Your Application**

Railway will provide a public URL like:
```
https://bol-outreach-production.up.railway.app
```

Your app is now live! 🎉

---

### Option 2: Railway CLI (Requires Browser Auth)

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login (will open browser)
railway login

# Initialize project
cd /Users/northsea/clawd-dmitry/bol-outreach
railway init

# Deploy
railway up

# Open in browser
railway open
```

---

## Environment Variables Reference

### Required Variables:
| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Application port |
| `DATABASE_PATH` | `/data/bol-outreach.db` | SQLite database path (use `/data` mount for Railway) |

### Optional Variables:
| Variable | Value | Description |
|----------|-------|-------------|
| `ADPOWER_API_ENDPOINT` | `http://127.0.0.1:50325` | AdsPower API URL |
| `ADPOWER_API_KEY` | `your_key_here` | AdsPower API key |
| `SESSION_SECRET` | `random_string` | Session encryption key |

---

## Post-Deployment Checklist

Once deployed, verify these features:

- [ ] **Dashboard loads** - Visit the root URL
- [ ] **Seller Discovery works** - Try discovering sellers
- [ ] **Campaign Management** - Create a test campaign
- [ ] **Message Templates** - Create a template
- [ ] **Approval Queue** - Test the approval workflow
- [ ] **Analytics display** - Check analytics page

---

## Production URL & Access

Once deployed, you'll have:

- **Production URL**: Provided by Railway (e.g., `https://your-app.up.railway.app`)
- **No authentication needed**: The app is public (add auth if needed)
- **Database**: Located at `/data/bol-outreach.db` (persistent volume)

---

## Database Management

### Backup Your Database

```bash
# Via Railway CLI
railway volume download

# Or access via shell and backup
railway shell
cp /data/bol-outreach.db /data/backup-$(date +%Y%m%d).db
```

### Restore Database

```bash
# Via Railway CLI
railway volume upload backup-file.db /data/bol-outreach.db
```

### Access Database Directly

```bash
railway shell
sqlite3 /data/bol-outreach.db
```

---

## Monitoring & Logs

### View Logs
```bash
railway logs
# Or in Railway dashboard: "Deployments" → "View Logs"
```

### Metrics Dashboard
Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request counts

Access: Railway Dashboard → Your Project → "Metrics"

---

## Updates & Rollbacks

### Deploy Updates
```bash
# Make changes to code
git add .
git commit -m "Update description"
git push

# Railway auto-deploys on push, or manually:
railway up
```

### Rollback to Previous Version
```bash
railway rollback
# Or in dashboard: "Deployments" → Click previous deployment → "Redeploy"
```

---

## Troubleshooting

### App Won't Start
1. Check logs: `railway logs`
2. Verify environment variables are set
3. Check that Puppeteer/Chromium is available
4. Ensure port 3000 is not blocked

### Database Issues
1. Check storage volume is mounted: `/data`
2. Verify `DATABASE_PATH` environment variable
3. Check database file permissions

### Puppeteer Errors
Railway supports Puppeteer out of the box. If you see errors:
1. Add chromium dependencies in `package.json`:
```json
"scripts": {
  "postinstall": "npx puppeteer browsers install chrome"
}
```
2. Or use Railway's built-in Chromium (recommended)

---

## Custom Domain (Optional)

1. Go to **"Settings"** → **"Domains"** in Railway
2. Click **"New Domain"**
3. Enter your domain (e.g., `bol.yourdomain.com`)
4. Update DNS records as instructed:
   - CNAME: `bol.yourdomain.com` → `cname.railway.app`
5. Wait for SSL certificate (automatic)

---

## Security Recommendations

### For Production Use:

1. **Add Authentication** - Implement user login
2. **Use Environment Variables** - Never hardcode secrets
3. **Enable HTTPS** - Automatic on Railway
4. **Rate Limiting** - Prevent abuse
5. **Database Backups** - Regular automated backups
6. **Monitor Logs** - Watch for suspicious activity
7. **Update Dependencies** - Keep packages updated

---

## Cost Estimate

**Railway Free Tier:**
- $5 free credit monthly
- 512MB RAM
- Shared CPU
- Sufficient for testing

**Railway Paid Plans:**
- **Starter**: $5/month (1GB RAM, better performance)
- **Standard**: $20/month (2GB RAM, dedicated CPU)

---

## Alternative: Deploy to Render

If you prefer Render over Railway:

1. Go to [render.com](https://render.com/)
2. Click **"New"** → **"Web Service"**
3. Connect GitHub repository
4. Configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
5. Add environment variables
6. Add persistent disk (1GB recommended)
7. Deploy!

---

## Support

If you encounter issues:

1. **Check logs first**: `railway logs`
2. **Review this guide**: Ensure all steps followed
3. **Railway docs**: https://docs.railway.app/
4. **Project docs**: See `README.md` and `DEPLOYMENT-GUIDE.md`

---

## Summary

**Deploy to Railway in 5 minutes:**
1. Push code to GitHub
2. Connect repo to Railway
3. Configure environment variables
4. Add persistent storage
5. ✅ App is live!

**Production URL:** Provided by Railway after deployment

**Status:** ✅ Ready for Production Deployment

---

*Last Updated: 2026-02-10*
*Deployment Platform: Railway (recommended for Puppeteer apps)*
