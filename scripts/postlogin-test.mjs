import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const API = `${BASE}/api`;
const MOBILE = '01712345678';
const PASSWORD = 'Password123';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name} ${extra}`);
  }
};

const api = (path, opts = {}) => fetch(API + path, opts);
const json = (res) => res.json();
const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ---------------- setup: token, clean slate ----------------
const login = await api('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: MOBILE, password: PASSWORD }),
}).then(json);
const token = login?.data?.token;
const customer = login?.data?.user;
check('demo customer logs in', Boolean(token), JSON.stringify(login).slice(0, 140));
if (!token) process.exit(1);

// Start from an empty cart and wishlist so the assertions are deterministic.
await api('/cart', { method: 'DELETE', headers: authHeaders(token) }).then(json);
const startWish = await api('/wishlist', { headers: authHeaders(token) }).then(json);
for (const p of startWish?.data?.products || []) {
  await api(`/wishlist/${p.id}`, { method: 'DELETE', headers: authHeaders(token) }).then(json);
}

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });

let rateLimited = 0;
let counts = {};
const issues = [];
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('/api/')) {
    const p = new URL(u).pathname;
    counts[p] = (counts[p] || 0) + 1;
  }
});
page.on('response', (res) => {
  if (res.status() === 429) rateLimited++;
});
page.on('console', (m) => {
  if (m.type() === 'error') issues.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));

const bodyText = () => page.evaluate(() => document.body.innerText);
const path = () => new URL(page.url()).pathname;
const search = () => new URL(page.url()).search;
const badge = () =>
  page.evaluate(() => document.querySelector('.icon-btn__badge')?.textContent?.trim() || '');
const headerLabel = () =>
  page.evaluate(() => document.querySelector('.header__account-btn .icon-btn__label')?.textContent?.trim() || '');
const goto = async (route) => {
  await page.goto(BASE + route, { waitUntil: 'networkidle2' });
  await sleep(500);
};
/** Clicks the first enabled "Add to cart" button on a listing page. */
const addFirstAvailable = () =>
  page.evaluate(() => {
    for (const btn of document.querySelectorAll('.product-card .product-card__cart')) {
      if (!btn.disabled) {
        const link = btn.closest('.product-card')?.querySelector('.product-card__title a');
        btn.click();
        return { name: link?.textContent?.trim() || '', slug: link?.getAttribute('href') || '' };
      }
    }
    return null;
  });
const toastShown = async (needle) => {
  try {
    await page.waitForFunction(
      (t) => document.body.innerText.includes(t),
      { timeout: 4000 },
      needle
    );
    return true;
  } catch {
    return false;
  }
};
const noPlaceholder = async (label) => {
  const text = await bodyText();
  check(`${label}: no "not built yet" placeholder copy`, !text.includes('is not built yet'), text.slice(0, 160));
  check(`${label}: no Phase 7/8/9 banner`, !/Phase (7|8|9)/.test(text), text.slice(0, 160));
};
const snap = () => {
  const c = counts;
  counts = {};
  return c;
};

// ---------------- [A] logged out: protected routes bounce to login ----------------
console.log('\n[A] logged-out visitor');
await goto('/');
check('guest sees no Wishlist/Cart header icons',
  !(await page.$('a[aria-label^="Wishlist"]')) && !(await page.$('a[aria-label^="Cart"]')));
check('guest header shows Account (no member name)', (await headerLabel()).includes('Account'));

await goto('/cart');
check('guest /cart -> /login with next=/cart',
  path() === '/login' && search().includes('next=%2Fcart'), `${path()}${search()}`);
await noPlaceholder('/cart (guest)');

await goto('/wishlist');
check('guest /wishlist -> /login with next=/wishlist',
  path() === '/login' && search().includes('next=%2Fwishlist'), `${path()}${search()}`);

// ---------------- [B] sign in, land back on the requested page ----------------
console.log('\n[B] sign in from a protected deep link');
await goto(`/login?next=${encodeURIComponent('/cart')}`);
await page.type('input[type=tel]', MOBILE);
await page.type('input[type=password]', PASSWORD);
await page.click('.auth__submit');
await page.waitForFunction(() => {
  const el = document.querySelector('.header__account-btn .icon-btn__label');
  return el && !el.textContent.includes('Account') && !el.textContent.includes('Checking');
}, { timeout: 10000 });
await sleep(900);
check('login lands back on /cart', path() === '/cart', path());
check('header switches to the signed-in user immediately',
  (await headerLabel()).includes(customer.name.split(' ')[0]), await headerLabel());
check('signed in: Wishlist + Cart icons visible',
  Boolean(await page.$('a[aria-label^="Wishlist"]')) && Boolean(await page.$('a[aria-label^="Cart"]')));
await noPlaceholder('/cart (after login)');
check('empty cart shows the real empty state',
  (await bodyText()).includes('Your cart is empty.'), (await bodyText()).slice(0, 200));
check('header cart badge is hidden at zero', (await badge()) === '', await badge());

// ---------------- [C] add to cart: toast only, no navigation ----------------
console.log('\n[C] add to cart from the product card');
await goto('/');
const firstProduct = await addFirstAvailable();
check('first product card is addable', Boolean(firstProduct?.name), JSON.stringify(firstProduct));
check('toast confirms the addition', await toastShown('added to your cart'));
check('user stays on the homepage (toast does not navigate)', path() === '/', path());
await sleep(600);
check('header cart badge updates immediately', (await badge()) === '1', await badge());
check('cart count in the aria label', await page.evaluate(() => {
  const a = document.querySelector('a[aria-label^="Cart"]');
  return /Cart, 1 item/.test(a?.getAttribute('aria-label') || '');
}));

// ---------------- [D] cart page: quantity + remove ----------------
console.log('\n[D] cart page operations');
await page.click('a[aria-label^="Cart"]');
await page.waitForFunction(() => new URL(location.href).pathname === '/cart');
await sleep(700);
await noPlaceholder('/cart');
check('cart lists the product', (await page.$$('.cart-item')).length === 1,
  `items=${(await page.$$('.cart-item')).length}`);
const cartName = await page.evaluate(() => document.querySelector('.cart-item__name')?.textContent?.trim());
check('cart shows the same product', cartName === firstProduct?.name, `${cartName} vs ${firstProduct?.name}`);

const totalBefore = await page.evaluate(() => document.querySelector('.cart-item__line')?.textContent?.trim());
await page.click('.qty button[aria-label="Increase quantity"]');
await sleep(800);
const qtyNow = await page.evaluate(() => document.querySelector('.qty span')?.textContent?.trim());
const totalAfter = await page.evaluate(() => document.querySelector('.cart-item__line')?.textContent?.trim());
check('increase quantity -> qty 2', qtyNow === '2', qtyNow);
check('line total recalculated', totalBefore !== totalAfter, `${totalBefore} -> ${totalAfter}`);
check('badge now 2', (await badge()) === '2', await badge());

await page.click('.qty button[aria-label="Decrease quantity"]');
await sleep(800);
check('decrease quantity -> qty 1',
  (await page.evaluate(() => document.querySelector('.qty span')?.textContent?.trim())) === '1');

await page.click('.cart-item__remove');
await sleep(900);
check('remove empties the cart', (await page.$$('.cart-item')).length === 0);
check('empty cart state shown', (await bodyText()).includes('Your cart is empty.'));
check('badge back to zero', (await badge()) === '', await badge());

// ---------------- [E] re-add, then wishlist round trip ----------------
console.log('\n[E] re-add + wishlist');
await goto('/');
await addFirstAvailable();
check('re-add toast', await toastShown('added to your cart'));
await sleep(600);
check('badge 1 after re-add', (await badge()) === '1', await badge());

await goto(`/${firstProduct.slug.replace(/^\//, '')}`);
await page.click('button[aria-label="Add to wishlist"]');
check('wishlist toast', await toastShown('ishlist'));
await goto('/wishlist');
await noPlaceholder('/wishlist');
check('wishlist lists the product', (await page.$$('.wish-card')).length === 1,
  `cards=${(await page.$$('.wish-card')).length}`);

// remove it, then add it back and move it to the cart
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wish-card__actions button')]
    .find((b) => /Remove/.test(b.textContent));
  btn?.click();
});
await sleep(900);
check('wishlist empty state', (await bodyText()).includes('Your wishlist is empty.'));

await page.goto(BASE + `/${firstProduct.slug.replace(/^\//, '')}`, { waitUntil: 'networkidle2' });
await sleep(500);
await page.click('button[aria-label="Add to wishlist"]');
await sleep(700);
await goto('/wishlist');
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wish-card__actions button')]
    .find((b) => /Move to cart/.test(b.textContent));
  btn?.click();
});
await sleep(1000);
check('move to cart empties the wishlist', (await page.$$('.wish-card')).length === 0);
check('badge counts the moved item', (await badge()) === '2', await badge());

// ---------------- [F] my orders + order details ----------------
console.log('\n[F] my orders');
await goto('/orders');
await noPlaceholder('/orders');
const orderBody = await bodyText();
const hasOrders = (await page.$$('.order-card')).length > 0;
check('orders page renders orders or the empty state',
  hasOrders || orderBody.includes("You don't have any orders yet."), orderBody.slice(0, 200));
if (hasOrders) {
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('.order-card a')].find((a) => /View details/.test(a.textContent));
    link?.click();
  });
  await sleep(1000);
  check('order details route opens', /^\/orders\/[^/]+$/.test(path()), path());
  await noPlaceholder('order details');
  check('order details shows the items panel',
    (await bodyText()).includes('Delivery information'), (await bodyText()).slice(0, 200));
}

// ---------------- [G] track order ----------------
console.log('\n[G] track order');
await goto('/track-order');
await noPlaceholder('/track-order');
check('track page heading', (await page.evaluate(() => document.querySelector('h1')?.textContent?.trim())) === 'Track your order');
if (hasOrders) {
  check('tracking card with progress steps',
    (await page.$$('.track-card')).length > 0 && (await page.$$('.track-steps li')).length > 0,
    `cards=${(await page.$$('.track-card')).length} steps=${(await page.$$('.track-steps')).length}`);
} else {
  check('empty tracking state', (await bodyText()).includes("don't have any orders to track"),
    (await bodyText()).slice(0, 200));
}

// ---------------- [H] profile / account ----------------
console.log('\n[H] my account');
await goto('/profile');
await noPlaceholder('/profile');
check('profile heading', (await page.evaluate(() => document.querySelector('h1')?.textContent?.trim())) === 'My account');
check('profile shows the signed-in customer',
  (await bodyText()).includes(customer.name), (await bodyText()).slice(0, 200));
await goto('/account');
check('/account redirects to /profile', path() === '/profile', path());

// ---------------- [I] mobile layout of the new pages ----------------
console.log('\n[I] mobile (390px) layout');
await page.setViewport({ width: 390, height: 840 });
for (const route of ['/cart', '/wishlist', '/orders', '/track-order', '/profile']) {
  await goto(route);
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  check(`no horizontal overflow on ${route}`, overflow.scroll <= overflow.inner + 1,
    JSON.stringify(overflow));
}
await page.setViewport({ width: 1366, height: 900 });

// ---------------- [J] refresh keeps the session and the cart ----------------
console.log('\n[J] refresh persistence');
await goto('/cart');
const cartLines = async () =>
  page.evaluate(() => [...document.querySelectorAll('.qty span')].map((n) => Number(n.textContent) || 0));
const beforeRefresh = (await page.$$('.cart-item')).length;
const unitsBefore = (await cartLines()).reduce((a, b) => a + b, 0);
snap();
await page.reload({ waitUntil: 'networkidle2' });
await sleep(1200);
const reloadCounts = snap();
console.log('      requests on reload:', JSON.stringify(reloadCounts));
check('header badge + cart page share one cart request',
  (reloadCounts['/api/cart'] || 0) <= 2, JSON.stringify(reloadCounts));
check('still signed in after refresh', !(await headerLabel()).includes('Account'), await headerLabel());
check('cart still lists the same items after refresh',
  (await page.$$('.cart-item')).length === beforeRefresh && beforeRefresh > 0,
  `before=${beforeRefresh} after=${(await page.$$('.cart-item')).length}`);
const unitsAfter = (await cartLines()).reduce((a, b) => a + b, 0);
check('badge still correct after refresh (units)', (await badge()) === String(unitsAfter) && unitsAfter === unitsBefore,
  `badge=${await badge()} units=${unitsAfter}/${unitsBefore}`);

// ---------------- [J] logout protects every route ----------------
console.log('\n[K] logout');
await page.click('.header__account-btn');
await sleep(300);
await page.click('button[aria-label="Sign out"]');
await sleep(700);
check('logout restores the guest header',
  (await headerLabel()).includes('Account'), await headerLabel());
check('cart badge removed for guests', (await badge()) === '', await badge());

await goto('/cart');
check('signed-out /cart is blocked', path() === '/login' && search().includes('next=%2Fcart'), `${path()}${search()}`);
await goto('/orders');
check('signed-out /orders is blocked', path() === '/login', path());
await goto('/track-order');
check('signed-out /track-order is blocked', path() === '/login', path());

// ---------------- [L] network + console ----------------
console.log('\n[L] health');
check('no 429 rate limiting during the run', rateLimited === 0, `429s=${rateLimited}`);
check('no console/page errors', issues.length === 0, issues.slice(0, 6).join(' | '));

await page.screenshot({ path: 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\postlogin.png', fullPage: true });

// Leave the demo account tidy for the next run.
await api('/cart', { method: 'DELETE', headers: authHeaders(token) }).then(json);
const endWish = await api('/wishlist', { headers: authHeaders(token) }).then(json);
for (const p of endWish?.data?.products || []) {
  await api(`/wishlist/${p.id}`, { method: 'DELETE', headers: authHeaders(token) }).then(json);
}

console.log(`\nRESULT: ${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
await browser.close();
process.exit(failures ? 1 : 0);
