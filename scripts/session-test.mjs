import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (n, c, x = '') => { if (c) console.log('  ok   ' + n); else { failures++; console.log('  FAIL ' + n + ' ' + x); } };
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
const menu = (p) => p.evaluate(() => [...document.querySelectorAll('.header__account-panel a, .header__account-panel button')].map((n) => n.textContent.trim()));
const guestSet = JSON.stringify(['Sign in', 'Create account']);

// 1) expired/invalid token on boot -> guest menu, token dropped
console.log('[invalid stored token]');
const p1 = await browser.newPage();
await p1.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p1.evaluate(() => { localStorage.clear(); localStorage.setItem('eshopping.token', 'not-a-real-jwt'); });
await p1.goto(BASE + '/', { waitUntil: 'networkidle2' });
await sleep(900);
check('invalid token boots to the guest menu', JSON.stringify(await menu(p1)) === guestSet, JSON.stringify(await menu(p1)));
check('invalid token removed from storage', await p1.evaluate(() => !localStorage.getItem('eshopping.token')));

// 2) session expires mid-session -> authenticated UI disappears
console.log('[session expiry mid-session]');
const login = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: '01712345678', password: 'Password123' }) }).then((r) => r.json());
const p2 = await browser.newPage();
await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p2.evaluate((t) => { localStorage.clear(); localStorage.setItem('eshopping.token', t); }, login.data.token);
await p2.goto(BASE + '/', { waitUntil: 'networkidle2' });
await sleep(1200);
check('valid token boots to the member menu', JSON.stringify(await menu(p2)) !== guestSet, JSON.stringify(await menu(p2)));
await p2.evaluate(() => localStorage.setItem('eshopping.token', 'expired-token'));
await p2.evaluate(() => window.scrollTo(0, 700));
await sleep(600);
const hasCartBtn = await p2.evaluate(() => !!document.querySelector('.product-card__cart'));
if (hasCartBtn) {
  await p2.click('.product-card__cart');
  await sleep(1500);
}
check('401 during the session flips the header to the guest menu',
  JSON.stringify(await menu(p2)) === guestSet, JSON.stringify(await menu(p2)));
check('expired token cleared after the 401', await p2.evaluate(() => !localStorage.getItem('eshopping.token')));
check('account button back to guest state after expiry',
  await p2.evaluate(() => document.querySelector('.header__account-btn .icon-btn__label')?.textContent.includes('Account')));

// 3) mobile guest layout
console.log('[mobile 390px guest]');
const p3 = await browser.newPage();
await p3.setViewport({ width: 390, height: 780 });
await p3.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p3.evaluate(() => localStorage.clear());
await p3.goto(BASE + '/', { waitUntil: 'networkidle2' });
await sleep(900);
const m = await p3.evaluate(() => ({
  topBar: Boolean(document.querySelector('.header__top')),
  taglineInHeader: document.querySelector('header')?.innerText.includes('Everything you love, delivered') || false,
  signInOutsideMenus: [...document.querySelectorAll('header a[href="/login"]')]
    .filter((a) => !a.closest('.header__account-panel') && !a.closest('.header__nav-account')).length,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
}));
check('no upper dark bar or tagline on mobile', !m.topBar && !m.taglineInHeader, JSON.stringify(m));
check('no Sign in link outside the account menu', m.signInOutsideMenus === 0, JSON.stringify(m));
check('no horizontal overflow', m.overflow <= 1, String(m.overflow));
await p3.click('.header__burger');
await sleep(400);
const burger = await p3.evaluate(() => [...document.querySelectorAll('.header__nav-account a')].map((a) => a.textContent.trim()));
check('mobile burger menu = Sign in + Create account', JSON.stringify(burger) === JSON.stringify(['Sign in', 'Create account']), JSON.stringify(burger));
await p3.screenshot({ path: 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\guest-mobile.png' });

console.log(`\nRESULT: ${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
await browser.close();
process.exit(failures ? 1 : 0);
