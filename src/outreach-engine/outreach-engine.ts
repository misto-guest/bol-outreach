/**
 * Unified Outreach Execution Engine
 * Handles sending messages via AdsPower profiles with rate limiting, profile rotation, 
 * business hours enforcement, and message variations
 */

import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core';
import Database from '../database';
import AdsPowerClient from '../adspower-client';
import ProfileRotator, { ProfileConfig } from './profile-rotator';
import RateLimiter from './rate-limiter';
import TimeWindowChecker from './time-window-checker';
import MessageVariator from './message-variator';
import { AdsPowerStartResult } from '../types';

// Types for message and outreach data
interface MessageData {
    id: number;
    seller_id: number;
    campaign_id: number;
    message_sent: string;
    approval_status: string;
    status: string;
    shop_name: string;
    shop_url?: string;
    seller_url?: string;
    campaign_name: string;
}

interface OutreachProgress {
    current: number;
    total: number;
    seller?: string;
}

interface OutreachResults {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
}

interface OutreachEngineConfig {
    profiles: ProfileConfig[];
    maxMessagesPerHour?: number;
    delayMs?: number;
    timezone?: string;
    businessHours?: { start: number; end: number };
    enableVariations?: boolean;
    aiService?: (text: string) => Promise<string>;
}

interface OutreachMessage {
    recipient: string;
    subject: string;
    body: string;
    sentAt?: Date;
    status?: 'pending' | 'sent' | 'failed' | 'skipped';
    skipReason?: string;
    profileId?: string;
}

class OutreachEngine {
    private db: Database;
    private adspower: AdsPowerClient;
    private profileRotator: ProfileRotator;
    private rateLimiter: RateLimiter;
    private timeChecker: TimeWindowChecker;
    private messageVariator: MessageVariator;
    private config: OutreachEngineConfig;
    private isRunning: boolean;
    private shouldStop: boolean;
    private testMode: boolean;

    constructor(database: Database, adspowerClient: AdsPowerClient, config?: OutreachEngineConfig) {
        this.db = database;
        this.adspower = adspowerClient;
        
        // Initialize with default config if not provided (backward compatibility)
        this.config = config || {
            profiles: [],
            maxMessagesPerHour: 5,
            delayMs: 5000,
            timezone: 'Europe/Amsterdam',
            businessHours: { start: 9, end: 20 },
            enableVariations: false
        };
        
        // Initialize enhanced components
        this.profileRotator = new ProfileRotator(this.config.profiles);
        this.rateLimiter = new RateLimiter(this.config.maxMessagesPerHour || 5);
        this.timeChecker = new TimeWindowChecker(
            this.config.timezone || 'Europe/Amsterdam',
            this.config.businessHours?.start || 9,
            this.config.businessHours?.end || 20
        );
        this.messageVariator = new MessageVariator();
        
        this.isRunning = false;
        this.shouldStop = false;
        this.testMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
    }

    /**
     * Initialize outreach engine with enhanced features
     */
    async initialize(): Promise<void> {
        console.log('🚀 Initializing Bol.com Outreach Engine...');
        console.log(`📊 Profiles: ${this.profileRotator.getProfileCount()}`);
        console.log(`⏱️  Rate limit: ${this.config.maxMessagesPerHour || 5} messages/hour/profile`);
        console.log(`🕐 Business hours: 9AM-8PM Mon-Sat (${this.config.timezone || 'GMT+1'})`);
        console.log(`🔄 Profile rotation: ${this.profileRotator.isRotationEnabled() ? 'Enabled' : 'Disabled'}`);
        console.log(`📝 Message variations: ${this.config.enableVariations ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Check if sending is allowed (time window + rate limit)
     */
    private checkSendingAllowed(profileId: string): { allowed: boolean; reason?: string } {
        // Check time window
        const timeCheck = this.timeChecker.canSendNow();
        if (!timeCheck.allowed) {
            return {
                allowed: false,
                reason: `Outside business hours: ${timeCheck.reason}. Next allowed: ${this.timeChecker.formatNextAllowedTime(timeCheck.nextAllowedTime!)}`
            };
        }

        // Check rate limit
        const rateCheck = this.rateLimiter.canSend(profileId);
        if (!rateCheck.allowed) {
            return {
                allowed: false,
                reason: rateCheck.reason
            };
        }

        return { allowed: true };
    }

    /**
     * Start browser with next available profile
     */
    private async startWithNextProfile(): Promise<{ browser: AdsPowerStartResult; profile: ProfileConfig }> {
        const profile = this.profileRotator.getNextProfile();

        // Check if this profile can send
        const check = this.checkSendingAllowed(profile.profileId);
        if (!check.allowed) {
            throw new Error(`Profile ${profile.profileId} cannot send: ${check.reason}`);
        }
        const result = await this.adspower.startProfile(profile.profileId);
        return { browser: result, profile };
    }

    /**
     * Execute pending outreach from approval queue with enhanced features
     */
    async executeApprovedOutreach(onProgress?: (progress: OutreachProgress) => void): Promise<OutreachResults> {
        this.isRunning = true;
        this.shouldStop = false;

        try {
            // Get all approved but not yet sent messages
            const approvedMessages: MessageData[] = await this.db.all(`
                SELECT ol.*, s.shop_name, s.shop_url, c.name as campaign_name
                FROM outreach_log ol
                JOIN sellers s ON ol.seller_id = s.id
                JOIN campaigns c ON ol.campaign_id = c.id
                WHERE ol.approval_status = 'approved'
                AND ol.status = 'pending'
                ORDER BY ol.created_at ASC
            `) as unknown as MessageData[];

            console.log(`Found ${approvedMessages.length} approved messages to send`);

            const results: OutreachResults = {
                total: approvedMessages.length,
                sent: 0,
                failed: 0,
                skipped: 0
            };

            for (let i = 0; i < approvedMessages.length; i++) {
                if (this.shouldStop) break;

                const message = approvedMessages[i];

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: approvedMessages.length,
                        seller: message.shop_name
                    });
                }

                try {
                    const success = await this.sendMessage(message);

                    if (success) {
                        results.sent++;
                    } else {
                        results.failed++;
                    }

                    // Rate limiting: wait between messages
                    if (i < approvedMessages.length - 1) {
                        await this.delay(this.config.delayMs || 5000);
                    }
                } catch (error: unknown) {
                    console.error(`Failed to send message to ${message.shop_name}:`, (error as Error).message);
                    results.failed++;

                    // Update status to failed
                    await this.db.run(
                        'UPDATE outreach_log SET status = ?, error_message = ? WHERE id = ?',
                        ['failed', (error as Error).message, message.id]
                    );
                }
            }

            this.isRunning = false;
            return results;
        } catch (error) {
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Send a single message via AdsPower with enhanced features
     */
    async sendMessage(message: MessageData): Promise<boolean> {
        try {
            // TEST MODE: Simulate message sending without actual browser automation
            if (this.testMode) {
                console.log(`[TEST MODE] Simulating message send to ${message.shop_name}`);
                
                // Simulate processing delay
                await this.delay(1000 + Math.random() * 2000);
                
                // Update outreach log
                await this.db.run(
                    `UPDATE outreach_log SET status = 'sent', contacted_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [message.id]
                );

                // Update seller status
                await this.db.run(
                    `UPDATE sellers SET status = 'contacted', last_checked_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [message.seller_id]
                );

                // Update campaign total
                await this.db.run(
                    `UPDATE campaigns SET total_sent = total_sent + 1 WHERE id = ?`,
                    [message.campaign_id]
                );

                // Log audit
                await this.db.logAudit('message_sent', 'outreach_log', message.id, 'system', {
                    seller: message.shop_name,
                    test_mode: true
                });

                console.log(`✓ [TEST] Message sent to ${message.shop_name}`);
                return true;
            }

            // Get next available profile with rotation
            const { browser, profile } = await this.startWithNextProfile();
            const check = this.checkSendingAllowed(profile.profileId);

            if (!check.allowed) {
                console.log(`⏸️  Skipping ${message.shop_name}: ${check.reason}`);

                // Update outreach log with skip reason
                await this.db.run(
                    `UPDATE outreach_log SET status = 'skipped', error_message = ? WHERE id = ?`,
                    [check.reason, message.id]
                );

                return false;
            }

            console.log(`📧 Sending message to ${message.shop_name} using profile ${profile.profileId}...`);

            // Start AdsPower profile
            const browserPage = await puppeteer.connect({
                browserWSEndpoint: browser.puppeteerEndpoint
            });

            const page = await browserPage.newPage();

            try {
                // Navigate to seller page
                await page.goto(message.shop_url || message.seller_url || '', {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                await new Promise(resolve => setTimeout(resolve, 2000));

                // Look for contact button/form
                const contactFound = await this.findAndSubmitContactForm(page, message.message_sent);

                if (contactFound) {
                    // Record successful send
                    this.rateLimiter.recordMessage(profile.profileId);
                    
                    // Update outreach log
                    await this.db.run(
                        `UPDATE outreach_log SET status = 'sent', contacted_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [message.id]
                    );

                    // Update seller status
                    await this.db.run(
                        `UPDATE sellers SET status = 'contacted', last_checked_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [message.seller_id]
                    );

                    // Record message sent in AdsPower usage
                    await this.db.recordMessageSent(profile.profileId);

                    // Update campaign total
                    await this.db.run(
                        `UPDATE campaigns SET total_sent = total_sent + 1 WHERE id = ?`,
                        [message.campaign_id]
                    );

                    // Log audit
                    await this.db.logAudit('message_sent', 'outreach_log', message.id, 'system', {
                        seller: message.shop_name,
                        profile: profile.profileId
                    });

                    console.log(`✓ Message sent to ${message.shop_name}`);
                    return true;
                } else {
                    throw new Error('Contact form not found');
                }
            } finally {
                await browserPage.close();
            }
        } catch (error: unknown) {
            console.error(`Failed to send message to ${message.shop_name}:`, (error as Error).message);
            return false;
        }
    }

    /**
     * Find and submit contact form on seller page
     */
    private async findAndSubmitContactForm(page: Page, messageText: string): Promise<boolean> {
        try {
            // Look for contact button or link
            const contactSelectors = [
                'a[href*="contact"]',
                'a[href*="contacteer"]',
                'button:has-text("Contact")',
                'button:has-text("Contacteer")',
                '.contact-button',
                '[data-test="contact-button"]'
            ];

            let contactButton: ElementHandle | null = null;
            for (const selector of contactSelectors) {
                try {
                    contactButton = await page.$(selector);
                    if (contactButton) break;
                } catch (e) {
                    // Try next selector
                }
            }

            // If no button found, try to find by text
            if (!contactButton) {
                const buttons = await page.$$('button, a');
                for (const button of buttons) {
                    const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
                    if (text.includes('contact') || text.includes('bericht') || text.includes('vraag')) {
                        contactButton = button;
                        break;
                    }
                }
            }

            if (contactButton) {
                await contactButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Look for message textarea
                const messageSelectors = [
                    'textarea[name="message"]',
                    'textarea[name="bericht"]',
                    'textarea#message',
                    'textarea[name="body"]',
                    '[data-test="message-field"]'
                ];

                let messageField: ElementHandle | null = null;
                for (const selector of messageSelectors) {
                    messageField = await page.$(selector);
                    if (messageField) break;
                }

                if (messageField) {
                    // Type message
                    await messageField.click();
                    await messageField.type(messageText, { delay: 50 });

                    // Look for submit button
                    const submitSelectors = [
                        'button[type="submit"]',
                        'button:has-text("Send")',
                        'button:has-text("Verstuur")',
                        'button:has-text("Senden")',
                        '[data-test="send-button"]'
                    ];

                    for (const selector of submitSelectors) {
                        try {
                            const submitButton = await page.$(selector);
                            if (submitButton) {
                                await submitButton.click();
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                return true;
                            }
                        } catch (e) {
                            // Try next selector
                        }
                    }
                }
            }

            // Alternative: Look for email link
            const emailLink = await page.$('a[href^="mailto:"]');
            if (emailLink) {
                // @ts-ignore
                const email = await emailLink.evaluate(el => el.href);
                console.log(`Found email: ${email}`);
                // In production, you would open email client or use email API
                return true;
            }

            return false;
        } catch (error: unknown) {
            console.error('Error finding contact form:', (error as Error).message);
            return false;
        }
    }

    /**
     * Add message template for variations
     */
    addTemplate(template: { subject: string; body: string; category?: string }): string {
        return this.messageVariator.addTemplate(template);
    }

    /**
     * Generate AI variations for template
     */
    async generateVariations(templateId: string, count: number): Promise<void> {
        if (!this.config.enableVariations || !this.config.aiService) {
            console.log('Message variations disabled or AI service not configured');
            return;
        }

        for (let i = 0; i < count; i++) {
            await this.messageVariator.generateVariation(templateId, this.config.aiService);
        }
    }

    /**
     * Get message history
     */
    getMessageHistory(): OutreachMessage[] {
        // This would need to be implemented based on your database schema
        return [];
    }

    /**
     * Export message history
     */
    exportHistory(filename: string): void {
        const fs = require('fs');
        const history = this.getMessageHistory();
        fs.writeFileSync(filename, JSON.stringify(history, null, 2));
        console.log(`💾 Message history exported to ${filename}`);
    }

    /**
     * Get rate limit stats for all profiles
     */
    getRateLimitStats(): Map<string, { sent: number; limit: number; resetIn: number }> {
        return this.rateLimiter.getAllStats();
    }

    /**
     * Get time window status
     */
    getTimeWindowStatus(): { allowed: boolean; reason?: string; nextAllowedTime?: Date } {
        return this.timeChecker.canSendNow();
    }

    /**
     * Get profile rotation status
     */
    getProfileRotationStatus(): { enabled: boolean; count: number; current?: string } {
        return {
            enabled: this.profileRotator.isRotationEnabled(),
            count: this.profileRotator.getProfileCount()
        };
    }

    /**
     * Stop the outreach engine
     */
    stop(): void {
        this.shouldStop = true;
    }

    /**
     * Check if engine is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default OutreachEngine;