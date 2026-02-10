/**
 * Seller Research Module - Enhanced
 * Discovers and extracts seller information from Bol.com
 * Features: AdsPower integration, fixed pagination, better error handling
 */

const puppeteer = require('puppeteer');

class SellerResearch {
    constructor(database, adspowerClient = null) {
        this.db = database;
        this.adspower = adspowerClient;
        this.baseUrl = 'https://www.bol.com';
        this.isRunning = false;
        this.shouldStop = false;
        this.useAdsPower = !!adspowerClient;
    }

    /**
     * Start seller discovery for keywords
     * Enhanced with pagination fix and better seller extraction
     */
    async discoverByKeywords(keywords, options = {}) {
        const {
            maxResults = 25,
            extractSellers = true,
            saveToDb = true,
            deepSearch = false,
            onProgress = null,
            useAdsPowerProfile = null
        } = options;

        this.isRunning = true;
        this.shouldStop = false;

        const results = {
            totalFound: 0,
            sellers: [],
            keywords: keywords,
            errors: []
        };

        let browser, page;

        try {
            // Launch browser (using AdsPower if available)
            if (this.useAdsPower && useAdsPowerProfile) {
                const adspowerResult = await this.adspower.startProfile(useAdsPowerProfile, {
                    headless: false
                });
                
                if (adspowerResult && adspowerResult.ws) {
                    // Connect to existing AdsPower browser
                    browser = await puppeteer.connect({
                        browserWSEndpoint: adspowerResult.ws.puppeteer
                    });
                    page = (await browser.pages())[0] || await browser.newPage();
                    console.log(`Connected to AdsPower profile: ${useAdsPowerProfile}`);
                } else {
                    throw new Error('Failed to connect to AdsPower profile');
                }
            } else {
                // Launch regular browser
                browser = await puppeteer.launch({
                    headless: true,
                    defaultViewport: { width: 1920, height: 1080 },
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled'
                    ]
                });
                page = await browser.newPage();
            }

            // Set realistic user agent
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Set extra headers to avoid detection
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            // Handle cookie consent
            await this.handleCookieConsent(page);

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
                    const sellers = await this.searchForKeyword(page, keyword, maxResults, deepSearch, onProgress);

                    for (const seller of sellers) {
                        if (this.shouldStop) break;

                        try {
                            if (extractSellers) {
                                await this.enrichSellerInfo(page, seller);
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
                                    seller: seller.shop_name,
                                    status: 'found'
                                });
                            }
                        } catch (sellerError) {
                            console.error(`Error processing seller "${seller.shop_name}":`, sellerError.message);
                            results.errors.push({ seller: seller.shop_name, error: sellerError.message });
                        }
                    }
                } catch (error) {
                    console.error(`Error processing keyword "${keyword}":`, error.message);
                    results.errors.push({ keyword, error: error.message });
                }

                // Add delay between keywords to avoid rate limiting
                if (i < keywords.length - 1 && !this.shouldStop) {
                    await this.randomDelay(2000, 4000);
                }
            }

        } catch (error) {
            console.error('Fatal error during research:', error);
            results.errors.push({ fatal: error.message });
            throw error;
        } finally {
            // Close browser if we launched it (not AdsPower)
            if (browser && !this.useAdsPower) {
                await browser.close();
            } else if (browser && this.useAdsPower && useAdsPowerProfile) {
                // Don't close AdsPower browser, just disconnect
                await browser.disconnect();
                console.log('Disconnected from AdsPower profile');
            }
            
            this.isRunning = false;
        }

        console.log(`\n✅ Research completed: ${results.totalFound} sellers found, ${results.errors.length} errors`);
        return results;
    }

    /**
     * Handle cookie consent dialog - Enhanced
     */
    async handleCookieConsent(page) {
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
        } catch (error) {
            console.log('ℹ️ Cookie consent handling:', error.message);
        }
    }

    /**
     * Search for sellers by keyword - Enhanced with fixed pagination
     */
    async searchForKeyword(page, keyword, maxResults, deepSearch, onProgress) {
        console.log(`🔍 Searching for: "${keyword}"`);

        // Navigate to search page directly
        const searchUrl = `${this.baseUrl}/nl/search/?searchtext=${encodeURIComponent(keyword)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await this.randomDelay(2000, 3000);

        const sellers = [];
        const seenSellers = new Set(); // Track unique sellers
        let pageCount = 0;
        const maxPages = deepSearch ? 10 : 5; // Increased max pages for more results
        let consecutiveEmptyPages = 0;

        while (sellers.length < maxResults && pageCount < maxPages && consecutiveEmptyPages < 2) {
            console.log(`  📄 Page ${pageCount + 1}: Extracting products...`);

            // Scroll to load lazy-loaded content
            await this.scrollToLoad(page);

            // Get product links with improved selectors
            const products = await page.evaluate(() => {
                const links = [];
                const seenUrls = new Set();

                // Multiple selectors for product links
                const selectors = [
                    'a[href*="/p/"]',
                    'a[href*="/product/"]',
                    '.product-item a',
                    '[data-test="product-item"] a',
                    '.list-item__product-info a',
                    '.product-title a'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        const href = el.href;
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
                    if (seller && !seenSellers.has(seller.sellerId)) {
                        seenSellers.add(seller.sellerId);
                        sellers.push(seller);
                        newSellersOnPage++;
                        
                        if (onProgress) {
                            onProgress({
                                found: sellers.length,
                                seller: seller.shopName,
                                status: 'extracted'
                            });
                        }
                    }
                } catch (error) {
                    console.error(`    ✗ Error extracting from ${productUrl}:`, error.message);
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
    async scrollToLoad(page) {
        try {
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            });
            await this.randomDelay(500, 1000);
            
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await this.randomDelay(1000, 1500);
        } catch (error) {
            console.log('Scroll warning:', error.message);
        }
    }

    /**
     * Extract seller info from product page - Enhanced
     */
    async extractSellerFromProduct(page, productUrl, keyword) {
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await this.randomDelay(800, 1500);

        const sellerInfo = await page.evaluate(() => {
            const info = {
                shopName: null,
                shopUrl: null,
                sellerId: null,
                rating: null,
                totalProducts: null,
                isBolCom: false,
                businessInfo: null
            };

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

            for (const selector of sellerSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 0 && text.length < 100) {
                        info.shopName = text;
                        const href = el.href;
                        if (href && (href.includes('/shop/') || href.includes('/winkel/'))) {
                            info.shopUrl = href;
                        }
                        break;
                    }
                }
            }

            // Look for seller page link in page
            if (!info.shopUrl) {
                const sellerLinkElements = document.querySelectorAll('a[href*="/shop/"], a[href*="/winkel/"]');
                for (const link of sellerLinkElements) {
                    const href = link.href;
                    if (href && !href.includes('/reviews') && !href.includes('/product')) {
                        info.shopUrl = href;
                        if (!info.shopName) {
                            info.shopName = link.textContent?.trim();
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

            for (const selector of ratingSelectors) {
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
    async enrichSellerInfo(page, seller) {
        if (!seller.shopUrl) {
            console.log(`  ℹ️ No shop URL for ${seller.shopName}, skipping enrichment`);
            return;
        }

        try {
            console.log(`  🔍 Enriching info for: ${seller.shopName}`);
            await page.goto(seller.shopUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            await this.randomDelay(1000, 2000);

            const enrichedInfo = await page.evaluate(() => {
                const info = {
                    contactEmail: null,
                    totalProducts: null,
                    businessName: null,
                    kvkNumber: null,
                    address: null,
                    phoneNumber: null
                };

                // Look for email
                const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
                for (const link of emailLinks) {
                    const email = link.href.replace('mailto:', '').trim();
                    if (email.includes('@') && !email.includes('example')) {
                        info.contactEmail = email;
                        break;
                    }
                }

                // Also check text for email patterns
                const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
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

                for (const selector of productCountSelectors) {
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

                for (const selector of businessSelectors) {
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
                const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
                if (phoneLinks.length > 0) {
                    info.phoneNumber = phoneLinks[0].href.replace('tel:', '');
                }

                return info;
            });

            Object.assign(seller, enrichedInfo);
            console.log(`  ✓ Enriched: ${seller.contactEmail ? 'email found' : 'no email'}`);
        } catch (error) {
            console.error(`    ✗ Error enriching ${seller.shopName}:`, error.message);
        }
    }

    /**
     * Navigate to next page of search results - Enhanced
     */
    async goToNextPage(page) {
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
                        const isVisible = await button.isIntersectingViewports?.() ?? true;
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

        } catch (error) {
            console.log('  ℹ️ No next page found:', error.message);
            return false;
        }
    }

    /**
     * Save seller to database with better error handling
     */
    async saveSeller(seller) {
        try {
            await this.db.insertSeller({
                shop_name: seller.shopName,
                shop_url: seller.shopUrl,
                keyword: seller.keyword,
                seller_id: seller.sellerId,
                rating: seller.rating,
                total_products: seller.totalProducts || seller.total_products,
                contact_email: seller.contactEmail,
                status: seller.status || 'new',
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
        } catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
                console.log(`  ℹ️ Seller already exists: ${seller.shopName}`);
            } else {
                console.error(`  ✗ Error saving seller:`, error.message);
            }
        }
    }

    /**
     * Generate unique seller ID from shop name
     */
    generateSellerId(shopName) {
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
    async randomDelay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Stop the discovery process
     */
    stop() {
        this.shouldStop = true;
        console.log('⚠️ Stop requested...');
    }

    /**
     * Check if discovery is running
     */
    isActive() {
        return this.isRunning;
    }
}

module.exports = SellerResearch;
