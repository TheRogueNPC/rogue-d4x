
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));
  await page.goto('file:///J:/BKU/New folder/dark-clues/index.html');
  await page.waitForTimeout(4000);
  const title = await page.title().catch(() => 'no-title');
  console.log('TITLE:', title);
  await browser.close();
})();
