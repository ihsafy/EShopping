import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5173';
const routes = [
  '/', '/shop', '/search?q=phone', '/category/electronics', '/product/samsung-galaxy-a55-5g',
  '/offers', '/cart', '/wishlist', '/checkout', '/login', '/register', '/profile',
  '/orders', '/account', '/admin', '/admin/products', '/admin/orders', '/admin/customers',
  '/does-not-exist',
];

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });

let problems = 0;
for (const route of routes) {
  const issues = [];
  const onConsole = (msg) => { if (msg.type() === 'error') issues.push(`console.error: ${msg.text()}`); };
  const onPageErr = (err) => issues.push(`pageerror: ${err.message}`);
  const onReqFail = (req) => issues.push(`netfail: ${req.url()} ${req.failure()?.errorText || ''}`);
  const onResp = (res) => { if (res.status() >= 400) issues.push(`http ${res.status()}: ${res.url()}`); };

  page.on('console', onConsole);
  page.on('pageerror', onPageErr);
  page.on('requestfailed', onReqFail);
  page.on('response', onResp);

  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 700));
    const info = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) || '',
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      imgs: document.images.length,
    }));
    if (info.broken.length) issues.push(`broken images (${info.broken.length}): ${info.broken.slice(0, 3).join(', ')}`);
    const filtered = issues.filter((i) => !i.includes('/does-not-exist') || route === '/does-not-exist');
    if (filtered.length) {
      problems += filtered.length;
      console.log(`\n[${route}] title="${info.title}" h1="${info.h1}" imgs=${info.imgs}`);
      filtered.slice(0, 8).forEach((i) => console.log('   - ' + i));
      if (filtered.length > 8) console.log(`   ... +${filtered.length - 8} more`);
    } else {
      console.log(`[ok] ${route}  title="${info.title}" imgs=${info.imgs}`);
    }
  } catch (e) {
    problems++;
    console.log(`\n[${route}] FAILED: ${e.message}`);
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageErr);
  page.off('requestfailed', onReqFail);
  page.off('response', onResp);
}

await browser.close();
console.log(`\nTotal problems: ${problems}`);
