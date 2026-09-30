/**
 * Downloads realistic product photos from Wikimedia Commons into
 * backend/uploads/products/ and reports how product_images should be updated.
 *
 * Usage:
 *   node scripts/fetch-product-images.mjs --dry      # list candidate titles only
 *   node scripts/fetch-product-images.mjs            # download images
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'backend', 'uploads', 'products');
const SOURCES_FILE = path.join(ROOT, 'database', 'image-sources.json');
const UA = 'EShoppingDemo/1.0 (educational demo; contact: ihsafy2k21@gmail.com)';
const DRY = process.argv.includes('--dry');
const ONLY = (process.env.ONLY || '').split(',').map((n) => Number(n.trim())).filter(Boolean);

/** product id -> { queries: tried in order, prefer: title keywords, avoid: title regex } */
const QUERIES = {
  1: { queries: ['Samsung Galaxy smartphone', 'Samsung Galaxy front', 'Android smartphone front'], prefer: ['samsung galaxy', 'smartphone'], avoid: '/battery|disassembl|teardown|exploded|repair|internals|opened/' },
  2: { queries: ['HP Pavilion laptop', 'laptop computer', 'notebook laptop'], prefer: ['laptop', 'pavilion', 'hp'] },
  3: { queries: ['kurta cotton clothing', 'kurta suit men', 'Indian kurta'], prefer: ['kurta'] },
  4: { queries: ['facial serum bottle', 'cosmetic serum', 'skincare dropper bottle'], prefer: ['serum', 'skincare', 'dropper'] },
  5: { queries: ['running shoes', 'sneakers shoes', 'athletic shoe'], prefer: ['sneaker', 'running', 'shoe'] },
  6: { queries: ['hiking backpack product', 'travel backpack', 'backpack product photo'], prefer: ['backpack'], avoid: '/contents|reception|coscup|wirforce|mr\. diy|day 1|booth|court|game party|holyland|trump|wp\.jpg|worn-out|notebook/' },
  7: { queries: ['air fryer', 'airfryer kitchen'], prefer: ['air fryer', 'fryer'], avoid: '/interior|tabletop convection|grill|panini|press/' },
  8: { queries: ['smartwatch', 'fitness tracker watch', 'smart watch'], prefer: ['watch', 'smartwatch', 'fitness'], avoid: '/health2/' },
  9: { queries: ['mattress bedroom', 'bedroom mattress new', 'mattress'], prefer: ['mattress'], avoid: '/nebelwerfer|military|urine|dumped|land mattress|army|wartime|review|1971|senta|beautyrest|dump/' },
  10: { queries: ['dumbbell', 'dumbbells fitness'], prefer: ['dumbbell'], avoid: '/nebula|m27|galaxy/' },
  11: { queries: ['wristwatch analog', 'wristwatch', 'mechanical wristwatch'], prefer: ['watch'] },
  12: { queries: ['over-ear headphones', 'headphones', 'wireless headphones'], prefer: ['headphone'] },
  13: { queries: ['panjabi fatua', 'men kurta', 'kurta men clothing'], prefer: ['kurta', 'panjabi', 'fatua'] },
  14: { queries: ['nonstick frying pan', 'frying pan', 'cookware pan'], prefer: ['pan', 'cookware'], avoid: '/blintzes|tan ngang|trangia|crepe/' },
  15: { queries: ['makeup brushes', 'makeup brush set'], prefer: ['brush'] },
  16: { queries: ['LED light bulb', 'LED bulbs photo', 'light bulb lamp'], prefer: ['led', 'bulb'], avoid: '/shattered|\.png$|\.svg$|icon|clipart/' },
  17: { queries: ['oxford shoes', 'men dress shoes leather'], prefer: ['oxford', 'men'], avoid: '/lacma|museum|wedding|met /' },
  18: { queries: ['leather handbag', 'handbag'], prefer: ['handbag'] },
  19: { queries: ['camping tent', 'tent camping'], prefer: ['tent'], avoid: '/haldi|ceremony|decoration|saami|1900/' },
  20: { queries: ['smartphone android phone', 'Android smartphone', 'mobile phone front'], prefer: ['smartphone', 'phone'] },
  21: { queries: ['ergonomic chair', 'office chair wheels', 'desk chair'], prefer: ['chair'], avoid: '/efta|control room|office space|monitors|met |v&a|museum|frank lloyd|fauteuil|va london|1900/' },
  22: { queries: ['sunglasses', 'sunglasses polarized'], prefer: ['sunglass'] },
  23: { queries: ['shampoo bottle', 'shampoo'], prefer: ['shampoo'] },
  24: { queries: ['desk organizer', 'organizer desk', 'pen holder desk'], prefer: ['organizer', 'organiser', 'modular'], avoid: '/silver-plated|union station|cascade gardens|eads bridge|medication/' },
  25: { queries: ['portable bluetooth speaker', 'bluetooth speaker', 'portable speaker'], prefer: ['speaker'] },
  26: { queries: ['dress shirt', 'button-down shirt', 'men shirt'], prefer: ['shirt'] },
  27: { queries: ['running shoes', 'athletic shoes', 'sneakers'], prefer: ['sneaker', 'shoe'] },
  28: { queries: ['bedroom bed made bed sheet', 'bed sheets bedroom', 'bed linen bedroom'], prefer: ['bed sheet', 'bed sheets', 'linen', 'bedroom'], avoid: '/navy|seaman|serviceman|dryer|jail|convict|loom|hospital|laundry|stitch/' },
  29: { queries: ['stainless steel water bottle', 'metal water bottle'], prefer: ['bottle'] },
  30: { queries: ['yoga mat', 'exercise mat'], prefer: ['yoga mat', 'yoga mats'], avoid: '/underlay|carpet/' },
};

/**
 * Hand-picked replacements for slots where search results were a poor match.
 * Key is `<productId>-<slot>`.
 */
const PIN = {
  '1-1': {
    url: 'https://cdn.stocksnap.io/img-thumbs/960w/ZA8X5D7EGZ.jpg',
    title: 'Samsung Smartphone',
    page: 'https://stocksnap.io/photo/samsung-smartphone-ZA8X5D7EGZ',
    license: 'CC0',
    artist: 'Wilfred Iven',
  },
  '1-2': { commons: 'File:Samsung Galaxy S25 Ultra smartphone - side view.jpg' },
  '1-3': { commons: 'File:Samsung Galaxy S25 Ultra smartphone - bottom view.jpg' },
  '6-1': {
    url: 'https://live.staticflickr.com/3819/9650666216_85ea0392ca_b.jpg',
    title: 'Incase laptop backpack',
    page: 'https://www.flickr.com/photos/93307622@N00/9650666216',
    license: 'CC BY-SA',
    artist: 'esquetee',
  },
  '6-2': {
    url: 'https://live.staticflickr.com/3026/2416650578_a116b4c06e_b.jpg',
    title: 'Golla Tulip Gray laptop backpack: Front view',
    page: 'https://www.flickr.com/photos/78835633@N00/2416650578',
    license: 'CC BY-SA',
    artist: 'Miia Sample',
  },
  '7-2': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Air_Fryer_5458.jpg/960px-Air_Fryer_5458.jpg',
    title: 'Air Fryer 5458',
    page: 'https://commons.wikimedia.org/wiki/File:Air_Fryer_5458.jpg',
    license: 'CC BY 2.0',
    artist: 'Ashley Pomeroy',
  },
  '9-1': {
    url: 'https://live.staticflickr.com/1143/872459661_3e17e160f5_b.jpg',
    title: 'Sleep Number Mattress',
    page: 'https://www.flickr.com/photos/13542313@N00/872459661',
    license: 'CC BY',
    artist: 'Eddie~S',
  },
  '16-1': {
    url: 'https://live.staticflickr.com/6223/6310526454_e4ffb2180b_b.jpg',
    title: 'Ikea LEDARE GU10 LED Light Bulb',
    page: 'https://www.flickr.com/photos/24879135@N04/6310526454',
    license: 'CC BY-SA',
    artist: 'mattk1979',
  },
  '28-1': {
    url: 'https://live.staticflickr.com/3925/14272657347_ed1cb6fc70_b.jpg',
    title: 'Libeco Home Nottinghill Duvet Cover and Pillow Shams',
    page: 'https://www.flickr.com/photos/49889671@N03/14272657347',
    license: 'CC BY',
    artist: 'Didriks',
  },
};

const resolveCommons = async (title) => {
  const data = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '900' });
  const page = Object.values(data?.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`Commons file not found: ${title}`);
  const meta = info.extmetadata || {};
  return {
    url: info.thumburl,
    title: page.title.replace('File:', ''),
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace('File:', '').replace(/ /g, '_'))}`,
    license: meta.LicenseShortName?.value || 'see source page',
    artist: (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 80),
  };
};

const BAD_TITLE = /(logo|diagram|map\b|icon|chart|seal|coat of arms|screenshot|flag\b|poster|drawing|sketch|cartoon|clipart|barcode|qr|painting|museum|museo|egizio|engraving|portrait of|century|renaissance|ancient|fresco|statue|monument|plaque|water bottle\.jpg.*HK)/i;

const api = async (params) => {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status} for ${url}`);
  return res.json();
};

const toRegExp = (value) => {
  if (!value) return null;
  if (value instanceof RegExp) return value;
  if (value.startsWith('/')) return new RegExp(value.slice(1, value.lastIndexOf('/')), 'i');
  return new RegExp(value, 'i');
};

const searchCandidates = async (query, prefer = [], avoid = null) => {
  const avoidRe = toRegExp(avoid);
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '900',
  });
  const pages = Object.values(data?.query?.pages || {});
  return pages
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .filter((p) => {
      const info = p.imageinfo?.[0];
      if (!info) return false;
      if (!['image/jpeg', 'image/png'].includes(info.mime)) return false;
      if ((info.width || 0) < 600 || (info.height || 0) < 400) return false;
      if (BAD_TITLE.test(p.title)) return false;
      if (avoidRe && avoidRe.test(p.title)) return false;
      if ((info.size || 0) < 8000) return false;
      return true;
    })
    .map((p, rank) => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata || {};
      const title = p.title.toLowerCase();
      const hits = prefer.filter((k) => title.includes(k.toLowerCase())).length;
      return {
        title: p.title,
        thumb: info.thumburl,
        page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace('File:', '').replace(/ /g, '_'))}`,
        license: meta.LicenseShortName?.value || 'see source page',
        artist: (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 80),
        score: hits > 0 ? hits * 100 - rank : -rank,
      };
    })
    .sort((a, b) => b.score - a.score);
};

/** tries each query until one yields candidates */
const findCandidates = async (config) => {
  for (const query of config.queries) {
    try {
      const candidates = await searchCandidates(query, config.prefer, config.avoid);
      if (candidates.length) return { query, candidates };
    } catch (err) {
      console.warn(`  search "${query}" failed: ${err.message}`);
    }
  }
  return null;
};

const download = async (url, dest) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('file too small');
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJpg && !isPng) throw new Error('not an image');
  await fs.writeFile(dest, buf);
  return { bytes: buf.length, type: isJpg ? 'jpg' : 'png' };
};

// products + their image slots come from the database dump kept in the repo
const productsRaw = await fs.readFile(path.join(ROOT, 'database', 'seed.sql'), 'utf8');
const products = [];
const productBlock = productsRaw.slice(productsRaw.indexOf('INSERT INTO `products`'), productsRaw.indexOf('INSERT INTO `product_images`'));
for (const line of productBlock.split('\n')) {
  const m = line.match(/^\s*\((\d+),\s+(\d+),\s+(\d+|NULL),\s+'([^']+)',\s+'([^']+)'/);
  if (m) products.push({ id: Number(m[1]), name: m[4], slug: m[5] });
}
const imageCounts = {};
const imgBlock = productsRaw.slice(productsRaw.indexOf('INSERT INTO `product_images`'), productsRaw.indexOf('INSERT INTO `product_specs`'));
for (const line of imgBlock.split('\n')) {
  const m = line.match(/^\s*\((\d+),\s+'/);
  if (m) imageCounts[m[1]] = (imageCounts[m[1]] || 0) + 1;
}

await fs.mkdir(OUT_DIR, { recursive: true });
const sources = {};
let downloaded = 0;
const failures = [];

for (const product of products) {
  if (ONLY.length && !ONLY.includes(product.id)) continue;
  const slots = imageCounts[String(product.id)] || 1;
  const config = QUERIES[product.id];
  if (!config) {
    failures.push(`${product.slug}: no query defined`);
    continue;
  }
  const used = new Set();
  for (let slot = 0; slot < slots; slot++) {
    let pin = PIN[`${product.id}-${slot + 1}`];
    if (pin?.commons && !pin.url) pin = { ...(await resolveCommons(pin.commons)) };
    if (pin) {
      if (DRY) {
        console.log(`${String(product.id).padStart(2)} ${product.slug} #${slot + 1}  <- PIN ${pin.title}`);
        continue;
      }
      const file = `${product.slug}-${slot + 1}.jpg`;
      try {
        const info = await download(pin.url, path.join(OUT_DIR, file));
        downloaded++;
        console.log(`ok ${file}  ${info.bytes}B  <- PIN ${pin.title} [${pin.license}]`);
        sources[`${product.slug}-${slot + 1}`] = { title: pin.title, page: pin.page, license: pin.license, artist: pin.artist };
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        failures.push(`${product.slug}#${slot + 1}: pinned download failed ${err.message}`);
      }
      continue;
    }
    const found = await findCandidates(config);
    if (!found) {
      failures.push(`${product.slug}#${slot + 1}: no candidates for ${JSON.stringify(config.queries)}`);
      continue;
    }
    const { query, candidates } = found;
    const pick = candidates.find((c) => !used.has(c.title)) || candidates[0];
    if (!pick) {
      failures.push(`${product.slug}#${slot + 1}: no candidate for "${query}"`);
      continue;
    }
    used.add(pick.title);
    if (DRY) {
      console.log(`${String(product.id).padStart(2)} ${product.slug} #${slot + 1}  <- "${query}"  PICK: ${pick.title.replace('File:', '')}`);
      candidates
        .filter((c) => c.title !== pick.title)
        .slice(0, 4)
        .forEach((c) => console.log(`         ${c.title.replace('File:', '')}`));
      continue;
    }
    const file = `${product.slug}-${slot + 1}.jpg`;
    try {
      const info = await download(pick.thumb, path.join(OUT_DIR, file));
      downloaded++;
      console.log(`ok ${file}  ${info.bytes}B  <- ${pick.title.replace('File:', '')} [${pick.license}]`);
      sources[`${product.slug}-${slot + 1}`] = { title: pick.title, page: pick.page, license: pick.license, artist: pick.artist };
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      failures.push(`${product.slug}#${slot + 1}: download failed ${err.message}`);
    }
  }
}

if (!DRY) {
  // PNG payloads are saved with a .jpg name above - give them the right extension
  for (const name of await fs.readdir(OUT_DIR)) {
    if (!name.endsWith('.jpg')) continue;
    const buf = await fs.readFile(path.join(OUT_DIR, name));
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const target = name.replace(/\.jpg$/, '.png');
      await fs.rename(path.join(OUT_DIR, name), path.join(OUT_DIR, target));
      if (sources[name]) {
        sources[target] = sources[name];
        delete sources[name];
      }
      console.log(`renamed ${name} -> ${target}`);
    }
  }
  await fs.writeFile(SOURCES_FILE, JSON.stringify(sources, null, 2));
  console.log(`\nDownloaded ${downloaded} images to backend/uploads/products/`);
  console.log(`Wrote ${path.relative(ROOT, SOURCES_FILE)}`);
}
if (failures.length) {
  console.log(`\nFailures (${failures.length}):`);
  failures.forEach((f) => console.log('  - ' + f));
}
