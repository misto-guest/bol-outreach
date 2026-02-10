/**
 * Bol.com Seller Intelligence Platform
 * Main Express Server
 * Updated with AdsPower integration
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Import modules
const Database = require('./database');
let AdsPowerClient = null;
try {
  AdsPowerClient = require('./adspower-client.js');
  console.log('✅ AdsPower client loaded successfully');
} catch (e) {
  console.log('⚠️  AdsPower client not available:', e.message);
}
const SellerResearch = require('./seller-research');
const OutreachEngine = require('./outreach-engine');

const app = express();
let PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize modules
const db = new Database();
const adspower = AdsPowerClient ? new AdsPowerClient() : null;
let sellerResearch = null;
let outreachEngine = null;
let adspowerProfiles = [];

// Initialize and start server
async function startServer() {
  try {
    await db.init();
    console.log('✅ Database initialized');

    // Initialize research and outreach engines with AdsPower
    sellerResearch = new SellerResearch(db, adspower);
    outreachEngine = new OutreachEngine(db, adspower);
    console.log('✅ Research and outreach engines initialized');

    // Check AdsPower connection and load profiles
    try {
      const adspowerStatus = await adspower.testConnection();
      if (adspowerStatus.success) {
        console.log('✅ AdsPower connected');
        
        // Load available profiles
        try {
          const profilesResult = await adspower.getProfiles();
          if (profilesResult && profilesResult.list) {
            adspowerProfiles = profilesResult.list;
            console.log(`📋 Loaded ${adspowerProfiles.length} AdsPower profiles`);
          }
        } catch (profileError) {
          console.log('⚠️  Could not load AdsPower profiles:', profileError.message);
        }
      } else {
        console.log('⚠️  AdsPower not connected - will use Puppeteer directly');
      }
    } catch (adspowerError) {
      console.log('⚠️  AdsPower connection failed:', adspowerError.message);
      console.log('   Seller research will use Puppeteer without AdsPower');
    }

    // Try to start server on the configured port, with fallback
    const server = app.listen(PORT)
      .on('listening', () => {
        const address = server.address();
        const actualPort = address.port;
        console.log(`\n🚀 Bol.com Seller Intelligence Platform running on http://localhost:${actualPort}`);
        console.log(`📊 Dashboard: http://localhost:${actualPort}\n`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use!`);
          console.error(`💡 Try using a different port: PORT=${parseInt(PORT) + 1} npm start`);
          console.error(`   Or stop the other application using port ${PORT}`);
        } else {
          console.error('❌ Failed to start server:', err);
        }
        process.exit(1);
      });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ==================== API Routes ====================

// Health check endpoint (for Railway and monitoring)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Sellers ====================

// Get all sellers
app.get('/api/sellers', async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    let sellers;
    
    if (status) {
      sellers = await db.getSellersByStatus(status, parseInt(limit));
    } else {
      sellers = await db.all('SELECT * FROM sellers ORDER BY discovered_at DESC LIMIT ?', [parseInt(limit)]);
    }
    
    res.json({ success: true, data: sellers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single seller - Enhanced with better error handling
app.get('/api/sellers/:id', async (req, res) => {
  try {
    const sellerId = req.params.id;
    console.log(`Fetching seller details for ID: ${sellerId}`);
    
    // Try to find by numeric ID or seller_id string
    let seller = null;
    
    // First try numeric ID
    if (!isNaN(sellerId)) {
      seller = await db.get('SELECT * FROM sellers WHERE id = ?', [parseInt(sellerId)]);
    }
    
    // If not found, try seller_id string
    if (!seller) {
      seller = await db.get('SELECT * FROM sellers WHERE seller_id = ?', [sellerId]);
    }
    
    if (!seller) {
      console.log(`Seller not found: ${sellerId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Seller not found',
        message: `No seller found with ID: ${sellerId}`
      });
    }
    
    // Parse metadata if exists
    if (seller.metadata) {
      try {
        seller.metadata = JSON.parse(seller.metadata);
      } catch (e) {
        seller.metadata = {};
      }
    }
    
    // Get outreach history for this seller
    try {
      const history = await db.all(
        'SELECT * FROM outreach_log WHERE seller_id = ? ORDER BY contacted_at DESC',
        [seller.id || sellerId]
      );
      seller.history = history || [];
    } catch (historyError) {
      console.log('Could not load history:', historyError.message);
      seller.history = [];
    }
    
    console.log(`✓ Seller details loaded: ${seller.shop_name}`);
    res.json({ success: true, data: seller });
  } catch (error) {
    console.error('Error fetching seller:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add or update seller
app.post('/api/sellers', async (req, res) => {
  try {
    const sellerData = req.body;
    const result = await db.insertSeller(sellerData);
    
    await db.logAudit('seller_created', 'seller', result.id, 'system', { sellerData });
    
    res.json({ success: true, data: { id: result.id, ...sellerData } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update seller status
app.patch('/api/sellers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.run('UPDATE sellers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    
    await db.logAudit('seller_status_updated', 'seller', req.params.id, 'system', { newStatus: status });
    
    res.json({ success: true, data: { id: req.params.id, status } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Campaigns ====================

// Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await db.all(`
      SELECT c.*, mt.name as template_name, 
             (SELECT COUNT(*) FROM outreach_log WHERE campaign_id = c.id) as messages_count
      FROM campaigns c
      LEFT JOIN message_templates mt ON c.message_template_id = mt.id
      ORDER BY c.created_at DESC
    `);
    
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single campaign
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    
    // Get sellers targeted by this campaign
    const outreach = await db.all(
      'SELECT ol.*, s.shop_name FROM outreach_log ol JOIN sellers s ON ol.seller_id = s.id WHERE ol.campaign_id = ?',
      [req.params.id]
    );
    
    res.json({ success: true, data: { ...campaign, outreach } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const result = await db.createCampaign(req.body);
    
    await db.logAudit('campaign_created', 'campaign', result.id, 'system', { campaign: req.body });
    
    res.json({ success: true, data: { id: result.id, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update campaign
app.patch('/api/campaigns/:id', async (req, res) => {
  try {
    const updates = req.body;
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(req.params.id);
    
    await db.run(`UPDATE campaigns SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    
    await db.logAudit('campaign_updated', 'campaign', req.params.id, 'system', { updates });
    
    res.json({ success: true, data: { id: req.params.id, ...updates } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start campaign
app.post('/api/campaigns/:id/start', async (req, res) => {
  try {
    await db.run('UPDATE campaigns SET status = ?, start_date = CURRENT_TIMESTAMP WHERE id = ?', ['active', req.params.id]);
    
    await db.logAudit('campaign_started', 'campaign', req.params.id, 'system', {});
    
    res.json({ success: true, message: 'Campaign started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop campaign
app.post('/api/campaigns/:id/stop', async (req, res) => {
  try {
    await db.run('UPDATE campaigns SET status = ?, end_date = CURRENT_TIMESTAMP WHERE id = ?', ['stopped', req.params.id]);
    
    await db.logAudit('campaign_stopped', 'campaign', req.params.id, 'system', {});
    
    res.json({ success: true, message: 'Campaign stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Message Templates ====================

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await db.all('SELECT * FROM message_templates WHERE is_active = 1 ORDER BY created_at DESC');
    
    // Parse variables JSON
    templates.forEach(t => {
      if (t.variables) {
        try {
          t.variables = JSON.parse(t.variables);
        } catch (e) {
          t.variables = [];
        }
      }
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await db.get('SELECT * FROM message_templates WHERE id = ?', [req.params.id]);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    if (template.variables) {
      try {
        template.variables = JSON.parse(template.variables);
      } catch (e) {
        template.variables = [];
      }
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create template
app.post('/api/templates', async (req, res) => {
  try {
    const result = await db.createTemplate(req.body);
    
    await db.logAudit('template_created', 'template', result.id, 'system', { template: req.body.name });
    
    res.json({ success: true, data: { id: result.id, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update template
app.patch('/api/templates/:id', async (req, res) => {
  try {
    const updates = req.body;
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(req.params.id);
    
    await db.run(`UPDATE message_templates SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    
    await db.logAudit('template_updated', 'template', req.params.id, 'system', { updates });
    
    res.json({ success: true, data: { id: req.params.id, ...updates } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete template (soft delete)
app.delete('/api/templates/:id', async (req, res) => {
  try {
    await db.run('UPDATE message_templates SET is_active = 0 WHERE id = ?', [req.params.id]);
    
    await db.logAudit('template_deleted', 'template', req.params.id, 'system', {});
    
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Approval Queue ====================

// Get pending approvals
app.get('/api/approvals', async (req, res) => {
  try {
    const approvals = await db.getPendingApprovals();
    res.json({ success: true, data: approvals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve message
app.post('/api/approvals/:id/approve', async (req, res) => {
  try {
    const { approvedBy = 'system' } = req.body;
    await db.updateApproval(req.params.id, 'approved', approvedBy);
    
    // TODO: Send the actual message via AdsPower profile
    
    await db.logAudit('message_approved', 'outreach_log', req.params.id, approvedBy, {});
    
    res.json({ success: true, message: 'Message approved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject message
app.post('/api/approvals/:id/reject', async (req, res) => {
  try {
    const { rejectedBy = 'system', reason } = req.body;
    await db.updateApproval(req.params.id, 'rejected', rejectedBy);
    
    await db.logAudit('message_rejected', 'outreach_log', req.params.id, rejectedBy, { reason });
    
    res.json({ success: true, message: 'Message rejected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AdsPower ====================

// Get AdsPower profiles - Enhanced
app.get('/api/adspower/profiles', async (req, res) => {
  try {
    if (!adspower) {
      return res.status(503).json({ success: false, error: 'AdsPower not configured' });
    }
    
    // Return cached profiles if available
    if (adspowerProfiles.length > 0) {
      return res.json({ 
        success: true, 
        data: adspowerProfiles,
        cached: true,
        count: adspowerProfiles.length
      });
    }

    // Try to fetch profiles
    try {
      const profiles = await adspower.getProfiles();
      if (profiles && profiles.list) {
        adspowerProfiles = profiles.list;
      }
      res.json({ 
        success: true, 
        data: profiles.list || [],
        count: (profiles.list || []).length
      });
    } catch (fetchError) {
      console.log('Could not fetch AdsPower profiles:', fetchError.message);
      res.json({ 
        success: true, 
        data: [], 
        count: 0,
        message: 'AdsPower not connected. Profiles will be loaded when AdsPower is available.'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get AdsPower profile status
app.get('/api/adspower/profiles/:profileId/status', async (req, res) => {
  try {
    const usage = await db.checkAdsPowerUsage(req.params.profileId);
    res.json({ success: true, data: usage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start AdsPower profile
app.post('/api/adspower/profiles/:profileId/start', async (req, res) => {
  try {
    if (!adspower) {
      return res.status(503).json({ success: false, error: 'AdsPower not configured' });
    }
    const result = await adspower.startProfile(req.params.profileId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop AdsPower profile
app.post('/api/adspower/profiles/:profileId/stop', async (req, res) => {
  try {
    if (!adspower) {
      return res.status(503).json({ success: false, error: 'AdsPower not configured' });
    }
    const result = await adspower.stopProfile(req.params.profileId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Audit Log ====================

// Get audit log
app.get('/api/audit', async (req, res) => {
  try {
    const { limit = 100, entityType, entityId } = req.query;
    
    let sql = 'SELECT * FROM audit_log';
    const params = [];
    const conditions = [];
    
    if (entityType) {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }
    
    if (entityId) {
      conditions.push('entity_id = ?');
      params.push(entityId);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const logs = await db.all(sql, params);
    
    // Parse details JSON
    logs.forEach(log => {
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          // Keep as string
        }
      }
    });
    
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Seller Research ====================

// Start seller research - Enhanced with AdsPower support
app.post('/api/research/start', async (req, res) => {
  try {
    const { keywords, adspowerProfileId } = req.body;

    if (!sellerResearch) {
      return res.status(500).json({ success: false, error: 'Research engine not initialized' });
    }

    if (sellerResearch.isActive()) {
      return res.status(400).json({ success: false, error: 'Research already in progress' });
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid keywords provided' });
    }

    console.log(`Starting seller research for ${keywords.length} keywords...`);

    // Add to research queue
    const promises = keywords.map(keyword => {
      return db.run(
        'INSERT INTO research_queue (keyword, status) VALUES (?, ?)', 
        [keyword, 'pending']
      ).catch(err => {
        console.log(`Queue insert error for "${keyword}":`, err.message);
        return { id: null };
      });
    });

    await Promise.all(promises);

    // Start research in background with AdsPower if available
    setImmediate(async () => {
      try {
        console.log(`\n===== Starting Seller Discovery =====`);
        console.log(`Keywords: ${keywords.join(', ')}`);
        
        const options = {
          maxResults: 25,
          extractSellers: true,
          saveToDb: true,
          deepSearch: false,
          onProgress: (progress) => {
            console.log(`Progress: ${progress.current}/${progress.total} - Found: ${progress.found} - Current: ${progress.keyword || 'N/A'}`);
          }
        };

        // Use AdsPower profile if provided and available
        let useProfile = null;
        if (adspowerProfileId && adspowerProfiles.length > 0) {
          const profile = adspowerProfiles.find(p => p.user_id === adspowerProfileId);
          if (profile) {
            useProfile = adspowerProfileId;
            console.log(`Using AdsPower profile: ${adspowerProfileId}`);
          }
        }

        const results = await sellerResearch.discoverByKeywords(keywords, options, useProfile);

        console.log(`\n===== Research Summary =====`);
        console.log(`Total sellers found: ${results.totalFound}`);
        console.log(`Errors encountered: ${results.errors.length}`);
        
        // Update queue status
        for (const keyword of keywords) {
          await db.run(
            'UPDATE research_queue SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE keyword = ?',
            ['completed', keyword]
          ).catch(() => {});
        }

      } catch (error) {
        console.error('Research error:', error);
        // Mark queue items as failed
        for (const keyword of keywords) {
          await db.run(
            'UPDATE research_queue SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE keyword = ?',
            ['failed', error.message, keyword]
          ).catch(() => {});
        }
      }
    });

    await db.logAudit('research_started', 'research_queue', null, 'system', { keywords, adspowerProfileId });

    res.json({ 
      success: true, 
      message: `Research started for ${keywords.length} keywords`,
      keywords: keywords,
      usingAdsPower: !!useProfile
    });
  } catch (error) {
    console.error('Failed to start research:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get research queue status
app.get('/api/research/queue', async (req, res) => {
  try {
    const queue = await db.all('SELECT * FROM research_queue ORDER BY created_at DESC');
    res.json({ success: true, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get research status
app.get('/api/research/status', async (req, res) => {
  try {
    const isActive = sellerResearch ? sellerResearch.isActive() : false;
    res.json({ success: true, data: { isActive } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Outreach Execution ====================

// Execute approved outreach
app.post('/api/outreach/execute', async (req, res) => {
  try {
    if (!outreachEngine) {
      return res.status(500).json({ success: false, error: 'Outreach engine not initialized' });
    }

    if (outreachEngine.isActive()) {
      return res.status(400).json({ success: false, error: 'Outreach already in progress' });
    }

    // Start outreach in background
    setImmediate(async () => {
      try {
        const results = await outreachEngine.executeApprovedOutreach();
        console.log(`Outreach completed: ${results.sent} sent, ${results.failed} failed`);
      } catch (error) {
        console.error('Outreach error:', error);
      }
    });

    await db.logAudit('outreach_started', 'outreach_log', null, 'system', {});

    res.json({ success: true, message: 'Outreach started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get outreach status
app.get('/api/outreach/status', async (req, res) => {
  try {
    const isActive = outreachEngine ? outreachEngine.isActive() : false;
    res.json({ success: true, data: { isActive } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Serve Frontend ====================

// Serve index.html for root
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bol.com Seller Intelligence Platform</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #00a0e3; }
          .stat { display: inline-block; margin: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
          .stat-value { font-size: 32px; font-weight: bold; }
          .stat-label { color: #666; }
          .api-link { display: block; margin: 10px 0; color: #00a0e3; }
        </style>
      </head>
      <body>
        <h1>🎯 Bol.com Seller Intelligence Platform</h1>
        <p>A compliant B2B lead generation tool for Bol.com marketplace sellers.</p>
        
        <div id="stats">Loading stats...</div>
        
        <h2>API Endpoints</h2>
        <a class="api-link" href="/api/stats">GET /api/stats</a>
        <a class="api-link" href="/api/sellers">GET /api/sellers</a>
        <a class="api-link" href="/api/campaigns">GET /api/campaigns</a>
        <a class="api-link" href="/api/templates">GET /api/templates</a>
        <a class="api-link" href="/api/approvals">GET /api/approvals</a>
        <a class="api-link" href="/api/adspower/profiles">GET /api/adspower/profiles</a>
        <a class="api-link" href="/api/audit">GET /api/audit</a>
        
        <script>
          fetch('/api/stats')
            .then(r => r.json())
            .then(response => {
              const stats = response.data;
              document.getElementById('stats').innerHTML = \`
                <div class="stat"><div class="stat-value">\${stats.totalSellers}</div><div class="stat-label">Total Sellers</div></div>
                <div class="stat"><div class="stat-value">\${stats.activeCampaigns}</div><div class="stat-label">Active Campaigns</div></div>
                <div class="stat"><div class="stat-value">\${stats.pendingApprovals}</div><div class="stat-label">Pending Approvals</div></div>
                <div class="stat"><div class="stat-value">\${stats.messagesSent}</div><div class="stat-label">Messages Sent</div></div>
              \`;
            });
        </script>
      </body>
      </html>
    `);
  }
});

// ==================== Error Handling ====================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// ==================== Start Server ====================

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});
