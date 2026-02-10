/**
 * Database Setup and Schema
 * SQLite database for Bol.com Seller Intelligence Platform
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
  constructor(dbPath = path.join(__dirname, '../data/bol-outreach.db')) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  async init() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database:', this.dbPath);
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  /**
   * Create all database tables
   */
  async createTables() {
    const tables = [
      // Sellers table
      `CREATE TABLE IF NOT EXISTS sellers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_name TEXT,
        shop_url TEXT,
        discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        keyword TEXT,
        status TEXT DEFAULT 'new',
        seller_id TEXT UNIQUE,
        rating TEXT,
        total_products INTEGER,
        contact_email TEXT,
        last_checked_at DATETIME,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Campaigns table
      `CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        message_template_id INTEGER,
        keywords TEXT,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        start_date DATETIME,
        end_date DATETIME,
        daily_limit INTEGER DEFAULT 10,
        total_sent INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (message_template_id) REFERENCES message_templates(id)
      )`,

      // Message templates table
      `CREATE TABLE IF NOT EXISTS message_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        template_type TEXT DEFAULT 'outreach',
        variables TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )`,

      // Outreach log table
      `CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER,
        campaign_id INTEGER,
        contacted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        adspower_profile_id TEXT,
        status TEXT DEFAULT 'pending',
        message_sent TEXT,
        response_received TEXT,
        response_at DATETIME,
        approval_status TEXT DEFAULT 'pending',
        approved_by TEXT,
        approved_at DATETIME,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES sellers(id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      )`,

      // AdsPower usage tracking table
      `CREATE TABLE IF NOT EXISTS adspower_usage (
        profile_id TEXT PRIMARY KEY,
        last_used DATE,
        messages_sent_today INTEGER DEFAULT 0,
        total_messages_sent INTEGER DEFAULT 0,
        cooldown_until DATE,
        last_reset DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Audit log table
      `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        user_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Seller research queue table
      `CREATE TABLE IF NOT EXISTS research_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        products_found INTEGER DEFAULT 0,
        sellers_found INTEGER DEFAULT 0,
        started_at DATETIME,
        completed_at DATETIME,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Create indexes for better query performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status)',
      'CREATE INDEX IF NOT EXISTS idx_sellers_keyword ON sellers(keyword)',
      'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_log_seller ON outreach_log(seller_id)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_log_campaign ON outreach_log(campaign_id)',
      'CREATE INDEX IF NOT EXISTS idx_outreach_log_approval ON outreach_log(approval_status)',
      'CREATE INDEX IF NOT EXISTS idx_adspower_usage_last_used ON adspower_usage(last_used)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)'
    ];

    for (const sql of indexes) {
      await this.run(sql);
    }

    console.log('Database tables and indexes created successfully');
  }

  /**
   * Run a SQL query
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Get a single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Insert a new seller
   */
  async insertSeller(sellerData) {
    const sql = `
      INSERT OR REPLACE INTO sellers 
      (shop_name, shop_url, keyword, seller_id, rating, total_products, contact_email, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      sellerData.shop_name,
      sellerData.shop_url,
      sellerData.keyword,
      sellerData.seller_id,
      sellerData.rating || null,
      sellerData.total_products || null,
      sellerData.contact_email || null,
      sellerData.status || 'new',
      sellerData.metadata ? JSON.stringify(sellerData.metadata) : null
    ];
    return await this.run(sql, params);
  }

  /**
   * Get sellers by status
   */
  async getSellersByStatus(status, limit = 100) {
    const sql = `SELECT * FROM sellers WHERE status = ? ORDER BY discovered_at DESC LIMIT ?`;
    return await this.all(sql, [status, limit]);
  }

  /**
   * Get sellers not contacted in cooldown period
   */
  async getSellersForOutreach(limit = 50) {
    const sql = `
      SELECT DISTINCT s.* FROM sellers s
      LEFT JOIN outreach_log ol ON s.id = ol.seller_id
      WHERE s.status = 'researched'
      AND (ol.id IS NULL OR ol.contacted_at < datetime('now', '-120 days'))
      ORDER BY s.discovered_at ASC
      LIMIT ?
    `;
    return await this.all(sql, [limit]);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData) {
    const sql = `
      INSERT INTO campaigns (name, message_template_id, keywords, status, start_date, end_date, daily_limit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      campaignData.name,
      campaignData.message_template_id || null,
      campaignData.keywords,
      campaignData.status || 'draft',
      campaignData.start_date || null,
      campaignData.end_date || null,
      campaignData.daily_limit || 10,
      campaignData.notes || null
    ];
    return await this.run(sql, params);
  }

  /**
   * Create a message template
   */
  async createTemplate(templateData) {
    const sql = `
      INSERT INTO message_templates (name, subject, body, template_type, variables)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      templateData.name,
      templateData.subject || null,
      templateData.body,
      templateData.template_type || 'outreach',
      templateData.variables ? JSON.stringify(templateData.variables) : null
    ];
    return await this.run(sql, params);
  }

  /**
   * Add to approval queue
   */
  async addToApprovalQueue(outreachData) {
    const sql = `
      INSERT INTO outreach_log (seller_id, campaign_id, message_sent, adspower_profile_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `;
    return await this.run(sql, [
      outreachData.seller_id,
      outreachData.campaign_id,
      outreachData.message,
      outreachData.adspower_profile_id
    ]);
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals() {
    const sql = `
      SELECT ol.*, s.shop_name, s.shop_url, c.name as campaign_name
      FROM outreach_log ol
      JOIN sellers s ON ol.seller_id = s.id
      JOIN campaigns c ON ol.campaign_id = c.id
      WHERE ol.approval_status = 'pending'
      ORDER BY ol.created_at ASC
    `;
    return await this.all(sql);
  }

  /**
   * Update approval status
   */
  async updateApproval(logId, status, approvedBy = null) {
    const sql = `
      UPDATE outreach_log 
      SET approval_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.run(sql, [status, approvedBy, logId]);
  }

  /**
   * Check and update AdsPower profile usage
   */
  async checkAdsPowerUsage(profileId) {
    const sql = `SELECT * FROM adspower_usage WHERE profile_id = ?`;
    let usage = await this.get(sql, [profileId]);
    
    const today = new Date().toISOString().split('T')[0];
    
    if (!usage) {
      // Create new usage record
      await this.run(
        `INSERT INTO adspower_usage (profile_id, last_used, messages_sent_today, last_reset) VALUES (?, ?, 0, ?)`,
        [profileId, today, today]
      );
      return { canSend: true, messagesToday: 0, cooldown: false };
    }
    
    // Check if cooldown is active
    if (usage.cooldown_until) {
      const cooldownUntil = new Date(usage.cooldown_until);
      if (cooldownUntil > new Date()) {
        return { canSend: false, messagesToday: usage.messages_sent_today, cooldown: true, cooldownUntil: usage.cooldown_until };
      }
    }
    
    // Reset daily counter if needed
    if (usage.last_reset !== today) {
      await this.run(
        `UPDATE adspower_usage SET messages_sent_today = 0, last_reset = ? WHERE profile_id = ?`,
        [today, profileId]
      );
      usage.messages_sent_today = 0;
    }
    
    // Check daily limit
    const canSend = usage.messages_sent_today < 2;
    
    return {
      canSend,
      messagesToday: usage.messages_sent_today,
      cooldown: false
    };
  }

  /**
   * Record AdsPower message sent
   */
  async recordMessageSent(profileId) {
    const today = new Date().toISOString().split('T')[0];
    
    await this.run(`
      UPDATE adspower_usage 
      SET messages_sent_today = messages_sent_today + 1,
          total_messages_sent = total_messages_sent + 1,
          last_used = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE profile_id = ?
    `, [today, profileId]);
    
    // Check if daily limit reached, set cooldown
    const usage = await this.get(`SELECT messages_sent_today FROM adspower_usage WHERE profile_id = ?`, [profileId]);
    if (usage && usage.messages_sent_today >= 2) {
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 120); // 120 day cooldown
      
      await this.run(`
        UPDATE adspower_usage 
        SET cooldown_until = ?
        WHERE profile_id = ?
      `, [cooldownUntil.toISOString(), profileId]);
    }
  }

  /**
   * Log audit event
   */
  async logAudit(action, entityType, entityId, userId, details = {}) {
    const sql = `
      INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this.run(sql, [action, entityType, entityId, userId, JSON.stringify(details)]);
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    const stats = {};
    
    stats.totalSellers = (await this.get(`SELECT COUNT(*) as count FROM sellers`)).count;
    stats.newSellers = (await this.get(`SELECT COUNT(*) as count FROM sellers WHERE status = 'new'`)).count;
    stats.researchedSellers = (await this.get(`SELECT COUNT(*) as count FROM sellers WHERE status = 'researched'`)).count;
    stats.contactedSellers = (await this.get(`SELECT COUNT(*) as count FROM sellers WHERE status = 'contacted'`)).count;
    
    stats.totalCampaigns = (await this.get(`SELECT COUNT(*) as count FROM campaigns`)).count;
    stats.activeCampaigns = (await this.get(`SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'`)).count;
    
    stats.pendingApprovals = (await this.get(`SELECT COUNT(*) as count FROM outreach_log WHERE approval_status = 'pending'`)).count;
    stats.messagesSent = (await this.get(`SELECT COUNT(*) as count FROM outreach_log WHERE approval_status = 'approved'`)).count;
    stats.messagesDelivered = (await this.get(`SELECT COUNT(*) as count FROM outreach_log WHERE status = 'sent'`)).count;
    
    stats.adspowerProfiles = (await this.get(`SELECT COUNT(*) as count FROM adspower_usage`)).count;
    stats.activeProfiles = (await this.get(`
      SELECT COUNT(*) as count FROM adspower_usage 
      WHERE messages_sent_today < 2 
      AND (cooldown_until IS NULL OR cooldown_until < date('now'))
    `)).count;
    
    return stats;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
