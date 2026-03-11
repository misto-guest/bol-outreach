/**
 * Database Setup and Schema
 * SQLite database for Bol.com Seller Intelligence Platform
 * Migrated to sql.js for Railway compatibility (pure JavaScript, no native compilation)
 */

import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import {
    Campaign,
    DashboardStats,
    MessageTemplate,
    OutreachQueueItem,
    PendingApproval,
    Seller
} from './types';

// Type for query parameters
type QueryParams = unknown[];

// Type for query results
type QueryResult = Record<string, unknown>;

class Database {
    public db: SqlJsDatabase | null;
    public SQL: SqlJsStatic | null;
    public dbPath: string;

    constructor(dbPath: string = path.join(__dirname, '../data/bol-outreach.db')) {
        this.dbPath = dbPath;
        this.db = null;
        this.SQL = null;
    }

    /**
     * Initialize database connection and create tables
     */
    async init(): Promise<void> {
        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
            // Initialize sql.js
            this.SQL = await initSqlJs();

            // Load existing database or create new one
            if (fs.existsSync(this.dbPath)) {
                const buffer = fs.readFileSync(this.dbPath);
                this.db = new this.SQL.Database(buffer);
                console.log('Connected to SQLite database:', this.dbPath);
            } else {
                this.db = new this.SQL.Database();
                console.log('Created new SQLite database:', this.dbPath);
                await this.createTables();
                this.saveToFile();
            }
        } catch (err) {
            console.error('Error opening database:', err);
            throw err;
        }
    }

    /**
     * Save database to file
     */
    saveToFile(): void {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    /**
     * Create all database tables
     */
    async createTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

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
            this.db.run(sql);
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
            this.db.run(sql);
        }

        console.log('Database tables and indexes created successfully');
    }

    /**
     * Run a SQL query
     */
    run(sql: string, params: QueryParams = []): { id: number | null; changes: number } {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            this.db.run(sql, params as (string | number | null | Uint8Array)[]);
            this.saveToFile();
            // Get lastInsertId
            const result = this.db.exec('SELECT last_insert_rowid() as id');
            const lastId = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null;
            return { id: lastId as number | null, changes: 1 };
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get a single row
     */
    get(sql: string, params: QueryParams = []): QueryResult | null {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const stmt = this.db.prepare(sql);
            stmt.bind(params as (string | number | null | Uint8Array)[]);
            const result = stmt.getAsObject({}) || null;
            stmt.free();
            return result as QueryResult;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get all rows
     */
    all(sql: string, params: QueryParams = []): QueryResult[] {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const stmt = this.db.prepare(sql);
            stmt.bind(params as (string | number | null | Uint8Array)[]);
            const results: QueryResult[] = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject() as QueryResult);
            }
            stmt.free();
            return results;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Insert a new seller
     */
    async insertSeller(sellerData: Partial<Seller>): Promise<{ id: number | null; changes: number }> {
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
        return this.run(sql, params);
    }

    /**
     * Get sellers by status
     */
    async getSellersByStatus(status: string, limit: number = 100): Promise<Seller[]> {
        const sql = `SELECT * FROM sellers WHERE status = ? ORDER BY discovered_at DESC LIMIT ?`;
        return this.all(sql, [status, limit]) as unknown as Seller[];
    }

    /**
     * Get sellers not contacted in cooldown period
     */
    async getSellersForOutreach(limit: number = 50): Promise<Seller[]> {
        const sql = `
      SELECT DISTINCT s.* FROM sellers s
      LEFT JOIN outreach_log ol ON s.id = ol.seller_id
      WHERE s.status = 'researched'
      AND (ol.id IS NULL OR ol.contacted_at < datetime('now', '-120 days'))
      ORDER BY s.discovered_at ASC
      LIMIT ?
    `;
        return this.all(sql, [limit]) as unknown as Seller[];
    }

    /**
     * Create a new campaign
     */
    async createCampaign(campaignData: Partial<Campaign>): Promise<{ id: number | null; changes: number }> {
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
        return this.run(sql, params);
    }

    /**
     * Create a message template
     */
    async createTemplate(templateData: Partial<MessageTemplate>): Promise<{ id: number | null; changes: number }> {
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
        return this.run(sql, params);
    }

    /**
     * Add to approval queue
     */
    async addToApprovalQueue(outreachData: OutreachQueueItem): Promise<{ id: number | null; changes: number }> {
        const sql = `
      INSERT INTO outreach_log (seller_id, campaign_id, message_sent, adspower_profile_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `;
        return this.run(sql, [
            outreachData.seller_id,
            outreachData.campaign_id,
            outreachData.message,
            outreachData.adspower_profile_id
        ]);
    }

    /**
     * Get pending approvals
     */
    async getPendingApprovals(): Promise<PendingApproval[]> {
        const sql = `
      SELECT ol.*, s.shop_name, s.shop_url, c.name as campaign_name
      FROM outreach_log ol
      JOIN sellers s ON ol.seller_id = s.id
      JOIN campaigns c ON ol.campaign_id = c.id
      WHERE ol.approval_status = 'pending'
      ORDER BY ol.created_at ASC
    `;
        return this.all(sql) as unknown as Promise<PendingApproval[]>;
    }

    /**
     * Update approval status
     */
    async updateApproval(logId: number, status: string, approvedBy: string | null = null): Promise<{ id: number | null; changes: number }> {
        const sql = `
      UPDATE outreach_log 
      SET approval_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
        return this.run(sql, [status, approvedBy, logId]);
    }

    /**
     * Check and update AdsPower profile usage
     */
    async checkAdsPowerUsage(profileId: string): Promise<{ canSend: boolean; messagesToday: number; cooldown: boolean; cooldownUntil?: string }> {
        const sql = `SELECT * FROM adspower_usage WHERE profile_id = ?`;
        let usage = this.get(sql, [profileId]) as Record<string, unknown> | null;

        const today = new Date().toISOString().split('T')[0];

        if (!usage) {
            // Create new usage record
            this.run(
                `INSERT INTO adspower_usage (profile_id, last_used, messages_sent_today, last_reset) VALUES (?, ?, 0, ?)`,
                [profileId, today, today]
            );
            return { canSend: true, messagesToday: 0, cooldown: false };
        }

        // Check if cooldown is active
        const cooldownUntilVal = usage.cooldown_until as string | null | undefined;
        if (cooldownUntilVal) {
            const cooldownUntil = new Date(cooldownUntilVal);
            if (cooldownUntil > new Date()) {
                const messagesToday = usage.messages_sent_today as number;
                return { canSend: false, messagesToday, cooldown: true, cooldownUntil: cooldownUntilVal };
            }
        }

        // Reset daily counter if needed
        const lastReset = usage.last_reset as string;
        if (lastReset !== today) {
            this.run(
                `UPDATE adspower_usage SET messages_sent_today = 0, last_reset = ? WHERE profile_id = ?`,
                [today, profileId]
            );
            usage.messages_sent_today = 0;
        }

        // Check daily limit
        const messagesSentToday = usage.messages_sent_today as number;
        const canSend = messagesSentToday < 2;

        return {
            canSend,
            messagesToday: messagesSentToday,
            cooldown: false
        };
    }

    /**
     * Record AdsPower message sent
     */
    async recordMessageSent(profileId: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        this.run(`
      UPDATE adspower_usage 
      SET messages_sent_today = messages_sent_today + 1,
          total_messages_sent = total_messages_sent + 1,
          last_used = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE profile_id = ?
    `, [today, profileId]);

        // Check if daily limit reached, set cooldown
        const usage = this.get(`SELECT messages_sent_today FROM adspower_usage WHERE profile_id = ?`, [profileId]) as Record<string, unknown> | null;
        if (usage && (usage.messages_sent_today as number) >= 2) {
            const cooldownUntil = new Date();
            cooldownUntil.setDate(cooldownUntil.getDate() + 120); // 120 day cooldown

            this.run(`
        UPDATE adspower_usage 
        SET cooldown_until = ?
        WHERE profile_id = ?
      `, [cooldownUntil.toISOString(), profileId]);
        }
    }

    /**
     * Log audit event
     */
    async logAudit(action: string, entityType: string, entityId: number | null, userId: string, details: Record<string, unknown> = {}): Promise<void> {
        const sql = `
      INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
      VALUES (?, ?, ?, ?, ?)
    `;
        this.run(sql, [action, entityType, entityId, userId, JSON.stringify(details)]);
    }

    /**
     * Get dashboard stats
     */
    async getDashboardStats(): Promise<DashboardStats> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const stats = {} as DashboardStats;

        const getTotal = (table: string, where: string = ''): number => {
            if (!this.db) {
                return 0;
            }
            const sql = `SELECT COUNT(*) as count FROM ${table} ${where}`;
            const result = this.db.exec(sql);
            return result.length > 0 ? (result[0].values[0][0] as number) : 0;
        };

        stats.totalSellers = getTotal('sellers');
        stats.newSellers = getTotal('sellers', "WHERE status = 'new'");
        stats.researchedSellers = getTotal('sellers', "WHERE status = 'researched'");
        stats.contactedSellers = getTotal('sellers', "WHERE status = 'contacted'");

        stats.totalCampaigns = getTotal('campaigns');
        stats.activeCampaigns = getTotal('campaigns', "WHERE status = 'active'");

        stats.pendingApprovals = getTotal('outreach_log', "WHERE approval_status = 'pending'");
        stats.messagesSent = getTotal('outreach_log', "WHERE approval_status = 'approved'");
        stats.messagesDelivered = getTotal('outreach_log', "WHERE status = 'sent'");

        stats.adspowerProfiles = getTotal('adspower_usage');
        stats.activeProfiles = getTotal(
            'adspower_usage',
            "WHERE messages_sent_today < 2 AND (cooldown_until IS NULL OR cooldown_until < date('now'))"
        );

        return stats;
    }

    /**
     * Close database connection
     */
    close(): void {
        if (this.db) {
            this.saveToFile();
            this.db.close();
            console.log('Database connection closed');
        }
    }
}

export default Database;