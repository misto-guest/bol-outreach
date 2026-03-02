/**
 * Simple Puppeteer Debug Utilities
 * Helper functions for debugging Puppeteer browser automation
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

interface DebugOptions {
  screenshot?: boolean;
  consoleLogs?: boolean;
  networkLogs?: boolean;
  htmlDump?: boolean;
  waitForNetworkIdle?: boolean;
  delay?: number;
}

interface DebugResult {
  screenshotPath?: string;
  consoleLogs?: string[];
  networkLogs?: any[];
  htmlContent?: string;
  error?: string;
}

/**
 * Simple Puppeteer debugging utility
 */
export class PuppeteerDebugger {
  private browser: any = null;
  private page: any = null;
  private debugDir: string;

  constructor(debugDir: string = './debug-screenshots') {
    this.debugDir = debugDir;
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * Launch browser with debug settings
   */
  async launchBrowser(options: any = {}): Promise<any> {
    const defaultOptions: any = {
      headless: false, // Always visible for debugging
      devtools: true,  // Open devtools
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      ...options
    };

    this.browser = await puppeteer.launch(defaultOptions);
    return this.browser;
  }

  /**
   * Connect to existing browser
   */
  async connectToBrowser(browserWSEndpoint: string): Promise<any> {
    this.browser = await puppeteer.connect({
      browserWSEndpoint
    });
    return this.browser;
  }

  /**
   * Create new page with debug settings
   */
  async createPage(): Promise<any> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call launchBrowser() first.');
    }

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Enable request interception for network logging
    await this.page.setRequestInterception(true);
    
    return this.page;
  }

  /**
   * Navigate with debugging
   */
  async navigate(url: string, options: DebugOptions = {}): Promise<DebugResult> {
    if (!this.page) {
      throw new Error('Page not initialized. Call createPage() first.');
    }

    const result: DebugResult = {};

    try {
      // Navigate to URL
      const response = await this.page.goto(url, {
        waitUntil: options.waitForNetworkIdle ? 'networkidle2' : 'domcontentloaded',
        timeout: 30000
      });

      if (options.delay) {
        await this.page.waitForTimeout(options.delay);
      }

      // Capture debug information
      if (options.screenshot) {
        result.screenshotPath = await this.takeScreenshot();
      }

      if (options.htmlDump) {
        result.htmlContent = await this.page.content();
      }

      if (options.consoleLogs) {
        result.consoleLogs = await this.getConsoleLogs();
      }

      if (options.networkLogs) {
        result.networkLogs = await this.getNetworkLogs();
      }

      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(filename?: string): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filenameWithTimestamp = filename || `debug-${timestamp}.png`;
    const filePath = path.join(this.debugDir, filenameWithTimestamp);

    await this.page.screenshot({
      path: filePath,
      fullPage: true
    });

    console.log(`📸 Screenshot saved: ${filePath}`);
    return filePath;
  }

  /**
   * Get console logs from page
   */
  async getConsoleLogs(): Promise<string[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const logs: string[] = [];
    
    this.page.on('console', (msg: any) => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Wait a bit for logs to accumulate
    await this.page.waitForTimeout(1000);

    return logs;
  }

  /**
   * Get network logs
   */
  async getNetworkLogs(): Promise<any[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const requests: any[] = [];
    const responses: any[] = [];

    this.page.on('request', (request: any) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });

    this.page.on('response', (response: any) => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    });

    // Wait for network activity
    await this.page.waitForTimeout(2000);

    return { requests: requests, responses: responses };
  }

  /**
   * Wait for element and click with debugging
   */
  async waitForAndClick(selector: string, options: DebugOptions = {}): Promise<DebugResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const result: DebugResult = {};

    try {
      // Wait for element
      await this.page.waitForSelector(selector, { timeout: 10000 });
      
      // Take screenshot before click
      if (options.screenshot) {
        result.screenshotPath = await this.takeScreenshot(`before-click-${selector.replace(/[^\w]/g, '_')}.png`);
      }

      // Click element
      await this.page.click(selector);

      // Wait a bit after click
      if (options.delay) {
        await this.page.waitForTimeout(options.delay);
      }

      // Take screenshot after click
      if (options.screenshot) {
        result.screenshotPath = await this.takeScreenshot(`after-click-${selector.replace(/[^\w]/g, '_')}.png`);
      }

      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  /**
   * Fill form field with debugging
   */
  async fillField(selector: string, value: string, options: DebugOptions = {}): Promise<DebugResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const result: DebugResult = {};

    try {
      // Wait for element
      await this.page.waitForSelector(selector, { timeout: 10000 });
      
      // Take screenshot before filling
      if (options.screenshot) {
        result.screenshotPath = await this.takeScreenshot(`before-fill-${selector.replace(/[^\w]/g, '_')}.png`);
      }

      // Clear and fill field
      await this.page.click(selector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await this.page.type(selector, value, { delay: 50 });

      // Take screenshot after filling
      if (options.screenshot) {
        result.screenshotPath = await this.takeScreenshot(`after-fill-${selector.replace(/[^\w]/g, '_')}.png`);
      }

      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  /**
   * Debug contact form detection
   */
  async debugContactForm(): Promise<any> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const debugInfo: any = {
      url: this.page.url(),
      title: await this.page.title(),
      selectors: {
        contactButtons: [],
        messageFields: [],
        submitButtons: []
      }
    };

    // Test contact button selectors
    const contactSelectors = [
      'a[href*="contact"]',
      'a[href*="contacteer"]',
      'button:has-text("Contact")',
      'button:has-text("Contacteer")',
      '.contact-button',
      '[data-test="contact-button"]'
    ];

    for (const selector of contactSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          debugInfo.selectors.contactButtons.push({
            selector,
            text: await this.page.evaluate((el: any) => el.textContent?.trim(), element)
          });
        }
      } catch (error) {
        // Ignore errors for optional selectors
      }
    }

    // Test message field selectors
    const messageSelectors = [
      'textarea[name="message"]',
      'textarea[name="bericht"]',
      'textarea#message',
      'textarea[name="body"]',
      '[data-test="message-field"]'
    ];

    for (const selector of messageSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          debugInfo.selectors.messageFields.push({
            selector,
            placeholder: await this.page.evaluate((el: any) => el.placeholder, element)
          });
        }
      } catch (error) {
        // Ignore errors for optional selectors
      }
    }

    // Test submit button selectors
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Verstuur")',
      'button:has-text("Senden")',
      '[data-test="send-button"]'
    ];

    for (const selector of submitSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          debugInfo.selectors.submitButtons.push({
            selector,
            text: await this.page.evaluate((el: any) => el.textContent?.trim(), element)
          });
        }
      } catch (error) {
        // Ignore errors for optional selectors
      }
    }

    return debugInfo;
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Cleanup debug files older than specified days
   */
  cleanupOldFiles(days: number = 7): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const files = fs.readdirSync(this.debugDir);
    
    for (const file of files) {
      const filePath = path.join(this.debugDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.birthtime < cutoff) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cleaned up old debug file: ${file}`);
      }
    }
  }
}

/**
 * Debug utility function for quick testing
 */
export async function debugPuppeteer(url: string, options: DebugOptions = {}): Promise<DebugResult> {
  const debuggerInstance = new PuppeteerDebugger();
  
  try {
    await debuggerInstance.launchBrowser();
    await debuggerInstance.createPage();
    const result = await debuggerInstance.navigate(url, options);
    return result;
  } finally {
    await debuggerInstance.close();
  }
}

export default PuppeteerDebugger;