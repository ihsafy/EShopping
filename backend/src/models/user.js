'use strict';

const { query, queryOne } = require('../config/db');

/** Columns that are safe to expose to any client. Never includes password_hash. */
const PUBLIC_COLUMNS = `
  id, name, mobile, email, role, status, address, city, area, avatar,
  last_login_at, created_at, updated_at
`;

const ADMIN_COLUMNS = `
  id, name, mobile, email, role, status, address, city, area, avatar,
  last_login_at, created_at, updated_at
`;

const findById = (id) => queryOne(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);

const findByMobile = (mobile) =>
  queryOne('SELECT * FROM users WHERE mobile = ? LIMIT 1', [mobile]);

const findByEmailOrMobile = (identifier) =>
  queryOne('SELECT * FROM users WHERE (email = ? OR mobile = ?) AND role = ? LIMIT 1', [
    String(identifier).trim().toLowerCase(),
    String(identifier).trim(),
    'admin',
  ]);

const emailExists = async (email, ignoreId = null) => {
  const row = await queryOne(
    `SELECT id FROM users WHERE email = ? ${ignoreId ? 'AND id <> ?' : ''} LIMIT 1`,
    ignoreId ? [email, ignoreId] : [email]
  );
  return Boolean(row);
};

const mobileExists = async (mobile, ignoreId = null) => {
  const row = await queryOne(
    `SELECT id FROM users WHERE mobile = ? ${ignoreId ? 'AND id <> ?' : ''} LIMIT 1`,
    ignoreId ? [mobile, ignoreId] : [mobile]
  );
  return Boolean(row);
};

const create = async (data) => {
  const result = await query(
    `INSERT INTO users (name, mobile, email, password_hash, role, status, address, city, area)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      data.name,
      data.mobile,
      data.email || null,
      data.passwordHash,
      data.role || 'customer',
      data.status || 'active',
      data.address || null,
      data.city || null,
      data.area || null,
    ]
  );
  return result.insertId;
};

const update = async (id, patch) => {
  const fields = [];
  const params = [];
  const allowed = ['name', 'email', 'address', 'city', 'area', 'avatar', 'status', 'password_hash', 'role'];
  Object.keys(patch).forEach((key) => {
    const column = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (allowed.includes(column) && patch[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(patch[key]);
    }
  });
  if (!fields.length) return;
  params.push(id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
};

const touchLogin = (id) => query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);

/** Admin customer list with per-customer order aggregates. */
const listCustomers = async ({ page = 1, limit = 20, search = '', status = '', role = 'customer' } = {}) => {
  const offset = (page - 1) * limit;
  const filters = ['u.role = ?'];
  const params = [role];

  if (status) {
    filters.push('u.status = ?');
    params.push(status);
  }
  if (search) {
    filters.push('(u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)');
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like, like);
  }
  const where = `WHERE ${filters.join(' AND ')}`;

  const rows = await query(
    `SELECT u.id, u.name, u.mobile, u.email, u.status, u.created_at, u.last_login_at,
            COUNT(DISTINCT o.id) AS total_orders,
            COALESCE(SUM(CASE WHEN o.order_status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS total_spending
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    params
  );

  return { rows, total: countRow ? countRow.total : 0 };
};

const countCustomers = () =>
  queryOne("SELECT COUNT(*) AS total FROM users WHERE role = 'customer'");

const remove = (id) => query('DELETE FROM users WHERE id = ?', [id]);

module.exports = {
  PUBLIC_COLUMNS,
  ADMIN_COLUMNS,
  findById,
  findByMobile,
  findByEmailOrMobile,
  emailExists,
  mobileExists,
  create,
  update,
  touchLogin,
  listCustomers,
  countCustomers,
  remove,
};
