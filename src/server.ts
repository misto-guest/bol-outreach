/**
 * Bol.com Seller Intelligence Platform
 * Main Express Server
 * Updated with AdsPower integration
 */

import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Import modules
import AdsPowerClient from './adspower-client';
import Database from './database';
import OutreachEngine from './outreach-engine/outreach-engine';
import SellerResearch, { DiscoveryOptions } from './seller-research';
import { Seller, ResearchProgress, OutreachQueueItem, PendingApproval } from './types';

// Import validation schemas and middleware
import {
  idParamSchema,
  paginationQuerySchema,
  sellerSchema,
  sellerStatusSchema,
  campaignSchema,
  campaignUpdateSchema,
  messageTemplateSchema,
  messageTemplateUpdateSchema,
  addSellersToCampaignSchema,
  approveMessageSchema,
  rejectMessageSchema,
  researchStartSchema,
  auditQuerySchema,
  researchQueueQuerySchema,
  validateBody,
  validateQuery,
  validateParams,
  validateBodyAndParams
} from './validations';

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize modules
const db = new Database();

// Check if all required environment variables are set
if (!process.env.ADSPOWER_API_HOST || !process.env.ADSPOWER_API_PORT || !process.env.ADSPOWER_API_KEY) {
    throw new Error('Missing one or more required environment variables: ADSPOWER_API_HOST, ADSPOWER_API_PORT, ADSPOWER_API_KEY');
}
console.log('AdsPower Host:', process.env.ADSPOWER_API_HOST);
console.log('AdsPower Port:', process.env.ADSPOWER_API_PORT);
console.log('AdsPower API Key:', process.env.ADSPOWER_API_KEY);

const adspower = new AdsPowerClient({
    host: process.env.ADSPOWER_API_HOST!,
    port: process.env.ADSPOWER_API_PORT!,
    apiKey: process.env.ADSPOWER_API_KEY!,
    timeout: 30000
});

let sellerResearch: SellerResearch | null = null;
let outreachEngine: OutreachEngine | null = null;

// Initialize and start server
async function startServer(): Promise<void> {
    try {
        await db.init();
        console.log('✅ Database initialized');

        // Initialize research and outreach engines with AdsPower
        sellerResearch = new SellerResearch(db, adspower);
        outreachEngine = new OutreachEngine(db, adspower);
        console.log('✅ Research and outreach engines initialized');

        // Check AdsPower connection and load profiles
        await adspower.loadProfiles();
        const profilesResult = await adspower.getProfiles();
        if (!profilesResult.success) console.error('⚠️  AdsPower connection failed' + profilesResult.error);
        if (!profilesResult.list.length) {
            console.error('⚠️  0 AdsPower profiles')
        } else {
            console.log(`✅ AdsPower connected. Loaded ${profilesResult.list.length} profiles`);
        }

        // Try to start server on the configured port, with fallback
        const server = app.listen(Number(PORT), '0.0.0.0')
            .on('listening', () => {
                const address = server.address();
                const actualPort = (address as any).port;
                console.log(`\n🚀 Bol.com Seller Intelligence Platform running on http://0.0.0.0:${actualPort}`);
                console.log(`📊 Dashboard: http://localhost:${actualPort}\n`);
            })
            .on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${PORT} is already in use!`);
                    console.error(`💡 Try using a different port: PORT=${parseInt(PORT as string) + 1} npm start`);
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
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get('/api/stats', async (req: Request, res: Response) => {
    try {
        const stats = await db.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// ==================== Sellers ====================

// Get all sellers
app.get('/api/sellers', validateQuery(paginationQuerySchema), async (req: Request, res: Response) => {
    try {
        const { status, limit } = (req as any).query as { status?: string; limit: number };
        let sellers: Seller[];

        if (status) {
            sellers = await db.getSellersByStatus(status, limit);
        } else {
            sellers = await db.all('SELECT * FROM sellers ORDER BY discovered_at DESC LIMIT ?', [limit]) as Seller[];
        }

        res.json({ success: true, data: sellers });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Get single seller - Enhanced with better error handling
app.get('/api/sellers/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        console.log(`Fetching seller details for ID: ${id}`);

        // Try to find by numeric ID or seller_id string
        let seller: Record<string, unknown> | null = null;

        // First try numeric ID
        seller = await db.get('SELECT * FROM sellers WHERE id = ?', [id]);

        // If not found, try seller_id string (converted to string)
        if (!seller) {
            seller = await db.get('SELECT * FROM sellers WHERE seller_id = ?', [String(id)]);
        }

        if (!seller) {
            console.log(`Seller not found: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'Seller not found',
                message: `No seller found with ID: ${id}`
            });
        }

        // Parse metadata if exists
        if (seller.metadata) {
            try {
                seller.metadata = JSON.parse(seller.metadata as string);
            } catch (e) {
                seller.metadata = {};
            }
        }

        // Get outreach history for this seller
        try {
            const history = await db.all(
                'SELECT * FROM outreach_log WHERE seller_id = ? ORDER BY contacted_at DESC',
                [seller.id || id]
            );
            seller.history = history || [];
        } catch (historyError) {
            console.log('Could not load history:', (historyError as Error).message);
            seller.history = [];
        }

        console.log(`✓ Seller details loaded: ${seller.shop_name}`);
        res.json({ success: true, data: seller });
    } catch (error) {
        console.error('Error fetching seller:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
            stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        });
    }
});

// Add or update seller
app.post('/api/sellers', validateBody(sellerSchema), async (req: Request, res: Response) => {
    try {
        const sellerData = req.body;
        const result = await db.insertSeller(sellerData);

        await db.logAudit('seller_created', 'seller', result.id, 'system', { sellerData });

        res.json({ success: true, data: { id: result.id, ...sellerData } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Update seller status
app.patch('/api/sellers/:id/status',
  validateParams(idParamSchema),
  validateBody(sellerStatusSchema),
  async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const { id } = (req as any).params as { id: number };
        await db.run('UPDATE sellers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

        await db.logAudit('seller_status_updated', 'seller', id, 'system', { newStatus: status });

        res.json({ success: true, data: { id, status } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// ==================== Campaigns ====================

// Get all campaigns
app.get('/api/campaigns', async (req: Request, res: Response) => {
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
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Get single campaign
app.get('/api/campaigns/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [id]);
        if (!campaign) {
            return res.status(404).json({ success: false, error: 'Campaign not found' });
        }

        // Get sellers targeted by this campaign
        const outreach = await db.all(
            'SELECT ol.*, s.shop_name FROM outreach_log ol JOIN sellers s ON ol.seller_id = s.id WHERE ol.campaign_id = ?',
            [id]
        );

        res.json({ success: true, data: { ...campaign, outreach } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Create campaign
app.post('/api/campaigns', validateBody(campaignSchema), async (req: Request, res: Response) => {
    try {
        const result = await db.createCampaign(req.body);

        await db.logAudit('campaign_created', 'campaign', result.id, 'system', { campaign: req.body });

        res.json({ success: true, data: { id: result.id, ...req.body } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Update campaign
app.patch('/api/campaigns/:id',
  validateParams(idParamSchema),
  validateBody(campaignUpdateSchema),
  async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const { id } = (req as any).params as { id: number };
        const values = [...Object.values(updates), id];

        await db.run(`UPDATE campaigns SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

        await db.logAudit('campaign_updated', 'campaign', id, 'system', { updates });

        res.json({ success: true, data: { id, ...updates } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Start campaign
app.post('/api/campaigns/:id/start', validateParams(idParamSchema), async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        await db.run('UPDATE campaigns SET status = ?, start_date = CURRENT_TIMESTAMP WHERE id = ?', ['active', id]);

        await db.logAudit('campaign_started', 'campaign', id, 'system', {});

        res.json({ success: true, message: 'Campaign started' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Stop campaign
app.post('/api/campaigns/:id/stop', validateParams(idParamSchema), async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        await db.run('UPDATE campaigns SET status = ?, end_date = CURRENT_TIMESTAMP WHERE id = ?', ['stopped', id]);

        await db.logAudit('campaign_stopped', 'campaign', id, 'system', {});

        res.json({ success: true, message: 'Campaign stopped' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// ==================== Message Templates ====================

// Get all templates
app.get('/api/templates', async (req: Request, res: Response) => {
    try {
        const templates = await db.all('SELECT * FROM message_templates WHERE is_active = 1 ORDER BY created_at DESC');

        // Parse variables JSON
        templates.forEach((t: Record<string, unknown>) => {
            if (t.variables) {
                try {
                    t.variables = JSON.parse(t.variables as string);
                } catch (e) {
                    t.variables = [];
                }
            }
        });

        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Get single template
app.get('/api/templates/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        const template = await db.get('SELECT * FROM message_templates WHERE id = ?', [id]);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        if (template.variables) {
            try {
                template.variables = JSON.parse(template.variables as string);
            } catch (e) {
                template.variables = [];
            }
        }

        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Create template
app.post('/api/templates', validateBody(messageTemplateSchema), async (req: Request, res: Response) => {
    try {
        const result = await db.createTemplate(req.body);

        await db.logAudit('template_created', 'template', result.id, 'system', { template: req.body.name });

        res.json({ success: true, data: { id: result.id, ...req.body } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Update template
app.patch('/api/templates/:id',
  validateParams(idParamSchema),
  validateBody(messageTemplateUpdateSchema),
  async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const { id } = (req as any).params as { id: number };
        const values = [...Object.values(updates), id];

        await db.run(`UPDATE message_templates SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

        await db.logAudit('template_updated', 'template', id, 'system', { updates });

        res.json({ success: true, data: { id, ...updates } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Delete template (soft delete)
app.delete('/api/templates/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        await db.run('UPDATE message_templates SET is_active = 0 WHERE id = ?', [id]);

        await db.logAudit('template_deleted', 'template', id, 'system', {});

        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// ==================== Approval Queue ====================

// Get pending approvals
app.get('/api/approvals', async (req: Request, res: Response) => {
    try {
        const approvals = await db.getPendingApprovals();
        res.json({ success: true, data: approvals });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Approve message
app.post('/api/approvals/:id/approve',
  validateParams(idParamSchema),
  validateBody(approveMessageSchema),
  async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        const { approvedBy } = req.body;
        await db.updateApproval(id, 'approved', approvedBy);

        // TODO: Send the actual message via AdsPower profile

        await db.logAudit('message_approved', 'outreach_log', id, approvedBy, {});

        res.json({ success: true, message: 'Message approved' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Reject message
app.post('/api/approvals/:id/reject',
  validateParams(idParamSchema),
  validateBody(rejectMessageSchema),
  async (req: Request, res: Response) => {
    try {
        const { id } = (req as any).params as { id: number };
        const { rejectedBy, reason } = req.body;
        await db.updateApproval(id, 'rejected', rejectedBy);

        await db.logAudit('message_rejected', 'outreach_log', id, rejectedBy, { reason });

        res.json({ success: true, message: 'Message rejected' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Add sellers to campaign (create outreach records)
app.post('/api/campaigns/:id/sellers',
  validateParams(idParamSchema),
  validateBody(addSellersToCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sellerIds, approvalStatus } = req.body;
        const { id: campaignId } = (req as any).params as { id: number };

        // Verify campaign exists
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
        if (!campaign) {
            return res.status(404).json({ success: false, error: 'Campaign not found' });
        }

        // Get template to generate message
        let messageContent = 'Test message';
        if (campaign.message_template_id) {
            const template = await db.get('SELECT * FROM message_templates WHERE id = ?', [campaign.message_template_id]);
            if (template) {
                messageContent = `Subject: ${template.subject || 'No subject'}\n\n${String(template.body)}`;
            }
        }

        // Add outreach records for each seller
        interface SellerAddResult {
            sellerId: number;
            success: boolean;
            id?: number;
            error?: string;
        }
        const results: SellerAddResult[] = [];
        for (const sellerId of sellerIds) {
            try {
                // Verify seller exists
                const seller = await db.get('SELECT * FROM sellers WHERE id = ?', [sellerId]);
                if (!seller) {
                    results.push({ sellerId, success: false, error: 'Seller not found' });
                    continue;
                }

                // Create personalized message
                let personalizedMessage = messageContent;
                if (seller.shop_name) {
                    personalizedMessage = personalizedMessage.replace(/\{\{shop_name\}\}/g, String(seller.shop_name));
                }
                // Check for company_name in metadata
                if (seller.metadata && typeof seller.metadata === 'object' && 'company_name' in seller.metadata) {
                    const companyName = (seller.metadata as Record<string, unknown>).company_name as string;
                    personalizedMessage = personalizedMessage.replace(/\{\{company_name\}\}/g, companyName || String(seller.shop_name));
                }
                if (seller.rating) {
                    personalizedMessage = personalizedMessage.replace(/\{\{rating\}\}/g, String(seller.rating));
                }

                const result = await db.run(`
          INSERT INTO outreach_log (seller_id, campaign_id, status, approval_status, message_sent)
          VALUES (?, ?, ?, ?, ?)
        `, [sellerId, campaignId, 'pending', approvalStatus, personalizedMessage]);

                results.push({ sellerId, success: true, id: result.id! });
            } catch (error) {
                results.push({ sellerId, success: false, error: (error as Error).message });
            }
        }

        const successCount = results.filter(r => r.success).length;

        await db.logAudit('sellers_added_to_campaign', 'campaign', campaignId, 'system', {
            count: successCount,
            total: sellerIds.length
        });

        res.json({
            success: true,
            message: `Added ${successCount}/${sellerIds.length} sellers to campaign`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});


// ==================== Audit Log ====================

// Get audit log
app.get('/api/audit', validateQuery(auditQuerySchema), async (req: Request, res: Response) => {
    try {
        const { limit, entityType, entityId } = (req as any).query as { limit: number; entityType?: string; entityId?: number };

        let sql = 'SELECT * FROM audit_log';
        const params: (string | number)[] = [];
        const conditions: string[] = [];

        if (entityType) {
            conditions.push('entity_type = ?');
            params.push(String(entityType));
        }

        if (entityId) {
            conditions.push('entity_id = ?');
            params.push(Number(entityId));
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const logs = await db.all(sql, params) as Record<string, unknown>[];

        // Parse details JSON
        logs.forEach((log: Record<string, unknown>) => {
            if (log.details) {
                try {
                    log.details = JSON.parse(log.details as string);
                } catch (e) {
                    // Keep as string
                }
            }
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// ==================== Seller Research ====================

// Start seller research - Enhanced with AdsPower support
app.post('/api/research/start', validateBody(researchStartSchema), async (req: Request, res: Response) => {
    try {
        const { keywords, adspowerProfileId } = req.body;

        if (!sellerResearch) {
            return res.status(500).json({ success: false, error: 'Research engine not initialized' });
        }

        if (sellerResearch.isActive()) {
            return res.status(400).json({ success: false, error: 'Research already in progress' });
        }

        console.log(`Starting seller research for ${keywords.length} keywords...`);

        // Add to research queue
        for (const keyword of keywords) {
            try {
                db.run(
                    'INSERT INTO research_queue (keyword, status) VALUES (?, ?)',
                    [keyword, 'pending']
                );
            } catch (err) {
                console.log(`Queue insert error for "${keyword}":`, (err as Error).message);
            }
        }

        // Start research in background with AdsPower if available
        setImmediate(async () => {
            try {
                console.log(`\n===== Starting Seller Discovery =====`);
                console.log(`Keywords: ${keywords.join(', ')}`);

                const options: DiscoveryOptions = {
                    maxResults: 25,
                    extractSellers: true,
                    saveToDb: true,
                    deepSearch: false,
                    adsPowerProfileId: adspowerProfileId,
                    onProgress: (progress) => {
                        console.log(`Progress: ${progress.current}/${progress.total} - Found: ${progress.found} - Current: ${progress.keyword || 'N/A'}`);
                    }
                };

                // Use AdsPower profile if provided and available
                console.log(`Using AdsPower profile: ${adspowerProfileId}`);
                const results = await sellerResearch!.discoverByKeywords(keywords, options);

                console.log(`\n===== Research Summary =====`);
                console.log(`Total sellers found: ${results.totalFound}`);
                console.log(`Errors encountered: ${results.errors.length}`);

                // Update queue status
                for (const keyword of keywords) {
                    try {
                        await db.run(
                            'UPDATE research_queue SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE keyword = ?',
                            ['completed', keyword]
                        );
                    } catch (e) {
                        // Ignore errors
                    }
                }

            } catch (error) {
                console.error('Research error:', error);
                // Mark queue items as failed
                for (const keyword of keywords) {
                    try {
                        await db.run(
                            'UPDATE research_queue SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE keyword = ?',
                            ['failed', (error as Error).message, keyword]
                        );
                    } catch (e) {
                        // Ignore errors
                    }
                }
            }
        });

        await db.logAudit('research_started', 'research_queue', null, 'system', { keywords, adspowerProfileId });
        res.json({
            success: true,
            message: `Research started for ${keywords.length} keywords`,
            keywords: keywords,
            adspowerProfileId: adspowerProfileId
        });
    } catch (error) {
        console.error('Failed to start research:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Get research queue status with pagination
app.get('/api/research/queue', validateQuery(researchQueueQuerySchema), async (req: Request, res: Response) => {
    try {
        const { page, limit, status } = (req as any).query as { page: number; limit: number; status?: string };
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM research_queue';
        const params: (string | number)[] = [];
        const conditions: string[] = [];

        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const queue = await db.all(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM research_queue';
        const countParams: (string | number)[] = [];
        if (conditions.length > 0) {
            countSql += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.get(countSql, countParams);
        const total = (countResult?.total as number) || 0;

        res.json({
            success: true,
            data: queue,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Get research status
app.get('/api/research/status', async (req: Request, res: Response) => {
    try {
        const isActive = sellerResearch ? sellerResearch.isActive() : false;
        res.json({ success: true, data: { isActive } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// ==================== Outreach Execution ====================

// Execute approved outreach
app.post('/api/outreach/execute', async (req: Request, res: Response) => {
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
                const results = await outreachEngine!.executeApprovedOutreach();
                console.log(`Outreach completed: ${results.sent} sent, ${results.failed} failed`);
            } catch (error) {
                console.error('Outreach error:', error);
            }
        });

        await db.logAudit('outreach_started', 'outreach_log', null, 'system', {});

        res.json({ success: true, message: 'Outreach started' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Get outreach status
app.get('/api/outreach/status', async (req: Request, res: Response) => {
    try {
        const isActive = outreachEngine ? outreachEngine.isActive() : false;
        res.json({ success: true, data: { isActive } });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Check AdsPower API health
app.get('/api/adspower/profiles', async (req: Request, res: Response) => {
    try {
        const profiles = await adspower.getProfiles();
        res.json({ success: true, data: profiles });
    } catch (error) {
        res.status(500).json({ success: false, error: `AdsPower API is not available: ${error}` });
    }
});

// ==================== Serve Frontend ====================

// Serve index.html for root
app.get('/', (req: Request, res: Response) => {
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

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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