'use strict';

const { query, queryOne } = require('../config/db');
const { money } = require('../utils/helpers');

const list = async ({ onlyActive = false } = {}) => {
  const where = onlyActive ? "WHERE status = 'active'" : '';
  return query(`SELECT * FROM coupons ${where} ORDER BY created_at DESC, id DESC`);
};

const findById = (id) => queryOne('SELECT * FROM coupons WHERE id = ?', [id]);

const findByCode = (code) =>
  queryOne('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) LIMIT 1', [String(code || '').trim()]);

const create = async (data) => {
  const result = await query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, minimum_order, maximum_discount,
       start_date, expiry_date, usage_limit, per_user_limit, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      String(data.code).trim().toUpperCase(),
      data.description || null,
      data.discountType === 'fixed' ? 'fixed' : 'percent',
      money(data.discountValue),
      money(data.minimumOrder || 0),
      data.maximumDiscount ? money(data.maximumDiscount) : null,
      data.startDate || null,
      data.expiryDate || null,
      data.usageLimit ? Number(data.usageLimit) : null,
      Number(data.perUserLimit) || 1,
      data.status === 'inactive' ? 'inactive' : 'active',
    ]
  );
  return result.insertId;
};

const update = async (id, data) => {
  const current = await findById(id);
  if (!current) return false;
  await query(
    `UPDATE coupons SET code = ?, description = ?, discount_type = ?, discount_value = ?,
      minimum_order = ?, maximum_discount = ?, start_date = ?, expiry_date = ?,
      usage_limit = ?, per_user_limit = ?, status = ? WHERE id = ?`,
    [
      data.code !== undefined ? String(data.code).trim().toUpperCase() : current.code,
      data.description !== undefined ? data.description : current.description,
      data.discountType !== undefined ? data.discountType : current.discount_type,
      data.discountValue !== undefined ? money(data.discountValue) : current.discount_value,
      data.minimumOrder !== undefined ? money(data.minimumOrder) : current.minimum_order,
      data.maximumDiscount !== undefined ? (data.maximumDiscount ? money(data.maximumDiscount) : null) : current.maximum_discount,
      data.startDate !== undefined ? data.startDate : current.start_date,
      data.expiryDate !== undefined ? data.expiryDate : current.expiry_date,
      data.usageLimit !== undefined ? (data.usageLimit ? Number(data.usageLimit) : null) : current.usage_limit,
      data.perUserLimit !== undefined ? Number(data.perUserLimit) : current.per_user_limit,
      data.status !== undefined ? data.status : current.status,
      id,
    ]
  );
  return true;
};

const remove = (id) => query('DELETE FROM coupons WHERE id = ?', [id]);

const usageCountForUser = (couponId, userId) =>
  queryOne('SELECT COUNT(*) AS total FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [couponId, userId]).then(
    (r) => (r ? r.total : 0)
  );

/**
 * Validates a coupon for a given subtotal and user.
 * Returns { coupon, discount } or throws a client-safe error.
 */
const validate = async (code, subtotal, userId = null) => {
  const fail = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  };

  const coupon = await findByCode(code);
  if (!coupon) fail('That coupon code is not valid');
  if (coupon.status !== 'active') fail('This coupon is no longer active');

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) fail('This coupon is not active yet');
  if (coupon.expiry_date && new Date(coupon.expiry_date) < now) fail('This coupon has expired');
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    fail('This coupon has reached its usage limit');
  }

  const amount = money(subtotal);
  if (amount < money(coupon.minimum_order)) {
    fail(`This coupon requires a minimum order of ৳${money(coupon.minimum_order).toFixed(0)}`);
  }

  if (userId && coupon.per_user_limit) {
    const used = await usageCountForUser(coupon.id, userId);
    if (used >= coupon.per_user_limit) fail('You have already used this coupon');
  }

  let discount =
    coupon.discount_type === 'percent'
      ? money((amount * Number(coupon.discount_value)) / 100)
      : money(coupon.discount_value);

  if (coupon.maximum_discount) discount = Math.min(discount, money(coupon.maximum_discount));
  discount = money(Math.min(discount, amount));

  return { coupon, discount };
};

module.exports = { list, findById, findByCode, create, update, remove, validate, usageCountForUser };
