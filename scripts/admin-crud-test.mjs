import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:5000/api';

const env = Object.fromEntries(
  fs.readFileSync('backend/.env', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Gentle polling: the app ships a global 500 req / 15 min limiter, so the suite
// must stay well under it (the browser also spends requests on every page load).
async function until(fn, timeout = 8000, step = 700) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      last = await fn();
      if (last) return last;
    } catch {
      /* keep polling */
    }
    await wait(step);
  }
  return last;
}

async function api(method, path, { token, body, retries = 3 } = {}) {
  let attempt = 0;
  let res;
  for (;;) {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429 && attempt < retries) {
      attempt += 1;
      await wait(3000);
      continue;
    }
    break;
  }
  let json = {};
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

let adminToken = '';
async function loginAdminApi() {
  const res = await api('POST', '/auth/admin-login', {
    body: { identifier: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
  });
  adminToken = res.body?.data?.token || '';
  return adminToken;
}

// tiny valid 1x1 PNG + a text file for the invalid-type check
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const PNG_PATH = 'scripts/_tmp-phase12.png';
const TXT_PATH = 'scripts/_tmp-phase12.txt';
fs.writeFileSync(PNG_PATH, PNG);
fs.writeFileSync(TXT_PATH, 'not an image');

const cleanErrors = (state) => [...state.jsErrors].filter((t) => !/Failed to load resource/i.test(t));

// Replace an input's whole value: triple-click selection is flaky on populated
// fields (it can append instead of overwrite), so select() the value directly.
async function fill(page, selector, value) {
  await page.$eval(selector, (el) => {
    el.focus();
    el.select();
  });
  await page.type(selector, value);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

async function newPage(viewport = { width: 1366, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const state = { jsErrors: [], api: [] };
  page.on('console', (m) => { if (m.type() === 'error') state.jsErrors.push(m.text()); });
  page.on('pageerror', (e) => state.jsErrors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (r.url().includes('/api/')) state.api.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  return { page, state };
}

const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText.trim() || '', sel);
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const modalOpen = async (page) => (await count(page, '.admin-modal')) > 0;
const closeModals = async (page) => {
  for (let i = 0; i < 3; i += 1) {
    if (!(await modalOpen(page))) return;
    await page.evaluate(() => document.querySelector('.admin-modal__x')?.click());
    await wait(350);
  }
};

async function adminLoginUi(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
  await wait(700);
  if (page.url().includes('/admin/login')) {
    const inputs = await page.$$('.auth__card form input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(env.ADMIN_EMAIL);
      await inputs[1].type(env.ADMIN_PASSWORD);
      await page.click('.auth__submit');
    }
  }
  await until(() => page.url().endsWith('/admin'), 9000);
}

// keep a pristine copy of everything the test touches so the store is restored
const originalSettings = (await api('GET', '/admin/settings', { token: await loginAdminApi() })).body?.data?.settings || {};
const contentCleanup = {};

try {
  // ------------------------------------------------------------------ 1. security
  {
    const { page, state } = await newPage();
    const deep = ['/admin/products', '/admin/orders', '/admin/customers', '/admin/content', '/admin/content/banners'];

    for (const path of deep) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
      await wait(900);
      const url = page.url();
      const next = url.includes('/admin/login') ? new URL(url).searchParams.get('next') : null;
      check(`guest blocked from ${path}`, next === path, `url=${url}`);
    }

    const guest = await Promise.all([
      api('GET', '/admin/products'),
      api('GET', '/admin/orders'),
      api('GET', '/admin/customers'),
      api('GET', '/admin/dashboard'),
      api('POST', '/admin/banners', { body: { title: 'x' } }),
      api('PUT', '/admin/settings', { body: { store_name: 'x' } }),
      api('DELETE', '/admin/customers/1'),
      api('PUT', '/admin/orders/1/status', { body: { status: 'shipped' } }),
    ]);
    check('guest admin API calls all 401', guest.every((r) => r.status === 401), guest.map((r) => r.status).join(','));

    const customerRes = await api('POST', '/auth/login', {
      body: { mobile: '01712345678', password: 'Password123' },
    });
    const customerToken = customerRes.body?.data?.token || '';
    const asCustomer = await Promise.all([
      api('GET', '/admin/products', { token: customerToken }),
      api('GET', '/admin/orders', { token: customerToken }),
      api('GET', '/admin/customers', { token: customerToken }),
      api('GET', '/admin/dashboard', { token: customerToken }),
      api('POST', '/admin/banners', { token: customerToken, body: { title: 'x' } }),
      api('PUT', '/admin/settings', { token: customerToken, body: { store_name: 'x' } }),
      api('DELETE', '/admin/customers/1', { token: customerToken }),
      api('PUT', '/admin/orders/1/status', { token: customerToken, body: { status: 'shipped' } }),
    ]);
    check('customer admin API calls all 403', asCustomer.every((r) => r.status === 403), asCustomer.map((r) => r.status).join(','));
    check('settings unchanged by blocked calls',
      (await api('GET', '/admin/settings', { token: adminToken })).body?.data?.settings?.store_name === originalSettings.store_name,
      '');

    // signed-in customer: every admin screen must render the access-denied card
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => localStorage.setItem('eshopping.token', t), customerToken);
    const deniedPaths = [];
    for (const path of deep) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });
      await wait(700);
      const heading = await text(page, '.admin-deny h1');
      if (heading !== 'Administrator access required') deniedPaths.push(`${path} -> "${heading}" ${page.url()}`);
    }
    check('customer blocked from all 5 admin screens', deniedPaths.length === 0, deniedPaths.join(' | '));
    check('security sweep has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 2. dashboard
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);
    await wait(2200);

    const kpis = await count(page, '.admin-kpi');
    const kpiLabels = await page.evaluate(() => [...document.querySelectorAll('.admin-kpi span')].map((s) => s.innerText.toLowerCase()));
    const hasCharts = await count(page, '.admin-chart svg');
    check('dashboard loads for the admin', page.url().endsWith('/admin') && kpis === 4, `url=${page.url()} kpis=${kpis}`);
    check('KPI cards: revenue / orders / customers / products',
      ['revenue', 'total orders', 'total customers', 'total products'].every((l) => kpiLabels.includes(l)),
      JSON.stringify(kpiLabels));
    check('dashboard renders recharts graphs', hasCharts > 0, `svg blocks=${hasCharts}`);
    const moneyFigures = await until(async () => (await text(page, '.admin-kpis')).includes('৳'), 6000);
    check('dashboard shows money figures', moneyFigures, '');

    const revenueCallsBefore = state.api.filter((r) => r.includes('/admin/analytics/revenue')).length;
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('.admin-segbtn button')].find((b) => b.innerText.includes('30 days'));
      btn?.click();
    });
    await wait(1800);
    const activePeriod = await text(page, '.admin-segbtn .is-active');
    const revenueCallsAfter = state.api.filter((r) => r.includes('/admin/analytics/revenue')).length;
    check('period switch (7d -> 30d) re-requests the sales series',
      activePeriod === '30 days' && revenueCallsAfter > revenueCallsBefore,
      `active="${activePeriod}" calls=${revenueCallsBefore} -> ${revenueCallsAfter}`);

    const legend = await count(page, '.admin-legend li');
    const panels = await page.evaluate(() => [...document.querySelectorAll('.admin-panel__head h2')].map((h) => h.innerText.trim()));
    check('status + category panels present',
      panels.some((p) => p.includes('Orders by status')) && panels.some((p) => p.includes('Sales by category')) &&
      panels.some((p) => p.includes('Top products')) && panels.some((p) => p.includes('Latest orders')) && legend >= 1,
      JSON.stringify(panels));
    check('dashboard has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 3. products CRUD
  let createdName = `Phase12 test product ${Date.now()}`;
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);
    await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle2' });
    await wait(1500);

    const rows = await count(page, '.admin-table--rows tbody tr');
    check('products page lists the catalogue', rows > 0, `rows=${rows}`);

    // --- filters / search
    await page.type('.admin-filters input[type="search"]', 'zzz-no-such-product-zzz');
    await page.evaluate(() => [...document.querySelectorAll('.admin-filters button')].find((b) => b.innerText.includes('Apply'))?.click());
    await wait(1500);
    const emptyHeading = await text(page, '.admin-empty h2');
    check('search with no matches shows an empty state', emptyHeading === 'No products match these filters', emptyHeading);

    await page.evaluate(() => [...document.querySelectorAll('.admin-filters button')].find((b) => b.innerText.includes('Reset'))?.click());
    await wait(1200);
    check('reset brings the catalogue back', (await count(page, '.admin-table--rows tbody tr')) > 0, '');

    // --- validation: empty form must not create anything
    await page.evaluate(() => [...document.querySelectorAll('.admin-page__head .btn')].find((b) => b.innerText.includes('Add product'))?.click());
    await wait(700);
    await page.click('button[form="product-form"]');
    await wait(500);
    const fieldErrors = await count(page, '#product-form .admin-field__error');
    const totalBefore = await text(page, '.admin-page__head p');
    check('empty product form shows validation errors', fieldErrors >= 3 && (await modalOpen(page)), `errors=${fieldErrors}`);
    check('invalid image rejected', await (async () => {
      const input = await page.$('#product-form input[type="file"]');
      await input.uploadFile(TXT_PATH);
      await wait(700);
      const pending = await count(page, '.admin-picker__item--new');
      const toastText = await page.evaluate(() => document.body.innerText);
      return pending === 0 && /only JPG|not.*allowed|images are allowed/i.test(toastText);
    })(), '');

    // --- create with a real image upload
    await fill(page, '#pf-name', createdName);
    await page.select('#pf-category', await page.evaluate(() => document.querySelector('#pf-category option:nth-child(2)').value));
    await fill(page, '#pf-price', '1500');
    await fill(page, '#pf-stock', '7');
    const fileInput = await page.$('#product-form input[type="file"]');
    await fileInput.uploadFile(PNG_PATH);
    await wait(500);
    check('new image shows an instant preview', (await count(page, '.admin-picker__item--new')) === 1, '');
    await page.click('button[form="product-form"]');
    const closed = await until(async () => !(await modalOpen(page)), 9000);
    await wait(800);
    check('product created from the form', closed && (await page.evaluate((n) => document.body.innerText.includes(n), createdName)), `closed=${closed} ${totalBefore}`);

    await page.type('.admin-filters input[type="search"]', createdName);
    await page.evaluate(() => [...document.querySelectorAll('.admin-filters button')].find((b) => b.innerText.includes('Apply'))?.click());
    await wait(1500);
    const foundRows = await count(page, '.admin-table--rows tbody tr');
    const firstRowText = await text(page, '.admin-table--rows tbody tr:first-child');
    check('created product is searchable', foundRows === 1 && firstRowText.includes('7 left'), `rows=${foundRows} row="${firstRowText.replace(/\s+/g, ' ')}"`);

    // --- edit
    await page.evaluate(() => document.querySelector('.admin-table--rows tbody tr .admin-actions .btn')?.click());
    await wait(900);
    const editName = await page.evaluate(() => document.querySelector('#pf-name')?.value || '');
    await fill(page, '#pf-stock', '3');
    await page.click('button[form="product-form"]');
    await until(async () => !(await modalOpen(page)), 9000);
    await wait(1200);
    const editedRow = await text(page, '.admin-table--rows tbody tr:first-child');
    check('edit re-opens the same product and saves stock', editName === createdName && editedRow.includes('3 left'),
      `loaded="${editName}" row="${editedRow.replace(/\s+/g, ' ')}"`);

    // --- image on edit
    await page.evaluate(() => document.querySelector('.admin-table--rows tbody tr .admin-actions .btn')?.click());
    await wait(900);
    const keptImages = await count(page, '#product-form .admin-picker__item');
    check('edit keeps the existing image', keptImages === 1, `images=${keptImages}`);
    await closeModals(page);

    // --- delete (with confirmation)
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.admin-table--rows tbody tr:first-child .admin-actions .btn')];
      btns.find((b) => b.innerText.includes('Delete'))?.click();
    });
    await wait(800);
    const confirmTitle = await text(page, '.admin-modal__head h2');
    const confirmText = await text(page, '.admin-confirm__text');
    check('delete asks for confirmation first', confirmTitle === 'Delete product' && confirmText.includes(createdName), `${confirmTitle} / ${confirmText}`);
    await page.evaluate(() => document.querySelector('.admin-modal .btn--danger')?.click());
    const gone = await until(async () => {
      const rows = await page.$$eval('.admin-table--rows tbody tr', (els) => els.map((e) => e.innerText));
      return rows.every((r) => !r.includes(createdName));
    }, 9000);
    check('product deleted and removed from the list', gone, '');

    const apiHasProduct = await api('GET', '/admin/products', { token: adminToken, body: undefined });
    const names = (apiHasProduct.body?.data?.products || []).map((p) => p.name);
    check('deleted product is gone from the API too', apiHasProduct.status === 200 && !names.includes(createdName),
      `status=${apiHasProduct.status} checked ${names.length} rows`);

    check('products flow has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 4. orders
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);
    await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
    await wait(1600);

    const rows = await count(page, '.admin-table--rows tbody tr');
    check('orders page lists orders', rows > 0, `rows=${rows}`);

    // Open a mutable order: the newest row can be a cancelled one (immutable),
    // which would silently skip the whole status-update branch below.
    await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('.admin-table--rows tbody tr')];
      const target = candidates.find((row) => !/cancelled/i.test(row.innerText)) || candidates[0];
      target?.querySelector('.admin-actions .btn')?.click();
    });
    await wait(1400);
    const title = await text(page, '.admin-modal__head h2');
    const blocks = await count(page, '.admin-order__block');
    const items = await count(page, '.admin-order .admin-table tbody tr');
    check('order detail opens with customer/payment/totals', /^Order \w+/.test(title) && blocks === 3 && items > 0,
      `${title} blocks=${blocks} items=${items}`);

    // the pill renders with text-transform: capitalize, so read the real value
    const original = (await text(page, '.admin-order__status .admin-pill')).trim().toLowerCase();
    const orderNumber = title.replace('Order ', '');
    const listed = (await api('GET', `/admin/orders?search=${orderNumber}`, { token: adminToken })).body?.data?.orders || [];
    const orderId = (listed.find((o) => o.order_number === orderNumber) || {}).id;
    check('order detail resolves to a real order id', Boolean(orderId), `${orderNumber} -> ${orderId}`);
    if (original === 'cancelled' || !orderId) {
      check('order status update (skipped: order is cancelled)', true, 'cancelled orders are immutable');
    } else {
      const nextStatus = original === 'confirmed' ? 'processing' : 'confirmed';
      await page.select('#order-status', nextStatus);
      await page.type('#order-note', 'Phase12 status check');
      await page.click('.admin-order__status .btn--primary');
      const saved = await until(async () => {
        const pill = await text(page, '.admin-order__status .admin-field__hint .admin-pill');
        return pill.trim().toLowerCase() === nextStatus;
      }, 9000);
      await wait(500);
      check('order status updates without errors', saved && cleanErrors(state).length === 0,
        `pill="${await text(page, '.admin-order__status .admin-field__hint .admin-pill')}" ${JSON.stringify(cleanErrors(state))}`);

      const apiOrder = await api('GET', `/admin/orders/${orderId}`, { token: adminToken });
      check('new order status persisted in the API', apiOrder.body?.data?.order?.order_status === nextStatus,
        apiOrder.body?.data?.order?.order_status);

      // restore the original status (no note, so the order is left as we found it)
      const restore = await api('PUT', `/admin/orders/${orderId}/status`, {
        token: adminToken,
        body: { status: original },
      });
      const restored = await api('GET', `/admin/orders/${orderId}`, { token: adminToken });
      check('order status restored',
        restored.body?.data?.order?.order_status === original && !restored.body?.data?.order?.status_note,
        `${restore.status} -> ${restored.body?.data?.order?.order_status} note=${restored.body?.data?.order?.status_note}`);
    }

    await closeModals(page);

    // filters
    await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
    await wait(1200);
    await page.type('.admin-filters input[type="search"]', 'zzz-no-such-order-zzz');
    await page.evaluate(() => [...document.querySelectorAll('.admin-filters button')].find((b) => b.innerText.includes('Apply'))?.click());
    await wait(1400);
    check('order search empty state', (await text(page, '.admin-empty h2')) === 'No orders match these filters', await text(page, '.admin-empty h2'));

    check('orders flow has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 5. customers
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);
    await page.goto(`${BASE}/admin/customers`, { waitUntil: 'networkidle2' });
    await wait(1500);
    const rows = await count(page, '.admin-table--rows tbody tr');
    check('customers page lists accounts', rows > 0, `rows=${rows}`);

    // a fresh customer to exercise status + delete end to end
    const probeName = `Phase12 Probe ${Date.now()}`;
    const probeMobile = `017${String(Date.now()).slice(-8)}`;
    const created = await api('POST', '/auth/register', {
      body: { name: probeName, mobile: probeMobile, email: `${probeMobile}@example.com`, password: 'Password123', confirmPassword: 'Password123' },
    });
    check('probe customer registered', created.status === 201 || created.status === 200, `status=${created.status}`);

    await page.type('.admin-filters input[type="search"]', probeMobile);
    await page.evaluate(() => [...document.querySelectorAll('.admin-filters button')].find((b) => b.innerText.includes('Apply'))?.click());
    await wait(1500);
    const found = await count(page, '.admin-table--rows tbody tr');
    check('customer search finds the new account', found === 1, `rows=${found}`);

    await page.evaluate(() => document.querySelector('.admin-table--rows tbody tr .admin-actions .btn')?.click());
    await wait(1400);
    const stats = await count(page, '.admin-customer__stats .admin-kpi--sm');
    const infoLines = await count(page, '.admin-customer__info p');
    check('customer detail shows stats + profile + orders', stats === 3 && infoLines >= 4, `stats=${stats} info=${infoLines}`);

    // disable then re-enable
    const probeRow = ((await api('GET', `/admin/customers?search=${probeMobile}`, { token: adminToken })).body?.data?.rows || [])
      .find((r) => r.mobile === probeMobile);
    check('probe customer is visible to the admin API', Boolean(probeRow), `id=${probeRow?.id}`);

    let statusSeen = '';
    await page.evaluate(() => [...document.querySelectorAll('.admin-modal__foot .btn')].find((b) => b.innerText.includes('Disable'))?.click());
    const disabled = await until(async () => {
      const detail = await api('GET', `/admin/customers/${probeRow.id}`, { token: adminToken });
      statusSeen = detail.body?.data?.customer?.status || `http ${detail.status}`;
      return statusSeen === 'disabled';
    }, 9000);
    check('customer can be disabled from the detail view', disabled, `status=${statusSeen}`);

    await page.evaluate(() => [...document.querySelectorAll('.admin-modal__foot .btn')].find((b) => b.innerText.includes('Enable'))?.click());
    const enabled = await until(async () => {
      const detail = await api('GET', `/admin/customers/${probeRow.id}`, { token: adminToken });
      statusSeen = detail.body?.data?.customer?.status || `http ${detail.status}`;
      return statusSeen === 'active';
    }, 9000);
    check('customer re-enabled from the same view', enabled, `status=${statusSeen}`);

    await closeModals(page);

    // delete it
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.admin-table--rows tbody tr:first-child .admin-actions .btn')];
      btns.find((b) => b.innerText.includes('Delete'))?.click();
    });
    await wait(700);
    const confirmText = await text(page, '.admin-confirm__text');
    check('customer delete asks for confirmation', confirmText.includes(probeName), confirmText);
    await page.evaluate(() => document.querySelector('.admin-modal .btn--danger')?.click());
    const removed = await until(async () => (await count(page, '.admin-table--rows tbody tr')) === 0, 9000);
    check('customer removed from the list', removed, '');

    const gone = await api('GET', '/admin/customers', { token: adminToken, body: undefined });
    const stillThere = (gone.body?.data?.rows || []).some((r) => r.mobile === probeMobile);
    check('deleted customer gone from the API', gone.status === 200 && !stillThere,
      `status=${gone.status} rows=${(gone.body?.data?.rows || []).length}`);

    check('customers flow has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 6. content: banners
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);

    // hub
    await page.goto(`${BASE}/admin/content`, { waitUntil: 'networkidle2' });
    await wait(1400);
    const cards = await count(page, '.admin-card');
    const cardTitles = await page.evaluate(() => [...document.querySelectorAll('.admin-card__body strong')].map((s) => s.innerText));
    check('content dashboard shows all 6 sections', cards === 6, JSON.stringify(cardTitles));

    await page.evaluate(() => {
      const link = [...document.querySelectorAll('.admin-card')].find((a) => a.innerText.includes('Homepage banners'));
      link?.click();
    });
    await wait(1500);
    check('content card navigates to banners', page.url().includes('/admin/content/banners'), page.url());
    const bannerRowsBefore = await count(page, '.admin-table--rows tbody tr');
    // remember the seed banners' sort order so the reorder step leaves no trace
    // (the admin list answers with snake_case columns straight from MySQL)
    const seedSort = ((await api('GET', '/admin/banners', { token: adminToken })).body?.data?.banners || [])
      .map((b) => ({ id: b.id, sortOrder: Number(b.sort_order ?? b.sortOrder) || 0 }));
    const lowestSort = Math.min(...seedSort.map((b) => b.sortOrder), 0) - 1;

    // add a banner
    const bannerTitle = `Phase12 hero ${Date.now()}`;
    await page.evaluate(() => [...document.querySelectorAll('.admin-page__head .btn')].find((b) => b.innerText.includes('Add banner'))?.click());
    await wait(700);
    await page.type('#bf-title', bannerTitle);
    await page.type('#bf-subtitle', 'Phase 12 promo subtitle');
    await page.type('#bf-button-text', 'Shop now');
    await page.type('#bf-button-link', '/shop');
    await fill(page, '#bf-order', String(lowestSort));
    const bannerFile = await page.$('.admin-modal input[type="file"]');
    await bannerFile.uploadFile(PNG_PATH);
    await wait(500);
    await page.click('button[form="banner-form"]');
    const bannerSaved = await until(async () => !(await modalOpen(page)), 9000);
    await wait(800);
    const bannerRows = await count(page, '.admin-table--rows tbody tr');
    check('banner created with an uploaded image', bannerSaved && bannerRows === bannerRowsBefore + 1,
      `closed=${bannerSaved} rows=${bannerRowsBefore} -> ${bannerRows}`);

    const publicBanners = (await api('GET', '/banners')).body?.data?.banners || [];
    check('new banner is live on the public API', publicBanners.some((b) => b.title === bannerTitle),
      `${publicBanners.length} public banners`);
    const stored = publicBanners.find((b) => b.title === bannerTitle);
    contentCleanup.bannerId = stored?.id;

    // it is first in the hero (sort order -1)
    const home = await newPage();
    await home.page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await wait(2000);
    const heroTitle = await text(home.page, '.hero__content h1');
    const heroImg = await home.page.evaluate(() => (document.querySelector('.hero')?.getAttribute('style') || ''));
    check('banner drives the homepage hero', heroTitle === bannerTitle && /uploads/.test(heroImg),
      `hero="${heroTitle}" style="${heroImg.slice(0, 90)}"`);
    await home.page.close();

    // edit + disable (always target our banner, never somebody else's)
    await page.evaluate((needle) => {
      const row = [...document.querySelectorAll('.admin-table--rows tbody tr')].find((tr) => tr.innerText.includes(needle));
      [...(row?.querySelectorAll('.admin-actions .btn') || [])].find((b) => b.innerText.includes('Edit'))?.click();
    }, bannerTitle);
    await wait(800);
    const editingTitle = await page.evaluate(() => document.querySelector('#bf-title')?.value || '');
    await fill(page, '#bf-title', `${bannerTitle} edited`);
    await page.select('#bf-status', 'inactive');
    await page.click('button[form="banner-form"]');
    await until(async () => !(await modalOpen(page)), 9000);
    await wait(800);
    check('banner edit re-opened the right banner', editingTitle === bannerTitle, editingTitle);
    const afterEdit = (await api('GET', '/banners')).body?.data?.banners || [];
    check('disabled banner is hidden from the public site', !afterEdit.some((b) => b.title.includes(bannerTitle)), '');
    const adminBanners = (await api('GET', '/admin/banners', { token: adminToken })).body?.data?.banners || [];
    check('disabled banner still listed for the admin', adminBanners.some((b) => b.title === `${bannerTitle} edited`), '');

    // reorder: push our banner one position down
    const orderBefore = await page.evaluate(() =>
      [...document.querySelectorAll('.admin-table--rows tbody tr')].slice(0, 2).map((tr) => ({
        title: tr.querySelector('td:nth-child(2) strong')?.innerText || '',
        order: tr.querySelector('.admin-order-input span')?.innerText || '',
      }))
    );
    await page.evaluate((needle) => {
      const row = [...document.querySelectorAll('.admin-table--rows tbody tr')].find((tr) => tr.innerText.includes(needle));
      [...(row?.querySelectorAll('.admin-order-input button') || [])][1]?.click();
    }, bannerTitle);
    await wait(1600);
    const orderAfter = await page.evaluate(() =>
      [...document.querySelectorAll('.admin-table--rows tbody tr')].slice(0, 2).map((tr) => ({
        title: tr.querySelector('td:nth-child(2) strong')?.innerText || '',
        order: tr.querySelector('.admin-order-input span')?.innerText || '',
      }))
    );
    check('banner ordering control swaps positions',
      JSON.stringify(orderBefore) !== JSON.stringify(orderAfter),
      `${JSON.stringify(orderBefore)} -> ${JSON.stringify(orderAfter)}`);

    // delete
    await page.evaluate((needle) => {
      const row = [...document.querySelectorAll('.admin-table--rows tbody tr')].find((tr) => tr.innerText.includes(needle));
      [...(row?.querySelectorAll('.admin-actions .btn') || [])].find((b) => b.innerText.includes('Delete'))?.click();
    }, bannerTitle);
    await wait(700);
    check('banner delete asks for confirmation', (await text(page, '.admin-confirm__text')).includes(bannerTitle), await text(page, '.admin-modal__head h2'));
    await page.evaluate(() => document.querySelector('.admin-modal .btn--danger')?.click());
    const bannerGone = await until(async () => (await count(page, '.admin-table--rows tbody tr')) === bannerRowsBefore, 9000);
    const adminBannersAfter = (await api('GET', '/admin/banners', { token: adminToken })).body?.data?.banners || [];
    check('banner deleted from admin and public API', bannerGone && !adminBannersAfter.some((b) => b.title.includes(bannerTitle)),
      `rows=${await count(page, '.admin-table--rows tbody tr')}`);

    // put the seed banners back in their original order
    let restoredSort = true;
    for (const seed of seedSort) {
      const now = adminBannersAfter.find((b) => b.id === seed.id);
      const nowSort = now ? Number(now.sort_order ?? now.sortOrder) || 0 : seed.sortOrder;
      if (!now || nowSort === seed.sortOrder) continue;
      const res = await api('PUT', `/admin/banners/${seed.id}`, { token: adminToken, body: { sortOrder: seed.sortOrder } });
      if (res.status !== 200) restoredSort = false;
    }
    check('seed banner ordering restored after the test', restoredSort, JSON.stringify(seedSort.map((b) => b.sortOrder)));

    check('banner flow has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 7. content: branding + store info
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);
    const newStoreName = `EShopping Phase12 ${String(Date.now()).slice(-4)}`;

    await page.goto(`${BASE}/admin/content/branding`, { waitUntil: 'networkidle2' });
    await wait(1400);
    const hadName = await page.evaluate(() => document.querySelector('#site-name')?.value || '');
    check('branding form loads current settings', hadName.length > 0, hadName);

    await fill(page, '#site-name', newStoreName);
    await fill(page, '#site-tagline', 'Phase 12 tagline check');
    const logoFile = await page.$('.admin-modal input[type="file"], .admin-page input[type="file"]');
    await logoFile.uploadFile(PNG_PATH);
    await wait(500);
    await page.evaluate(() => [...document.querySelectorAll('.admin-form__actions .btn')].find((b) => b.innerText.includes('Save branding'))?.click());
    const brandSaved = await until(async () => {
      const store = await api('GET', '/store');
      return store.body?.data?.storeName === newStoreName;
    }, 9000);
    check('site name + logo saved through the branding form', brandSaved, '');

    const store = (await api('GET', '/store')).body?.data || {};
    check('public store payload carries the new logo/name', store.storeName === newStoreName && /uploads/.test(store.logo || ''),
      `${store.storeName} / ${store.logo}`);

    const shop = await newPage();
    await shop.page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await wait(1800);
    const logoSrc = await shop.page.evaluate(() => document.querySelector('.brand__logo')?.getAttribute('src') || '');
    const headerName = await text(shop.page, '.brand__name');
    const favicon = await shop.page.evaluate(() => document.querySelector('link[rel="icon"]')?.getAttribute('href') || '');
    check('public header renders the uploaded logo', /uploads/.test(logoSrc), logoSrc);
    check('public header shows the renamed store', headerName === newStoreName, headerName);
    check('favicon falls back to the app icon when unset', favicon === '/favicon.svg' || /uploads/.test(favicon), favicon);
    await shop.page.close();

    // store information
    await page.goto(`${BASE}/admin/content/store-info`, { waitUntil: 'networkidle2' });
    await wait(1300);
    const phone = '+880170000000';
    await fill(page, '#store_phone', phone);
    await page.evaluate(() => [...document.querySelectorAll('.admin-form__actions .btn')].find((b) => b.innerText.includes('Save store'))?.click());
    const phoneSaved = await until(async () => ((await api('GET', '/store')).body?.data?.phone === phone), 9000);
    check('store phone saved and served publicly', phoneSaved, '');

    check('branding flow has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 8. content: categories + featured + coupons
  {
    const { page, state } = await newPage();
    await adminLoginUi(page);

    // categories: hide then show
    await page.goto(`${BASE}/admin/content/categories`, { waitUntil: 'networkidle2' });
    await wait(1500);
    const catRows = await count(page, '.admin-table--rows tbody tr');
    check('categories page lists categories', catRows > 0, `rows=${catRows}`);
    const firstCat = await text(page, '.admin-table--rows tbody tr:first-child .admin-prod__meta strong');
    const publicBefore = (await api('GET', '/categories')).body?.data?.categories || [];
    const isVisibleBefore = publicBefore.some((c) => c.name === firstCat);
    await page.evaluate((hide) => {
      const btns = [...document.querySelectorAll('.admin-table--rows tbody tr:first-child .admin-actions .btn')];
      btns.find((b) => b.innerText.includes(hide ? 'Hide' : 'Show'))?.click();
    }, isVisibleBefore);
    await wait(1600);
    const publicAfter = (await api('GET', '/categories')).body?.data?.categories || [];
    const isVisibleAfter = publicAfter.some((c) => c.name === firstCat);
    check('category visibility toggles on the public site', isVisibleBefore !== isVisibleAfter,
      `${firstCat}: ${isVisibleBefore} -> ${isVisibleAfter}`);
    // restore
    await page.evaluate((hide) => {
      const btns = [...document.querySelectorAll('.admin-table--rows tbody tr:first-child .admin-actions .btn')];
      btns.find((b) => b.innerText.includes(hide ? 'Hide' : 'Show'))?.click();
    }, isVisibleAfter);
    await wait(1600);
    const restoredCat = ((await api('GET', '/categories')).body?.data?.categories || []).some((c) => c.name === firstCat);
    check('category visibility restored', restoredCat === isVisibleBefore, '');

    // featured toggles
    await page.goto(`${BASE}/admin/content/featured`, { waitUntil: 'networkidle2' });
    await wait(1700);
    const switches = await count(page, '.admin-switch');
    check('featured page lists toggleable products', switches >= 3, `switches=${switches}`);
    const target = await page.evaluate(() => {
      const row = document.querySelector('.admin-table--rows tbody tr');
      return row ? { name: row.querySelector('.admin-prod__meta strong')?.innerText || '', on: row.querySelector('.admin-switch input')?.checked } : null;
    });
    if (target?.name) {
      await page.evaluate(() => document.querySelector('.admin-table--rows tbody tr .admin-switch input')?.click());
      await wait(1600);
      const list = (await api('GET', '/admin/products', { token: adminToken, body: undefined })).body?.data?.products || [];
      const row = list.find((p) => p.name === target.name);
      check('featured flag flips and persists', row && Boolean(Number(row.featured)) !== target.on,
        `${target.name}: ${target.on} -> ${row?.featured}`);
      // restore
      await page.evaluate(() => document.querySelector('.admin-table--rows tbody tr .admin-switch input')?.click());
      await wait(1500);
      const list2 = (await api('GET', '/admin/products', { token: adminToken, body: undefined })).body?.data?.products || [];
      const row2 = list2.find((p) => p.name === target.name);
      check('featured flag restored', row2 && Boolean(Number(row2.featured)) === target.on, `${row2?.featured}`);
    }

    // coupons CRUD
    const code = `PH12${String(Date.now()).slice(-6)}`;
    await page.goto(`${BASE}/admin/content/coupons`, { waitUntil: 'networkidle2' });
    await wait(1400);
    const couponRows = await count(page, '.admin-table--rows tbody tr');
    await page.evaluate(() => [...document.querySelectorAll('.admin-page__head .btn')].find((b) => b.innerText.includes('Add promotion'))?.click());
    await wait(700);
    await page.type('#cp-code', code);
    await page.type('#cp-value', '10');
    await page.type('#cp-min', '500');
    await page.click('button[form="coupon-form"]');
    await until(async () => !(await modalOpen(page)), 9000);
    await wait(900);
    const coupons = (await api('GET', '/admin/coupons', { token: adminToken })).body?.data?.coupons || [];
    check('promotion created and listed', coupons.some((c) => c.code === code), `${coupons.length} coupons`);

    await page.evaluate((needle) => {
      const row = [...document.querySelectorAll('.admin-table--rows tbody tr')].find((tr) => tr.innerText.includes(needle));
      [...(row?.querySelectorAll('.admin-actions .btn') || [])].find((b) => b.innerText.includes('Delete'))?.click();
    }, code);
    await wait(700);
    check('coupon delete asks for confirmation', (await text(page, '.admin-modal__head h2')) === 'Delete promotion', await text(page, '.admin-modal__head h2'));
    await page.evaluate(() => document.querySelector('.admin-modal .btn--danger')?.click());
    const couponsAfter = await until(async () => {
      const list = (await api('GET', '/admin/coupons', { token: adminToken })).body?.data?.coupons || [];
      return !list.some((c) => c.code === code);
    }, 9000);
    check('promotion deleted', couponsAfter, `rows=${await count(page, '.admin-table--rows tbody tr')} (was ${couponRows})`);

    check('content flow has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }

  // ------------------------------------------------------------------ 9. mobile responsive
  {
    const { page, state } = await newPage({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await adminLoginUi(page);
    await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle2' });
    await wait(1600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('products page has no horizontal overflow at 390px', overflow <= 1, `overflow=${overflow}px`);

    await page.evaluate(() => [...document.querySelectorAll('.admin-page__head .btn')].find((b) => b.innerText.includes('Add product'))?.click());
    await wait(800);
    const modalFits = await page.evaluate(() => {
      const card = document.querySelector('.admin-modal__card');
      if (!card) return false;
      const rect = card.getBoundingClientRect();
      return rect.width <= window.innerWidth + 1 && rect.left >= -1;
    });
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('add-product dialog fits the phone viewport', modalFits && overflow2 <= 1, `modal=${modalFits} overflow=${overflow2}px`);
    await closeModals(page);

    await page.goto(`${BASE}/admin/content`, { waitUntil: 'networkidle2' });
    await wait(1400);
    const overflow3 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('content dashboard has no horizontal overflow at 390px', overflow3 <= 1, `overflow=${overflow3}px`);
    check('mobile pass has no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
    await page.close();
  }
} finally {
  // -------------------------------------------------------------- restore the store
  try {
    const token = adminToken || (await loginAdminApi());
    await api('PUT', '/admin/settings', { token, body: {
      store_name: originalSettings.store_name,
      store_tagline: originalSettings.store_tagline,
      store_logo: originalSettings.store_logo,
      store_favicon: originalSettings.store_favicon,
      store_phone: originalSettings.store_phone,
      store_email: originalSettings.store_email,
      store_address: originalSettings.store_address,
    } });
    if (contentCleanup.bannerId) {
      await api('DELETE', `/admin/banners/${contentCleanup.bannerId}`, { token });
    }
    console.log('cleanup: settings restored');
  } catch (err) {
    console.log('cleanup failed:', err.message);
  }
  try { fs.unlinkSync(PNG_PATH); } catch { /* already gone */ }
  try { fs.unlinkSync(TXT_PATH); } catch { /* already gone */ }
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
