'use strict';

const { query, queryOne, transaction } = require('../config/db');
const { money, buildOrderNumber } = require('../utils/helpers');

const ORDER_SELECT = `
  SELECT o.*, u.name AS account_name
  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
`;

const ITEMS_SELECT = `
  SELECT oi.*, p.slug AS product_slug, p.stock AS current_stock
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
`;

const itemsForOrder = async (orderId) =>
  query(`${ITEMS_SELECT} WHERE oi.order_id = ? ORDER BY oi.id ASC`, [orderId]);

const findById = async (id) => {
  const order = await queryOne(`${ORDER_SELECT} WHERE o.id = ?`, [id]);
  if (!order) return null;
  return { ...order, items: await itemsForOrder(id) };
};

const findByNumber = async (orderNumber) => {
  const order = await queryOne(`${ORDER_SELECT} WHERE o.order_number = ?`, [orderNumber]);
  if (!order) return null;
  return { ...order, items: await itemsForOrder(order.id) };
};

const list = async ({ page = 1, limit = 20, status = '', userId = null, search = '', from = null, to = null } = {}) => {
  const filters = [];
  const params = [];

  if (status) {
    filters.push('o.order_status = ?');
    params.push(status);
  }
  if (userId) {
    filters.push('o.user_id = ?');
    params.push(userId);
  }
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    filters.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
    params.push(like, like, like);
  }
  if (from) {
    filters.push('o.created_at >= ?');
    params.push(from);
  }
  if (to) {
    filters.push('o.created_at <= ?');
    params.push(to);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = await query(
    `${ORDER_SELECT} ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const countRow = await queryOne(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);

  const total = countRow ? countRow.total : 0;
  return {
    orders: rows,
    pagination: {
      page,
      limit: Number(limit),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/**
 * Creates an order from a validated set of lines.
 * The whole thing (stock decrement + order + items + coupon usage) is atomic.
 */
const create = async ({
  customer,
  items,
  subtotal,
  discount,
  deliveryFee,
  coupon,
  notes,
  paymentMethod = 'cod',
}) => {
  const total = money(subtotal - discount + deliveryFee);

  return transaction(async (connection) => {
    // Re-verify stock inside the transaction to prevent overselling.
    for (const item of items) {
      const [rows] = await connection.execute(
        'SELECT name, stock, status, sale_price FROM products WHERE id = ? FOR UPDATE',
        [item.productId]
      );
      const product = rows[0];
      if (!product) {
        const error = new Error('A product in your order no longer exists');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }
      if (product.status !== 'active') {
        const error = new Error(`"${product.name}" is no longer available`);
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }
      if (product.stock < item.quantity) {
        const error = new Error(`Only ${product.stock} unit(s) of "${product.name}" left in stock`);
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (order_number, user_id, customer_name, customer_phone, customer_email, customer_address,
         city, area, delivery_zone, notes, subtotal, discount, coupon_id, coupon_code,
         delivery_fee, total, payment_method, payment_status, order_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'PENDING',
        customer.userId || null,
        customer.name,
        customer.phone,
        customer.email || null,
        customer.address,
        customer.city,
        customer.area,
        customer.deliveryZone || 'inside_dhaka',
        notes || null,
        money(subtotal),
        money(discount),
        coupon ? coupon.id : null,
        coupon ? coupon.code : null,
        money(deliveryFee),
        total,
        paymentMethod || 'cod',
        'pending',
        'pending',
      ]
    );

    const orderId = orderResult.insertId;
    const orderNumber = buildOrderNumber(orderId);
    await connection.execute('UPDATE orders SET order_number = ? WHERE id = ?', [orderNumber, orderId]);

    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items
          (order_id, product_id, category_id, product_name, product_sku, product_image,
           quantity, original_price, discount, unit_price, total)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderId,
          item.productId,
          item.categoryId || null,
          item.name,
          item.sku || null,
          item.image || null,
          item.quantity,
          money(item.originalPrice),
          money(item.discount || 0),
          money(item.unitPrice),
          money(item.unitPrice * item.quantity),
        ]
      );
      await connection.execute('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [
        item.quantity,
        item.productId,
      ]);
    }

    if (coupon) {
      await connection.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
      await connection.execute(
        'INSERT INTO coupon_usage (coupon_id, user_id, order_id, amount) VALUES (?,?,?,?)',
        [coupon.id, customer.userId || null, orderId, money(discount)]
      );
    }

    const [[order]] = await connection.execute(`${ORDER_SELECT} WHERE o.id = ?`, [orderId]);
    return { ...order, items: await itemsForOrder(orderId) };
  });
};

const updateStatus = async (id, status, note = null) => {
  await query(
    "UPDATE orders SET order_status = ?, status_note = ?, payment_status = IF(? = 'delivered' AND payment_method = 'cod', 'paid', payment_status) WHERE id = ?",
    [status, note, status, id]
  );
  return findById(id);
};

const setCancelRequested = async (id, requested) => {
  await query('UPDATE orders SET cancel_requested = ? WHERE id = ?', [requested ? 1 : 0, id]);
};

/** Restores stock for every item of a cancelled order. */
const restoreStock = async (connection, orderId) => {
  const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [
    orderId,
  ]);
  for (const item of items) {
    if (!item.product_id) continue;
    await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
  }
};

const cancelOrder = async (id) => {
  return transaction(async (connection) => {
    const [rows] = await connection.execute('SELECT order_status FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) return null;
    await connection.execute("UPDATE orders SET order_status = 'cancelled', cancel_requested = 0 WHERE id = ?", [id]);
    await restoreStock(connection, id);
    const [[order]] = await connection.execute(`${ORDER_SELECT} WHERE o.id = ?`, [id]);
    return { ...order, items: await itemsForOrder(id) };
  });
};

const countByStatus = () =>
  query(
    `SELECT order_status, COUNT(*) AS total FROM orders GROUP BY order_status`
  ).then((rows) => rows.reduce((acc, row) => ({ ...acc, [row.order_status]: Number(row.total) }), {}));

module.exports = {
  findById,
  findByNumber,
  list,
  create,
  updateStatus,
  setCancelRequested,
  cancelOrder,
  countByStatus,
  itemsForOrder,
};
