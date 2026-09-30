'use strict';

const cartModel = require('../models/cart');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/** GET /api/cart */
const get = asyncHandler(async (req, res) => {
  const cart = await cartModel.getCart(req.user.id);
  res.json({ success: true, data: cart });
});

/** POST /api/cart */
const add = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const cart = await cartModel.addItem(req.user.id, productId, quantity);
  res.status(201).json({ success: true, message: 'Added to your cart', data: cart });
});

/** PUT /api/cart/:itemId */
const update = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const cart = await cartModel.updateItem(req.user.id, itemId, req.body.quantity);
  res.json({ success: true, message: 'Cart updated', data: cart });
});

/** DELETE /api/cart/:itemId */
const remove = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const cart = await cartModel.removeItem(req.user.id, itemId);
  res.json({ success: true, message: 'Item removed from your cart', data: cart });
});

/** DELETE /api/cart */
const clear = asyncHandler(async (req, res) => {
  const cart = await cartModel.clearCart(req.user.id);
  res.json({ success: true, message: 'Cart cleared', data: cart });
});

/** GET /api/cart/summary - totals including delivery, used by the cart page */
const summary = asyncHandler(async (req, res) => {
  const cart = await cartModel.getCart(req.user.id);
  const inside = await cartModel.deliveryFee('inside_dhaka');
  const outside = await cartModel.deliveryFee('outside_dhaka');
  res.json({ success: true, data: { cart, delivery: { inside, outside } } });
});

/** POST /api/cart/merge - merges a guest (localStorage) cart after login */
const merge = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity) || 1;
    if (!productId || quantity < 1) continue;
    try {
      // Stock limits are enforced by addItem; a merge should never fail a login.
      await cartModel.addItem(req.user.id, productId, quantity);
    } catch (error) {
      /* skip items that became unavailable */
    }
  }
  const cart = await cartModel.getCart(req.user.id);
  res.json({ success: true, message: 'Cart updated', data: cart });
});

module.exports = { get, add, update, remove, clear, summary, merge, ApiError };
