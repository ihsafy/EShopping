'use strict';

const { query, queryOne } = require('../config/db');

/** Product reviews with the author's name and their purchase state. */
const listForProduct = async (productId, { page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;
  const rows = await query(
    `SELECT r.id, r.rating, r.review, r.status, r.created_at, r.order_id,
            u.id AS user_id, u.name AS user_name,
            o.order_number, o.order_status
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN orders o ON o.id = r.order_id
     WHERE r.product_id = ? AND r.status = 'visible'
     ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [productId, Number(limit), Number(offset)]
  );

  const countRow = await queryOne(
    "SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'visible'",
    [productId]
  );

  const breakdownRows = await query(
    "SELECT rating, COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'visible' GROUP BY rating",
    [productId]
  );

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdownRows.forEach((row) => {
    breakdown[row.rating] = Number(row.total);
  });

  const avgRow = await queryOne(
    "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'visible'",
    [productId]
  );

  const total = avgRow ? Number(avgRow.total) : 0;
  return {
    reviews: rows,
    total,
    average: avgRow && avgRow.avg_rating ? Number(Number(avgRow.avg_rating).toFixed(2)) : 0,
    breakdown,
    pagination: { page, limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

/** Finds a non-cancelled order line proving the customer bought the product. */
const findPurchase = (userId, productId) =>
  queryOne(
    `SELECT o.id, o.order_number, o.order_status
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.order_status IN ('confirmed','processing','shipped','delivered')
     ORDER BY o.created_at DESC LIMIT 1`,
    [userId, productId]
  );

const findByUserAndProduct = (userId, productId) =>
  queryOne('SELECT * FROM reviews WHERE user_id = ? AND product_id = ?', [userId, productId]);

const listForUser = (userId) =>
  query(
    `SELECT r.id, r.rating, r.review, r.status, r.created_at, r.order_id,
            p.name AS product_name, p.slug AS product_slug,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
              ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC, r.id DESC`,
    [userId]
  );

const create = async ({ productId, userId, orderId, rating, review }) => {
  const result = await query(
    'INSERT INTO reviews (product_id, user_id, order_id, rating, review) VALUES (?,?,?,?,?)',
    [productId, userId, orderId || null, Number(rating), review || null]
  );
  return result.insertId;
};

const findById = (id) => queryOne('SELECT * FROM reviews WHERE id = ?', [id]);

const update = async (id, { rating, review }) => {
  const current = await findById(id);
  if (!current) return false;
  await query('UPDATE reviews SET rating = ?, review = ? WHERE id = ?', [
    rating !== undefined ? Number(rating) : current.rating,
    review !== undefined ? review : current.review,
    id,
  ]);
  return true;
};

const setStatus = (id, status) => query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);

const remove = (id) => query('DELETE FROM reviews WHERE id = ?', [id]);

/** Admin review moderation list. */
const listAll = async ({ page = 1, limit = 20, search = '', status = '', rating = '' } = {}) => {
  const filters = [];
  const params = [];
  if (status) {
    filters.push('r.status = ?');
    params.push(status);
  }
  if (rating) {
    filters.push('r.rating = ?');
    params.push(Number(rating));
  }
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    filters.push('(p.name LIKE ? OR u.name LIKE ? OR r.review LIKE ?)');
    params.push(like, like, like);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT r.*, u.name AS user_name, u.mobile AS user_mobile, p.name AS product_name, p.slug AS product_slug
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     JOIN products p ON p.id = r.product_id
     ${where}
     ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM reviews r
     JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id ${where}`,
    params
  );

  return { rows, total: countRow ? countRow.total : 0 };
};

module.exports = {
  listForProduct,
  listForUser,
  listAll,
  findPurchase,
  findByUserAndProduct,
  findById,
  create,
  update,
  setStatus,
  remove,
};
