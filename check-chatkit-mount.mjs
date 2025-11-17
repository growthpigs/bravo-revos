// Check if ChatKit component is mounting
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[Browser]', msg.text()));

  await page.goto('http://localhost:3002/test-chatkit');
  await page.waitForTimeout(2000);

  console.log('\n📋 Clicking button...');
  await page.click('button:has-text("Topic Generation")');
  await page.waitForTimeout(12000);

  // Check DOM state
  const domState = await page.evaluate(() => {
    return {
      chatkitWrapperExists: !!document.querySelector('[class*="ChatKit"]'),
      anyDivs: document.querySelectorAll('div').length,
      bodyHTML: document.body.innerHTML.includes('ChatKit') ? 'Contains ChatKit text' : 'No ChatKit text',
      hasSpinner: !!document.querySelector('.animate-spin'),
      hasErrorBox: !!document.querySelector('.bg-red-50'),
      componentState: document.querySelector('[data-state]')?.getAttribute('data-state') || 'no state attr'
    };
  });

  console.log('\n🔍 DOM State:');
  console.log(JSON.stringify(domState, null, 2));

  await browser.close();
})();
