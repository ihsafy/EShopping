/** Quick screenshot + layout probe: node scripts/shot.mjs <path> <width> [out] [full] */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const SHOTS = 'C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode\\shots';

const route = process.argv[2] || '/';
const width = Number(process.argv[3] || 1366);
const out = process.argv[4] || `${SHOTS}\\shot.png`;
const full = process.argv[5] === 'full';

fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900, isMobile: width < 700, hasTouch: width < 700 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon|net::ERR_ABORTED/i.test(m.text())) errors.push(m.text());
});

await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise((r) => setTimeout(r, 900));

const info = await page.evaluate(() => {
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const cards = [...document.querySelectorAll('.product-card')].slice(0, 8).map((card) => {
    const media = card.querySelector('.product-card__media');
    const img = card.querySelector('.product-card__media img');
    const body = card.querySelector('.product-card__body');
    const c = card.getBoundingClientRect();
    const m = media ? media.getBoundingClientRect() : null;
    const b = body ? body.getBoundingClientRect() : null;
    return {
      w: Math.round(c.width),
      h: Math.round(c.height),
      mediaH: m ? Math.round(m.height) : 0,
      mediaRatio: m ? +(m.width / m.height).toFixed(2) : 0,
      bodyH: b ? Math.round(b.height) : 0,
      mediaShare: m && c.height ? +(m.height / c.height).toFixed(2) : 0,
      fit: img ? getComputedStyle(img).objectFit : null,
      natural: img ? [img.naturalWidth, img.naturalHeight] : null,
      naturalRatio: img && img.naturalHeight ? +(img.naturalWidth / img.naturalHeight).toFixed(2) : null,
      src: img ? img.getAttribute('src') : null,
    };
  });
  const tracks = [...document.querySelectorAll('.section-row__track')].map((t) => {
    const r = t.getBoundingClientRect();
    return { w: Math.round(r.width), cols: getComputedStyle(t).gridAutoColumns, flow: getComputedStyle(t).gridAutoFlow, colsCount: getComputedStyle(t).gridTemplateColumns.split(' ').length };
  });
  return { overflow, cards, tracks, sections: document.querySelectorAll('.section-row').length };
});

await page.screenshot({ path: out, fullPage: full });
console.log(JSON.stringify(info, null, 2));
if (errors.length) console.log('console errors:', errors.slice(0, 5));
await browser.close();
