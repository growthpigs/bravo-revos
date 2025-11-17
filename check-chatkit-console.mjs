// Check browser console for ChatKit errors
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text
    });
  });

  // Capture network errors
  const networkErrors = [];
  page.on('response', response => {
    if (!response.ok()) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  // Capture JavaScript errors
  const jsErrors = [];
  page.on('pageerror', error => {
    jsErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  console.log('🌐 Loading test page...');
  await page.goto('http://localhost:3002/test-chatkit');

  console.log('⏳ Waiting 3 seconds for page to load...');
  await page.waitForTimeout(3000);

  console.log('\n📋 Clicking Topic Generation button...');
  try {
    await page.click('button:has-text("Topic Generation")');
    console.log('✅ Button clicked');
  } catch (e) {
    console.log('❌ Failed to click button:', e.message);
  }

  console.log('⏳ Waiting 10 seconds for ChatKit to initialize...');
  await page.waitForTimeout(10000);

  // Check if ChatKit rendered
  const chatkitVisible = await page.evaluate(() => {
    const container = document.querySelector('[class*="chatkit"]');
    return {
      found: !!container,
      innerHTML: container?.innerHTML?.substring(0, 200) || 'not found',
      hasIframe: !!document.querySelector('iframe')
    };
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));

  console.log('\n🎯 ChatKit Element:');
  console.log('  Found:', chatkitVisible.found);
  console.log('  Has iframe:', chatkitVisible.hasIframe);
  console.log('  Content preview:', chatkitVisible.innerHTML);

  console.log('\n🔴 JavaScript Errors (' + jsErrors.length + '):');
  jsErrors.forEach((err, i) => {
    console.log(`  ${i + 1}. ${err.message}`);
  });

  console.log('\n📡 Network Errors (' + networkErrors.length + '):');
  networkErrors.forEach((err, i) => {
    console.log(`  ${i + 1}. ${err.status} - ${err.url.substring(0, 80)}`);
  });

  console.log('\n💬 Console Messages (last 20):');
  consoleMessages.slice(-20).forEach((msg, i) => {
    console.log(`  [${msg.type}] ${msg.text.substring(0, 100)}`);
  });

  console.log('\n' + '='.repeat(60));

  await browser.close();
})();
