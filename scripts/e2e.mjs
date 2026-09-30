/**
 * Headless click-through smoke tests for the storefront.
 * Requires: API on :5000, frontend on :5173, Chrome installed.
 *
 *   node scripts/e2e.mjs
 */
import puppeteer from 'puppeteer-core';
import { rmSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const PROFILE = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\pptr-profile';

const CUSTOMER = { mobile: '01712345678', password: 'Password123' };
const TEMP_USER = {
  name: 'E2E Temp',
  // Fresh number per run: an account left behind by an earlier run would
  // otherwise answer 409 and block the registration check.
  mobile: `01799${Math.floor(100000 + Math.random() * 900000)}`,
  password: 'Password123',
  confirmPassword: 'Password123',
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const text = (page) => page.evaluate(() => document.body.innerText);

/** The account menu holds My account / My orders / Sign out, so open it first. */
async function openAccountMenu(page) {
  await page.waitForSelector('.header__account-btn');
  const expanded = await page.$eval('.header__account-btn', (b) => b.getAttribute('aria-expanded') === 'true');
  if (!expanded) await page.click('.header__account-btn');
  await page.waitForSelector('.header__account.is-open .header__account-panel');
}

async function signIn(page, { mobile, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type=tel]', mobile);
  await page.type('input[type=password]', password);
  await page.click('.auth__submit');
  // Signed in: the account button shows the first name instead of "Account".
  await page.waitForSelector('.header__account-btn');
  await page.waitForFunction(() => {
    const el = document.querySelector('.header__account-btn .icon-btn__label');
    return el && el.textContent.trim() && el.textContent.trim() !== 'Account';
  });
}

async function signOut(page) {
  await openAccountMenu(page);
  await page.click('button[aria-label="Sign out"]');
  await page.waitForFunction(() => {
    const el = document.querySelector('.header__account-btn .icon-btn__label');
    return el && el.textContent.trim() === 'Account';
  });
}

async function main() {
  rmSync(PROFILE, { recursive: true, force: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });
  page.setDefaultTimeout(20000);

  // --- login (happy path) ---
  await signIn(page, CUSTOMER);
  const homeUrl = page.url();
  const homeText = await text(page);
  check('login redirects home', new URL(homeUrl).pathname === '/', homeUrl);
  check('header shows the signed-in first name', homeText.includes('Ayesha'));
  const token = await page.evaluate(() => localStorage.getItem('eshopping.token'));
  check('token stored after login', Boolean(token));

  // --- login honours ?next= ---
  await signOut(page);
  await page.goto(`${BASE}/login?next=/shop`, { waitUntil: 'networkidle2' });
  await page.type('input[type=tel]', CUSTOMER.mobile);
  await page.type('input[type=password]', CUSTOMER.password);
  await page.click('.auth__submit');
  await page.waitForFunction(() => location.pathname === '/shop');
  check('login returns to ?next=', true, page.url());

  // --- wrong password shows the API message ---
  await signOut(page);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type=tel]', CUSTOMER.mobile);
  await page.type('input[type=password]', 'definitely-wrong');
  await page.click('.auth__submit');
  await page.waitForSelector('.alert--error');
  const alertText = await page.$eval('.alert--error', (el) => el.innerText);
  check('wrong password shows an error', alertText.includes('Incorrect mobile number or password'), alertText);

  // --- register rejects mismatched passwords next to the field ---
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle2' });
  await page.type('input[autocomplete=name]', TEMP_USER.name);
  await page.type('input[autocomplete=tel]', TEMP_USER.mobile);
  await page.type('input[autocomplete=new-password]', TEMP_USER.password);
  const passwords = await page.$$('input[autocomplete=new-password]');
  await passwords[1].type('different-password');
  await page.click('.auth__submit');
  await page.waitForSelector('.field__error');
  const fieldError = await page.$eval('.field__error', (el) => el.innerText);
  check('password mismatch error shown', fieldError.includes('Passwords do not match'), fieldError);

  // --- register success signs the user in ---
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle2' });
  await page.type('input[autocomplete=name]', TEMP_USER.name);
  await page.type('input[autocomplete=tel]', TEMP_USER.mobile);
  await page.type('input[autocomplete=new-password]', TEMP_USER.password);
  const pw2 = await page.$$('input[autocomplete=new-password]');
  await pw2[1].type(TEMP_USER.password);
  await page.click('.auth__submit');
  await page.waitForFunction(() => {
    const el = document.querySelector('.header__account-btn .icon-btn__label');
    return el && el.textContent.includes('E2E');
  });
  const regText = await text(page);
  check('register signs the user in', regText.includes('E2E'), regText.slice(0, 80));

  // --- signed-out product detail keeps the sign-in gate ---
  await signOut(page);
  await page.goto(`${BASE}/product/wireless-over-ear-headphones`, { waitUntil: 'networkidle2' });
  const detailText = await text(page);
  check('signed-out detail shows sign-in gate', detailText.includes('Sign in to buy'));

  // --- signed-in product detail exposes the buy controls ---
  await signIn(page, CUSTOMER);
  await page.goto(`${BASE}/product/wireless-over-ear-headphones`, { waitUntil: 'networkidle2' });
  const signedInDetail = await text(page);
  check('signed-in detail shows Add to cart', signedInDetail.includes('Add to cart'));

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('E2E run failed:', err.message);
  process.exit(1);
});
