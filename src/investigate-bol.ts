/**
 * Bol.com UI Investigation Script
 * 
 * This script investigates Bol.com to document:
 * 1. Seller info selectors
 * 2. Contact buttons and forms
 * 3. Contact flow step-by-step
 * 4. CAPTCHA/security measures
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { promises as fs } from 'fs';
import path from 'path';

// Types for investigation findings
interface InvestigationFindings {
    timestamp: string;
    url: string;
    selectors: {
        searchInput?: string;
        productLink?: string;
        sellerInfo?: string;
        sellerPageLink?: string;
        possibleSelectors?: Array<{
            tag: string;
            class: string;
            id: string;
            text: string;
        }>;
        possibleContactSelectors?: Array<{
            tag: string;
            class: string;
            id: string;
            text: string;
            href: string;
        }>;
        sellerContactOptions?: Array<{
            type: string;
            value?: string;
            text?: string;
        }>;
    };
    flows: Array<{
        step: number;
        action: string;
        url: string;
        query?: string;
    }>;
    security: Array<{
        type: string;
        detected?: boolean;
        note?: string;
        selector?: string;
        text?: string;
    }>;
    screenshots: string[];
    error?: string;
}

// Helper function for delay
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const CONFIG = {
    baseUrl: 'https://www.bol.com',
    searchQuery: 'laptop',
    screenshotsDir: path.join(__dirname, '../docs/screenshots'),
    docsDir: path.join(__dirname, '../docs')
};

// Ensure directories exist
async function ensureDirs(): Promise<void> {
    await fs.mkdir(CONFIG.screenshotsDir, { recursive: true });
    await fs.mkdir(CONFIG.docsDir, { recursive: true });
}

// Take screenshot with label
async function screenshot(page: Page, label: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${label}_${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
}

// Main investigation function
async function investigateBol(): Promise<InvestigationFindings> {
    console.log('🔍 Starting Bol.com UI Investigation...\n');
    
    await ensureDirs();
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const findings: InvestigationFindings = {
        timestamp: new Date().toISOString(),
        url: CONFIG.baseUrl,
        selectors: {},
        flows: [],
        security: [],
        screenshots: []
    };
    
    try {
        // Step 1: Navigate to Bol.com homepage
        console.log('📍 Step 1: Navigating to Bol.com homepage...');
        await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(3000);
        findings.screenshots.push(await screenshot(page, '01_homepage'));
        findings.flows.push({ step: 1, action: 'Navigate to homepage', url: page.url() });
        
        // Check for cookie consent
        console.log('🍪 Checking for cookie consent...');
        try {
            const cookieSelectors = [
                'button[data-test="cookie-accept-all"]',
                '.cookie-consent .accept',
                '#accept-cookies',
                'button.js-cookie-consent-accept'
            ];
            
            let cookieAccepted = false;
            for (const selector of cookieSelectors) {
                const button = await page.$(selector);
                if (button) {
                    await button.click();
                    await delay(2000);
                    console.log(`  ✓ Cookie consent accepted using: ${selector}`);
                    findings.security.push({ type: 'cookie_consent', selector });
                    cookieAccepted = true;
                    break;
                }
            }
            
            if (!cookieAccepted) {
                const buttons = await page.$$('button');
                for (const button of buttons) {
                    const text = await button.evaluate(el => el.textContent || '');
                    if (text.includes('Accepteer') || text.includes('Akkoord') || text.includes('Accept')) {
                        await button.click();
                        await delay(2000);
                        console.log(`  ✓ Cookie consent accepted using text: ${text}`);
                        findings.security.push({ type: 'cookie_consent', text });
                        break;
                    }
                }
            }
        } catch (e: any) {
            console.log('  ℹ️  No cookie consent found or already handled');
        }
        
        // Step 2: Perform a search
        console.log('\n📍 Step 2: Performing search for:', CONFIG.searchQuery);
        const searchSelectors = [
            'input[data-test="search-input"]',
            '#searchfor',
            'input[name="search"]',
            'input[placeholder*="Zoek"]',
            '.search-input'
        ];
        
        let searchInput: any | null = null;
        for (const selector of searchSelectors) {
            searchInput = await page.$(selector);
            if (searchInput) {
                console.log(`  ✓ Found search input: ${selector}`);
                findings.selectors.searchInput = selector;
                break;
            }
        }
        
        if (!searchInput) {
            throw new Error('Search input not found');
        }
        
        await searchInput.type(CONFIG.searchQuery);
        await delay(500);
        
        const searchButton = await page.$('button[data-test="search-button"], button[type="submit"]');
        if (searchButton) {
            await searchButton.click();
        } else {
            await page.keyboard.press('Enter');
        }
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
            console.log('  ℹ️  Navigation timeout, waiting instead...');
            return delay(3000);
        });
        
        await delay(3000);
        findings.screenshots.push(await screenshot(page, '02_search_results'));
        findings.flows.push({ step: 2, action: 'Perform search', query: CONFIG.searchQuery, url: page.url() });
        
        // Step 3: Click on first product to view seller info
        console.log('\n📍 Step 3: Clicking first product...');
        const productSelectors = [
            'a[data-test="product-item"]',
            '.product-item--title a',
            '.list-block__list-item .product-title',
            'a[href*="/p/"]',
            '.product-list .product a'
        ];
        
        let productLink: any | null = null;
        let productUrl: string | null = null;
            for (const selector of productSelectors) {
                productLink = await page.$(selector);
                if (productLink) {
                    productUrl = await productLink.evaluate((el: any) => el.href);
                    console.log(`  ✓ Found product with selector: ${selector}`);
                    console.log(`    URL: ${productUrl}`);
                    findings.selectors.productLink = selector;
                    break;
                }
            }
        
        if (productUrl) {
            await page.goto(productUrl, { waitUntil: 'networkidle2' });
            await delay(3000);
            findings.screenshots.push(await screenshot(page, '03_product_page'));
            findings.flows.push({ step: 3, action: 'View product page', url: page.url() });
            
            // Step 4: Look for seller/shop information
            console.log('\n📍 Step 4: Looking for seller/shop information...');
            
            const sellerSelectors = [
                '[data-test="seller-name"]',
                '.seller-name',
                '.shop-name',
                '.vendor-name',
                'a[href*="/shop/"]',
                '.sold-by',
                '[data-test="sold-by"]',
                '.wsp-sold-by__seller-name',
                '.product-page__seller'
            ];
            
            let sellerInfo: { selector: string; text: string; href: string } | null = null;
            for (const selector of sellerSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const text = await element.evaluate(el => (el.textContent || '').trim());
                        const href = await element.evaluate(el => el.getAttribute('href') || '');
                        console.log(`  ✓ Found seller info with selector: ${selector}`);
                        console.log(`    Text: ${text}`);
                        console.log(`    Link: ${href || 'N/A'}`);
                        sellerInfo = { selector, text, href };
                        findings.selectors.sellerInfo = selector;
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            if (!sellerInfo) {
                console.log('  ⚠️  Seller info not found with known selectors');
                console.log('  📄 Dumping page structure for seller info area...');
                const pageStructure = await page.evaluate(() => {
                    const sellerRelated = Array.from(document.querySelectorAll('*')).filter((el: any) => {
                        const text = el.textContent?.toLowerCase() || '';
                        return (text.includes('verkoper') || 
                                text.includes('seller') || 
                                text.includes('winkel') ||
                                text.includes('shop') ||
                                text.includes('verkocht') ||
                                text.includes('door')) &&
                               (el.textContent?.length || 0) < 200;
                    }).slice(0, 30).map((el: any) => ({
                        tag: el.tagName,
                        class: el.className,
                        id: el.id,
                        text: (el.textContent?.trim() || '').substring(0, 100)
                    }));
                    return { sellerRelated };
                });
                findings.selectors.possibleSelectors = pageStructure.sellerRelated;
                
                console.log('  Found', pageStructure.sellerRelated.length, 'potential seller-related elements');
                pageStructure.sellerRelated.slice(0, 10).forEach((el: any) => {
                    console.log(`    - <${el.tag}> class="${el.class}" text="${el.text}"`);
                });
            }
            
            // Step 5: Look for contact options
            console.log('\n📍 Step 5: Looking for contact options...');
            
            const contactElements = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('button, a'));
                return elements.filter((el: any) => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('contact') ||
                           text.includes('vraag') ||
                           text.includes('bericht') ||
                           text.includes('mail');
                }).map((el: any) => ({
                    tag: el.tagName,
                    class: el.className,
                    id: el.id,
                    text: (el.textContent?.trim() || '').substring(0, 80),
                    href: el.href || ''
                }));
            });
            
            if (contactElements.length > 0) {
                console.log(`  ✓ Found ${contactElements.length} contact-related elements:`);
                contactElements.forEach((el: any, i: number) => {
                    console.log(`    ${i + 1}. <${el.tag}> "${el.text}" ${el.href ? `- ${el.href}` : ''}`);
                });
                findings.selectors.possibleContactSelectors = contactElements;
            } else {
                console.log('  ⚠️  No contact elements found');
            }
            
            // Step 6: Look for seller page link
            console.log('\n📍 Step 6: Looking for seller page...');
            const sellerPageSelectors = [
                'a[href*="/shop/"]',
                'a[href*="/seller/"]',
                'a[href*="/verkoper/"]',
                '[data-test="seller-page-link"]'
            ];
            
            let sellerPageUrl: string | null = null;
            for (const selector of sellerPageSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const href = await element.evaluate(el => el.getAttribute('href') || '');
                        console.log(`  ✓ Found seller page link: ${href}`);
                        sellerPageUrl = href;
                        findings.selectors.sellerPageLink = selector;
                        
                        // Navigate to seller page
                        await page.goto(href, { waitUntil: 'networkidle2' });
                        await delay(3000);
                        findings.screenshots.push(await screenshot(page, '04_seller_page'));
                        findings.flows.push({ step: 4, action: 'Navigate to seller page', url: page.url() });
                        
                        // Look for contact info on seller page
                        console.log('\n📍 Step 7: Looking for contact on seller page...');
                        const sellerContactInfo = await page.evaluate(() => {
                            const contacts: Array<{ type: string; value?: string; text?: string }> = [];
                            
                            // Look for email links
                            document.querySelectorAll('a[href^="mailto:"]').forEach((el: any) => {
                                contacts.push({ type: 'email', value: el.getAttribute('href') || '', text: (el.textContent?.trim() || '') });
                            });
                            
                            // Look for contact buttons
                            document.querySelectorAll('button, a').forEach((el: any) => {
                                const text = el.textContent?.toLowerCase() || '';
                                if (text.includes('contact') || text.includes('bericht') || text.includes('mail')) {
                                    contacts.push({ type: 'button', text: (el.textContent?.trim() || '').substring(0, 80) });
                                }
                            });
                            
                            return contacts;
                        });
                        
                        if (sellerContactInfo.length > 0) {
                            console.log(`  ✓ Found ${sellerContactInfo.length} contact options:`);
                            sellerContactInfo.forEach((c: any) => {
                                console.log(`    - ${c.type}: ${c.value || c.text}`);
                            });
                            findings.selectors.sellerContactOptions = sellerContactInfo;
                        }
                        
                        break;
                    }
                } catch (e: any) {
                    console.log(`  ⚠️  Error with selector ${selector}:`, e.message);
                }
            }
            
            if (!sellerPageUrl) {
                console.log('  ⚠️  No seller page link found');
            }
            
            // Step 8: Check for CAPTCHA or security
            console.log('\n📍 Step 8: Checking for security measures...');
            const securityChecks = await page.evaluate(() => {
                const doc = document as any;
                const checks: any = {
                    recaptcha: !!doc.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
                    cloudflare: !!doc.querySelector('iframe[src*="challenges.cloudflare"], .cf-challenge'),
                    captcha: !!doc.querySelector('iframe[src*="captcha"], .captcha, #captcha'),
                    loginRequired: !!doc.querySelector('.login-required, [data-test="login-required"]'),
                    antiBot: !!doc.querySelector('.antibot, [data-antibot]')
                };
                return checks;
            });
            
            console.log('  Security check results:', securityChecks);
            findings.security = Object.entries(securityChecks)
                .filter(([_, found]) => found)
                .map(([type]) => ({ type, detected: true }));
            
            if (findings.security.length === 0) {
                console.log('  ✓ No obvious security/CAPTCHA detected');
                findings.security.push({ type: 'none', note: 'No obvious security measures detected on these pages' });
            }
            
        } else {
            console.log('⚠️  No products found in search results');
        }
        
        // Save findings
        console.log('\n💾 Saving investigation findings...');
        await fs.writeFile(
            path.join(CONFIG.docsDir, 'investigation-findings.json'),
            JSON.stringify(findings, null, 2)
        );
        
        // Create markdown report
        const report = generateMarkdownReport(findings);
        await fs.writeFile(
            path.join(CONFIG.docsDir, 'INVESTIGATION-REPORT.md'),
            report
        );
        
        console.log('\n✅ Investigation complete!');
        console.log(`📄 Screenshots saved to: ${CONFIG.screenshotsDir}`);
        console.log(`📄 Report saved to: ${CONFIG.docsDir}/INVESTIGATION-REPORT.md`);
        console.log(`📄 JSON data saved to: ${CONFIG.docsDir}/investigation-findings.json`);
        
    } catch (error: any) {
        console.error('❌ Error during investigation:', error);
        findings.error = error.message;
        await fs.writeFile(
            path.join(CONFIG.docsDir, 'investigation-error.json'),
            JSON.stringify({ error: error.message, stack: error.stack, findings }, null, 2)
        );
    } finally {
        await browser.close();
    }
    
    return findings;
}

// Generate markdown report
function generateMarkdownReport(findings: InvestigationFindings): string {
    return `# Bol.com UI Investigation Report

**Date:** ${new Date(findings.timestamp).toLocaleString()}
**URL:** ${findings.url}

## Investigation Summary

This report documents the findings from investigating Bol.com's UI for seller information and contact mechanisms.

## Screenshots Taken

${findings.screenshots.map((s, i) => `${i + 1}. \`${path.basename(s)}\``).join('\n')}

## Navigation Flow

${findings.flows.map(f => `
### Step ${f.step}: ${f.action}
- URL: ${f.url}
${f.query ? `- Query: ${f.query}` : ''}
`).join('\n')}

## Discovered Selectors

### Search Input
\`\`\`css
${findings.selectors.searchInput || 'Not found'}
\`\`\`

### Product Link
\`\`\`css
${findings.selectors.productLink || 'Not found'}
\`\`\`

### Seller Information
\`\`\`css
${findings.selectors.sellerInfo || 'Not found'}
\`\`\`

### Seller Page Link
\`\`\`css
${findings.selectors.sellerPageLink || 'Not found'}
\`\`\`

${findings.selectors.possibleSelectors ? `
## Possible Alternative Selectors

Seller info elements found:
${findings.selectors.possibleSelectors.map(s => `- \`<${s.tag} class="${s.class}" id="${s.id}">\` - "${s.text}"`).join('\n')}
` : ''}

${findings.selectors.possibleContactSelectors ? `
### Contact-related elements
${findings.selectors.possibleContactSelectors.map(s => `- \`<${s.tag}> class="${s.class}" id="${s.id}"\` - "${s.text}" ${s.href ? `- ${s.href}` : ''}`).join('\n')}
` : ''}

${findings.selectors.sellerContactOptions ? `
### Seller Contact Options
${findings.selectors.sellerContactOptions.map(c => `- **${c.type}**: ${c.value || c.text}`).join('\n')}
` : ''}

## Security Measures

${findings.security.map(s => `- **${s.type}**: ${s.detected ? 'Detected' : s.note || 'Not detected'}`).join('\n')}

## Notes

${findings.error ? `⚠️ **Error encountered:** ${findings.error}` : 'Investigation completed successfully.'}

## Recommendations

1. ${findings.selectors.sellerInfo ? 'Seller info selector found - can be used for automation.' : 'Need to manually identify seller info selector from screenshots.'}
2. ${findings.selectors.sellerPageLink ? 'Seller page link found - can navigate to seller pages.' : 'Need to identify seller page navigation manually.'}
3. ${findings.selectors.possibleContactSelectors && findings.selectors.possibleContactSelectors.length > 0 ? 'Contact options found - investigate these for automation.' : 'Need to identify contact flow manually.'}
4. ${findings.security.some(s => s.detected) ? 'Security measures detected - need to handle CAPTCHA/bypass in automation.' : 'No obvious security - automation should be straightforward.'}

---

*Generated by Bol.com Investigation Script*
`;
}

// Run the investigation
investigateBol().catch(console.error);