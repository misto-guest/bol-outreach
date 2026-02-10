# Bol.com Outreach Platform - Deployment Guide

## Quick Start Deployment

### Option 1: Railway (Recommended for Puppeteer) ⭐⭐⭐

**Why Railway?**
- Best support for Puppeteer/headless Chrome
- Easy GitHub integration
- Built-in PostgreSQL or SQLite
- Automatic HTTPS
- Generous free tier

#### Step-by-Step Deployment:

1. **Prepare Your Repository**
   ```bash
   cd /Users/northsea/clawd-dmitry/bol-outreach
   git init
   git add .
   git commit -m "Ready for production deployment"
   ```

2. **Push to GitHub**
   ```bash
   # Create a new repository on GitHub first, then:
   git remote add origin https://github.com/YOUR_USERNAME/bol-outreach.git
   git push -u origin main
   ```

3. **Deploy on Railway**
   - Go to [railway.app](https://railway.app/)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `bol-outreach` repository
   - Railway will automatically detect Node.js

4. **Configure Environment Variables**
   In your Railway project settings, add these variables:

   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=./data/bol-outreach.db
   ```

   Optional (for integrations):
   ```env
   BOL_COM_API_KEY=your_api_key_here
   ADVERTISE_API_KEY=your_adspower_key
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=your_email
   EMAIL_PASS=your_password
   EMAIL_FROM=noreply@yourdomain.com
   ```

5. **Configure Persistent Storage**
   - Go to your project → "Storage"
   - Add a new volume
   - Mount path: `/app/data`
   - This ensures your SQLite database persists across deployments

6. **Configure Puppeteer for Railway**
   Add this to your `package.json` scripts:
   ```json
   "scripts": {
     "start": "node src/server.js",
     "dev": "nodemon src/server.js"
   }
   ```

7. **Deploy!**
   - Railway will automatically deploy
   - Your app will be available at: `https://your-app-name.railway.app`

8. **Configure Custom Domain (Optional)**
   - Go to "Settings" → "Domains"
   - Add your custom domain
   - Update DNS records as instructed

---

### Option 2: Render (Alternative) ⭐⭐

**Why Render?**
- Good free tier
- Supports Puppeteer
- Built-in PostgreSQL
- Automatic SSL

#### Deployment Steps:

1. **Prepare Render-Specific Files**
   Create `render.yaml` in your project root:

   ```yaml
   services:
     - type: web
       name: bol-outreach
       env: node
       buildCommand: npm install
       startCommand: node src/server.js
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 3000
       disk:
         name: data
         mountPath: /opt/render/project/data
         sizeGB: 1
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com/)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select `bol-outreach`
   - Render will auto-detect Node.js
   - Use the following settings:
     - Environment: Node
     - Build Command: `npm install`
     - Start Command: `node src/server.js`
     - Instance Type: **Free** (or **Starter** for better performance)

3. **Configure Environment Variables**
   Add in Render dashboard:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=/opt/render/project/data/bol-outreach.db
   ```

4. **Deploy!**
   - Click "Create Web Service"
   - Render builds and deploys your app
   - Available at: `https://your-app-name.onrender.com`

---

### Option 3: Self-Hosted VPS (Best Control) ⭐⭐⭐⭐

**Recommended VPS Providers:**
- DigitalOcean (from $6/month)
- Linode (from $5/month)
- AWS Lightsail (from $3.50/month)
- Vultr (from $2.50/month)

#### Server Setup (Ubuntu 20.04+):

1. **Connect to Your Server**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Dependencies**
   ```bash
   # Update system
   apt update && apt upgrade -y

   # Install Node.js (v18+)
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs

   # Install Puppeteer dependencies
   apt install -y \
     gconf-service \
     libasound2 \
     libatk1.0-0 \
     libatk-bridge2.0-0 \
     libc6 \
     libcairo2 \
     libcups2 \
     libdbus-1-3 \
     libexpat1 \
     libfontconfig1 \
     libgcc1 \
     libgconf-2-4 \
     libgdk-pixbuf2.0-0 \
     libglib2.0-0 \
     libgtk-3-0 \
     libnspr4 \
     libpango-1.0-0 \
     libpangocairo-1.0-0 \
     libstdc++6 \
     libx11-6 \
     libx11-xcb1 \
     libxcb1 \
     libxcomposite1 \
     libxcursor1 \
     libxdamage1 \
     libxext6 \
     libxfixes3 \
     libxi6 \
     libxrandr2 \
     libxrender1 \
     libxss1 \
     libxtst6 \
     ca-certificates \
     fonts-liberation \
     libappindicator1 \
     libnss3 \
     lsb-release \
     xdg-utils \
     wget \
     libgbm-dev

   # Install PM2 (process manager)
   npm install -g pm2
   ```

3. **Setup Application**
   ```bash
   # Create app directory
   mkdir -p /var/www/bol-outreach
   cd /var/www/bol-outreach

   # Clone your repository
   git clone https://github.com/YOUR_USERNAME/bol-outreach.git .

   # Or upload files directly
   # scp -r /Users/northsea/clawd-dmitry/bol-outreach/* root@your-server-ip:/var/www/bol-outreach/

   # Install dependencies
   npm install --production

   # Create data directory
   mkdir -p data
   ```

4. **Configure Environment**
   ```bash
   # Create .env file
   nano .env
   ```

   Add:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=/var/www/bol-outreach/data/bol-outreach.db
   ```

5. **Start with PM2**
   ```bash
   # Start application
   pm2 start src/server.js --name bol-outreach

   # Configure PM2 to start on boot
   pm2 startup
   pm2 save
   ```

6. **Setup Nginx Reverse Proxy**
   ```bash
   # Install Nginx
   apt install -y nginx

   # Create Nginx config
   nano /etc/nginx/sites-available/bol-outreach
   ```

   Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   ln -s /etc/nginx/sites-available/bol-outreach /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

7. **Setup SSL with Let's Encrypt**
   ```bash
   # Install Certbot
   apt install -y certbot python3-certbot-nginx

   # Get SSL certificate
   certbot --nginx -d your-domain.com

   # Auto-renewal is configured automatically
   ```

8. **Setup Firewall**
   ```bash
   ufw allow OpenSSH
   ufw allow 'Nginx Full'
   ufw enable
   ```

---

## Environment Variables Reference

### Required Variables:
```env
NODE_ENV=production              # Environment (production/development)
PORT=3000                        # Application port
DATABASE_PATH=./data/bol-outreach.db  # SQLite database path
```

### Optional Variables:
```env
# Bol.com API
BOL_COM_API_KEY=your_key_here

# AdsPower Integration
ADVERTISE_API_KEY=your_key_here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Bol.com Outreach <noreply@yourdomain.com>

# Security
SESSION_SECRET=your-random-secret-key-here

# Logging
LOG_LEVEL=info
```

---

## Database Backup Strategy

### Automated Backups (Cron Job):

```bash
# Open crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cp /var/www/bol-outreach/data/bol-outreach.db /var/www/backups/bol-outreach-$(date +\%Y\%m\%d).db

# Keep last 30 days
0 3 * * * find /var/www/backups -name "bol-outreach-*.db" -mtime +30 -delete
```

### Manual Backup:
```bash
# Backup database
cp data/bol-outreach.db data/bol-outreach-backup-$(date +%Y%m%d).db

# Restore database
cp data/bol-outreach-backup-20250210.db data/bol-outreach.db
```

---

## Monitoring & Maintenance

### PM2 Monitoring (Self-Hosted):
```bash
# View logs
pm2 logs bol-outreach

# Monitor performance
pm2 monit

# Restart app
pm2 restart bol-outreach

# View status
pm2 status
```

### Health Check Endpoint:
The app has a health check at: `GET /api/health`

Set up monitoring with:
- [UptimeRobot](https://uptimerobot.com/) (Free)
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

---

## Performance Optimization

### Production Optimizations:

1. **Enable Compression** (Already in Express)
   ```javascript
   app.use(compression());
   ```

2. **Static File Caching**
   ```javascript
   app.use(express.static('public', {
     maxAge: '1d', // Cache for 1 day
     etag: true
   }));
   ```

3. **Rate Limiting** (Recommended for production)
   ```bash
   npm install express-rate-limit
   ```

4. **Database Optimization**
   - Run `VACUUM` periodically
   - Add indexes for frequently queried fields

---

## Security Checklist

- ✅ Use HTTPS (SSL certificate)
- ✅ Set strong NODE_ENV=production
- ✅ Use environment variables for secrets
- ✅ Regular security updates (`apt update && apt upgrade`)
- ✅ Firewall configured (only necessary ports open)
- ✅ Regular database backups
- ✅ Monitor logs for suspicious activity
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)

---

## Troubleshooting

### Common Issues:

**1. Puppeteer Fails to Launch**
```bash
# Solution: Install missing dependencies
apt install -y libnss3 libatk-bridge2.0-0 libxkbcommon0 libgbm1
```

**2. Database Locked Error**
```bash
# Solution: Check for other processes
lsof data/bol-outreach.db

# Or: Restart the application
pm2 restart bol-outreach
```

**3. Port Already in Use**
```bash
# Solution: Find and kill the process
lsof -i :3000
kill -9 [PID]

# Or change PORT in .env
```

**4. High Memory Usage**
```bash
# Solution: Increase swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## Post-Deployment Checklist

- [ ] Application is accessible via domain
- [ ] HTTPS is working correctly
- [ ] Database is persisting data
- [ ] Puppeteer/web scraping works
- [ ] Email sending works (if configured)
- [ ] All pages load correctly
- [ ] Mobile responsive design works
- [ ] SSL certificate auto-renews
- [ ] Backups are running
- [ ] Monitoring is configured
- [ ] Error logging is working

---

## Scaling Considerations

### When to Scale:
- **CPU > 80%**: Upgrade instance or add worker
- **Memory > 80%**: Add more RAM
- **Slow response times**: Add load balancer
- **Database bottlenecks**: Migrate to PostgreSQL

### Scaling Options:
1. **Vertical Scaling**: Upgrade server resources
2. **Horizontal Scaling**: Load balancer + multiple instances
3. **Database Scaling**: Migrate to PostgreSQL/MySQL
4. **CDN**: CloudFlare for static assets

---

## Support & Documentation

### Application Links:
- Repository: `/Users/northsea/clawd-dmitry/bol-outreach/`
- QA Report: `/Users/northsea/clawd-dmitry/bol-outreach/QA-TEST-REPORT.md`
- User Guide: `/Users/northsea/clawd-dmitry/bol-outreach/USER-GUIDE.md`
- API Docs: See `/docs/api/` (if available)

### Getting Help:
1. Check logs: `pm2 logs bol-outreach` (self-hosted) or Railway logs
2. Review this guide
3. Check troubleshooting section
4. Review QA test report for known issues

---

## Summary

**Deployment Status**: ✅ Ready for Production

**Recommended Platform**: Railway (easiest) or Self-Hosted VPS (most control)

**Estimated Time to Deploy**:
- Railway: 15 minutes
- Render: 20 minutes
- Self-Hosted VPS: 45-60 minutes

**Cost Estimate**:
- Railway: Free tier, then ~$5-20/month
- Render: Free tier, then ~$7/month
- VPS: $5-10/month (DigitalOcean/Linode)

**Next Steps**:
1. Choose your deployment platform
2. Follow the step-by-step guide above
3. Configure environment variables
4. Deploy and test
5. Set up monitoring and backups

Good luck! 🚀
