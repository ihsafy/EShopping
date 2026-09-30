import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API = process.env.API_URL || 'http://localhost:5000/api';
const PROBE_PREFIX = '01790003'; // probe mobiles used by this script
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`);
};

/**
 * Removes probe customers left behind by a previous run, otherwise the very
 * registration this script asserts on reports "already exists".
 */
async function clearProbeCustomers() {
  try {
    const login = await fetch(`${API}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'ihsafy2k21@gmail.com',
        password: 'ihsafy2k21@gmail.com',
      }),
    }).then((r) => r.json());
    const token = login?.data?.token;
    if (!token) return 0;

    const list = await fetch(`${API}/admin/customers?search=${PROBE_PREFIX}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    const rows = list?.data?.rows || [];
    let removed = 0;
    for (const row of rows) {
      if (!String(row.mobile || '').startsWith(PROBE_PREFIX)) continue;
      const del = await fetch(`${API}/admin/customers/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (del.ok) removed += 1;
    }
    if (removed) console.log(`cleanup: removed ${removed} leftover probe customer(s)`);
    return removed;
  } catch {
    return 0;
  }
}

async function makePage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const state = { api: [], jsErrors: [], pageErrors: [] };
  page.on('request', (r) => {
    if (r.url().includes('/api/')) state.api.push({ m: r.method(), u: new URL(r.url()).pathname });
  });
  page.on('console', (m) => { if (m.type() === 'error') state.jsErrors.push(m.text()); });
  page.on('pageerror', (e) => state.pageErrors.push(e.message));
  return { page, state };
}

const banner = (page) => page.evaluate(() => document.querySelector('.alert--error')?.innerText.trim() || '');
const fieldErrors = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.field--invalid')].map((l) => `${l.querySelector('span').innerText}: ${l.querySelector('.field__error')?.innerText || ''}`)
);
const registerCalls = (state) => state.api.filter((r) => r.m === 'POST' && r.u === '/api/auth/register').length;
const fill = async (page, values) => {
  const fields = ['name', 'mobile', 'email', 'password', 'confirmPassword'];
  for (const f of fields) {
    const idx = fields.indexOf(f);
    await page.evaluate((i, v) => {
      const el = document.querySelectorAll('form .field input')[i];
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, idx, values[f] ?? '');
  }
};

await clearProbeCustomers();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

// ---------- 1. load / register page (5173) ----------
{
  const { page, state } = await makePage(browser);
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  check('1. load shows no error message', (await banner(page)) === '', JSON.stringify(await banner(page)));
  check('1b. no register request on load', registerCalls(state) === 0, `register POSTs=${registerCalls(state)}`);
  check('8. refresh keeps the page clean', await (async () => {
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    return (await banner(page)) === '' && registerCalls(state) === 0;
  })(), `banner="${await banner(page)}" POSTs=${registerCalls(state)}`);

  // ---------- 2. empty submit: validation only, no request ----------
  const before = registerCalls(state);
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 800));
  const emptyFields = await fieldErrors(page);
  check('2. empty submit -> field messages', emptyFields.length === 4, JSON.stringify(emptyFields));
  check('2b. empty submit -> no banner, no request',
    (await banner(page)) === '' && registerCalls(state) === before,
    `banner="${await banner(page)}" POSTs=${registerCalls(state) - before}`);

  // ---------- 6. invalid email ----------
  await fill(page, { name: 'Probe Valid', mobile: '01790003001', email: 'not-an-email', password: 'Password123', confirmPassword: 'Password123' });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 500));
  const emailFields = await fieldErrors(page);
  check('6. invalid email -> field message', emailFields.some((f) => f.startsWith('Email')), JSON.stringify(emailFields));
  check('6b. invalid email -> no request, no banner',
    (await banner(page)) === '' && registerCalls(state) === before,
    `POSTs=${registerCalls(state) - before}`);

  // ---------- 7. mismatched passwords ----------
  await fill(page, { name: 'Probe Valid', mobile: '01790003001', email: '', password: 'Password123', confirmPassword: 'Password999' });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 500));
  const mismatchFields = await fieldErrors(page);
  check('7. mismatch -> field message', mismatchFields.some((f) => f.includes('Passwords do not match')), JSON.stringify(mismatchFields));
  check('7b. mismatch -> no request, no banner',
    (await banner(page)) === '' && registerCalls(state) === before,
    `POSTs=${registerCalls(state) - before}`);

  // ---------- 3. valid data, empty email ----------
  await fill(page, { name: 'Register Probe', mobile: '01790003001', email: '', password: 'Password123', confirmPassword: 'Password123' });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 2500));
  const okCalls = registerCalls(state) - before;
  check('3/5. valid data -> account created & redirected',
    page.url().endsWith('/') && okCalls === 1,
    `url=${page.url()} POSTs=${okCalls}`);
  check('3b. success toast shown', await page.evaluate(() => document.body.innerText.includes('Account created successfully')));
  check('3c. signed in (token stored)', await page.evaluate(() => Boolean(localStorage.getItem('eshopping.token'))));
  check('3d. no error banner after success', (await banner(page)) === '');
  const signIn = await page.evaluate(() => [...document.querySelectorAll('header a, header button')].map((n) => n.innerText.trim()).filter(Boolean));
  check('3e. header switched to member state', signIn.some((t) => /Sign out|My account/i.test(t)), JSON.stringify(signIn));

  // ---------- 9. console clean on success path ----------
  const jsOnly = [...state.jsErrors, ...state.pageErrors].filter((t) => !/Failed to load resource/i.test(t));
  check('9. no JS console/page errors', jsOnly.length === 0, JSON.stringify(jsOnly));

  await page.evaluate(() => localStorage.clear());
  await page.close();
}

// ---------- 4. duplicate mobile ----------
{
  const { page, state } = await makePage(browser);
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await fill(page, { name: 'Duplicate Probe', mobile: '01712345678', email: '', password: 'Password123', confirmPassword: 'Password123' });
  await page.click('.auth__submit');
  await new Promise((r) => setTimeout(r, 1500));
  const msg = await banner(page);
  const dupFields = await fieldErrors(page);
  check('4. duplicate mobile -> clear message', msg === 'An account with this mobile number already exists', msg);
  check('4b. duplicate mobile highlighted on field', dupFields.some((f) => f.startsWith('Mobile number')), JSON.stringify(dupFields));
  check('4c. exactly one register request', registerCalls(state) === 1, `POSTs=${registerCalls(state)}`);
  check('4d. still signed out', await page.evaluate(() => !localStorage.getItem('eshopping.token')));
  await page.close();
}

// ---------- original bug: page served from the OTHER Vite (port 5174) ----------
{
  const { page, state } = await makePage(browser);
  await page.goto('http://localhost:5174/register', { waitUntil: 'networkidle2' }).catch(() => null);
  const onRightOrigin = await page.evaluate(() => location.origin);
  if (onRightOrigin.includes('5174')) {
    await fill(page, { name: 'Port 5174 Probe', mobile: '01790003002', email: 'probe5174@example.com', password: 'Password123', confirmPassword: 'Password123' });
    await page.click('.auth__submit');
    await new Promise((r) => setTimeout(r, 2500));
    const msg = await banner(page);
    check('ROOT CAUSE FIX: register works from :5174 (CORS)',
      msg === '' && registerCalls(state) === 1 && page.url().endsWith('/'),
      `origin=${onRightOrigin} banner="${msg}" POSTs=${registerCalls(state)} url=${page.url()}`);
    const jsOnly = [...state.jsErrors, ...state.pageErrors].filter((t) => !/Failed to load resource/i.test(t));
    check('ROOT CAUSE FIX: no JS errors from :5174', jsOnly.length === 0, JSON.stringify(jsOnly));
  } else {
    check('ROOT CAUSE FIX: register works from :5174 (CORS)', false, `origin=${onRightOrigin}`);
  }
  await page.evaluate(() => localStorage.clear());
  await page.close();
}

await clearProbeCustomers();
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
