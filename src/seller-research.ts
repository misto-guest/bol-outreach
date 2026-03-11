/**
 * Seller Research Module - Enhanced
 * Discovers and extracts seller information from Bol.com
 * Features: AdsPower integration, fixed pagination, better error handling
 */

import { Browser, Page } from 'puppeteer-core';
import AdsPowerClient from './adspower-client';
import Database from './database';
import { ResearchProgress, SellerStatus } from './types';

// Types for seller information
export interface SellerInfo {
    shopName: string | null;
    shopUrl: string | null;
    sellerId: string | null;
    rating: string | null;
    totalProducts: string | null;
    contactEmail?: string | null;
    businessName?: string | null;
    kvkNumber?: string | null;
    address?: string | null;
    phoneNumber?: string | null;
    isBolCom: boolean;
    businessInfo?: string | null;
    keyword?: string;
    status?: string;
    productUrl?: string;
    metadata?: Record<string, unknown>;
}

export interface DiscoveryOptions {
    maxResults?: number;
    extractSellers?: boolean;
    saveToDb?: boolean;
    deepSearch?: boolean;
    onProgress?: (progress: ResearchProgress) => void;
    adsPowerProfileId?: string;
}

interface DiscoveryResults {
    totalFound: number;
    sellers: SellerInfo[];
    keywords: string[];
    errors: Array<{ keyword?: string; seller?: string; error: string; fatal?: string }>;
}

interface EnrichedSellerInfo {
    contactEmail: string | null;
    totalProducts: string | null;
    businessName: string | null;
    kvkNumber: string | null;
    address: string | null;
    phoneNumber: string | null;
}

class SellerResearch {
    private readonly db: Database;
    private readonly adspower: AdsPowerClient | null;
    private readonly baseUrl: string;
    private isRunning: boolean;
    private shouldStop: boolean;

    constructor(database: Database, adspowerClient: AdsPowerClient | null = null) {
        this.db = database;
        this.adspower = adspowerClient;
        this.baseUrl = 'https://www.bol.com';
        this.isRunning = false;
        this.shouldStop = false;
    }

    /**
     * Start seller discovery for keywords
     * Enhanced with pagination fix and better seller extraction
     */
    async discoverByKeywords(keywords: string[], options: DiscoveryOptions): Promise<DiscoveryResults> {
        const {
            maxResults = 25,
            extractSellers = true,
            saveToDb = true,
            deepSearch = false,
            onProgress = undefined,
            adsPowerProfileId
        } = options;

        this.isRunning = true;
        this.shouldStop = false;

        const results: DiscoveryResults = {
            totalFound: 0,
            sellers: [],
            keywords: keywords,
            errors: []
        };

        let browser: Browser | undefined;
        let page: Page | undefined;

        try {
            if (!this.adspower || !adsPowerProfileId) {
                throw new Error('AdsPower client not available or profile ID not provided');
            }
            const adspowerResult = await this.adspower.startProfile(adsPowerProfileId);
            const browser = adspowerResult.browser;
            const pages = await browser.pages();
            page = pages[0] || await browser.newPage();
            console.log(`Connected to AdsPower profile: ${adsPowerProfileId}`);

            // Handle cookie consent
            await this.handleCookieConsent(page!);

            // Process each keyword
            for (let i = 0; i < keywords.length; i++) {
                if (this.shouldStop) break;

                const keyword = keywords[i];
                console.log(`\n[${i + 1}/${keywords.length}] Processing keyword: "${keyword}"`);

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: keywords.length,
                        keyword: keyword,
                        found: results.totalFound,
                        status: 'searching'
                    });
                }

                try {
                    const sellers = await this.searchForKeyword(page!, keyword, maxResults, deepSearch, onProgress);

                    for (const seller of sellers) {
                        if (this.shouldStop) break;

                        try {
                            if (extractSellers) {
                                await this.enrichSellerInfo(page!, seller);
                            }

                            if (saveToDb) {
                                await this.saveSeller(seller);
                            }

                            results.sellers.push(seller);
                            results.totalFound++;

                            if (onProgress) {
                                onProgress({
                                    current: i + 1,
                                    total: keywords.length,
                                    keyword: keyword,
                                    found: results.totalFound,
                                    seller: seller.shopName!,
                                    status: 'found'
                                });
                            }
                        } catch (sellerError: unknown) {
                            console.error(`Error processing seller "${seller.shopName}":`, (sellerError as Error).message);
                            results.errors.push({ seller: seller.shopName!, error: (sellerError as Error).message });
                        }
                    }
                } catch (error: unknown) {
                    console.error(`Error processing keyword "${keyword}":`, (error as Error).message);
                    results.errors.push({ keyword, error: (error as Error).message });
                }

                // Add delay between keywords to avoid rate limiting
                if (i < keywords.length - 1 && !this.shouldStop) {
                    await this.randomDelay(2000, 4000);
                }
            }

        } catch (error: unknown) {
            console.error('Fatal error during research:', error);
            results.errors.push({ error: (error as Error).message, fatal: (error as Error).message });
            throw error;
        } finally {
            await page?.close();
            await browser?.close();
            console.log('Disconnected from AdsPower profile');
            this.isRunning = false;
        }

        console.log(`\n✅ Research completed: ${results.totalFound} sellers found, ${results.errors.length} errors`);
        return results;
    }

    /**
     * Handle cookie consent dialog - Enhanced
     */
    private async handleCookieConsent(page: Page): Promise<void> {
        try {
            console.log('🍪 Handling cookie consent...');
            await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Wait for page to load
            await this.randomDelay(2000, 3000);

            // Try multiple cookie consent selectors
            const cookieSelectors = [
                'button[data-test="cookie-accept-all"]',
                '.cookie-consent .accept',
                '#accept-cookies',
                'button.js-cookie-consent-accept',
                'button:has-text("Accepteer alles")',
                'button:has-text("Akkoord")',
                '.consent-button-accept',
                '#js-cookie-consent-accept',
                'button[data-testid="cookie-accept"]'
            ];

            for (const selector of cookieSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 3000, visible: true });
                    await page.click(selector, { delay: 100 });
                    await this.randomDelay(1000, 1500);
                    console.log('✓ Cookie consent accepted');
                    return;
                } catch (e) {
                    // Try next selector
                }
            }

            // Try to find button by text
            const buttons = await page.$$('button');
            for (const button of buttons) {
                try {
                    const text = await button.evaluate(el => el.textContent?.trim() || '');
                    if (text.includes('Accepteer alles') || text.includes('Akkoord') || 
                        text.includes('Accept all') || text.includes('Begrepen')) {
                        await button.click({ delay: 100 });
                        await this.randomDelay(1000, 1500);
                        console.log(`✓ Cookie consent accepted using text: "${text}"`);
                        return;
                    }
                } catch (e) {
                    // Continue
                }
            }

            console.log('ℹ️ No cookie consent dialog found (may have been accepted already)');
        } catch (error: unknown) {
            console.log('ℹ️ Cookie consent handling:', (error as Error).message);
        }
    }

    /**
     * Search for sellers by keyword - Enhanced with fixed pagination
     */
    private async searchForKeyword(page: Page, keyword: string, maxResults: number, deepSearch: boolean, onProgress: ((progress: ResearchProgress) => void) | undefined): Promise<SellerInfo[]> {
        console.log(`🔍 Searching for: "${keyword}"`);

        // Navigate to search page directly
        const searchUrl = `${this.baseUrl}/nl/nl/s/?searchtext=${encodeURIComponent(keyword)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await this.randomDelay(2000, 3000);

        const sellers: SellerInfo[] = [];
        const seenSellers = new Set<string>(); // Track unique sellers
        let pageCount = 0;
        const maxPages = deepSearch ? 10 : 5; // Increased max pages for more results
        let consecutiveEmptyPages = 0;

        while (sellers.length < maxResults && pageCount < maxPages && consecutiveEmptyPages < 2) {
            console.log(`  📄 Page ${pageCount + 1}: Extracting products...`);

            // Scroll to load lazy-loaded content
            await this.scrollToLoad(page);

            // Get product links with improved selectors
            const products = await page.evaluate(() => {
                // @ts-ignore - DOM types in browser context
                const links: string[] = [];
                const seenUrls = new Set<string>();

                // Multiple selectors for product links
                const selectors = [
                    'a[href*="/p/"]',
                    'a[href*="/product/"]',
                    '.product-item a',
                    '[data-test="product-item"] a',
                    '.list-item__product-info a',
                    '.product-title a'
                ];

                // @ts-ignore
                for (const selector of selectors) {
                    // @ts-ignore
                    const elements = document.querySelectorAll(selector);
                    for (let i = 0; i < elements.length; i++) {
                        // @ts-ignore
                        const el = elements[i];
                        const href = (el as unknown as { href: string }).href;
                        if (href && !seenUrls.has(href) && href.includes('/p/')) {
                            seenUrls.add(href);
                            links.push(href);
                        }
                    }
                }

                return links;
            });

            console.log(`  ✓ Found ${products.length} unique products on page ${pageCount + 1}`);

            // Extract sellers from products
            let newSellersOnPage = 0;
            for (const productUrl of products) {
                if (sellers.length >= maxResults) break;
                if (this.shouldStop) break;

                try {
                    const seller = await this.extractSellerFromProduct(page, productUrl, keyword);
                    if (seller && !seenSellers.has(seller.sellerId!)) {
                        seenSellers.add(seller.sellerId!);
                        sellers.push(seller);
                        newSellersOnPage++;
                        
                        if (onProgress) {
                            onProgress({
                                current: sellers.length,
                                total: maxResults,
                                found: sellers.length,
                                seller: seller.shopName!,
                                status: 'extracted'
                            });
                        }
                    }
                } catch (error: unknown) {
                    console.error(`    ✗ Error extracting from ${productUrl}:`, (error as Error).message);
                }

                // Small delay between product visits
                await this.randomDelay(300, 800);
            }

            console.log(`  ✓ Extracted ${newSellersOnPage} new sellers from page ${pageCount + 1}`);

            if (newSellersOnPage === 0) {
                consecutiveEmptyPages++;
            } else {
                consecutiveEmptyPages = 0;
            }

            // Try to go to next page
            if (sellers.length < maxResults && !this.shouldStop) {
                const hasNextPage = await this.goToNextPage(page);
                if (!hasNextPage) {
                    console.log('  ℹ️ No more pages available');
                    break;
                }
                pageCount++;
            }
        }

        console.log(`📊 Found ${sellers.length} unique sellers for "${keyword}"`);
        return sellers;
    }

    /**
     * Scroll to load lazy content
     */
    private async scrollToLoad(page: Page): Promise<void> {
        try {
            await page.evaluate(() => {
                // @ts-ignore
                window.scrollTo(0, document.body.scrollHeight / 2);
            });
            await this.randomDelay(500, 1000);
            
            await page.evaluate(() => {
                // @ts-ignore
                window.scrollTo(0, document.body.scrollHeight);
            });
            await this.randomDelay(1000, 1500);
        } catch (error: unknown) {
            console.log('Scroll warning:', (error as Error).message);
        }
    }

    /**
     * Extract seller info from product page - Enhanced
     */
    private async extractSellerFromProduct(page: Page, productUrl: string, keyword: string): Promise<SellerInfo | null> {
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await this.randomDelay(800, 1500);

        const sellerInfo = await page.evaluate(() => {
            // @ts-ignore - DOM types in browser context
            const info: SellerInfo = {
                shopName: null,
                shopUrl: null,
                sellerId: null,
                rating: null,
                totalProducts: null,
                isBolCom: false,
                businessInfo: null
            };

            // @ts-ignore
            const bodyText = document.body.innerText;

            // Check if sold by bol.com
            if (bodyText.includes('Verkoop door bol') || 
                bodyText.includes('Verkoop door Bol.com') ||
                bodyText.includes('Verkoop en bezorging door bol.com')) {
                info.isBolCom = true;
                return info;
            }

            // Enhanced seller selectors
            const sellerSelectors = [
                '[data-test="seller-name"]',
                '.seller-name',
                '.shop-name',
                '.vendor-name',
                '.sold-by__seller',
                '.wsp-sold-by__seller-name',
                '.product-page__seller-name',
                'a[href*="/shop/"]',
                'a[href*="/winkel/"]',
                '.buy-box__seller-name'
            ];

            // @ts-ignore
            for (const selector of sellerSelectors) {
                // @ts-ignore
                const el = document.querySelector(selector);
                if (el) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 0 && text.length < 100) {
                        info.shopName = text;
                        // @ts-ignore
                        const href = (el as unknown as { href: string }).href;
                        if (href && (href.includes('/shop/') || href.includes('/winkel/'))) {
                            info.shopUrl = href;
                        }
                        break;
                    }
                }
            }

            // Look for seller page link in page
            if (!info.shopUrl) {
                // @ts-ignore
                const sellerLinkElements = document.querySelectorAll('a[href*="/shop/"], a[href*="/winkel/"]');
                for (let i = 0; i < sellerLinkElements.length; i++) {
                    // @ts-ignore
                    const link = sellerLinkElements[i];
                    // @ts-ignore
                    const href = (link as unknown as { href: string }).href;
                    if (href && !href.includes('/reviews') && !href.includes('/product')) {
                        info.shopUrl = href;
                        if (!info.shopName) {
                            info.shopName = link.textContent?.trim() || null;
                        }
                        break;
                    }
                }
            }

            // Extract rating
            const ratingSelectors = [
                '[data-test="rating"]',
                '.rating',
                '.stars',
                '.seller-rating',
                '.review-score'
            ];

            // @ts-ignore
            for (const selector of ratingSelectors) {
                // @ts-ignore
                const el = document.querySelector(selector);
                if (el) {
                    const ratingMatch = el.textContent?.match(/([\d.]+)\s*[★*]?/);
                    if (ratingMatch) {
                        info.rating = ratingMatch[1];
                        break;
                    }
                }
            }

            // Extract business info (if available)
            const businessText = bodyText.match(/(?:Officieel(?:\s+verkoper)?|Business|Handelaar)[\s\S]{0,200}/i);
            if (businessText) {
                info.businessInfo = businessText[0].trim();
            }

            return info;
        });

        // Skip if sold by bol.com
        if (sellerInfo.isBolCom || !sellerInfo.shopName) {
            return null;
        }

        // Generate seller ID
        sellerInfo.sellerId = this.generateSellerId(sellerInfo.shopName);
        sellerInfo.keyword = keyword;
        sellerInfo.status = 'new';
        sellerInfo.productUrl = productUrl;

        return sellerInfo;
    }

    /**
     * Enrich seller information by visiting their page - Enhanced
     */
    private async enrichSellerInfo(page: Page, seller: SellerInfo): Promise<void> {
        if (!seller.shopUrl) {
            console.log(`  ℹ️ No shop URL for ${seller.shopName}, skipping enrichment`);
            return;
        }

        try {
            console.log(`  🔍 Enriching info for: ${seller.shopName}`);
            await page.goto(seller.shopUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            await this.randomDelay(1000, 2000);

            const enrichedInfo = await page.evaluate((): EnrichedSellerInfo => {
                // @ts-ignore - DOM types in browser context
                const info: EnrichedSellerInfo = {
                    contactEmail: null,
                    totalProducts: null,
                    businessName: null,
                    kvkNumber: null,
                    address: null,
                    phoneNumber: null
                };

                // Look for email
                // @ts-ignore
                const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
                for (let i = 0; i < emailLinks.length; i++) {
                    // @ts-ignore
                    const link = emailLinks[i];
                    // @ts-ignore
                    const email = (link as unknown as { href: string }).href.replace('mailto:', '').trim();
                    if (email.includes('@') && !email.includes('example')) {
                        info.contactEmail = email;
                        break;
                    }
                }

                // Also check text for email patterns
                const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                // @ts-ignore
                const bodyText = document.body.innerText;
                const emails = bodyText.match(emailRegex);
                if (emails && emails.length > 0) {
                    info.contactEmail = emails[0];
                }

                // Look for product count
                const productCountSelectors = [
                    '[data-test="product-count"]',
                    '.product-count',
                    '.total-products',
                    '.assortment-size',
                    '.seller-stats__products'
                ];

                // @ts-ignore
                for (const selector of productCountSelectors) {
                    // @ts-ignore
                    const el = document.querySelector(selector);
                    if (el) {
                        const countMatch = el.textContent?.match(/(\d+(?:\.\d+)?[\dKkMm]*)/);
                        if (countMatch) {
                            info.totalProducts = countMatch[1];
                            break;
                        }
                    }
                }

                // Look for business information
                const businessSelectors = [
                    '.business-name',
                    '.company-name',
                    '.kvk-number',
                    '.chamber-of-commerce'
                ];

                // @ts-ignore
                for (const selector of businessSelectors) {
                    // @ts-ignore
                    const el = document.querySelector(selector);
                    if (el && el.textContent?.trim()) {
                        const text = el.textContent.trim();
                        if (text.includes('KvK') || text.includes('Kamer')) {
                            info.kvkNumber = text;
                        } else {
                            info.businessName = text;
                        }
                    }
                }

                // Look for phone
                // @ts-ignore
                const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
                if (phoneLinks.length > 0) {
                    // @ts-ignore
                    info.phoneNumber = (phoneLinks[0] as any).href.replace('tel:', '');
                }

                return info;
            });

            Object.assign(seller, enrichedInfo);
            console.log(`  ✓ Enriched: ${seller.contactEmail ? 'email found' : 'no email'}`);
        } catch (error: unknown) {
            console.error(`    ✗ Error enriching ${seller.shopName}:`, (error as Error).message);
        }
    }

    /**
     * Navigate to next page of search results - Enhanced
     */
    private async goToNextPage(page: Page): Promise<boolean> {
        try {
            await this.randomDelay(1000, 1500);

            // Try multiple selectors for next button
            const nextSelectors = [
                'a[rel="next"]',
                '.next-page',
                '[data-test="next-page"]',
                'a.pagination__next',
                '.pagination-next',
                'button:has-text("Volgende")',
                'a:has-text("›")',
                'a:has-text("→")'
            ];

            for (const selector of nextSelectors) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        const isVisible = await button.isIntersectingViewport?.() ?? true;
                        if (isVisible) {
                            await button.click({ delay: 100 });
                            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
                            await this.randomDelay(1500, 2500);
                            console.log('  ✓ Moved to next page');
                            return true;
                        }
                    }
                } catch (e) {
                    // Try next selector
                }
            }

            // Try direct URL manipulation
            const currentUrl = page.url();
            const urlObj = new URL(currentUrl);
            const currentPage = parseInt(urlObj.searchParams.get('page') || '1');
            urlObj.searchParams.set('page', String(currentPage + 1));
            
            await page.goto(urlObj.toString(), { waitUntil: 'networkidle2', timeout: 15000 });
            await this.randomDelay(1500, 2500);
            console.log('  ✓ Moved to next page (via URL)');
            return true;

        } catch (error: unknown) {
            console.log('  ℹ️ No next page found:', (error as Error).message);
            return false;
        }
    }

    /**
     * Save seller to database with better error handling
     */
    private async saveSeller(seller: SellerInfo): Promise<void> {
        try {
            await this.db.insertSeller({
                shop_name: seller.shopName,
                shop_url: seller.shopUrl,
                keyword: seller.keyword,
                seller_id: seller.sellerId,
                rating: seller.rating,
                total_products: seller.totalProducts ? parseInt(seller.totalProducts) || null : null,
                contact_email: seller.contactEmail,
                status: (seller.status as SellerStatus) || 'new',
                metadata: JSON.stringify({
                    businessName: seller.businessName,
                    kvkNumber: seller.kvkNumber,
                    address: seller.address,
                    phoneNumber: seller.phoneNumber,
                    businessInfo: seller.businessInfo,
                    productUrl: seller.productUrl,
                    discoveredAt: new Date().toISOString()
                })
            });
            console.log(`  ✓ Saved seller: ${seller.shopName}`);
        } catch (error: unknown) {
            if ((error as Error).message.includes('UNIQUE constraint')) {
                console.log(`  ℹ️ Seller already exists: ${seller.shopName}`);
            } else {
                console.error(`  ✗ Error saving seller:`, (error as Error).message);
            }
        }
    }

    /**
     * Generate unique seller ID from shop name
     */
    private generateSellerId(shopName: string): string {
        return shopName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }

    /**
     * Random delay to avoid detection
     */
    private async randomDelay(min: number, max: number): Promise<void> {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Stop the discovery process
     */
    stop(): void {
        this.shouldStop = true;
        console.log('⚠️ Stop requested...');
    }

    /**
     * Check if discovery is running
     */
    isActive(): boolean {
        return this.isRunning;
    }
}

export default SellerResearch;