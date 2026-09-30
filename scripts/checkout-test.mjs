/**
 * Checkout flow + compact recommendation cards.
 * Requires: API on :5000, frontend on :5173, Chrome installed.
 *
 *   node scripts/checkout-test.mjs
 *
 * Walks the real browser flow (login -> product page -> add to cart ->
 * checkout -> place order) and asserts server-validated totals, the double
 * click guard, the auth gate and the "You may also like" card sizing at four
 * viewport widths. Screenshots land in %TEMP%\opencode\shots.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, rmSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const API = 'http://localhost:5000/api';
const PROFILE = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\pptr-profile-checkout';
const SHOTS = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\shots';

const CUSTOMER = { mobile: '01712345678', password: 'Password123' };
const PRODUCT_PATH = '/product/digital-air-fryer-55l';
const AIR_FRYER_ID = 7;
const CHEAP_ID = 24; // minimalist-desk-organiser @ ৳1,000 - keeps sub-৳5,000 so the zone fee is visible

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

let token = '';
async function api(label, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status >= 400) {
    console.log(`      api ${label} -> ${res.status} ${json?.message || ''}`);
  }
  return { status: res.status, body: json };
}

async function signIn(page, next = '') {
  await page.goto(`${BASE}/login${next}`, { waitUntil: 'networkidle2' });
  await page.type('input[type=tel]', CUSTOMER.mobile);
  await page.type('input[type=password]', CUSTOMER.password);
  await page.click('.auth__submit');
  await page.waitForFunction(() => {
    const el = document.querySelector('.header__account-btn .icon-btn__label');
    return el && el.textContent.trim() && el.textContent.trim() !== 'Account';
  });
}

/** Reads the computed grid columns of the recommendation shelf. */
const readShelf = (page) =>
  page.$eval('.section-row--compact .section-row__track', (track) => {
    const cards = [...track.querySelectorAll('.product-card')];
    const cols = getComputedStyle(track).gridTemplateColumns.split(' ').filter(Boolean).length;
    return {
      cols,
      cards: cards.length,
      cardWidth: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : 0,
      scrollable: track.scrollWidth > track.clientWidth + 2,
      flow: getComputedStyle(track).gridAutoFlow,
    };
  });

const money = (page, selector) =>
  page.$eval(selector, (el) => el.textContent.replace(/\s+/g, ' ').trim());

async function main() {
  rmSync(PROFILE, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  // ---------- API assertions (no writes) ----------
  const auth = await api('login', 'POST', '/auth/login', CUSTOMER);
  token = auth.body?.data?.token || auth.body?.token || '';
  check('api login for the demo customer', auth.status === 200 && Boolean(token), `status ${auth.status}`);

  const [inside, outside] = await Promise.all([
    api('preview inside', 'POST', '/checkout/preview', { items: [{ productId: CHEAP_ID, quantity: 1 }], deliveryZone: 'inside_dhaka' }),
    api('preview outside', 'POST', '/checkout/preview', { items: [{ productId: CHEAP_ID, quantity: 1 }], deliveryZone: 'outside_dhaka' }),
  ]);
  const inFee = inside.body?.data?.deliveryFee;
  const outFee = outside.body?.data?.deliveryFee;
  check('preview prices inside Dhaka at ৳60', Number(inFee) === 60, `fee ${inFee}`);
  check('preview prices outside Dhaka at ৳120', Number(outFee) === 120, `fee ${outFee}`);

  const before = await api('orders list', 'GET', '/orders?limit=1');
  const totalOf = (body) => Number(body?.data?.pagination?.total ?? 0);
  const ordersBefore = totalOf(before.body);
  check('order count readable before the run', ordersBefore > 0, `total ${ordersBefore}`);

  const badPay = await api('reject unsupported payment method', 'POST', '/orders', {
    items: [{ productId: AIR_FRYER_ID, quantity: 1 }],
    name: 'Ayesha Rahman',
    phone: CUSTOMER.mobile,
    address: 'House 12, Road 5, Banani',
    city: 'Dhaka',
    area: 'Banani',
    deliveryZone: 'inside_dhaka',
    paymentMethod: 'card',
  });
  check('paymentMethod outside the whitelist is rejected', badPay.status === 422, `status ${badPay.status}`);

  // ---------- browser ----------
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.setDefaultTimeout(20000);

  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon|net::ERR_ABORTED/i.test(msg.text())) consoleErrors.push(msg.text());
  });

  const previews = [];
  const orderPosts = [];
  page.on('request', (req) => {
    if (req.method() !== 'POST') return;
    if (req.url().includes('/checkout/preview')) {
      try {
        previews.push(JSON.parse(req.postData() || '{}'));
      } catch {
        /* ignore */
      }
    }
    if (req.url().includes('/api/orders') && !req.url().includes('preview')) orderPosts.push(req.url());
  });

  // 1. signed-out checkout is gated and returns here after signing in
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle2' });
  const gated = new URL(page.url());
  check(
    'signed-out /checkout redirects to the sign-in gate',
    gated.pathname === '/login' && gated.search.includes('next=%2Fcheckout'),
    page.url()
  );

  // sign in through the gate so the ?next= target is exercised end to end
  await signIn(page, '?next=%2Fcheckout');
  await page.waitForFunction(() => location.pathname === '/checkout', { timeout: 15000 });
  check('login returns to /checkout', true, page.url());
  await page.waitForFunction(() => document.body.innerText.includes('Your cart is empty'), { timeout: 15000 });
  check('empty cart shows the empty state', true);

  // 2. product page: compact recommendation shelf
  await page.goto(BASE + PRODUCT_PATH, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.section-row--compact .product-card');
  const pdpText = await page.evaluate(() => document.body.innerText);
  check('product page renders its buy controls', pdpText.includes('Add to cart'));
  check('related shelf is the compact variant', (await page.$('.section-row--compact')) !== null);

  const sizes = [
    { width: 1366, cols: 5, label: 'desktop' },
    { width: 1000, cols: 4, label: 'small laptop' },
    { width: 800, cols: 3, label: 'tablet' },
    { width: 400, cols: 2, label: 'mobile' },
  ];
  for (const size of sizes) {
    await page.setViewport({ width: size.width, height: 900 });
    await new Promise((r) => setTimeout(r, 350));
    const shelf = await readShelf(page);
    check(
      `related cards use ${size.cols} columns at ${size.width}px (${size.label})`,
      shelf.cols === size.cols,
      `cols ${shelf.cols}, card ${shelf.cardWidth}px, ${shelf.cards} cards`
    );
    check(
      `related cards do not overflow-scroll at ${size.width}px`,
      !shelf.scrollable,
      `scrollable ${shelf.scrollable}`
    );
    check(
      `related card width under 280px at ${size.width}px`,
      shelf.cardWidth > 0 && shelf.cardWidth < 280,
      `${shelf.cardWidth}px`
    );
    if (size.width !== 1366) await page.screenshot({ path: `${SHOTS}\\related-${size.width}.png` });
  }
  await page.setViewport({ width: 1366, height: 900 });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: `${SHOTS}\\product-detail-related.png` });

  // home shelf still scrolls horizontally (untouched by the compact variant)
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.section-row__track');
  const homeShelf = await page.$eval('.section-row:not(.section-row--compact) .section-row__track', (el) => ({
    flow: getComputedStyle(el).gridAutoFlow,
    overflow: getComputedStyle(el).overflowX,
  }));
  check(
    'home shelf keeps the horizontal scroller',
    homeShelf.flow === 'column' && homeShelf.overflow === 'auto',
    JSON.stringify(homeShelf)
  );

  // 3. add to cart from the product page
  await page.goto(BASE + PRODUCT_PATH, { waitUntil: 'networkidle2' });
  await page.click('.detail__buy');
  await page.waitForFunction(() => {
    const badge = document.querySelector('a[href="/cart"] .icon-btn__badge');
    return badge && badge.textContent.trim() === '1';
  });
  check('header cart badge shows 1 after adding', true);

  // 4. checkout: prefilled details + server totals
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.checkout-layout');
  const fields = await page.evaluate(() => ({
    name: document.querySelector('input[autocomplete=name]')?.value,
    phone: document.querySelector('input[type=tel]')?.value,
    address: document.querySelector('input[autocomplete=street-address]')?.value,
    city: document.querySelector('input[autocomplete=address-level2]')?.value,
    area: document.querySelectorAll('.checkout-grid input')[5]?.value,
  }));
  check(
    'customer details prefilled from the account',
    fields.name === 'Ayesha Rahman' &&
      fields.phone === CUSTOMER.mobile &&
      fields.address === 'House 12, Road 5, Banani' &&
      fields.city === 'Dhaka' &&
      fields.area === 'Banani',
    JSON.stringify(fields)
  );

  const cartPreview = await api('preview cart', 'POST', '/checkout/preview', { deliveryZone: 'inside_dhaka' });
  const apiTotal = Number(cartPreview.body?.data?.total);
  await page.waitForFunction(() => /৳|Tk|৳/.test(document.querySelector('.cart-summary__row--total')?.textContent || ''), { timeout: 15000 });
  const pageTotal = await money(page, '.cart-summary__row--total');
  check(
    'page total matches the server-computed total',
    pageTotal.includes(apiTotal.toLocaleString('en-US')),
    `page "${pageTotal}" vs api ${apiTotal}`
  );

  const lineCount = (await page.$$('.checkout-line')).length;
  check('order summary lists the cart line', lineCount === 1, `${lineCount} lines`);
  const lineText = await money(page, '.checkout-line');
  check(
    'line shows image, name, quantity and line total',
    /Digital Air Fryer/i.test(lineText) && lineText.includes('\u00D7 1') && (await page.$('.checkout-line__media img')) !== null,
    lineText
  );
  const summaryText = await page.evaluate(() => document.querySelector('.cart-summary').innerText);
  check(
    'delivery is free above the ৳5,000 threshold',
    /Delivery[\s\S]*Free/i.test(summaryText),
    summaryText.split('\n').filter((l) => /Delivery|Total|Subtotal/.test(l)).join(' | ')
  );
  check('cash on delivery is the selected method', await page.$eval('input[name=payment-method]', (el) => el.checked));

  // 5. coupon: invalid first, then a valid one, then remove it
  await page.type('.checkout-coupon input', 'NOPE2026');
  await page.click('.checkout-coupon button');
  await page.waitForSelector('.checkout-coupon__error', { timeout: 15000 });
  const couponErr = await money(page, '.checkout-coupon__error');
  check('invalid coupon shows an inline error', couponErr.length > 4, couponErr);
  await page.evaluate(() => {
    const input = document.querySelector('.checkout-coupon input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.type('.checkout-coupon input', 'SAVE200');
  await page.click('.checkout-coupon button');
  await page.waitForSelector('.checkout-coupon__applied', { timeout: 15000 });
  const couponText = await money(page, '.checkout-coupon__applied');
  check('valid coupon is applied', couponText.includes('SAVE200'), couponText);
  const withCoupon = await page.evaluate(() => document.querySelector('.cart-summary').innerText);
  check(
    'coupon discount + delivery fee re-priced by the server',
    /-৳200/.test(withCoupon) && /৳4,930/.test(withCoupon),
    withCoupon.split('\n').join(' | ')
  );

  // zone switch now that the total sits under the free-delivery threshold
  await page.click('.checkout-options label:nth-child(2)');
  await page.waitForFunction(
    () => {
      const t = document.querySelector('.cart-summary')?.innerText || '';
      return /Delivery \(Outside Dhaka\)/i.test(t) && /৳120/.test(t);
    },
    { timeout: 15000 }
  );
  const outsideText = await page.evaluate(() => document.querySelector('.cart-summary').innerText);
  check(
    'outside Dhaka raises the delivery fee to ৳120',
    /Delivery \(Outside Dhaka\)/i.test(outsideText) && /৳120/.test(outsideText),
    outsideText.split('\n').filter((l) => /Delivery|Total/.test(l)).join(' | ')
  );
  const lastPreview = previews[previews.length - 1];
  check('preview was re-requested with the new zone', lastPreview?.deliveryZone === 'outside_dhaka', JSON.stringify(lastPreview));

  await page.click('.checkout-options label:nth-child(1)');
  await page.waitForFunction(
    () => /Delivery \(Inside Dhaka\)/i.test(document.querySelector('.cart-summary')?.innerText || ''),
    { timeout: 15000 }
  );

  await page.click('.checkout-coupon__applied button');
  await page.waitForFunction(
    () => {
      const t = document.querySelector('.cart-summary')?.innerText || '';
      return !document.querySelector('.checkout-coupon__applied') && /৳5,070/.test(t) && /Delivery[\s\S]*Free/i.test(t);
    },
    { timeout: 15000 }
  );
  const afterRemove = await page.evaluate(() => document.querySelector('.cart-summary').innerText);
  check(
    'removing the coupon restores the ৳5,070 total',
    /৳5,070/.test(afterRemove) && !/-৳200/.test(afterRemove),
    afterRemove.split('\n').filter((l) => /Subtotal|Total|Delivery/.test(l)).join(' | ')
  );

  await page.screenshot({ path: `${SHOTS}\\checkout-filled.png` });

  // 6. client-side validation blocks an incomplete address
  await page.evaluate(() => {
    const input = document.querySelector('input[autocomplete=street-address]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('.checkout-summary__place');
  await page.waitForSelector('.field--invalid', { timeout: 8000 });
  const fieldErr = await money(page, '.field__error');
  check('missing address is flagged before submitting', fieldErr.includes('required'), fieldErr);
  check('validation keeps you on /checkout', new URL(page.url()).pathname === '/checkout', page.url());
  const stillBefore = await api('orders list after failed validation', 'GET', '/orders?limit=1');
  check(
    'no order created by the blocked submit',
    totalOf(stillBefore.body) === ordersBefore,
    `${totalOf(stillBefore.body)} vs ${ordersBefore}`
  );

  // restore the address
  await page.type('input[autocomplete=street-address]', 'House 12, Road 5, Banani');
  await page.waitForFunction(() => !document.querySelector('.field--invalid'));

  // 7. triple click creates exactly one order
  const busySeen = await page.evaluate(async () => {
    const btn = document.querySelector('.checkout-summary__place');
    let seen = false;
    const observer = new MutationObserver(() => {
      if (btn.disabled || /Placing/.test(btn.textContent)) seen = true;
    });
    observer.observe(btn, { attributes: true, childList: true, subtree: true, characterData: true });
    btn.click();
    btn.click();
    btn.click();
    await new Promise((r) => setTimeout(r, 500));
    observer.disconnect();
    return seen;
  });
  check('submit button enters the busy/disabled state on the first click', busySeen);

  await page.waitForFunction(() => /^\/orders\/\d+$/.test(location.pathname), { timeout: 20000 });
  const orderUrl = page.url();
  const orderId = Number(orderUrl.match(/\/orders\/(\d+)$/)?.[1]);
  check('success lands on the order page', Number.isFinite(orderId) && orderId > 0, orderUrl);
  check('the triple click sent exactly one POST /orders', orderPosts.length === 1, `${orderPosts.length} posts`);

  const after = await api('orders list after the run', 'GET', '/orders?limit=1');
  const ordersAfter = totalOf(after.body);
  check('exactly one order created by the triple click', ordersAfter === ordersBefore + 1, `${ordersBefore} -> ${ordersAfter}`);

  const one = await api('the new order', 'GET', `/orders/${orderId}`);
  const order = one.body?.data?.order || one.body?.order;
  check('order loads for its owner', one.status === 200 && Boolean(order), `status ${one.status}`);
  check('order stores payment_method cod', order?.payment_method === 'cod', String(order?.payment_method));
  check('order stores the delivery zone', order?.delivery_zone === 'inside_dhaka', String(order?.delivery_zone));
  check(
    'order totals match the previewed totals',
    Number(order?.total) === apiTotal,
    `order ${order?.total} vs preview ${apiTotal}`
  );
  check('order carries exactly one item', order?.items?.length === 1, `${order?.items?.length} items`);

  const cartAfter = await api('cart after ordering', 'GET', '/cart');
  check(
    'cart cleared by the order',
    Number(cartAfter.body?.data?.itemCount ?? cartAfter.body?.data?.items?.length ?? -1) === 0,
    JSON.stringify(cartAfter.body?.data?.itemCount ?? cartAfter.body?.data?.items?.length)
  );

  const badgeGone = await page.$('a[href="/cart"] .icon-btn__badge');
  check('header cart badge resets', badgeGone === null);

  const detailText = await page.evaluate(() => document.body.innerText);
  check(
    'order page shows the number and the item',
    detailText.includes(order?.order_number || '\u0000') && /Digital Air Fryer/i.test(detailText),
    order?.order_number || ''
  );
  await page.screenshot({ path: `${SHOTS}\\order-created.png` });

  // 8. survives a reload and appears under My orders
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.order-item');
  const reloaded = await page.evaluate(() => document.body.innerText);
  check('order page survives a reload', /Digital Air Fryer/i.test(reloaded));

  await page.goto(`${BASE}/orders`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.order-card');
  const listText = await page.evaluate(() => document.body.innerText);
  check('order listed under My orders', listText.includes(order?.order_number || '\u0000'), order?.order_number);

  // 9. signed-out checkout is still gated
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' });
  await page.click('.header__account-btn');
  await page.waitForSelector('.header__account.is-open .header__account-panel');
  await page.click('button[aria-label="Sign out"]');
  await page.waitForFunction(() => document.querySelector('.header__account-btn .icon-btn__label')?.textContent.trim() === 'Account');
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle2' });
  check('signed-out checkout redirects to login again', new URL(page.url()).pathname === '/login', page.url());

  await browser.close();

  check('no uncaught page errors during the run', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  if (consoleErrors.length) console.log(`      console errors (non-fatal): ${consoleErrors.slice(0, 3).join(' | ')}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(`screenshots: ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('checkout-test run failed:', err.message);
  process.exit(1);
});
