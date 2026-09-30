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

async function apiLogin(identifier, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: identifier, password }),
  });
  const body = await res.json().catch(() => ({}));
  return body.data?.token || '';
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

async function newPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const state = { jsErrors: [], api: [] };
  page.on('console', (m) => { if (m.type() === 'error') state.jsErrors.push(m.text()); });
  page.on('pageerror', (e) => state.jsErrors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (r.url().includes('/api/')) state.api.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  return { page, state };
}

const bannerOf = (page) => page.evaluate(() => document.querySelector('.alert--error')?.innerText.trim() || '');
const token = (page) => page.evaluate(() => localStorage.getItem('eshopping.token') || '');
const fill = async (page, values) => {
  const inputs = await page.$$('.auth__card form input');
  const keys = ['identifier', 'password'];
  for (let i = 0; i < inputs.length; i += 1) {
    await inputs[i].click({ clickCount: 3 });
    await inputs[i].type(values[keys[i]] || '');
  }
};
const cleanErrors = (state) => [...state.jsErrors].filter((t) => !/Failed to load resource/i.test(t));

// ---------- 1. valid admin login ----------
{
  const { page, state } = await newPage();
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 700));
  const title = await page.title();
  check('login page renders (no placeholder)', title.startsWith('Admin sign in') && await page.evaluate(() => Boolean(document.querySelector('.admin-login__brand'))), title);
  check('login page starts with no error', (await bannerOf(page)) === '');

  // show/hide password toggle
  const inputTypes = () => page.evaluate(() =>
    [...document.querySelectorAll('.auth__card form input')].map((i) => `${i.autocomplete}:${i.type}`)
  );
  await page.type('input[autocomplete="current-password"]', 'secret-123');
  const before = await inputTypes();
  await page.click('.field__reveal');
  await new Promise((r) => setTimeout(r, 200));
  const during = await inputTypes();
  const shownValue = await page.evaluate(() => document.querySelector('input[autocomplete="current-password"]').value);
  await page.click('.field__reveal');
  await new Promise((r) => setTimeout(r, 200));
  const after = await inputTypes();
  check('show/hide password toggle works',
    before[1].endsWith(':password') && during[1].endsWith(':text') && shownValue === 'secret-123' && after[1].endsWith(':password'),
    `${before[1]} -> ${during[1]} (value "${shownValue}") -> ${after[1]}`);

  // wipe the probe text so the real sign-in uses clean fields
  await page.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    document.querySelectorAll('.auth__card form input').forEach((el) => {
      set.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await fill(page, { identifier: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 2500));

  const url = page.url();
  const kpis = await page.evaluate(() => document.querySelectorAll('.admin-kpi').length);
  const brand = await page.evaluate(() => document.querySelector('.admin__badge')?.innerText || '');
  const who = await page.evaluate(() => document.querySelector('.admin__user')?.innerText || '');
  const loginBanner = await bannerOf(page);
  check('1. valid admin login -> dashboard', url.endsWith('/admin') && kpis > 0, `url=${url} kpis=${kpis} banner="${loginBanner}"`);
  check('1b. admin session stored', (await token(page)).length > 20, `token len=${(await token(page)).length}`);
  check('1c. shell shows admin badge + name', brand.toLowerCase() === 'admin' && who.includes('IH Safy'), `${brand} / ${who}`);
  check('1d. dashboard shows live figures', await page.evaluate(() => document.body.innerText.includes('৳')), '');
  check('1e. no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));

  // ---------- 7. refresh after login ----------
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1800));
  const afterRefresh = page.url();
  const kpis2 = await page.evaluate(() => document.querySelectorAll('.admin-kpi').length);
  check('7. refresh keeps admin session & dashboard', afterRefresh.endsWith('/admin') && kpis2 > 0, `url=${afterRefresh} kpis=${kpis2}`);

  // ---------- 6a. logout ----------
  await page.click('.admin__out');
  await new Promise((r) => setTimeout(r, 1500));
  const outUrl = page.url();
  const outToken = await token(page);
  const outBanner = await bannerOf(page);
  check('6. sign out -> login page, token cleared', outUrl.includes('/admin/login') && outToken === '' && outBanner === '', `url=${outUrl} token="${outToken}"`);
  check('6b. signed-out admin login page shows no error', (await page.evaluate(() => document.querySelector('.auth__card h1')?.innerText)) === 'Admin Sign In');

  await page.close();
}

// ---------- 2. invalid credentials ----------
{
  const { page, state } = await newPage();
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));
  await fill(page, { identifier: env.ADMIN_EMAIL, password: 'not-the-password' });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 1500));
  const msg = await bannerOf(page);
  check('2. invalid credentials -> clear message', msg === 'Incorrect admin credentials', msg);
  check('2b. stays on login, no token', page.url().includes('/admin/login') && (await token(page)) === '', page.url());
  check('2c. password field still masked', await page.evaluate(() => document.querySelector('input[type="password"]') !== null));
  check('2d. no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
  await page.close();
}

// ---------- 3. customer attempting admin login ----------
{
  const { page } = await newPage();
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));
  await fill(page, { identifier: '01712345678', password: 'Password123' });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 1500));
  const msg = await bannerOf(page);
  check('3. customer rejected by admin login', msg === 'Incorrect admin credentials', msg);
  check('3b. customer gets no admin session', page.url().includes('/admin/login') && (await token(page)) === '', `url=${page.url()}`);

  // customer session + direct admin URL -> access denied
  const custToken = await apiLogin('01712345678', 'Password123');
  await page.evaluate((t) => localStorage.setItem('eshopping.token', t), custToken);
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  const heading = await page.evaluate(() => document.querySelector('.admin-deny h1')?.innerText || '');
  const hasKpis = await page.evaluate(() => document.querySelectorAll('.admin-kpi').length);
  check('5b. customer on /admin -> access denied', heading === 'Administrator access required' && hasKpis === 0, `${heading} kpis=${hasKpis} url=${page.url()}`);

  // customer on a deep admin URL -> also denied (no login redirect loop)
  await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  const deep = await page.evaluate(() => document.querySelector('.admin-deny h1')?.innerText || '');
  check('5c. customer on /admin/products -> access denied', deep === 'Administrator access required', `${deep} url=${page.url()}`);

  // customer token must not unlock the admin API from the page context
  const apiStatus = await page.evaluate(async () => {
    const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${localStorage.getItem('eshopping.token')}` } });
    return res.status;
  });
  check('5d. admin API refuses the customer token', apiStatus === 403, `status=${apiStatus}`);
  await page.close();
}

// ---------- 4. unauthenticated access ----------
{
  const { page, state } = await newPage();
  // previous scenarios share this browser profile - start from a clean session
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1800));
  const url = page.url();
  const onLogin = url.includes('/admin/login');
  const nextParam = new URL(url).searchParams.get('next');
  const denied = await page.evaluate(() => document.querySelector('.admin-deny h1')?.innerText || '');
  check('4. guest at /admin -> redirected to admin login', onLogin && nextParam === '/admin' && denied === '', `url=${url} denied="${denied}"`);
  check('4b. no dashboard data leaked', await page.evaluate(() => document.querySelectorAll('.admin-kpi').length) === 0);
  check('4d. no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));

  await page.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  const deepUrl = page.url();
  check('4c. guest at deep admin URL -> login with next', deepUrl.includes('/admin/login') && new URL(deepUrl).searchParams.get('next') === '/admin/orders', deepUrl);

  // 6b. expired/garbage token must boot back to the login screen
  await page.evaluate(() => localStorage.setItem('eshopping.token', 'not.a.real.token'));
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1800));
  const expiredUrl = page.url();
  const expiredToken = await token(page);
  check('6c. invalid/expired token -> login, token dropped', expiredUrl.includes('/admin/login') && expiredToken === '', `url=${expiredUrl} token="${expiredToken}"`);
  check('6d. no console errors', cleanErrors(state).length === 0, JSON.stringify(cleanErrors(state)));
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
