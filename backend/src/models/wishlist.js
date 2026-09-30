'use strict';

const { query, queryOne } = require('../config/db');

const list = (userId) =>
  query(
    `SELECT w.id AS wishlist_id, w.created_at AS added_at, p.*,
            c.name AS category_name,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
              ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image
     FROM wishlists w
     JOIN products p ON p.id = w.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC, w.id DESC`,
    [userId]
  );

const ids = (userId) =>
  query('SELECT product_id FROM wishlists WHERE user_id = ?', [userId]).then((rows) =>
    rows.map((row) => row.product_id)
  );

const has = (userId, productId) =>
  queryOne('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]).then(
    (row) => Boolean(row)
  );

/** Adds to the wishlist. Returns false when it was already there. */
const add = async (userId, productId) => {
  const product = await queryOne('SELECT id FROM products WHERE id = ?', [productId]);
  if (!product) return { error: 'Product not found' };
  const existing = await queryOne('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [
    userId,
    productId,
  ]);
  if (existing) return { id: existing.id, added: false };
  const result = await query('INSERT INTO wishlists (user_id, product_id) VALUES (?,?)', [userId, productId]);
  return { id: result.insertId, added: true };
};

const remove = (userId, productId) =>
  query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);

const removeByWishlistId = (userId, id) =>
  query('DELETE FROM wishlists WHERE user_id = ? AND id = ?', [userId, id]);

const count = (userId) =>
  queryOne('SELECT COUNT(*) AS total FROM wishlists WHERE user_id = ?', [userId]).then((r) => (r ? r.total : 0));

module.exports = { list, ids, has, add, remove, removeByWishlistId, count };
