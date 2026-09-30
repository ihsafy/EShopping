'use strict';

const { query, queryOne } = require('../config/db');
const { getNumber } = require('./settings');

/** Creates a notification for a user. Failures never break the main request. */
async function notify(userId, { title, message = null, type = 'general', link = null }) {
  if (!userId) return null;
  try {
    return await queryOne(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type, link]
    );
  } catch (error) {
    console.error('[notify] failed:', error.message);
    return null;
  }
}

/** Sends the same notification to every active admin. */
async function notifyAdmins({ title, message = null, type = 'general', link = null }) {
  const admins = await query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
  await Promise.all(admins.map((admin) => notify(admin.id, { title, message, type, link })));
  return admins.length;
}

/** Notifies a customer about an order status change. */
async function notifyOrderStatus(order, message) {
  const TITLES = {
    confirmed: 'Your order is confirmed',
    processing: 'Your order is being processed',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
  };
  return notify(order.user_id, {
    title: TITLES[order.order_status] || 'Order update',
    message,
    type: 'order',
    link: `/profile/orders/${order.id}`,
  });
}

/** Warns admins about products at or below the configured threshold. */
async function checkLowStock(product) {
  const threshold = await getNumber('low_stock_threshold', 5);
  if (product && product.stock <= threshold) {
    await notifyAdmins({
      title: `Low stock: ${product.name}`,
      message: `Only ${product.stock} unit(s) left in stock.`,
      type: 'low_stock',
      link: '/admin/products',
    });
  }
}

async function list(userId, { limit = 30 } = {}) {
  return query(
    'SELECT id, title, message, type, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
    [userId, Number(limit)]
  );
}

async function unreadCount(userId) {
  const row = await queryOne(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return row ? row.total : 0;
}

async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}

async function markRead(userId, id) {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
}

async function remove(userId, id) {
  await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
}

module.exports = {
  notify,
  notifyAdmins,
  notifyOrderStatus,
  checkLowStock,
  list,
  unreadCount,
  markAllRead,
  markRead,
  remove,
};
