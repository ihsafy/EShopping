'use strict';

const { query, queryOne, transaction } = require('../config/db');
const productModel = require('../models/product');
const cartModel = require('../models/cart');
const couponModel = require('../models/coupon');
const orderModel = require('../models/order');
const settings = require('../services/settings');
const notifications = require('../services/notifications');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { money } = require('../utils/helpers');

/**
 * Resolves requested product lines into fully priced order lines.
 * Prices always come from the database, never from the client.
 */
async function resolveLines(rawItems) {
  const lines = [];
  const seen = new Set();

  for (const raw of rawItems) {
    const productId = Number(raw.productId ?? raw.id);
    const quantity = Math.max(1, Number(raw.quantity) || 1);
    if (!productId) continue;
    if (seen.has(productId)) throw ApiError.badRequest('The same product was added twice');
    seen.add(productId);

    const product = await queryOne(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`,
      [productId]
    );
    if (!product || product.status !== 'active') {
      throw ApiError.badRequest('One of the selected products is no longer available');
    }
    if (product.stock <= 0) throw ApiError.badRequest(`"${product.name}" is out of stock`);
    if (quantity > product.stock) {
      throw ApiError.badRequest(`Only ${product.stock} unit(s) of "${product.name}" are available`);
    }

    const image = await queryOne(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
      [productId]
    );

    lines.push({
      productId: product.id,
      categoryId: product.category_id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      image: image ? image.image_url : null,
      quantity,
      originalPrice: money(product.original_price),
      discount: money(product.discount),
      unitPrice: money(product.sale_price),
      lineTotal: money(Number(product.sale_price) * quantity),
    });
  }

  if (!lines.length) throw ApiError.badRequest('Your cart is empty');
  return lines;
}

/** Applies coupon + delivery rules to a set of lines. */
async function computeTotals(lines, { couponCode = null, userId = null, deliveryZone = 'inside_dhaka' } = {}) {
  const subtotal = money(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const originalTotal = money(lines.reduce((sum, line) => sum + line.originalPrice * line.quantity, 0));

  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const result = await couponModel.validate(couponCode, subtotal, userId);
    coupon = { id: result.coupon.id, code: result.coupon.code };
    discount = result.discount;
  }

  const { fee, freeOver } = await cartModel.deliveryFee(deliveryZone);
  const deliveryFee = freeOver > 0 && subtotal - discount >= freeOver ? 0 : money(fee);
  const total = money(subtotal - discount + deliveryFee);

  return {
    items: lines,
    subtotal,
    originalTotal,
    productSavings: money(originalTotal - subtotal),
    discount,
    coupon,
    deliveryZone,
    deliveryFee,
    freeDeliveryOver: freeOver,
    total,
  };
}

/** POST /api/checkout/preview */
const preview = asyncHandler(async (req, res) => {
  const { items, couponCode, deliveryZone = 'inside_dhaka' } = req.body;

  let rawItems = items;
  if ((!rawItems || !rawItems.length) && req.user) {
    const cart = await cartModel.getCart(req.user.id);
    rawItems = cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  }
  if (!rawItems || !rawItems.length) throw ApiError.badRequest('There is nothing to check out');

  const lines = await resolveLines(rawItems);
  const totals = await computeTotals(lines, {
    couponCode,
    deliveryZone,
    userId: req.user ? req.user.id : null,
  });

  res.json({ success: true, data: totals });
});

/**
 * Payment methods the store is configured for. This is a manual/dummy setup
 * (no gateway): the customer picks a method at checkout and the value is
 * stored on the order, which is what the admin screens and order pages show.
 */
const PAYMENT_METHODS = ['cod'];
const DEFAULT_PAYMENT_METHOD = 'cod';

/** POST /api/orders - works for guests and signed-in customers alike. */
const create = asyncHandler(async (req, res) => {
  const { name, phone, email, address, city, area, deliveryZone = 'inside_dhaka', couponCode, notes, items, paymentMethod } =
    req.body;

  let rawItems = items;
  if ((!rawItems || !rawItems.length) && req.user) {
    const cart = await cartModel.getCart(req.user.id);
    rawItems = cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  }
  if (!rawItems || !rawItems.length) throw ApiError.badRequest('There is nothing to order');

  const lines = await resolveLines(rawItems);
  const totals = await computeTotals(lines, {
    couponCode,
    deliveryZone,
    userId: req.user ? req.user.id : null,
  });

  const order = await orderModel.create({
    customer: {
      userId: req.user ? req.user.id : null,
      name,
      phone,
      email,
      address,
      city,
      area,
      deliveryZone,
    },
    items: lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    deliveryFee: totals.deliveryFee,
    coupon: totals.coupon,
    notes,
    paymentMethod: PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : DEFAULT_PAYMENT_METHOD,
  });

  if (req.user) await cartModel.clearCart(req.user.id);

  await notifications.notifyAdmins({
    title: 'New order received',
    message: `${order.order_number} from ${name} — ৳${Number(order.total || 0).toFixed(2)}`,
    type: 'order',
    link: `/admin/orders/${order.id}`,
  });

  if (req.user) {
    await notifications.notify(req.user.id, {
      title: 'Order placed successfully',
      message: `We received your order ${order.order_number}. We will call you to confirm delivery.`,
      type: 'order',
      link: '/profile/orders',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: { order },
  });
});

/** GET /api/orders - the signed-in customer's own orders */
const mine = asyncHandler(async (req, res) => {
  const result = await orderModel.list({ ...req.query, userId: req.user.id, limit: req.query.limit || 10 });
  res.json({ success: true, data: result });
});

/** GET /api/orders/:id - own order, or any order number as a guest */
const detail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = /^\d+$/.test(id) ? await orderModel.findById(id) : await orderModel.findByNumber(id);
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = req.user && order.user_id === req.user.id;
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    // Guests may look up their own order by number, which acts as a secret.
    const { orderNumber, phone } = req.query;
    if (String(orderNumber || '').toUpperCase() !== order.order_number || String(phone || '') !== order.customer_phone) {
      throw ApiError.forbidden('You do not have access to this order');
    }
  }

  res.json({ success: true, data: { order } });
});

/** POST /api/orders/:id/cancel - customer cancels while still pending */
const cancel = asyncHandler(async (req, res) => {
  const allowCancel = (await settings.getSetting('allow_cancel', '1')) === '1';
  if (!allowCancel) throw ApiError.forbidden('Online cancellation is disabled. Please contact support.');

  const order = await orderModel.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = req.user && order.user_id === req.user.id;
  if (!isOwner) throw ApiError.forbidden('You can only cancel your own orders');
  if (order.order_status !== 'pending') {
    throw ApiError.badRequest('Only pending orders can be cancelled. Please contact support.');
  }

  const cancelled = await orderModel.cancelOrder(order.id);

  await notifications.notifyAdmins({
    title: 'Order cancelled by customer',
    message: `${order.order_number} was cancelled by ${order.customer_name}.`,
    type: 'order',
    link: `/admin/orders/${order.id}`,
  });

  res.json({ success: true, message: 'Your order has been cancelled', data: { order: cancelled } });
});

module.exports = { preview, create, mine, detail, cancel, resolveLines, computeTotals };
