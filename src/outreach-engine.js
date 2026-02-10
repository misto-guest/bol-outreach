/**
 * Outreach Execution Engine
 * Handles sending messages via AdsPower profiles with rate limiting and compliance
 */

class OutreachEngine {
    constructor(database, adspowerClient) {
        this.db = database;
        this.adspower = adspowerClient;
        this.isRunning = false;
        this.shouldStop = false;
    }

    /**
     * Execute pending outreach from approval queue
     */
    async executeApprovedOutreach(onProgress = null) {
        this.isRunning = true;
        this.shouldStop = false;

        try {
            // Get all approved but not yet sent messages
            const approvedMessages = await this.db.all(`
                SELECT ol.*, s.shop_name, s.shop_url, c.name as campaign_name
                FROM outreach_log ol
                JOIN sellers s ON ol.seller_id = s.id
                JOIN campaigns c ON ol.campaign_id = c.id
                WHERE ol.approval_status = 'approved'
                AND ol.status = 'pending'
                ORDER BY ol.created_at ASC
            `);

            console.log(`Found ${approvedMessages.length} approved messages to send`);

            const results = {
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
                        await this.delay(5000 + Math.random() * 5000); // 5-10 seconds
                    }
                } catch (error) {
                    console.error(`Failed to send message to ${message.shop_name}:`, error.message);
                    results.failed++;

                    // Update status to failed
                    await this.db.run(
                        'UPDATE outreach_log SET status = ?, error_message = ? WHERE id = ?',
                        ['failed', error.message, message.id]
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
     * Send a single message via AdsPower
     */
    async sendMessage(message) {
        try {
            // Get available AdsPower profile
            const profile = await this.getAvailableProfile();
            if (!profile) {
                console.log('No available AdsPower profiles');
                return false;
            }

            console.log(`Sending message to ${message.shop_name} using profile ${profile.profile_id}`);

            // Start AdsPower profile
            const browser = await this.adspower.startProfile(profile.profile_id, {
                headless: false
            });

            if (!browser || !browser.puppeteerEndpoint) {
                throw new Error('Failed to start AdsPower profile');
            }

            // Connect to browser
            const puppeteer = require('puppeteer');
            const browserPage = await puppeteer.connect({
                browserWSEndpoint: browser.puppeteerEndpoint
            });

            const page = await browserPage.newPage();

            try {
                // Navigate to seller page
                await page.goto(message.shop_url || message.seller_url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                await page.waitForTimeout(2000);

                // Look for contact button/form
                const contactFound = await this.findAndSubmitContactForm(page, message.message_sent);

                if (contactFound) {
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
                    await this.db.recordMessageSent(profile.profile_id);

                    // Update campaign total
                    await this.db.run(
                        `UPDATE campaigns SET total_sent = total_sent + 1 WHERE id = ?`,
                        [message.campaign_id]
                    );

                    // Log audit
                    await this.db.logAudit('message_sent', 'outreach_log', message.id, 'system', {
                        seller: message.shop_name,
                        profile: profile.profile_id
                    });

                    console.log(`✓ Message sent to ${message.shop_name}`);
                    return true;
                } else {
                    throw new Error('Contact form not found');
                }
            } finally {
                await browserPage.close();
            }
        } catch (error) {
            console.error(`Failed to send message: ${error.message}`);
            return false;
        }
    }

    /**
     * Find and submit contact form on seller page
     */
    async findAndSubmitContactForm(page, messageText) {
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

            let contactButton = null;
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
                    const text = await button.evaluate(el => el.textContent.toLowerCase());
                    if (text.includes('contact') || text.includes('bericht') || text.includes('vraag')) {
                        contactButton = button;
                        break;
                    }
                }
            }

            if (contactButton) {
                await contactButton.click();
                await page.waitForTimeout(2000);

                // Look for message textarea
                const messageSelectors = [
                    'textarea[name="message"]',
                    'textarea[name="bericht"]',
                    'textarea#message',
                    'textarea[name="body"]',
                    '[data-test="message-field"]'
                ];

                let messageField = null;
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
                                await page.waitForTimeout(2000);
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
                const email = await emailLink.evaluate(el => el.href);
                console.log(`Found email: ${email}`);
                // In production, you would open email client or use email API
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error finding contact form:', error.message);
            return false;
        }
    }

    /**
     * Get available AdsPower profile (not rate limited)
     */
    async getAvailableProfile() {
        try {
            const profiles = await this.adspower.getProfiles();

            if (!profiles || profiles.length === 0) {
                return null;
            }

            // Check each profile for availability
            for (const profile of profiles) {
                const profileId = profile.profile_id || profile.id;
                const usage = await this.db.checkAdsPowerUsage(profileId);

                if (usage.canSend) {
                    return { profile_id: profileId, ...profile };
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting available profile:', error);
            return null;
        }
    }

    /**
     * Check if seller is in cooldown period
     */
    async checkSellerCooldown(sellerId) {
        const result = await this.db.get(`
            SELECT contacted_at
            FROM outreach_log
            WHERE seller_id = ?
            ORDER BY contacted_at DESC
            LIMIT 1
        `, [sellerId]);

        if (!result) return false;

        const lastContacted = new Date(result.contacted_at);
        const cooldownDays = 120;
        const cooldownUntil = new Date(lastContacted);
        cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays);

        return cooldownUntil > new Date();
    }

    /**
     * Stop the outreach engine
     */
    stop() {
        this.shouldStop = true;
    }

    /**
     * Check if engine is running
     */
    isActive() {
        return this.isRunning;
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = OutreachEngine;
