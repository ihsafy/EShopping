'use strict';

const { query, queryOne } = require('../config/db');
const { slugify } = require('../utils/helpers');

const list = async ({ includeInactive = false, withCounts = true } = {}) => {
  const where = includeInactive ? '' : "WHERE c.status = 'active'";
  const countSelect = withCounts
    ? `, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS product_count`
    : '';
  return query(`SELECT c.*${countSelect} FROM categories c ${where} ORDER BY c.sort_order ASC, c.name ASC`);
};

const findById = (id) => queryOne('SELECT * FROM categories WHERE id = ?', [id]);

const findBySlug = (slug) => queryOne('SELECT * FROM categories WHERE slug = ?', [slug]);

async function uniqueSlug(name, ignoreId = null) {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const existing = await queryOne(
      `SELECT id FROM categories WHERE slug = ? ${ignoreId ? 'AND id <> ?' : ''} LIMIT 1`,
      ignoreId ? [candidate, ignoreId] : [candidate]
    );
    if (!existing) return candidate;
    candidate = `${root}-${++suffix}`;
  }
  /* eslint-enable no-await-in-loop */
}

const create = async (data) => {
  const result = await query(
    'INSERT INTO categories (name, slug, description, icon, image_url, status, sort_order) VALUES (?,?,?,?,?,?,?)',
    [
      data.name,
      data.slug ? await uniqueSlug(data.slug) : await uniqueSlug(data.name),
      data.description || null,
      data.icon || null,
      data.imageUrl || null,
      data.status === 'inactive' ? 'inactive' : 'active',
      Number(data.sortOrder) || 0,
    ]
  );
  return result.insertId;
};

const update = async (id, data) => {
  const current = await findById(id);
  if (!current) return false;
  await query(
    'UPDATE categories SET name = ?, slug = ?, description = ?, icon = ?, image_url = ?, status = ?, sort_order = ? WHERE id = ?',
    [
      data.name !== undefined ? data.name : current.name,
      data.name !== undefined || data.slug !== undefined
        ? await uniqueSlug(data.slug || data.name || current.name, id)
        : current.slug,
      data.description !== undefined ? data.description : current.description,
      data.icon !== undefined ? data.icon : current.icon,
      data.imageUrl !== undefined ? data.imageUrl : current.image_url,
      data.status !== undefined ? data.status : current.status,
      data.sortOrder !== undefined ? Number(data.sortOrder) || 0 : current.sort_order,
      id,
    ]
  );
  return true;
};

const remove = (id) => query('DELETE FROM categories WHERE id = ?', [id]);

const productCount = (id) =>
  queryOne('SELECT COUNT(*) AS total FROM products WHERE category_id = ?', [id]).then((r) => (r ? r.total : 0));

// ---- subcategories ---------------------------------------------------------

const listSubcategories = (categoryId) =>
  query(
    `SELECT sc.*, (SELECT COUNT(*) FROM products p WHERE p.subcategory_id = sc.id AND p.status = 'active') AS product_count
     FROM subcategories sc WHERE sc.category_id = ? ORDER BY sc.name ASC`,
    [categoryId]
  );

const findSubcategoryById = (id) => queryOne('SELECT * FROM subcategories WHERE id = ?', [id]);

const subcategoryProductCount = (id) =>
  queryOne('SELECT COUNT(*) AS total FROM products WHERE subcategory_id = ?', [id]).then((r) =>
    r ? r.total : 0
  );

const createSubcategory = async (data) => {
  const result = await query('INSERT INTO subcategories (category_id, name, slug, status) VALUES (?,?,?,?)', [
    data.categoryId,
    data.name,
    slugify(data.name),
    data.status === 'inactive' ? 'inactive' : 'active',
  ]);
  return result.insertId;
};

const updateSubcategory = async (id, data) => {
  const current = await findSubcategoryById(id);
  if (!current) return false;
  await query('UPDATE subcategories SET name = ?, slug = ?, status = ? WHERE id = ?', [
    data.name !== undefined ? data.name : current.name,
    data.name !== undefined ? slugify(data.name) : current.slug,
    data.status !== undefined ? data.status : current.status,
    id,
  ]);
  return true;
};

const removeSubcategory = (id) => query('DELETE FROM subcategories WHERE id = ?', [id]);

module.exports = {
  list,
  findById,
  findBySlug,
  create,
  update,
  remove,
  productCount,
  listSubcategories,
  findSubcategoryById,
  subcategoryProductCount,
  createSubcategory,
  updateSubcategory,
  removeSubcategory,
};
