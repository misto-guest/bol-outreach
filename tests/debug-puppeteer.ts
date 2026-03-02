/**
 * Puppeteer Debug Utility
 * Standalone debugging tool for Puppeteer browser automation
 */

import { PuppeteerDebugger } from './puppeteer-debug-simple';

/**
 * Debug a specific URL for contact form detection
 */
async function debugContactForm(url: string): Promise<void> {
  console.log(`🔍 Debugging contact form detection for: ${url}`);
  
  const debuggerInstance = new PuppeteerDebugger();
  
  try {
    await debuggerInstance.launchBrowser();
    await debuggerInstance.createPage();
    
    // Navigate to URL
    const result = await debuggerInstance.navigate(url, {
      screenshot: true,
      consoleLogs: true,
      networkLogs: true,
      htmlDump: true,
      delay: 2000
    });
    
    console.log('📊 Navigation Result:');
    console.log(`   Screenshot: ${result.screenshotPath}`);
    console.log(`   HTML Dump: ${result.htmlContent ? 'Available' : 'Not available'}`);
    console.log(`   Console Logs: ${result.consoleLogs?.length || 0} entries`);
    console.log(`   Network Logs: ${result.networkLogs ? 'Available' : 'Not available'}`);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
      return;
    }
    
    // Debug contact form detection
    console.log('\n🔎 Debugging contact form selectors...');
    const debugInfo = await debuggerInstance.debugContactForm();
    
    console.log('📋 Contact Form Analysis:');
    console.log(`   URL: ${debugInfo.url}`);
    console.log(`   Title: ${debugInfo.title}`);
    console.log(`   Contact Buttons Found: ${debugInfo.selectors.contactButtons.length}`);
    console.log(`   Message Fields Found: ${debugInfo.selectors.messageFields.length}`);
    console.log(`   Submit Buttons Found: ${debugInfo.selectors.submitButtons.length}`);
    
    if (debugInfo.selectors.contactButtons.length > 0) {
      console.log('\n🎯 Contact Buttons:');
      debugInfo.selectors.contactButtons.forEach((btn: any, index: number) => {
        console.log(`   ${index + 1}. ${btn.selector} - "${btn.text}"`);
      });
    }
    
    if (debugInfo.selectors.messageFields.length > 0) {
      console.log('\n📝 Message Fields:');
      debugInfo.selectors.messageFields.forEach((field: any, index: number) => {
        console.log(`   ${index + 1}. ${field.selector} - Placeholder: "${field.placeholder}"`);
      });
    }
    
    if (debugInfo.selectors.submitButtons.length > 0) {
      console.log('\n📤 Submit Buttons:');
      debugInfo.selectors.submitButtons.forEach((btn: any, index: number) => {
        console.log(`   ${index + 1}. ${btn.selector} - "${btn.text}"`);
      });
    }
    
    if (debugInfo.selectors.contactButtons.length === 0 && 
        debugInfo.selectors.messageFields.length === 0 &&
        debugInfo.selectors.submitButtons.length === 0) {
      console.log('\n⚠️  No contact form elements found. This might be a different page type.');
    }
    
    // Take additional screenshots for analysis
    console.log('\n📸 Taking additional screenshots...');
    
    // Screenshot before clicking contact button
    if (debugInfo.selectors.contactButtons.length > 0) {
      const contactResult = await debuggerInstance.waitForAndClick(
        debugInfo.selectors.contactButtons[0].selector,
        { screenshot: true, delay: 1000 }
      );
      console.log(`   Contact button clicked. Screenshot: ${contactResult.screenshotPath}`);
    }
    
    // Screenshot after form interaction
    if (debugInfo.selectors.messageFields.length > 0) {
      const fillResult = await debuggerInstance.fillField(
        debugInfo.selectors.messageFields[0].selector,
        'Test message for debugging',
        { screenshot: true, delay: 500 }
      );
      console.log(`   Message field filled. Screenshot: ${fillResult.screenshotPath}`);
    }
    
    console.log('\n✅ Debugging completed successfully!');
    console.log(`📁 Debug files saved to: ${debuggerInstance['debugDir']}`);
    
  } catch (error) {
    console.error('❌ Debugging failed:', error);
  } finally {
    await debuggerInstance.close();
  }
}

/**
 * Test message sending workflow
 */
async function testMessageSending(url: string, message: string): Promise<void> {
  console.log(`📧 Testing message sending workflow for: ${url}`);
  
  const debuggerInstance = new PuppeteerDebugger();
  
  try {
    await debuggerInstance.launchBrowser();
    await debuggerInstance.createPage();
    
    // Navigate to seller page
    await debuggerInstance.navigate(url, { screenshot: true });
    
    // Look for contact form and send message
    console.log('🔍 Looking for contact form...');
    
    // Try to find and click contact button
    const contactSelectors = [
      'a[href*="contact"]',
      'a[href*="contacteer"]',
      'button:has-text("Contact")',
      'button:has-text("Contacteer")',
      '.contact-button'
    ];
    
    let contactFound = false;
    for (const selector of contactSelectors) {
      try {
        const element = await debuggerInstance['page']?.$(selector);
        if (element) {
          console.log(`✅ Found contact element: ${selector}`);
          
          // Click contact button
          await debuggerInstance.waitForAndClick(selector, { screenshot: true });
          
          // Look for message field
          const messageSelectors = [
            'textarea[name="message"]',
            'textarea[name="bericht"]',
            'textarea#message'
          ];
          
          for (const msgSelector of messageSelectors) {
            const msgElement = await debuggerInstance['page']?.$(msgSelector);
            if (msgElement) {
              console.log(`✅ Found message field: ${msgSelector}`);
              
              // Fill message
              await debuggerInstance.fillField(msgSelector, message, { screenshot: true });
              
              // Look for submit button
              const submitSelectors = [
                'button[type="submit"]',
                'button:has-text("Send")',
                'button:has-text("Verstuur")'
              ];
              
              for (const submitSelector of submitSelectors) {
                const submitElement = await debuggerInstance['page']?.$(submitSelector);
                if (submitElement) {
                  console.log(`✅ Found submit button: ${submitSelector}`);
                  
                  // Submit form
                  await debuggerInstance.waitForAndClick(submitSelector, { screenshot: true });
                  
                  console.log('✅ Message sending workflow completed!');
                  contactFound = true;
                  break;
                }
              }
              break;
            }
          }
          break;
        }
      } catch (error) {
        console.log(`   Selector ${selector} not found or error: ${error}`);
      }
    }
    
    if (!contactFound) {
      console.log('⚠️  No contact form found or workflow completed');
    }
    
  } catch (error) {
    console.error('❌ Message sending test failed:', error);
  } finally {
    await debuggerInstance.close();
  }
}

/**
 * Main debugging function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Puppeteer Debug Session\n');
  
  // Example URLs to debug (replace with actual Bol.com seller URLs)
  const testUrls = [
    'https://www.bol.com/nl/nl/checkout/checkout.html',
    'https://www.bol.com/nl/nl/contact.html',
    'https://www.bol.com/nl/nl/help/klantenservice.html'
  ];
  
  for (const url of testUrls) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Debugging URL: ${url}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      await debugContactForm(url);
      
      // Test message sending if contact form found
      await testMessageSending(url, 'This is a test message for debugging purposes.');
      
    } catch (error) {
      console.error(`Failed to debug ${url}:`, error);
    }
    
    // Wait between URLs
    console.log('\n⏳ Waiting 5 seconds before next URL...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('🎉 Debug session completed!');
  console.log('📁 Check the debug-screenshots folder for all captured images and logs.');
}

// Run the debug session if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { debugContactForm, testMessageSending };