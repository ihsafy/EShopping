/**
 * Phase 13: image handling (no crop), desktop zoom + gallery, full-screen
 * viewer, mobile-first responsiveness, admin drawer/tables and the customer
 * <-> admin support chat.
 *
 *   node scripts/responsive-test.mjs
 *
 * Requires API :5000, frontend :5173, Chrome, XAMPP MySQL.
 * Screenshots land in %TEMP%\opencode\shots. Everything the run creates in
 * the database (product, images, order, chat messages, wishlist, cart) is
 * removed again in the finally block.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'C:\\Users\\ASUS\\EShopping';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const API = 'http://localhost:5000/api';
const PROFILE = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\pptr-profile-responsive';
const SHOTS = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\shots';
const TMP_IMGS = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\ratio-imgs';
const MYSQL = 'C:\\xampp\\mysql\\bin\\mysql.exe';

const CUSTOMER = { mobile: '01712345678', password: 'Password123' };
const PRODUCT_PATH = '/product/digital-air-fryer-55l';
const SINGLE_IMAGE_PATH = '/product/premium-cotton-kurta';
const CHEAP_PATH = '/product/minimalist-desk-organiser';

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, 'backend', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const requireBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const mysql = requireBackend('mysql2/promise');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, timeout = 9000, step = 500) {
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

let token = '';
async function api(label, method, apiPath, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + apiPath, {
      method,
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
    if (res.status === 429 && attempt < 3) {
      await wait(3000);
      continue;
    }
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* empty */
    }
    if (res.status >= 400) console.log(`      api ${label} -> ${res.status} ${json?.message || ''}`);
    return { status: res.status, body: json };
  }
}

/** Tiny but real PNGs with the exact aspect ratios the spec asks for. */
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const head = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head, data])));
  return Buffer.concat([len, head, data, crc]);
};
function makePng(width, height, [r, g, b]) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const edge = x < 6 || y < 6 || x >= width - 6 || y >= height - 6;
      const o = row + 1 + x * 3;
      raw[o] = edge ? 18 : r;
      raw[o + 1] = edge ? 22 : g;
      raw[o + 2] = edge ? 44 : b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const RATIOS = [
  { file: 'square-1000x1000.png', w: 1000, h: 1000, rgb: [79, 70, 229] },
  { file: 'portrait-800x1200.png', w: 800, h: 1200, rgb: [14, 165, 233] },
  { file: 'landscape-1200x800.png', w: 1200, h: 800, rgb: [244, 63, 94] },
  { file: 'tall-600x1000.png', w: 600, h: 1000, rgb: [16, 185, 129] },
  { file: 'wide-1600x700.png', w: 1600, h: 700, rgb: [245, 158, 11] },
];

const overflowOf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const computedOf = (page, selector, prop) =>
  page.evaluate(
    (sel, property) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[property] : null;
    },
    selector,
    prop
  );

const rectOf = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top };
  }, selector);

const scaleOf = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { a: m.a, d: m.d, e: m.e, f: m.f, none: getComputedStyle(el).transform === 'none' };
  }, selector);

function trackErrors(page, sink) {
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon|net::ERR_ABORTED/i.test(msg.text())) sink.push(msg.text());
  });
}

async function clearStorage(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function signIn(page, next = '') {
  await clearStorage(page);
  await page.goto(`${BASE}/login${next}`, { waitUntil: 'networkidle2' });
  await page.type('input[type=tel]', CUSTOMER.mobile);
  await page.type('input[type=password]', CUSTOMER.password);
  await page.click('.auth__submit');
  await page.waitForFunction(() => {
    const el = document.querySelector('.header__account-btn .icon-btn__label');
    return el && el.textContent.trim() && el.textContent.trim() !== 'Account';
  });
}

async function adminUiLogin(page) {
  await clearStorage(page);
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
  await wait(700);
  if (page.url().includes('/admin/login')) {
    const inputs = await page.$$('.auth__card form input');
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type(env.ADMIN_EMAIL);
    await inputs[1].type(env.ADMIN_PASSWORD);
    await page.click('.auth__submit');
    await until(() => !page.url().includes('/admin/login'), 12000);
  }
}

async function main() {
  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(TMP_IMGS, { recursive: true });

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    database: 'eshopping',
    namedPlaceholders: true,
  });

  // ---------- baseline (everything this run may touch) ----------
  const [baseRows] = await db.query(
    `SELECT (SELECT COALESCE(MAX(id),0) FROM orders) maxOrder,
            (SELECT COALESCE(MAX(id),0) FROM notifications) maxNotif,
            (SELECT COALESCE(MAX(id),0) FROM messages) maxMessage,
            (SELECT COALESCE(MAX(id),0) FROM admin_activity_logs) maxLog,
            (SELECT COALESCE(MAX(id),0) FROM wishlists) maxWish,
            (SELECT COUNT(*) FROM conversations) conversations`
  );
  const base = baseRows[0];
  const [convRows] = await db.query('SELECT * FROM conversations WHERE user_id = 1');
  const baseConv = convRows[0] || null;
  console.log('baseline:', JSON.stringify(base));

  // ---------- admin + customer tokens ----------
  const adminLogin = await api('admin login', 'POST', '/auth/admin-login', {
    identifier: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  const adminToken = adminLogin.body?.data?.token || '';
  check('admin api login', adminLogin.status === 200 && Boolean(adminToken));

  const custLogin = await api('customer login', 'POST', '/auth/login', CUSTOMER);
  const customerToken = custLogin.body?.data?.token || '';
  check('customer api login', custLogin.status === 200 && Boolean(customerToken));

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  /** State this run creates, undone in the finally block. */
  const created = { productId: null, orderId: null, wishlistId: null, orderItems: [] };

  try {
    /* ==================================================================
     * [A] product images: never cropped, originals preserved
     * ================================================================== */
    console.log('\n[A] image handling (desktop 1366)');
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    page.setDefaultTimeout(20000);
    const errorsA = [];
    trackErrors(page, errorsA);

    // build + upload the five reference pictures
    const form = new FormData();
    for (const spec of RATIOS) {
      const file = path.join(TMP_IMGS, spec.file);
      fs.writeFileSync(file, makePng(spec.w, spec.h, spec.rgb));
      form.append('files', new Blob([fs.readFileSync(file)], { type: 'image/png' }), spec.file);
    }
    const upload = await api('upload ratio images', 'POST', '/uploads', form);
    const urls = upload.body?.data?.urls || [];
    check('five reference images uploaded', upload.status === 201 && urls.length === 5, `urls=${urls.length}`);

    const create = await api('create ratio product', 'POST', '/admin/products', {
      name: 'Ratio Fixture Product',
      originalPrice: '1500',
      stock: '25',
      status: 'active',
      description: 'Aspect ratio fixture for the responsive suite.',
      images: urls,
    });
    created.productId = create.body?.data?.id || null;
    check('fixture product created', create.status === 201 && Boolean(created.productId), `id=${created.productId}`);

    const detail = await api('fixture product detail', 'GET', `/admin/products/${created.productId}`);
    const slug = detail.body?.data?.product?.slug || '';
    check('fixture slug readable', Boolean(slug), slug);

    await page.goto(`${BASE}/product/${slug}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.detail__main-image img');

    const fit = await page.evaluate(() => {
      const img = document.querySelector('.detail__main-image img');
      const box = document.querySelector('.detail__main-image');
      const r = img.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      return {
        objectFit: getComputedStyle(img).objectFit,
        natural: [img.naturalWidth, img.naturalHeight],
        inside: r.width <= b.width + 1 && r.height <= b.height + 1,
        centered: Math.abs(r.left - b.left - (b.width - r.width) / 2) < 2,
      };
    });
    check('product detail image uses object-fit: contain', fit.objectFit === 'contain', fit.objectFit);
    check('main image fits inside its frame (nothing cropped)', fit.inside && fit.centered, JSON.stringify(fit));
    check(
      'served picture keeps its original pixel size (no server resize)',
      fit.natural[0] === RATIOS[0].w && fit.natural[1] === RATIOS[0].h,
      `${fit.natural.join('x')} vs ${RATIOS[0].w}x${RATIOS[0].h}`
    );

    // every ratio renders undistorted inside the same frame
    const thumbCount = await page.$$eval('.detail__thumb', (n) => n.length);
    check('gallery shows one thumbnail per picture', thumbCount === 5, `thumbs=${thumbCount}`);

    const ratioChecks = [];
    const ratioLog = [];
    for (let i = 0; i < 5; i++) {
      await page.evaluate((n) => document.querySelectorAll('.detail__thumb')[n]?.click(), i);
      await wait(250);
      const info = await page.evaluate(() => {
        const img = document.querySelector('.detail__main-image img');
        const box = document.querySelector('.detail__main-image');
        const r = img.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        return {
          natural: [img.naturalWidth, img.naturalHeight],
          rendered: r.width / r.height,
          fits: r.width <= b.width + 1 && r.height <= b.height + 1,
          objectFit: getComputedStyle(img).objectFit,
        };
      });
      const spec = RATIOS[i];
      // contain: whole image inside the frame, original pixels, no distortion
      const ok =
        info.objectFit === 'contain' &&
        info.fits &&
        info.natural[0] === spec.w &&
        info.natural[1] === spec.h;
      ratioChecks.push(ok);
      ratioLog.push(`${spec.file}:${info.natural.join('x')}@${info.rendered.toFixed(2)}:${ok ? 'ok' : 'bad'}`);
    }
    check('all five aspect ratios render contained and unresized', ratioChecks.every(Boolean), ratioLog.join(' '));
    await page.screenshot({ path: `${SHOTS}\\image-pdp.png` });

    // switching pictures must not move the rest of the page
    const before = await rectOf(page, '.detail__info');
    await page.evaluate(() => document.querySelectorAll('.detail__thumb')[3]?.click());
    await wait(250);
    const after = await rectOf(page, '.detail__info');
    check(
      'switching images causes no layout shift',
      before && after && Math.abs(before.top - after.top) < 1 && Math.abs(before.h - after.h) < 1,
      `${before?.top} -> ${after?.top}`
    );

    // single-image products hide the thumbnail strip
    await page.goto(`${BASE}${SINGLE_IMAGE_PATH}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.detail__main-image img');
    const singleThumbs = await page.$$eval('.detail__thumb', (n) => n.length);
    const hasStrip = (await page.$('.detail__thumbs')) !== null;
    check('thumbnail strip hidden for single-image products', singleThumbs === 0 && !hasStrip, `thumbs=${singleThumbs}`);

    // ---------- desktop zoom ----------
    await page.goto(`${BASE}/product/${slug}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.detail__main-image img');
    const frame = await rectOf(page, '.detail__main-image');
    const gridBefore = await rectOf(page, '.detail__grid');

    await page.mouse.move(frame.x + frame.w / 2, frame.y + frame.h / 2);
    await wait(450);
    const zoomed = await scaleOf(page, '.detail__main-image img');
    check(
      'hover magnifies the original picture moderately (1.9x)',
      zoomed && !zoomed.none && Math.abs(zoomed.a - 1.9) < 0.02,
      zoomed ? `scale=${zoomed.a.toFixed(3)}` : 'no transform'
    );

    await page.mouse.move(frame.x + frame.w * 0.25, frame.y + frame.h * 0.3);
    await wait(450);
    const zoomed2 = await scaleOf(page, '.detail__main-image img');
    const moved =
      Boolean(zoomed2) &&
      (Math.abs(zoomed2.e - (zoomed?.e || 0)) > 4 || Math.abs(zoomed2.f - (zoomed?.f || 0)) > 4);
    check('zoom follows the pointer', moved,
      `${zoomed?.e?.toFixed(0)},${zoomed?.f?.toFixed(0)} -> ${zoomed2?.e?.toFixed(0)},${zoomed2?.f?.toFixed(0)}`);

    const gridMid = await rectOf(page, '.detail__grid');
    check(
      'zooming does not reflow the page',
      gridBefore && gridMid && Math.abs(gridBefore.h - gridMid.h) < 1 && Math.abs(gridBefore.top - gridMid.top) < 1,
      `${gridBefore?.h} vs ${gridMid?.h}`
    );
    await page.screenshot({ path: `${SHOTS}\\image-zoom.png` });

    await page.mouse.move(6, 6);
    await wait(400);
    const zoomOff = await scaleOf(page, '.detail__main-image img');
    check('zoom resets when the pointer leaves', zoomOff && zoomOff.none, JSON.stringify(zoomOff));

    // ---------- full-screen viewer ----------
    await page.click('.detail__main-image');
    await page.waitForSelector('.pviewer', { timeout: 6000 });
    const viewerOpen = await page.evaluate(() => ({
      count: document.querySelector('.pviewer__count')?.textContent.trim(),
      bodyOverflow: document.body.style.overflow,
      imgFit: getComputedStyle(document.querySelector('.pviewer__stage img')).objectFit,
      z: getComputedStyle(document.querySelector('.pviewer')).zIndex,
    }));
    check('click opens the full-screen viewer', viewerOpen.count === '1 / 5', JSON.stringify(viewerOpen));
    check('page behind the viewer is scroll-locked', viewerOpen.bodyOverflow === 'hidden', viewerOpen.bodyOverflow);
    check('viewer picture is contained, not cropped', viewerOpen.imgFit === 'contain', viewerOpen.imgFit);
    await page.screenshot({ path: `${SHOTS}\\image-viewer.png` });

    await page.click('.pviewer__nav--next');
    await wait(250);
    const afterNext = await page.$eval('.pviewer__count', (n) => n.textContent.trim());
    check('viewer next arrow changes the picture', afterNext === '2 / 5', afterNext);

    // browser back closes the viewer and stays on the product page
    await page.goBack();
    await wait(600);
    const closedByBack = await page.evaluate(() => ({
      open: Boolean(document.querySelector('.pviewer')),
      path: location.pathname,
      bodyOverflow: document.body.style.overflow,
    }));
    check('browser back closes the viewer first', !closedByBack.open && closedByBack.path === `/product/${slug}`, JSON.stringify(closedByBack));
    check('scroll lock released after closing', closedByBack.bodyOverflow === '', JSON.stringify(closedByBack.bodyOverflow));

    await page.click('.detail__main-image');
    await page.waitForSelector('.pviewer');
    await page.keyboard.press('Escape');
    await wait(500);
    check('Escape closes the viewer', (await page.$('.pviewer')) === null);

    // ---------- cards: square frame, contained art ----------
    await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.product-card__media img');
    const card = await page.evaluate(() => {
      const media = document.querySelector('.product-card__media');
      const img = media.querySelector('img');
      const cardEl = media.closest('.product-card');
      const m = media.getBoundingClientRect();
      const c = cardEl.getBoundingClientRect();
      return {
        objectFit: getComputedStyle(img).objectFit,
        ratio: getComputedStyle(media).aspectRatio,
        square: Math.abs(m.width - m.height) <= 2,
        mediaShare: +(m.height / c.height).toFixed(3),
        padding: getComputedStyle(img).padding,
      };
    });
    check('card image uses object-fit: contain', card.objectFit === 'contain', card.objectFit);
    check('card frame is a consistent square', card.ratio === '1 / 1' && card.square, `${card.ratio} square=${card.square}`);
    check('image no longer dominates the card', card.mediaShare > 0.3 && card.mediaShare < 0.7, `share=${card.mediaShare}`);
    check('card image keeps breathing room', parseFloat(card.padding) >= 8, card.padding);

    // ---------- admin previews never crop ----------
    token = adminToken;
    await adminUiLogin(page);
    await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.admin-prod__media img');
    const adminThumb = await page.evaluate(() => {
      const img = document.querySelector('.admin-prod__media img');
      return { fit: getComputedStyle(img).objectFit, pad: parseFloat(getComputedStyle(img).padding) };
    });
    check('admin product thumbnail is contained', adminThumb.fit === 'contain', JSON.stringify(adminThumb));

    await page.evaluate(() => [...document.querySelectorAll('.admin-page__head .btn')].find((b) => b.innerText.includes('Add product'))?.click());
    await page.waitForSelector('.admin-modal', { timeout: 6000 });
    const fileInput = await page.$('.admin-picker input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(path.join(TMP_IMGS, 'tall-600x1000.png'));
      await wait(600);
      const preview = await page.evaluate(() => {
        const img = document.querySelector('.admin-picker__item--new img');
        if (!img) return null;
        const box = img.parentElement.getBoundingClientRect();
        const r = img.getBoundingClientRect();
        return { fit: getComputedStyle(img).objectFit, inside: r.width <= box.width + 1 && r.height <= box.height + 1 };
      });
      check('admin add-product preview keeps the whole picture', Boolean(preview) && preview.fit === 'contain' && preview.inside, JSON.stringify(preview));
      await page.screenshot({ path: `${SHOTS}\\admin-image-preview.png` });
    } else {
      check('admin add-product preview keeps the whole picture', false, 'no file input');
    }
    await page.keyboard.press('Escape');
    await wait(400);

    check('no page errors while checking images', errorsA.length === 0, errorsA.slice(0, 3).join(' | '));
    await page.close();

    /* ==================================================================
     * [B] mobile public storefront (390 x 844, touch)
     * ================================================================== */
    console.log('\n[B] mobile storefront (390x844)');
    const m = await browser.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    m.setDefaultTimeout(20000);
    const errorsB = [];
    trackErrors(m, errorsB);

    const viewportMeta = await m.evaluate(() => document.querySelector('meta[name="viewport"]')?.content || '');
    check('viewport handles notches (viewport-fit=cover)', viewportMeta.includes('viewport-fit=cover'), viewportMeta);

    for (const route of ['/', '/shop', '/offers', '/category/electronics', PRODUCT_PATH, '/login', '/register']) {
      await m.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' });
      await wait(500);
      const o = await overflowOf(m);
      check(`no horizontal overflow on ${route}`, o <= 1, `overflow=${o}px`);
    }
    await m.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await wait(400);
    await m.screenshot({ path: `${SHOTS}\\mobile-home.png` });

    // hamburger menu
    const burgerBox = await rectOf(m, '.header__burger');
    check('hamburger is a 44px touch target', burgerBox && burgerBox.w >= 44 && burgerBox.h >= 44, JSON.stringify(burgerBox));
    await m.tap('.header__burger');
    await wait(400);
    const menuOpen = await m.evaluate(() => ({
      open: document.querySelector('.header__nav')?.classList.contains('is-open'),
      links: [...document.querySelectorAll('.header__nav-account a')].map((a) => a.textContent.trim()),
      navOverflow: document.querySelector('.header__nav').scrollWidth - document.querySelector('.header__nav').clientWidth,
    }));
    check('burger opens the mobile menu', menuOpen.open, JSON.stringify(menuOpen.open));
    check('guest burger still lists Sign in + Create account',
      JSON.stringify(menuOpen.links) === JSON.stringify(['Sign in', 'Create account']), JSON.stringify(menuOpen.links));
    check('mobile menu itself does not overflow', menuOpen.navOverflow <= 1, `${menuOpen.navOverflow}px`);

    // touch targets across the header
    const targets = await m.evaluate(() => {
      const sels = ['.header__burger', '.header__search-btn', 'a[aria-label="Account menu"]'];
      return sels.map((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, w: 0, h: 0 };
        const r = el.getBoundingClientRect();
        return { sel, w: Math.round(r.width), h: Math.round(r.height) };
      });
    });
    check('header controls are at least 44x44', targets.every((t) => t.w >= 44 && t.h >= 44), JSON.stringify(targets));

    // mobile search overlay
    await m.tap('.header__search-btn');
    await wait(400);
    const searchRow = await m.evaluate(() => {
      const form = document.querySelector('.header__main > .search');
      if (!form || getComputedStyle(form).display === 'none') return null;
      const r = form.getBoundingClientRect();
      return { w: Math.round(r.width), vw: window.innerWidth, top: Math.round(r.top) };
    });
    check('search opens as a full-width row', searchRow && searchRow.w >= searchRow.vw - 60, JSON.stringify(searchRow));
    await m.type('.header__main > .search input', 'phone');
    await m.keyboard.press('Enter');
    await wait(900);
    const searchUrl = new URL(m.url());
    check('mobile search routes to the results page', searchUrl.pathname === '/shop' && searchUrl.search.includes('q=phone'), m.url());

    // product page on a phone: buy controls right after the hero picture
    await m.goto(`${BASE}${PRODUCT_PATH}`, { waitUntil: 'networkidle2' });
    await m.waitForSelector('.detail__main-image img');
    const pdp = await m.evaluate(() => {
      const buy = document.querySelector('.detail__buy');
      const title = document.querySelector('.detail__title');
      const price = document.querySelector('.detail__price');
      const buyBox = buy.getBoundingClientRect();
      const thumbStrip = document.querySelector('.detail__thumbs');
      const media = document.querySelector('.detail__main-image').getBoundingClientRect();
      return {
        buyTop: Math.round(buyBox.top),
        titleTop: Math.round(title.getBoundingClientRect().top),
        priceTop: Math.round(price.getBoundingClientRect().top),
        buyW: Math.round(buyBox.width),
        thumbsBelow: thumbStrip ? thumbStrip.getBoundingClientRect().top > media.top : false,
        mediaH: Math.round(media.height),
      };
    });
    check('title, price and buy controls sit right under the hero image', pdp.titleTop < 700 && pdp.priceTop < 900 && pdp.buyTop < 1200, JSON.stringify(pdp));
    check('buy control is a comfortable touch target', pdp.buyW > 200 && pdp.buyTop < 1200, `w=${pdp.buyW}`);
    check('thumbnails sit below the picture on phones', pdp.thumbsBelow, JSON.stringify(pdp.thumbsBelow));
    const pdpOverflow = await overflowOf(m);
    check('no horizontal overflow on the product page', pdpOverflow <= 1, `overflow=${pdpOverflow}px`);
    await m.screenshot({ path: `${SHOTS}\\mobile-pdp.png`, fullPage: false });

    // full-screen viewer with touch: tap, swipe, pinch, double tap, close
    await m.tap('.detail__main-image');
    await m.waitForSelector('.pviewer', { timeout: 6000 });
    check('tapping the picture opens the viewer', true);
    const viewerBox = await rectOf(m, '.pviewer__stage');
    const fire = (type, points) =>
      m.evaluate(
        (kind, pts, sel) => {
          const target = document.querySelector(sel);
          const mk = (p) => new Touch({ identifier: p.id, target, clientX: p.x, clientY: p.y });
          const make = (list) => list.map(mk);
          const event = new TouchEvent(kind, {
            bubbles: true,
            cancelable: true,
            touches: kind === 'touchend' ? [] : make(pts),
            targetTouches: kind === 'touchend' ? [] : make(pts),
            changedTouches: make(pts),
          });
          target.dispatchEvent(event);
        },
        type,
        points,
        '.pviewer'
      );

    // horizontal swipe -> next picture
    const cy = viewerBox.y + viewerBox.h / 2;
    const startX = viewerBox.x + viewerBox.w * 0.8;
    const endX = viewerBox.x + viewerBox.w * 0.2;
    await fire('touchstart', [{ id: 1, x: startX, y: cy }]);
    await fire('touchmove', [{ id: 1, x: (startX + endX) / 2, y: cy }]);
    await fire('touchmove', [{ id: 1, x: endX, y: cy }]);
    await fire('touchend', [{ id: 1, x: endX, y: cy }]);
    await wait(500);
    const swiped = await m.$eval('.pviewer__count', (n) => n.textContent.trim());
    check('swipe changes the picture', swiped === '2 / 5', swiped);

    // pinch to zoom
    const beforePinch = await scaleOf(m, '.pviewer__stage img');
    const mid = { x: viewerBox.x + viewerBox.w / 2, y: viewerBox.y + viewerBox.h / 2 };
    await fire('touchstart', [{ id: 1, x: mid.x - 40, y: mid.y }, { id: 2, x: mid.x + 40, y: mid.y }]);
    await fire('touchmove', [{ id: 1, x: mid.x - 110, y: mid.y }, { id: 2, x: mid.x + 110, y: mid.y }]);
    await fire('touchend', [{ id: 1, x: mid.x - 110, y: mid.y }, { id: 2, x: mid.x + 110, y: mid.y }]);
    await wait(500);
    const afterPinch = await scaleOf(m, '.pviewer__stage img');
    check(
      'pinch zooms the picture',
      afterPinch && !afterPinch.none && afterPinch.a > (beforePinch?.a || 1) + 0.4,
      `${beforePinch?.a?.toFixed(2)} -> ${afterPinch?.a?.toFixed(2)}`
    );

    // double tap zooms back out / in
    await fire('touchend', [{ id: 1, x: mid.x, y: mid.y }]);
    await wait(60);
    await fire('touchend', [{ id: 1, x: mid.x, y: mid.y }]);
    await wait(500);
    const afterDouble = await scaleOf(m, '.pviewer__stage img');
    check('double tap toggles the zoom level', afterDouble && Math.abs(afterDouble.a - (afterPinch.a > 1.5 ? 1 : 2.2)) < 0.3, `scale=${afterDouble?.a?.toFixed(2)}`);

    const viewerOverflow = await overflowOf(m);
    check('viewer adds no horizontal overflow', viewerOverflow <= 1, `${viewerOverflow}px`);
    await m.screenshot({ path: `${SHOTS}\\mobile-viewer.png` });

    await m.tap('.pviewer__close');
    await wait(500);
    check('close button leaves the viewer', (await m.$('.pviewer')) === null);

    check('no page errors on the mobile storefront', errorsB.length === 0, errorsB.slice(0, 3).join(' | '));
    await m.close();

    /* ==================================================================
     * [C] admin on a phone
     * ================================================================== */
    console.log('\n[C] admin on a phone');
    const a = await browser.newPage();
    await a.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    a.setDefaultTimeout(20000);
    const errorsC = [];
    trackErrors(a, errorsC);

    await a.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
    await wait(700);
    if (a.url().includes('/admin/login')) {
      const inputs = await a.$$('.auth__card form input');
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(env.ADMIN_EMAIL);
      await inputs[1].type(env.ADMIN_PASSWORD);
      await a.click('.auth__submit');
      await until(() => a.url().endsWith('/admin'), 9000);
    }
    check('admin signed in on mobile', a.url().endsWith('/admin'), a.url());

    for (const route of ['/admin', '/admin/products', '/admin/orders', '/admin/customers', '/admin/messages', '/admin/content']) {
      await a.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' });
      await wait(700);
      const o = await overflowOf(a);
      check(`no horizontal overflow on ${route}`, o <= 1, `overflow=${o}px`);
    }

    await a.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle2' });
    await a.waitForSelector('.admin-table');
    const table = await a.evaluate(() => {
      const firstCell = document.querySelector('.admin-table tbody td:first-child');
      const wrap = document.querySelector('.admin-table-wrap');
      const hint = document.querySelector('.admin-swipe-hint');
      return {
        sticky: firstCell ? getComputedStyle(firstCell).position : null,
        wrapScrolls: wrap ? wrap.scrollWidth > wrap.clientWidth : false,
        documentScrolls: document.documentElement.scrollWidth - window.innerWidth,
        hintShown: hint ? getComputedStyle(hint).display !== 'none' : false,
        burger: getComputedStyle(document.querySelector('.admin__burger')).display,
        topNav: getComputedStyle(document.querySelector('.admin__nav')).display,
      };
    });
    check('admin tables keep a sticky first column on phones', table.sticky === 'sticky', JSON.stringify(table));
    check('the table itself scrolls sideways', table.wrapScrolls, JSON.stringify(table.wrapScrolls));
    check('a visible swipe hint is shown above scrolling tables', table.hintShown, JSON.stringify(table.hintShown));
    check('top nav is replaced by the hamburger', table.burger !== 'none' && table.topNav === 'none', JSON.stringify(table));
    await a.screenshot({ path: `${SHOTS}\\admin-mobile-products.png` });

    await a.tap('.admin__burger');
    await wait(500);
    const drawer = await a.evaluate(() => {
      const el = document.querySelector('.admin__drawer');
      const r = el.getBoundingClientRect();
      return {
        open: el.classList.contains('is-open'),
        x: Math.round(r.x),
        visible: getComputedStyle(el).visibility,
        links: [...el.querySelectorAll('.admin__drawer-nav a')].map((n) => n.textContent.trim()),
        hasClose: Boolean(el.querySelector('.admin__drawer-head button')),
      };
    });
    check('hamburger opens the admin drawer', drawer.open && drawer.x === 0 && drawer.visible === 'visible', JSON.stringify(drawer));
    check('drawer carries every admin section',
      ['Dashboard', 'Products', 'Orders', 'Customers', 'Messages', 'Content'].every((l) => drawer.links.includes(l)),
      JSON.stringify(drawer.links));
    check('drawer has a close control', drawer.hasClose);
    await a.screenshot({ path: `${SHOTS}\\admin-drawer.png` });

    await a.evaluate(() => [...document.querySelectorAll('.admin__drawer-nav a')].find((n) => n.textContent.includes('Messages'))?.click());
    await wait(900);
    check('drawer navigation reaches the inbox', new URL(a.url()).pathname === '/admin/messages', a.url());

    await a.tap('.admin__burger');
    await wait(500);
    const hasBackdrop = await a.evaluate(() => Boolean(document.querySelector('.admin__backdrop')));
    if (hasBackdrop) {
      await a.evaluate(() => document.querySelector('.admin__backdrop').click());
      await wait(500);
    }
    const closedByBackdrop = await a.evaluate(() => !document.querySelector('.admin__drawer')?.classList.contains('is-open'));
    check('backdrop tap closes the drawer', hasBackdrop && closedByBackdrop, `backdrop=${hasBackdrop} closed=${closedByBackdrop}`);

    check('no page errors in the admin mobile pass', errorsC.length === 0, errorsC.slice(0, 3).join(' | '));
    await a.close();

    /* ==================================================================
     * [D] support chat: customer + admin
     * ================================================================== */
    console.log('\n[D] support chat');

    // security: guests and customers cannot reach the admin inbox
    token = '';
    const guestChat = await api('guest chat', 'GET', '/chat');
    const guestAdminList = await api('guest admin chat', 'GET', '/admin/chat/conversations');
    token = customerToken;
    const customerAdminList = await api('customer admin chat', 'GET', '/admin/chat/conversations');
    const customerAdminSend = await api('customer admin send', 'POST', '/admin/chat/conversations/1/messages', { message: 'nope' });
    check('guest cannot read a conversation', guestChat.status === 401, String(guestChat.status));
    check('guest cannot list admin conversations', guestAdminList.status === 401, String(guestAdminList.status));
    check('customer cannot list admin conversations', customerAdminList.status === 403, String(customerAdminList.status));
    check('customer cannot post into the admin inbox', customerAdminSend.status === 403, String(customerAdminSend.status));

    token = adminToken;
    const inbox = await api('admin inbox', 'GET', '/admin/chat/conversations');
    const inboxRows = inbox.body?.data?.rows || [];
    check('admin inbox lists the seeded conversations', inbox.status === 200 && inboxRows.length >= 3, `rows=${inboxRows.length}`);
    const withUnread = inboxRows.filter((r) => Number(r.unread_admin) > 0);
    check('admin inbox exposes the unread count', Number(inbox.body?.data?.unread) === withUnread.reduce((s, r) => s + Number(r.unread_admin), 0),
      `unread=${inbox.body?.data?.unread}`);

    // --- customer screen ---
    const c = await browser.newPage();
    await c.setViewport({ width: 1366, height: 900 });
    c.setDefaultTimeout(20000);
    const errorsD = [];
    trackErrors(c, errorsD);

    const [convForUser] = await db.query('SELECT id FROM conversations WHERE user_id = 1 ORDER BY id LIMIT 1');
    const convId = convForUser[0]?.id || 0;
    check('customer conversation exists server-side', Boolean(convId), `id=${convId}`);
    const convPath = `/admin/chat/conversations/${convId}/messages`;

    await clearStorage(c);
    await c.goto(`${BASE}/chat`, { waitUntil: 'networkidle2' });
    const gated = new URL(c.url());
    check('guest /chat is gated behind sign-in', gated.pathname === '/login' && gated.search.includes('next=%2Fchat'), c.url());

    await signIn(c);
    await c.goto(`${BASE}/chat`, { waitUntil: 'networkidle2' });
    await c.waitForSelector('.chat__list');
    const historyCount = await c.$$eval('.chat-msg', (n) => n.length);
    check('existing conversation history loads', historyCount >= 4, `messages=${historyCount}`);
    check('conversation status is shown', (await c.$('.chat__status')) !== null);
    await c.screenshot({ path: `${SHOTS}\\chat-customer.png` });

    // poll budget: a chat page must not hammer the API
    const chatRequests = [];
    c.on('request', (req) => {
      if (req.url().includes('/api/chat') && req.method() === 'GET') chatRequests.push(Date.now());
    });
    await wait(11000);
    check('chat polling stays polite (<= 3 requests / 11s)', chatRequests.length <= 3, `${chatRequests.length} requests`);
    c.removeAllListeners('request');

    // send a message with the Enter key
    const outbound = `Responsive suite ${Date.now()}`;
    await c.type('.chat__form input', outbound);
    await c.keyboard.press('Enter');
    await wait(900);
    const sent = await c.evaluate(() => [...document.querySelectorAll('.chat-msg')].map((n) => n.textContent).join('\n'));
    check('customer message appears in the thread', sent.includes(outbound), outbound.slice(0, 30));
    const [sentRow] = await db.query('SELECT id FROM messages WHERE message = ?', [outbound]);
    check('customer message stored server-side', sentRow.length === 1, `rows=${sentRow.length}`);

    // admin replies over the API -> the open customer page picks it up
    token = adminToken;
    const replyText = `Support reply ${Date.now()}`;
    const adminReply = await api('admin reply', 'POST', convPath, { message: replyText });
    check('admin reply accepted', adminReply.status === 201, String(adminReply.status));

    await c.bringToFront();
    const gotReply = await until(
      async () => (await c.evaluate(() => document.body.innerText)).includes(replyText),
      16000,
      600
    );
    check('customer page polls the reply into view', Boolean(gotReply), replyText.slice(0, 24));
    await c.screenshot({ path: `${SHOTS}\\chat-customer-reply.png` });

    // leave the thread so the customer page stops marking messages as read,
    // then let the admin push one more message for the badge test
    await c.goto(`${BASE}/orders`, { waitUntil: 'networkidle2' });
    await wait(500);
    token = adminToken;
    const badgeReply = `Badge reply ${Date.now()}`;
    const badgeSend = await api('admin badge reply', 'POST', convPath, { message: badgeReply });
    check('second admin reply accepted', badgeSend.status === 201, String(badgeSend.status));
    await c.close();

    // header badge on a fresh page (first badge poll is delayed by 3s)
    const c2 = await browser.newPage();
    await c2.setViewport({ width: 1366, height: 900 });
    trackErrors(c2, errorsD);
    await signIn(c2);
    await c2.goto(`${BASE}/orders`, { waitUntil: 'networkidle2' });
    const badge = await until(
      async () => {
        const label = await c2.evaluate(
          () => document.querySelector('a[href="/chat"]')?.getAttribute('aria-label') || ''
        );
        return label.includes('unread') ? label : '';
      },
      10000,
      500
    );
    check('header shows the unread message badge', Boolean(badge), badge || 'no badge');

    // header chat entry point exists for members only
    const chatIcon = await c2.evaluate(() => Boolean(document.querySelector('a[href="/chat"]')));
    check('signed-in header carries a chat entry point', chatIcon);
    await c2.close();

    const guestPage = await browser.newPage();
    await guestPage.setViewport({ width: 1366, height: 900 });
    await clearStorage(guestPage);
    await guestPage.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    const guestHasChatIcon = await guestPage.evaluate(() => Boolean(document.querySelector('a[href="/chat"]')));
    check('guests get no chat entry point', !guestHasChatIcon, String(guestHasChatIcon));
    await guestPage.close();

    // --- admin inbox screen ---
    const ap = await browser.newPage();
    await ap.setViewport({ width: 1366, height: 900 });
    ap.setDefaultTimeout(20000);
    trackErrors(ap, errorsD);
    await adminUiLogin(ap);
    await ap.goto(`${BASE}/admin/messages`, { waitUntil: 'networkidle2' });
    await ap.waitForSelector('.admin-chat__row', { timeout: 15000 });
    const listInfo = await ap.evaluate(() => ({
      rows: document.querySelectorAll('.admin-chat__row').length,
      dots: document.querySelectorAll('.admin-chat__dot').length,
      badge: document.querySelector('.admin__nav-badge')?.textContent.trim() || '',
      placeholders: [...document.querySelectorAll('.admin-chat__note')].map((n) => n.textContent.trim()),
    }));
    check('admin inbox renders the conversation list', listInfo.rows >= 3, `rows=${listInfo.rows}`);
    check('unread conversations are flagged', listInfo.dots >= 1, `dots=${listInfo.dots}`);
    check('admin navigation shows the unread badge', listInfo.badge !== '' && Number(listInfo.badge) >= 1, `badge=${listInfo.badge}`);
    await ap.screenshot({ path: `${SHOTS}\\admin-messages.png` });

    // open the first conversation, reply with Enter
    await ap.click('.admin-chat__row');
    await wait(900);
    const thread = await ap.evaluate(() => ({
      messages: document.querySelectorAll('.admin-chat__messages .chat-msg').length,
      head: document.querySelector('.admin-chat__head h2')?.textContent.trim() || '',
      hasClose: Boolean(document.querySelector('.admin-chat__head .btn')),
    }));
    check('conversation opens with its history', thread.messages >= 4 && thread.head.length > 0, JSON.stringify(thread));
    check('conversation can be closed/reopened', thread.hasClose);

    const adminOutbound = `Inbox reply ${Date.now()}`;
    await ap.type('.admin-chat__thread .chat__form input, .admin-chat__form input', adminOutbound);
    await ap.keyboard.press('Enter');
    await wait(900);
    const adminThreadText = await ap.evaluate(() => document.querySelector('.admin-chat__messages')?.innerText || '');
    check('admin reply renders in the thread', adminThreadText.includes(adminOutbound), adminOutbound.slice(0, 24));

    // close + reopen
    await ap.click('.admin-chat__head .btn');
    await wait(900);
    const closedState = await ap.evaluate(() => document.body.innerText.includes('Conversation closed'));
    check('conversation can be closed', closedState, String(closedState));
    await ap.click('.admin-chat__head .btn');
    await wait(900);
    const reopened = await ap.evaluate(() => !document.body.innerText.includes('Conversation closed'));
    check('conversation can be reopened', reopened, String(reopened));

    // search filter
    await ap.type('.admin-chat__search input', 'Rakib');
    await wait(1400);
    const filtered = await ap.$$eval('.admin-chat__row', (n) => n.length);
    check('inbox search narrows the list', filtered >= 1 && filtered < listInfo.rows, `rows=${filtered}`);
    await ap.evaluate(() => {
      const input = document.querySelector('.admin-chat__search input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(900);

    check('no page errors in the chat pass', errorsD.length === 0, errorsD.slice(0, 4).join(' | '));
    await c.close();

    /* ==================================================================
     * [E] 25-step mobile customer journey (390 x 844)
     * ================================================================== */
    console.log('\n[E] mobile customer journey');
    const j = await browser.newPage();
    await j.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    j.setDefaultTimeout(25000);
    const errorsE = [];
    trackErrors(j, errorsE);

    const stepOverflow = async (label) => {
      const o = await overflowOf(j);
      check(`step ${label}: no horizontal overflow`, o <= 1, `overflow=${o}px`);
    };
    const text = () => j.evaluate(() => document.body.innerText);

    await j.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await stepOverflow('01 home');

    await j.tap('.header__burger');
    await wait(350);
    await j.evaluate(() => [...document.querySelectorAll('.header__nav a')].find((a) => a.textContent.trim() === 'Shop')?.click());
    await wait(900);
    check('step 02 burger reaches the shop', new URL(j.url()).pathname === '/shop', j.url());
    await stepOverflow('03 shop grid');

    await j.goto(`${BASE}${CHEAP_PATH}`, { waitUntil: 'networkidle2' });
    await j.waitForSelector('.detail__buy');
    await stepOverflow('04 product');

    await j.tap('.detail__buy');
    await wait(1200);
    const badgeText = await j.evaluate(() => document.querySelector('a[href="/cart"] .icon-btn__badge')?.textContent || '');
    check('step 05 add to cart updates the badge', badgeText === '1', badgeText);
    await stepOverflow('05 after add to cart');

    await j.goto(`${BASE}/cart`, { waitUntil: 'networkidle2' });
    await j.waitForSelector('.cart-item');
    const cartImg = await computedOf(j, '.cart-item__media img', 'objectFit');
    check('step 06 cart artwork is contained', cartImg === 'contain', String(cartImg));
    await stepOverflow('06 cart');

    await j.evaluate(() => [...document.querySelectorAll('.qty button')][1]?.click());
    await wait(700);
    const qtyNow = await j.evaluate(() => document.querySelector('.qty span')?.textContent.trim());
    check('step 07 quantity stepper works on touch', qtyNow === '2', qtyNow);
    await stepOverflow('07 cart quantity');

    await j.goto(`${BASE}/checkout`, { waitUntil: 'networkidle2' });
    await j.waitForSelector('.checkout-layout');
    await stepOverflow('08 checkout');
    const checkoutLayout = await j.evaluate(() => {
      const cols = getComputedStyle(document.querySelector('.checkout-layout')).gridTemplateColumns.split(' ').length;
      const tel = document.querySelector('input[type="tel"]')?.type;
      const email = document.querySelector('input[type="email"]')?.type;
      const labels = [...document.querySelectorAll('.checkout-layout label')].length;
      return { cols, tel, email, labels };
    });
    check('checkout collapses to one column on a phone', checkoutLayout.cols === 1, JSON.stringify(checkoutLayout));
    check('checkout keeps labelled tel/email fields', checkoutLayout.tel === 'tel' && checkoutLayout.email === 'email', JSON.stringify(checkoutLayout));

    const lineFit = await j.evaluate(() => {
      const img = document.querySelector('.checkout-line__media img');
      return img ? getComputedStyle(img).objectFit : null;
    });
    check('checkout line artwork is contained', lineFit === 'contain', String(lineFit));

    // place the order (server-priced)
    await j.evaluate(() => [...document.querySelectorAll('.checkout-layout .btn--primary')].find((b) => /place order/i.test(b.innerText))?.click());
    const ordered = await until(async () => /order/i.test(new URL(j.url()).pathname) || (await text()).includes('Order'), 16000, 700);
    check('step 09 order placed on the phone', Boolean(ordered), j.url());
    const [orderRows] = await db.query('SELECT id FROM orders WHERE id > ? ORDER BY id DESC LIMIT 1', [base.maxOrder]);
    created.orderId = orderRows[0]?.id || null;
    if (created.orderId) {
      const [items] = await db.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [created.orderId]);
      created.orderItems = items;
    }
    check('the new order is recorded', Boolean(created.orderId), `id=${created.orderId}`);
    await stepOverflow('10 order page');

    await j.goto(`${BASE}/orders`, { waitUntil: 'networkidle2' });
    await j.waitForSelector('.order-card');
    await stepOverflow('11 my orders');

    await j.goto(`${BASE}/orders/${created.orderId || 1}`, { waitUntil: 'networkidle2' });
    await wait(500);
    const orderImg = await computedOf(j, '.order-item__media img', 'objectFit');
    check('step 12 order item artwork is contained', orderImg === 'contain', String(orderImg));
    await stepOverflow('12 order detail');

    await j.goto(`${BASE}/track-order`, { waitUntil: 'networkidle2' });
    await stepOverflow('13 track order');

    await j.goto(`${BASE}${PRODUCT_PATH}`, { waitUntil: 'networkidle2' });
    await j.waitForSelector('.detail__wish');
    await j.tap('.detail__wish');
    await wait(900);
    await j.goto(`${BASE}/wishlist`, { waitUntil: 'networkidle2' });
    await wait(500);
    const wishFit = await computedOf(j, '.wish-card__media img', 'objectFit');
    check('step 14 wishlist artwork is contained', wishFit === 'contain', String(wishFit));
    await stepOverflow('14 wishlist');
    const [wishRows] = await db.query('SELECT id FROM wishlists ORDER BY id DESC LIMIT 1');
    created.wishlistId = wishRows[0]?.id || null;

    await j.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' });
    const profileHasChat = await j.evaluate(() => Boolean([...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/chat')));
    check('step 15 profile links to the support chat', profileHasChat);
    await stepOverflow('15 profile');

    await j.goto(`${BASE}/chat`, { waitUntil: 'networkidle2' });
    await j.waitForSelector('.chat__list');
    const journeyMsg = `Journey hello ${Date.now()}`;
    await j.type('.chat__form input', journeyMsg);
    await j.keyboard.press('Enter');
    await wait(900);
    check('step 16 chat works on the phone', (await text()).includes(journeyMsg));
    await stepOverflow('16 chat');
    await j.screenshot({ path: `${SHOTS}\\mobile-chat.png` });

    await j.goto(`${BASE}/offers`, { waitUntil: 'networkidle2' });
    await stepOverflow('17 offers');
    await j.goto(`${BASE}/category/electronics`, { waitUntil: 'networkidle2' });
    await stepOverflow('18 category');
    await j.goto(`${BASE}/search?q=phone`, { waitUntil: 'networkidle2' });
    await stepOverflow('19 search results');
    await j.goto(`${BASE}/does-not-exist`, { waitUntil: 'networkidle2' });
    await stepOverflow('20 404 page');

    // sign out from the burger menu, then confirm the gates
    await j.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await j.tap('.header__account-btn');
    await wait(400);
    await j.evaluate(() => document.querySelector('.header__account-panel button[aria-label="Sign out"]')?.click());
    await wait(900);
    const signedOut = await j.evaluate(() => document.querySelector('.header__account-btn .icon-btn__label')?.textContent.trim());
    check('step 21 sign out on the phone', signedOut === 'Account', signedOut);
    const guestChatIcon = await j.evaluate(() => Boolean(document.querySelector('a[href="/chat"]')));
    check('step 22 chat entry disappears for guests', !guestChatIcon, String(guestChatIcon));

    await j.goto(`${BASE}/cart`, { waitUntil: 'networkidle2' });
    check('step 23 guest cart is gated', new URL(j.url()).pathname === '/login', j.url());

    await j.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await j.type('input[type=tel]', CUSTOMER.mobile);
    await j.type('input[type=password]', CUSTOMER.password);
    await j.tap('.auth__submit');
    await until(() => !new URL(j.url()).pathname.includes('/login'), 12000);
    check('step 24 sign in again from the phone', !new URL(j.url()).pathname.includes('/login'), j.url());

    await j.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await j.tap('.header__search-btn');
    await wait(400);
    await j.type('.header__main > .search input', 'kurta');
    await j.keyboard.press('Enter');
    await wait(900);
    check('step 25 mobile search round trip', new URL(j.url()).pathname === '/shop' && new URL(j.url()).search.includes('q=kurta'), j.url());
    await stepOverflow('25 search results');
    await j.screenshot({ path: `${SHOTS}\\mobile-journey-end.png` });

    check('no page errors during the mobile journey', errorsE.length === 0, errorsE.slice(0, 4).join(' | '));
    await j.close();
  } finally {
    /* ---------------- restore everything this run created ---------------- */
    console.log('\n[cleanup] restoring the store');
    try {
      if (created.productId) {
        token = adminToken;
        await api('delete fixture product', 'DELETE', `/admin/products/${created.productId}`);
      }
    } catch (err) {
      console.log('  fixture product cleanup failed:', err.message);
    }

    try {
      if (created.orderId) {
        for (const item of created.orderItems) {
          await db.query('UPDATE products SET stock = stock + ? WHERE id = ?', [Number(item.quantity) || 0, item.product_id]);
        }
        await db.query('DELETE FROM order_items WHERE order_id = ?', [created.orderId]);
        await db.query('DELETE FROM orders WHERE id = ?', [created.orderId]);
        console.log(`  removed order #${created.orderId} and restored stock`);
      }
      // anything another suite may have appended while we ran
      await db.query('DELETE FROM notifications WHERE id > ?', [base.maxNotif]);
      await db.query('DELETE FROM messages WHERE id > ?', [base.maxMessage]);
      await db.query('DELETE FROM admin_activity_logs WHERE id > ?', [base.maxLog]);
      if (created.wishlistId) await db.query('DELETE FROM wishlists WHERE id >= ?', [created.wishlistId]);
      await db.query('DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = 1');
      if (baseConv) {
        await db.query(
          'UPDATE conversations SET status = ?, last_message = ?, last_message_at = ?, unread_admin = ?, unread_user = ? WHERE id = ?',
          [baseConv.status, baseConv.last_message, baseConv.last_message_at, baseConv.unread_admin, baseConv.unread_user, baseConv.id]
        );
      }
      console.log('  notifications / chat / activity log / cart restored');
    } catch (err) {
      console.log('  cleanup warning:', err.message);
    }

    try {
      fs.rmSync(TMP_IMGS, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    await db.end().catch(() => {});
    await browser.close().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) failed.forEach((f) => console.log(`  FAIL: ${f.name}`));
  console.log(`screenshots: ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('responsive-test failed:', err);
  process.exit(1);
});
