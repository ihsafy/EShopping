'use strict';

const { query, queryOne, transaction } = require('../config/db');
const { money } = require('../utils/helpers');
const { getNumber } = require('../services/settings');

/** Returns the user's cart id, creating it on first use. */
async function ensureCart(userId, connection = null) {
  // `connection.execute` resolves to [rows, fields] while the shared `query`
  // helper resolves straight to rows, so normalise before destructuring.
  const run = async (sql, params) => {
    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows;
    }
    return query(sql, params);
  };

  const rows = await run('SELECT id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
  if (rows[0]) return rows[0].id;
  const result = await run('INSERT INTO carts (user_id) VALUES (?)', [userId]);
  return result.insertId;
}

const CART_ITEMS_SELECT = `
  SELECT ci.id, ci.quantity, ci.product_id,
         p.name, p.slug, p.sku, p.stock, p.status, p.original_price, p.discount,
         p.sale_price, p.featured, p.best_seller, p.new_arrival,
         c.name AS category_name,
         (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id
           ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  LEFT JOIN categories c ON c.id = p.category_id
`;

/** Full cart with per-line and cart-level totals. */
async function getCart(userId) {
  const cartId = await ensureCart(userId);
  const items = await query(`${CART_ITEMS_SELECT} WHERE ci.cart_id = ? ORDER BY ci.id ASC`, [cartId]);

  const lines = items.map((item) => {
    const unitPrice = money(item.sale_price);
    const quantity = Math.max(1, Number(item.quantity));
    return {
      id: item.id,
      productId: item.product_id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      image: item.image,
      categoryName: item.category_name,
      originalPrice: money(item.original_price),
      discount: money(item.discount),
      unitPrice,
      quantity,
      stock: item.stock,
      inStock: item.stock > 0 && item.status === 'active',
      lineTotal: money(unitPrice * quantity),
    };
  });

  const subtotal = money(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const originalTotal = money(lines.reduce((sum, line) => sum + line.originalPrice * line.quantity, 0));
  const hasStockIssue = lines.some((line) => !line.inStock || line.quantity > line.stock);

  return {
    id: cartId,
    items: lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    originalTotal,
    savings: money(originalTotal - subtotal),
    hasStockIssue,
  };
}

/** Adds a product, or increases the quantity when it is already in the cart. */
async function addItem(userId, productId, quantity = 1) {
  const product = await queryOne(
    "SELECT id, name, stock, status FROM products WHERE id = ? LIMIT 1",
    [productId]
  );
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  if (product.status !== 'active') {
    const error = new Error(`"${product.name}" is no longer available`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }
  if (product.stock <= 0) {
    const error = new Error(`"${product.name}" is out of stock`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  const cartId = await ensureCart(userId);
  const existing = await queryOne('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [
    cartId,
    productId,
  ]);

  const desired = (existing ? existing.quantity : 0) + Math.max(1, Number(quantity) || 1);
  if (desired > product.stock) {
    const error = new Error(`Only ${product.stock} unit(s) of "${product.name}" available`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  if (existing) {
    await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [desired, existing.id]);
  } else {
    await query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?,?,?)', [
      cartId,
      productId,
      Math.max(1, Number(quantity) || 1),
    ]);
  }
  return getCart(userId);
}

/** Sets an absolute quantity; quantity 0 removes the line. */
async function updateItem(userId, itemId, quantity) {
  const cartId = await ensureCart(userId);
  const item = await queryOne(
    `SELECT ci.id, ci.product_id, p.stock, p.name
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.id = ? AND ci.cart_id = ? LIMIT 1`,
    [itemId, cartId]
  );
  if (!item) {
    const error = new Error('Cart item not found');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const next = Number(quantity);
  if (!Number.isFinite(next) || next <= 0) {
    await query('DELETE FROM cart_items WHERE id = ?', [itemId]);
    return getCart(userId);
  }

  if (next > item.stock) {
    const error = new Error(`Only ${item.stock} unit(s) of "${item.name}" available`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [next, itemId]);
  return getCart(userId);
}

async function removeItem(userId, itemId) {
  const cartId = await ensureCart(userId);
  await query('DELETE FROM cart_items WHERE cart_id = ? AND id = ?', [cartId, itemId]);
  return getCart(userId);
}

const clearCart = async (userId) => {
  const cartId = await ensureCart(userId);
  await query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
  return getCart(userId);
};

/** Resolves the cart lines into priced order lines and empties the cart. */
async function checkout(userId) {
  const cart = await getCart(userId);
  if (!cart.items.length) {
    const error = new Error('Your cart is empty');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }
  if (cart.hasStockIssue) {
    const error = new Error('Some items in your cart are no longer available in that quantity');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }
  return cart;
}

const clearInTransaction = async (connection, userId) => {
  const cartId = await ensureCart(userId, connection);
  await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
};

/** Delivery fee depends on the zone and the free-delivery threshold. */
async function deliveryFee(zone) {
  const inside = await getNumber('inside_dhaka_fee', 60);
  const outside = await getNumber('outside_dhaka_fee', 120);
  const freeOver = await getNumber('free_delivery_over', 0);
  const fee = zone === 'outside_dhaka' ? outside : inside;
  return { fee: money(fee), freeOver: money(freeOver) };
}

module.exports = {
  ensureCart,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  checkout,
  clearInTransaction,
  deliveryFee,
};
