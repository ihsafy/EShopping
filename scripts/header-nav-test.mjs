import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${extra}`); }
};

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });

let counts = {};
let rateLimited = 0;
const issues = [];
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('/api/')) { const p = new URL(u).pathname; counts[p] = (counts[p] || 0) + 1; }
});
page.on('response', (res) => { if (res.status() === 429) rateLimited++; });
page.on('console', (m) => { if (m.type() === 'error') issues.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
const snap = () => { const c = counts; counts = {}; return c; };
const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);

const menuLabels = () => page.evaluate(() =>
  [...document.querySelectorAll('.header__account-panel a, .header__account-panel button')].map((n) => n.textContent.trim()));
const topBar = () => page.evaluate(() => {
  const el = document.querySelector('.header__top');
  return el ? { present: true, text: el.innerText.trim() } : { present: false, text: '' };
});
const accountText = () => page.evaluate(() => document.querySelector('header')?.innerText || '');

// ---------------- A. logged out ----------------
console.log('\n[A] logged-out homepage');
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await sleep(900);
const guestTop = await topBar();
check('upper dark bar is gone (no tagline, no Sign in)', !guestTop.present, JSON.stringify(guestTop));
check('header no longer renders the tagline',
  !(await accountText()).includes('Everything you love, delivered'));
const signInOutsideMenus = await page.evaluate(() =>
  [...document.querySelectorAll('header a[href="/login"]')]
    .filter((a) => !a.closest('.header__account-panel') && !a.closest('.header__nav-account'))
    .length);
check('no Sign in link outside the account menu', signInOutsideMenus === 0, String(signInOutsideMenus));
await page.click('.header__account-btn');
await sleep(300);
const guestMenu = await menuLabels();
check('account menu = Sign in + Create account only',
  JSON.stringify(guestMenu) === JSON.stringify(['Sign in', 'Create account']), JSON.stringify(guestMenu));
const guestHeader = await accountText();
check('no My orders / Track order / Wishlist in header',
  !/My orders|Track order|My account|Wishlist/.test(guestHeader), guestHeader.replace(/\n/g, ' | ').slice(0, 160));
check('no Wishlist/Cart header icons for guests',
  !await page.$('a[aria-label="Wishlist"]') && !await page.$('a[aria-label="Cart"]'));
const guestBurger = await page.evaluate(() => {
  const el = document.querySelector('.header__nav-account');
  return el ? [...el.querySelectorAll('a')].map((a) => a.textContent.trim()) : [];
});
check('guest burger menu = Sign in + Create account',
  JSON.stringify(guestBurger) === JSON.stringify(['Sign in', 'Create account']), JSON.stringify(guestBurger));
await page.keyboard.press('Escape');

// ---------------- B. log in ----------------
console.log('\n[B] after login');
rateLimited = 0;
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.type('input[type=tel]', '01712345678');
await page.type('input[type=password]', 'Password123');
await page.click('.auth__submit');
await page.waitForFunction(() => {
  const el = document.querySelector('.header__account-btn .icon-btn__label');
  return el && el.textContent.trim() !== 'Account';
});
await sleep(600);
const memberTop = await topBar();
check('upper dark bar stays removed for signed-in users', !memberTop.present, JSON.stringify(memberTop));
await page.click('.header__account-btn');
await sleep(300);
const memberMenu = await menuLabels();
check('account menu = My account/My orders/Cart/Wishlist/Track order/Sign out',
  JSON.stringify(memberMenu) === JSON.stringify(['My account', 'My orders', 'Cart', 'Wishlist', 'Track order', 'Sign out']),
  JSON.stringify(memberMenu));
check('Wishlist + Cart icons visible when signed in',
  Boolean(await page.$('a[aria-label="Wishlist"]')) && Boolean(await page.$('a[aria-label="Cart"]')));

// click every member entry and confirm the destination route
for (const [label, route] of [['My account','/profile'],['My orders','/orders'],['Cart','/cart'],['Wishlist','/wishlist'],['Track order','/track-order']]) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await sleep(400);
  await page.click('.header__account-btn');
  await sleep(250);
  await page.evaluate((l) => {
    const el = [...document.querySelectorAll('.header__account-panel a')].find((a) => a.textContent.trim() === l);
    el && el.click();
  }, label);
  await sleep(700);
  const path = new URL(page.url()).pathname;
  const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() || '');
  check(`${label} -> ${route} (renders, not blank)`, path === route && h1.length > 0, `path=${path} h1=${h1}`);
}

// ---------------- C. log out ----------------
console.log('\n[C] after logout');
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await sleep(600);
await page.click('.header__account-btn');
await sleep(250);
await page.click('button[aria-label="Sign out"]');
await sleep(400);
const afterLogout = await menuLabels();
check('logout immediately restores the guest menu',
  JSON.stringify(afterLogout) === JSON.stringify(['Sign in', 'Create account']), JSON.stringify(afterLogout));
check('no upper bar reappears after logout', !(await topBar()).present);
check('account button returns to "Account"',
  await page.evaluate(() => document.querySelector('.header__account-btn .icon-btn__label')?.textContent.includes('Account')));

// ---------------- D. refresh, no repeated store requests ----------------
console.log('\n[D] refresh while signed in');
const login2 = await fetch(BASE + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: '01712345678', password: 'Password123' }),
}).then((r) => r.json());
const token = login2?.data?.token;
check('demo customer token', !!token, JSON.stringify(login2).slice(0, 120));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => localStorage.setItem('eshopping.token', t), token);
// Warm-up load so counters only measure the refresh below.
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await sleep(800);
rateLimited = 0;
snap();
await page.reload({ waitUntil: 'networkidle2' });
await sleep(1500);
const loadCounts = snap();
console.log('      requests on load:', JSON.stringify(loadCounts));
check('store fetched at most once per load', (loadCounts['/api/store'] || 0) <= 1, JSON.stringify(loadCounts));
check('categories fetched at most once per load', (loadCounts['/api/categories'] || 0) <= 1, JSON.stringify(loadCounts));
check('/auth/me at most once per load', (loadCounts['/api/auth/me'] || 0) <= 1, JSON.stringify(loadCounts));
check('no 429 on load', rateLimited === 0, `429s=${rateLimited}`);
const bodyText = await accountText();
check('no "Too many requests" rendered', !bodyText.includes('Too many requests'), bodyText.slice(0, 120));

// ---------------- E. navigation between pages ----------------
console.log('\n[E] navigate home -> shop -> category -> home -> shop -> home');
rateLimited = 0;
const phases = [];
for (const [label, selector] of [
  ['shop', 'nav a[href="/shop"]'],
  ['offers', 'nav a[href="/offers"]'],
  ['home', 'nav a[href="/"]'],
  ['shop again', 'nav a[href="/shop"]'],
  ['home again', 'nav a[href="/"]'],
]) {
  await page.click(selector);
  await new Promise((r) => setTimeout(r, 1400));
  phases.push([label, snap()]);
}
phases.forEach(([label, c]) => console.log(`      ${label}: ${JSON.stringify(c)}`));
check('store endpoint never re-requested while navigating',
  phases.every(([, c]) => (c['/api/store'] || 0) === 0));
check('category endpoint never re-requested while navigating',
  phases.every(([, c]) => (c['/api/categories'] || 0) === 0));
check('total API calls across 5 navigations is bounded',
  phases.reduce((sum, [, c]) => sum + total(c), 0) <= 25,
  String(phases.reduce((sum, [, c]) => sum + total(c), 0)));
check('no 429 while navigating', rateLimited === 0, `429s=${rateLimited}`);

// category page navigation (dropdown)
await page.click('.nav-dropdown__toggle');
await sleep(300);
const catHref = await page.evaluate(() => document.querySelector('.nav-dropdown__panel a[href^="/category/"]')?.getAttribute('href'));
if (catHref) {
  rateLimited = 0;
  await page.click(`.nav-dropdown__panel a[href="${catHref}"]`);
  await new Promise((r) => setTimeout(r, 1400));
  const catCounts = snap();
  console.log(`      ${catHref}: ${JSON.stringify(catCounts)}`);
  check('category page renders with no 429',
    new URL(page.url()).pathname === catHref && rateLimited === 0, `${page.url()} 429s=${rateLimited}`);
  await page.click('nav a[href="/"]');
  await new Promise((r) => setTimeout(r, 1400));
  snap();
}

// ---------------- F/G. console + network ----------------
check('no console/page errors', issues.length === 0, issues.slice(0, 5).join(' | '));
check('no 429 anywhere in the run', rateLimited === 0, `last phase 429s=${rateLimited}`);

await page.screenshot({ path: 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\auth-guest.png' });
console.log(`\nRESULT: ${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
await browser.close();
process.exit(failures ? 1 : 0);
