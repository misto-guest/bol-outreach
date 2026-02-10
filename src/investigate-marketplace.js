/**
 * Bol.com Marketplace Seller Investigation
 * 
 * This script investigates Bol.com's marketplace seller pages
 * to find seller information and contact mechanisms.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const CONFIG = {
  baseUrl: 'https://www.bol.com',
  // Search for products typically sold by third-party sellers
  searchQueries: [
    'boeken',
    'speelgoed',
    'elektronica',
    'home & living'
  ],
  screenshotsDir: path.join(__dirname, '../docs/screenshots'),
  docsDir: path.join(__dirname, '../docs')
};

async function ensureDirs() {
  await fs.mkdir(CONFIG.screenshotsDir, { recursive: true });
  await fs.mkdir(CONFIG.docsDir, { recursive: true });
}

async function screenshot(page, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${label}_${timestamp}.png`;
  const filepath = path.join(CONFIG.screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

async function findMarketplaceSellers(page) {
  // Look for seller indicators on the product page
  const sellerInfo = await page.evaluate(() => {
    // Common patterns for seller info
    const info = {
      sellerName: null,
      sellerLink: null,
      isBolcom: false,
      sellerRating: null,
      sellerInfoElements: []
    };
    
    // Check if sold by bol.com
    const soldByText = document.body.innerText;
    if (soldByText.includes('Verkoop door bol') || 
        soldByText.includes('Verkoop door Bol.com') ||
        soldByText.includes('bol.com')) {
      info.isBolcom = true;
    }
    
    // Look for seller name patterns
    const sellerSelectors = [
      '[data-test="seller-name"]',
      '.seller-name',
      '.shop-name',
      '.vendor-name'
    ];
    
    for (const selector of sellerSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        info.sellerName = el.textContent.trim();
        info.sellerInfoElements.push({
          selector,
          text: el.textContent.trim(),
          html: el.outerHTML.substring(0, 200)
        });
      }
    }
    
    // Look for seller/winkel links
    document.querySelectorAll('a[href*="/shop/"], a[href*="/winkel/"], a[href*="/seller/"]').forEach(el => {
      info.sellerInfoElements.push({
        type: 'seller-link',
        text: el.textContent.trim(),
        href: el.href,
        html: el.outerHTML.substring(0, 200)
      });
    });
    
    // Look for elements with "verkoper" or "seller" text
    Array.from(document.querySelectorAll('*')).forEach(el => {
      const text = el.textContent.toLowerCase();
      if ((text.includes('verkoper') || text.includes('verkoop door') || text.includes('winkel')) &&
          el.textContent.length < 500 &&
          el.children.length < 5) {
        info.sellerInfoElements.push({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          text: el.textContent.trim().substring(0, 150),
          html: el.outerHTML.substring(0, 300)
        });
      }
    });
    
    return info;
  });
  
  return sellerInfo;
}

async function investigateMarketplace() {
  console.log('🔍 Starting Bol.com Marketplace Investigation...\n');
  
  await ensureDirs();
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const findings = {
    timestamp: new Date().toISOString(),
    queries: [],
    marketplaceSellers: [],
    screenshots: []
  };
  
  try {
    // Go to homepage
    console.log('📍 Navigating to Bol.com...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    
    for (const query of CONFIG.searchQueries) {
      console.log(`\n🔎 Searching for: ${query}`);
      
      // Perform search
      const searchInput = await page.$('#searchfor');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 }); // Select all
        await searchInput.type(query);
        await delay(500);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await delay(3000);
      }
      
      // Get product links
      const productLinks = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('a[href*="/p/"]').forEach(el => {
          const href = el.href;
          // Get unique links only
          if (!links.find(l => l.href === href) && links.length < 10) {
            links.push({ href, text: el.textContent.trim().substring(0, 100) });
          }
        });
        return links;
      });
      
      console.log(`  Found ${productLinks.length} products`);
      
      // Check first few products for marketplace sellers
      for (let i = 0; i < Math.min(5, productLinks.length); i++) {
        const product = productLinks[i];
        console.log(`  \n  Checking product ${i + 1}: ${product.text.substring(0, 50)}...`);
        
        await page.goto(product.href, { waitUntil: 'networkidle2' });
        await delay(2000);
        
        const sellerInfo = await findMarketplaceSellers(page);
        
        console.log(`    Sold by bol.com: ${sellerInfo.isBolcom}`);
        
        if (!sellerInfo.isBolcom) {
          console.log(`    ⭐ Found marketplace seller!`);
          
          findings.marketplaceSellers.push({
            query,
            productUrl: product.href,
            productText: product.text,
            sellerInfo,
            screenshot: await screenshot(page, `marketplace_${query}_${i}`)
          });
          
          // Look for seller page
          if (sellerInfo.sellerInfoElements.length > 0) {
            console.log(`    Seller info elements found: ${sellerInfo.sellerInfoElements.length}`);
            
            // Try to find and click seller link
            for (const el of sellerInfo.sellerInfoElements) {
              if (el.href && (el.href.includes('/shop/') || el.href.includes('/winkel/'))) {
                console.log(`    → Navigating to seller page: ${el.href}`);
                await page.goto(el.href, { waitUntil: 'networkidle2' });
                await delay(3000);
                
                findings.sellerPageScreenshot = await screenshot(page, 'seller_page');
                
                // Look for contact options on seller page
                const contactInfo = await page.evaluate(() => {
                  const contacts = [];
                  
                  // Look for email links
                  document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
                    contacts.push({ type: 'email', value: el.href, text: el.textContent });
                  });
                  
                  // Look for contact forms
                  document.querySelectorAll('form').forEach(el => {
                    contacts.push({ type: 'form', action: el.action, id: el.id });
                  });
                  
                  // Look for contact buttons
                  document.querySelectorAll('button, a').forEach(el => {
                    const text = el.textContent.toLowerCase();
                    if (text.includes('contact') || text.includes('vraag') || text.includes('bericht')) {
                      contacts.push({ 
                        type: 'button', 
                        tag: el.tagName, 
                        text: el.textContent.trim().substring(0, 80),
                        id: el.id,
                        class: el.className,
                        href: el.href || ''
                      });
                    }
                  });
                  
                  return contacts;
                });
                
                console.log(`    Contact options found: ${contactInfo.length}`);
                findings.sellerPageContacts = contactInfo;
                
                break;
              }
            }
          }
          
          // Only need one marketplace seller per query
          break;
        }
      }
      
      findings.queries.push({ query, productsChecked: Math.min(5, productLinks.length) });
    }
    
    // Save findings
    console.log('\n💾 Saving marketplace investigation findings...');
    await fs.writeFile(
      path.join(CONFIG.docsDir, 'marketplace-investigation.json'),
      JSON.stringify(findings, null, 2)
    );
    
    // Create markdown report
    const report = generateMarketplaceReport(findings);
    await fs.writeFile(
      path.join(CONFIG.docsDir, 'MARKETPLACE-INVESTIGATION.md'),
      report
    );
    
    console.log('\n✅ Marketplace investigation complete!');
    console.log(`📄 Report saved to: ${CONFIG.docsDir}/MARKETPLACE-INVESTIGATION.md`);
    
    if (findings.marketplaceSellers.length > 0) {
      console.log(`\n🎯 Found ${findings.marketplaceSellers.length} marketplace seller(s)!`);
    } else {
      console.log('\n⚠️  No marketplace sellers found in this search');
    }
    
  } catch (error) {
    console.error('❌ Error during marketplace investigation:', error);
    findings.error = error.message;
  } finally {
    await browser.close();
  }
  
  return findings;
}

function generateMarketplaceReport(findings) {
  let report = `# Bol.com Marketplace Seller Investigation Report

**Date:** ${new Date(findings.timestamp).toLocaleString()}

## Investigation Summary

This report documents findings from investigating Bol.com's marketplace for third-party seller information and contact mechanisms.

## Search Queries Used

${findings.queries.map(q => `- **${q.query}** - Checked ${q.productsChecked} products`).join('\n')}

## Marketplace Sellers Found

`;

  if (findings.marketplaceSellers.length === 0) {
    report += `⚠️ **No marketplace sellers found** in the search results. All products appeared to be sold directly by bol.com.

## Recommendations

1. Try different search terms (e.g., specific hobby items, collectibles, used books)
2. Look for "Verkoop door" (Sold by) indicators in product descriptions
3. Check the "Bol.com Partner" program documentation for seller contact flows
`;
  } else {
    findings.marketplaceSellers.forEach((seller, i) => {
      report += `### Seller ${i + 1}

**Product:** [${seller.productText.substring(0, 60)}...](${seller.productUrl})

**Seller Info Elements Found:** ${seller.sellerInfo.sellerInfoElements.length}

`;
      
      if (seller.sellerInfo.sellerInfoElements.length > 0) {
        report += `#### Elements:
`;
        seller.sellerInfo.sellerInfoElements.forEach(el => {
          report += `- **${el.tag || el.type || 'element'}**: \`${el.class || el.selector || ''}\` - "${(el.text || '').substring(0, 80)}"\n`;
          if (el.href) report += `  - Link: ${el.href}\n`;
        });
        report += `\n`;
      }
      
      report += `**Screenshot:** \`${path.basename(seller.screenshot)}\`\n\n`;
    });
    
    if (findings.sellerPageContacts) {
      report += `## Seller Page Contact Options

`;
      findings.sellerPageContacts.forEach(contact => {
        report += `- **${contact.type}**: ${contact.value || contact.text || contact.action || 'N/A'}\n`;
      });
      report += `\n**Seller Page Screenshot:** \`${path.basename(findings.sellerPageScreenshot)}\`\n\n`;
    }
    
    report += `## Key Findings

1. **Marketplace sellers exist** on Bol.com
2. **Seller info elements** can be found on product pages
3. **Contact mechanisms** are available on seller pages

## Automation Recommendations

`;
    if (findings.sellerPageContacts && findings.sellerPageContacts.length > 0) {
      report += `- Contact options found: Can automate outreach through seller page\n`;
      findings.sellerPageContacts.forEach(c => {
        report += `  - Use \`${c.type}\` for contact: ${c.value || c.text || c.action}\n`;
      });
    } else {
      report += `- Need to investigate seller page contact forms manually\n`;
    }
  }

  report += `

## Screenshots

${findings.screenshots.map(s => `- \`${path.basename(s)}\``).join('\n')}

---

*Generated by Bol.com Marketplace Investigation Script*
`;
  return report;
}

// Run the investigation
investigateMarketplace().catch(console.error);
