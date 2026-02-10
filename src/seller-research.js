/**
 * Seller Research Module
 * Discovers and extracts seller information from Bol.com
 */

const puppeteer = require('puppeteer');

class SellerResearch {
    constructor(database) {
        this.db = database;
        this.baseUrl = 'https://www.bol.com';
        this.isRunning = false;
        this.shouldStop = false;
    }

    /**
     * Start seller discovery for keywords
     */
    async discoverByKeywords(keywords, options = {}) {
        const {
            maxResults = 25,
            extractSellers = true,
            saveToDb = true,
            deepSearch = false,
            onProgress = null
        } = options;

        this.isRunning = true;
        this.shouldStop = false;

        const results = {
            totalFound: 0,
            sellers: [],
            keywords: keywords
        };

        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1920, height: 1080 }
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Handle cookie consent
            await this.handleCookieConsent(page);

            for (let i = 0; i < keywords.length; i++) {
                if (this.shouldStop) break;

                const keyword = keywords[i];

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: keywords.length,
                        keyword: keyword,
                        found: results.totalFound
                    });
                }

                try {
                    const sellers = await this.searchForKeyword(page, keyword, maxResults, deepSearch);

                    for (const seller of sellers) {
                        if (extractSellers) {
                            await this.enrichSellerInfo(page, seller);
                        }

                        if (saveToDb) {
                            await this.saveSeller(seller);
                        }

                        results.sellers.push(seller);
                        results.totalFound++;
                    }
                } catch (error) {
                    console.error(`Error processing keyword "${keyword}":`, error.message);
                }
            }

            await browser.close();
        } catch (error) {
            await browser.close();
            throw error;
        } finally {
            this.isRunning = false;
        }

        return results;
    }

    /**
     * Handle cookie consent dialog
     */
    async handleCookieConsent(page) {
        try {
            await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Wait a bit for cookie dialog
            await page.waitForTimeout(2000);

            // Try multiple cookie consent selectors
            const cookieSelectors = [
                'button[data-test="cookie-accept-all"]',
                '.cookie-consent .accept',
                '#accept-cookies',
                'button.js-cookie-consent-accept'
            ];

            for (const selector of cookieSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.click(selector);
                    await page.waitForTimeout(1000);
                    console.log('Cookie consent accepted');
                    break;
                } catch (e) {
                    // Try next selector
                }
            }
        } catch (error) {
            console.log('No cookie consent or already handled');
        }
    }

    /**
     * Search for sellers by keyword
     */
    async searchForKeyword(page, keyword, maxResults, deepSearch) {
        console.log(`Searching for keyword: ${keyword}`);

        // Perform search
        const searchInput = await page.$('#searchfor');
        if (searchInput) {
            await searchInput.click({ clickCount: 3 });
            await searchInput.type(keyword);
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        }

        await page.waitForTimeout(2000);

        const sellers = [];
        let pageCount = 0;
        const maxPages = deepSearch ? 5 : 2;

        while (sellers.length < maxResults && pageCount < maxPages) {
            // Get product links
            const products = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('a[href*="/p/"]').forEach(el => {
                    const href = el.href;
                    if (!links.find(l => l === href)) {
                        links.push(href);
                    }
                });
                return links.slice(0, 20); // Limit to 20 per page
            });

            console.log(`Found ${products.length} products on page ${pageCount + 1}`);

            // Extract sellers from products
            for (const productUrl of products) {
                if (sellers.length >= maxResults) break;

                try {
                    const seller = await this.extractSellerFromProduct(page, productUrl, keyword);
                    if (seller) {
                        sellers.push(seller);
                    }
                } catch (error) {
                    console.error('Error extracting seller:', error.message);
                }
            }

            // Try to go to next page
            if (sellers.length < maxResults) {
                const hasNextPage = await this.goToNextPage(page);
                if (!hasNextPage) break;
                pageCount++;
            }
        }

        console.log(`Found ${sellers.length} sellers for "${keyword}"`);
        return sellers;
    }

    /**
     * Extract seller info from product page
     */
    async extractSellerFromProduct(page, productUrl, keyword) {
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForTimeout(1000);

        const sellerInfo = await page.evaluate(() => {
            const info = {
                shopName: null,
                shopUrl: null,
                sellerId: null,
                rating: null,
                totalProducts: null,
                isBolCom: false
            };

            // Check if sold by bol.com
            const bodyText = document.body.innerText;
            if (bodyText.includes('Verkoop door bol') || bodyText.includes('Verkoop door Bol.com')) {
                info.isBolCom = true;
                return info;
            }

            // Try to find seller info
            const sellerSelectors = [
                '[data-test="seller-name"]',
                '.seller-name',
                '.shop-name',
                '.vendor-name'
            ];

            for (const selector of sellerSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    info.shopName = el.textContent.trim();
                    break;
                }
            }

            // Look for seller page link
            const sellerLink = document.querySelector('a[href*="/shop/"], a[href*="/winkel/"]');
            if (sellerLink) {
                info.shopUrl = sellerLink.href;
            }

            // Extract rating if available
            const ratingEl = document.querySelector('[data-test="rating"], .rating, .stars');
            if (ratingEl) {
                const ratingMatch = ratingEl.textContent.match(/([\d.]+)\s*[★*]?/);
                if (ratingMatch) {
                    info.rating = ratingMatch[1];
                }
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

        return sellerInfo;
    }

    /**
     * Enrich seller information by visiting their page
     */
    async enrichSellerInfo(page, seller) {
        if (!seller.shopUrl) return;

        try {
            await page.goto(seller.shopUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            await page.waitForTimeout(1000);

            const enrichedInfo = await page.evaluate(() => {
                const info = {
                    contactEmail: null,
                    totalProducts: null
                };

                // Look for email
                const emailLink = document.querySelector('a[href^="mailto:"]');
                if (emailLink) {
                    info.contactEmail = emailLink.href.replace('mailto:', '');
                }

                // Look for product count
                const productCountSelectors = [
                    '[data-test="product-count"]',
                    '.product-count',
                    '.total-products'
                ];

                for (const selector of productCountSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const countMatch = el.textContent.match(/(\d+)/);
                        if (countMatch) {
                            info.totalProducts = parseInt(countMatch[1]);
                            break;
                        }
                    }
                }

                return info;
            });

            Object.assign(seller, enrichedInfo);
        } catch (error) {
            console.error('Error enriching seller info:', error.message);
        }
    }

    /**
     * Navigate to next page of search results
     */
    async goToNextPage(page) {
        try {
            const nextButton = await page.$('a[rel="next"], .next-page, [data-test="next-page"]');
            if (nextButton) {
                await nextButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                await page.waitForTimeout(1000);
                return true;
            }
        } catch (error) {
            console.log('No next page found');
        }
        return false;
    }

    /**
     * Save seller to database
     */
    async saveSeller(seller) {
        try {
            await this.db.insertSeller({
                shop_name: seller.shopName,
                shop_url: seller.shopUrl,
                keyword: seller.keyword,
                seller_id: seller.sellerId,
                rating: seller.rating,
                total_products: seller.totalProducts,
                contact_email: seller.contactEmail,
                status: seller.status || 'new'
            });
            console.log(`Saved seller: ${seller.shopName}`);
        } catch (error) {
            // Seller might already exist - that's okay
            console.log(`Seller already exists or error saving: ${seller.shopName}`);
        }
    }

    /**
     * Generate unique seller ID from shop name
     */
    generateSellerId(shopName) {
        return shopName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);
    }

    /**
     * Stop the discovery process
     */
    stop() {
        this.shouldStop = true;
    }

    /**
     * Check if discovery is running
     */
    isActive() {
        return this.isRunning;
    }
}

module.exports = SellerResearch;
