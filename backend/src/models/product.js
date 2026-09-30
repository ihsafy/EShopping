'use strict';

const { query, queryOne } = require('../config/db');
const { escapeLike, money, computeSalePrice, slugify } = require('../utils/helpers');

const BASE_SELECT = `
  SELECT
    p.*,
    c.name  AS category_name,
    c.slug  AS category_slug,
    sc.name AS subcategory_name,
    sc.slug AS subcategory_slug,
    (SELECT pi.image_url FROM product_images pi
      WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image
  FROM products p
  LEFT JOIN categories   c  ON c.id  = p.category_id
  LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
`;

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  oldest: 'p.created_at ASC, p.id ASC',
  price_asc: 'p.sale_price ASC, p.id DESC',
  price_desc: 'p.sale_price DESC, p.id DESC',
  popular: 'p.sold_count DESC, p.created_at DESC',
  rating: 'p.rating_avg DESC, p.rating_count DESC, p.id DESC',
  discount: 'p.discount DESC, p.id DESC',
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
};

function buildFilters(options = {}) {
  const {
    search,
    category,
    subcategory,
    brands = [],
    minPrice,
    maxPrice,
    minDiscount,
    minRating,
    availability,
    featured,
    bestSeller,
    newArrival,
    includeInactive = false,
    status = '',
    ids = null,
  } = options;

  const where = [];
  const params = [];

  if (!includeInactive) where.push("p.status = 'active'");

  // Admin listing can narrow to one status even when inactive rows are visible.
  if (status === 'active' || status === 'inactive') {
    where.push('p.status = ?');
    params.push(status);
  }

  if (search) {
    const like = `%${escapeLike(search)}%`;
    where.push(`(
      p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ? OR p.tags LIKE ?
      OR p.seo_keywords LIKE ? OR p.short_description LIKE ? OR c.name LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like);
  }

  if (category) {
    where.push('(c.slug = ? OR p.category_id = ?)');
    params.push(String(category), Number(category) || 0);
  }

  if (subcategory) {
    where.push('(sc.slug = ? OR p.subcategory_id = ?)');
    params.push(String(subcategory), Number(subcategory) || 0);
  }

  if (Array.isArray(brands) && brands.length) {
    where.push(`p.brand IN (${brands.map(() => '?').join(',')})`);
    params.push(...brands);
  }

  if (minPrice !== undefined && minPrice !== '') {
    where.push('p.sale_price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    where.push('p.sale_price <= ?');
    params.push(Number(maxPrice));
  }
  if (minDiscount) {
    where.push('p.discount >= ?');
    params.push(Number(minDiscount));
  }
  if (minRating) {
    where.push('p.rating_avg >= ?');
    params.push(Number(minRating));
  }

  if (availability === 'in_stock') where.push('p.stock > 0');
  if (availability === 'out_of_stock') where.push('p.stock <= 0');

  if (featured) where.push('p.featured = 1');
  if (bestSeller) where.push('p.best_seller = 1');
  if (newArrival) where.push('p.new_arrival = 1');

  if (Array.isArray(ids) && ids.length) {
    where.push(`p.id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }

  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/** Paginated product listing with search, filters and sorting. */
async function list(options = {}) {
  const { where, params } = buildFilters(options);
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 12));
  const offset = (page - 1) * limit;
  const orderBy = SORTS[options.sort] || SORTS.newest;

  const rows = await query(
    `${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM products p
     LEFT JOIN categories   c  ON c.id  = p.category_id
     LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
     ${where}`,
    params
  );

  const total = countRow ? countRow.total : 0;
  return {
    products: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/** Attaches the gallery + spec children to a product row. */
async function withChildren(product) {
  if (!product) return product;

  const [images, specs] = await Promise.all([
    query('SELECT id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC', [
      product.id,
    ]),
    query('SELECT spec_key, spec_value FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC, id ASC', [product.id]),
  ]);

  return { ...product, images, specs };
}

/** Product by numeric id, including images and specs. */
async function findById(id, { includeInactive = true } = {}) {
  const product = await queryOne(`${BASE_SELECT} WHERE p.id = ? ${includeInactive ? '' : "AND p.status = 'active'"}`, [
    id,
  ]);
  if (!product) return null;
  return withChildren(product);
}

/** Product by SEO slug (same shape as findById, including images and specs). */
async function findBySlug(slug, { includeInactive = true } = {}) {
  const product = await queryOne(
    `${BASE_SELECT} WHERE p.slug = ? ${includeInactive ? '' : "AND p.status = 'active'"}`,
    [slug]
  );
  return withChildren(product);
}

/** Lightweight rows for the search-suggestions dropdown. */
async function suggest(term, limit = 8) {
  if (!term || String(term).trim().length < 2) return [];
  const like = `%${escapeLike(String(term).trim())}%`;
  return query(
    `SELECT p.id, p.name, p.slug, p.sale_price,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
              ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'active' AND (p.name LIKE ? OR p.brand LIKE ? OR p.tags LIKE ? OR p.sku LIKE ?)
     ORDER BY p.sold_count DESC, p.name ASC LIMIT ?`,
    [like, like, like, like, Number(limit)]
  );
}

async function distinctBrands() {
  return query(
    "SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> '' AND status = 'active' ORDER BY brand ASC"
  );
}

async function priceRange() {
  const row = await queryOne(
    "SELECT MIN(sale_price) AS min_price, MAX(sale_price) AS max_price FROM products WHERE status = 'active'"
  );
  return {
    minPrice: row && row.min_price !== null ? money(row.min_price) : 0,
    maxPrice: row && row.max_price !== null ? money(row.max_price) : 5000,
  };
}

async function incrementSold(productIds, quantities) {
  for (let i = 0; i < productIds.length; i += 1) {
    await query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [
      quantities[i] || 0,
      productIds[i],
    ]);
  }
}

async function adjustStock(connection, productId, delta) {
  const executor = connection || { execute: query };
  await executor.execute('UPDATE products SET stock = GREATEST(0, stock + ?) WHERE id = ?', [
    delta,
    productId,
  ]);
}

async function recalculateRating(productId) {
  const row = await queryOne(
    "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'visible'",
    [productId]
  );
  const avg = row && row.total ? money(Number(row.avg_rating).toFixed(2)) : 0;
  await query('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?', [avg, row ? row.total : 0, productId]);
  return { ratingAvg: avg, ratingCount: row ? row.total : 0 };
}

async function recalculateSoldCounts() {
  // Rebuilds sold_count from delivered/shipped order items (used by the seed
  // script and by admin recalculation actions).
  await query('UPDATE products SET sold_count = 0');
  await query(
    `UPDATE products p
     SET p.sold_count = (
       SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = p.id AND o.order_status IN ('confirmed','processing','shipped','delivered')
     )`
  );
}

/** Generates a slug that does not collide, ignoring the current product id. */
async function uniqueSlug(base, ignoreId = null) {
  const root = slugify(base);
  let candidate = root;
  let suffix = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const existing = await queryOne(
      `SELECT id FROM products WHERE slug = ? ${ignoreId ? 'AND id <> ?' : ''} LIMIT 1`,
      ignoreId ? [candidate, ignoreId] : [candidate]
    );
    if (!existing) return candidate;
    candidate = `${root}-${++suffix}`;
  }
  /* eslint-enable no-await-in-loop */
}

async function uniqueSku(base, ignoreId = null) {
  const root = slugify(base).toUpperCase().replace(/-/g, '-').slice(0, 60);
  let candidate = root;
  let suffix = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const existing = await queryOne(`SELECT id FROM products WHERE sku = ? ${ignoreId ? 'AND id <> ?' : ''} LIMIT 1`, [
      candidate,
      ...(ignoreId ? [ignoreId] : []),
    ]);
    if (!existing) return candidate;
    candidate = `${root}-${++suffix}`;
  }
  /* eslint-enable no-await-in-loop */
}

async function create(data) {
  const slug = data.slug ? await uniqueSlug(data.slug) : await uniqueSlug(data.name);
  const sku = data.sku ? await uniqueSku(data.sku) : await uniqueSku(`${slugify(data.name)}-eshopping`);
  const originalPrice = money(data.originalPrice);
  const discount = money(data.discount || 0);
  const override = data.salePrice !== undefined && data.salePrice !== null && data.salePrice !== '';
  const salePrice = override ? money(data.salePrice) : computeSalePrice(originalPrice, discount);

  const result = await query(
    `INSERT INTO products
      (category_id, subcategory_id, name, slug, description, short_description, sku, brand, tags,
       seo_title, seo_description, seo_keywords, original_price, discount, sale_price, price_override,
       stock, featured, best_seller, new_arrival, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.categoryId || null,
      data.subcategoryId || null,
      data.name,
      slug,
      data.description || null,
      data.shortDescription || null,
      sku,
      data.brand || null,
      Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || null,
      data.seoTitle || data.name,
      data.seoDescription || data.shortDescription || null,
      data.seoKeywords || (Array.isArray(data.tags) ? data.tags.join(', ') : data.tags) || null,
      originalPrice,
      discount,
      salePrice,
      override ? 1 : 0,
      Number(data.stock) || 0,
      data.featured ? 1 : 0,
      data.bestSeller ? 1 : 0,
      data.newArrival ? 1 : 0,
      data.status === 'inactive' ? 'inactive' : 'active',
    ]
  );

  await replaceChildren(result.insertId, data);
  return result.insertId;
}

async function update(id, data) {
  const current = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
  if (!current) return false;

  const originalPrice = data.originalPrice !== undefined ? money(data.originalPrice) : money(current.original_price);
  const discount = data.discount !== undefined ? money(data.discount) : money(current.discount);

  let salePrice;
  let override;
  const hasSalePrice = data.salePrice !== undefined && data.salePrice !== null && data.salePrice !== '';
  if (hasSalePrice) {
    // Admin explicitly overrides the computed price.
    salePrice = money(data.salePrice);
    override = 1;
  } else if (data.salePrice === '' || data.priceOverride === false || data.priceOverride === 0 || data.priceOverride === '0') {
    // Empty sale price means "go back to calculating it from the discount".
    salePrice = computeSalePrice(originalPrice, discount);
    override = 0;
  } else {
    salePrice = current.price_override ? money(current.sale_price) : computeSalePrice(originalPrice, discount);
    override = current.price_override ? 1 : 0;
  }

  const slug = data.name !== undefined || data.slug !== undefined
    ? await uniqueSlug(data.slug || data.name || current.name, id)
    : current.slug;

  const sku = data.sku !== undefined && data.sku
    ? await uniqueSku(data.sku, id)
    : current.sku;

  await query(
    `UPDATE products SET
      category_id = ?, subcategory_id = ?, name = ?, slug = ?, description = ?, short_description = ?,
      sku = ?, brand = ?, tags = ?, seo_title = ?, seo_description = ?, seo_keywords = ?,
      original_price = ?, discount = ?, sale_price = ?, price_override = ?, stock = ?,
      featured = ?, best_seller = ?, new_arrival = ?, status = ?
     WHERE id = ?`,
    [
      data.categoryId !== undefined ? data.categoryId || null : current.category_id,
      data.subcategoryId !== undefined ? data.subcategoryId || null : current.subcategory_id,
      data.name !== undefined ? data.name : current.name,
      slug,
      data.description !== undefined ? data.description : current.description,
      data.shortDescription !== undefined ? data.shortDescription : current.short_description,
      sku,
      data.brand !== undefined ? data.brand : current.brand,
      data.tags !== undefined ? (Array.isArray(data.tags) ? data.tags.join(', ') : data.tags) : current.tags,
      data.seoTitle !== undefined ? data.seoTitle : current.seo_title,
      data.seoDescription !== undefined ? data.seoDescription : current.seo_description,
      data.seoKeywords !== undefined ? data.seoKeywords : current.seo_keywords,
      originalPrice,
      discount,
      salePrice,
      override,
      data.stock !== undefined ? Number(data.stock) || 0 : current.stock,
      data.featured !== undefined ? (data.featured ? 1 : 0) : current.featured,
      data.bestSeller !== undefined ? (data.bestSeller ? 1 : 0) : current.best_seller,
      data.newArrival !== undefined ? (data.newArrival ? 1 : 0) : current.new_arrival,
      data.status !== undefined ? data.status : current.status,
      id,
    ]
  );

  if (data.images !== undefined || data.specs !== undefined) {
    await replaceChildren(id, data);
  }
  return true;
}

async function replaceChildren(productId, data) {
  if (Array.isArray(data.images)) {
    await query('DELETE FROM product_images WHERE product_id = ?', [productId]);
    if (data.images.length) {
      const values = data.images.map(() => '(?, ?, ?, ?)').join(', ');
      const params = [];
      data.images.forEach((img, index) => {
        const url = typeof img === 'string' ? img : img.imageUrl;
        const alt = typeof img === 'string' ? null : img.altText || null;
        params.push(productId, url, alt, index);
      });
      await query(`INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES ${values}`, params);
    }
  }
  if (Array.isArray(data.specs)) {
    await query('DELETE FROM product_specs WHERE product_id = ?', [productId]);
    const valid = data.specs.filter((s) => s && s.key && String(s.value || '').trim());
    if (valid.length) {
      const values = valid.map(() => '(?, ?, ?, ?)').join(', ');
      const params = [];
      valid.forEach((spec, index) => params.push(productId, String(spec.key).slice(0, 80), String(spec.value).slice(0, 255), index));
      await query(`INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order) VALUES ${values}`, params);
    }
  }
}

async function remove(id) {
  await query('DELETE FROM products WHERE id = ?', [id]);
}

async function stats() {
  const row = await queryOne(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
      SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS low_stock
    FROM products
  `);
  return row;
}

module.exports = {
  list,
  findById,
  findBySlug,
  suggest,
  distinctBrands,
  priceRange,
  incrementSold,
  adjustStock,
  recalculateRating,
  recalculateSoldCounts,
  uniqueSlug,
  create,
  update,
  remove,
  stats,
};
