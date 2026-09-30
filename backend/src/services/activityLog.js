'use strict';

const { query, queryOne } = require('../config/db');

/** Records an admin action in the activity log. Never throws. */
async function log(admin, action, description) {
  try {
    return await queryOne(
      'INSERT INTO admin_activity_logs (admin_id, admin_name, action, description) VALUES (?, ?, ?, ?)',
      [admin ? admin.id : null, admin ? admin.name : 'System', action, String(description).slice(0, 500)]
    );
  } catch (error) {
    console.error('[activity-log] failed:', error.message);
    return null;
  }
}

async function list({ page = 1, limit = 25, action = null, search = '' } = {}) {
  const offset = (page - 1) * limit;
  const filters = [];
  const params = [];

  if (action) {
    filters.push('action = ?');
    params.push(action);
  }
  if (search) {
    filters.push('(description LIKE ? OR admin_name LIKE ? OR action LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await query(
    `SELECT id, admin_id, admin_name, action, description, created_at
     FROM admin_activity_logs ${where}
     ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM admin_activity_logs ${where}`,
    params
  );

  return { rows, total: countRow ? countRow.total : 0 };
}

module.exports = { log, list };
