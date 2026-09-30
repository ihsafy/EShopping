'use strict';

const reviewModel = require('../models/review');
const productModel = require('../models/product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const notifications = require('../services/notifications');

/** GET /api/products/:productId/reviews */
const list = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const result = await reviewModel.listForProduct(productId, {
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });
  res.json({ success: true, data: result });
});

/** POST /api/products/:productId/reviews  (verified purchase only) */
const create = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, review } = req.body;

  const product = await productModel.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const purchase = await reviewModel.findPurchase(req.user.id, productId);
  if (!purchase) {
    throw ApiError.forbidden('Only customers who purchased this product can review it');
  }

  const existing = await reviewModel.findByUserAndProduct(req.user.id, productId);
  if (existing) {
    await reviewModel.update(existing.id, { rating, review });
    await productModel.recalculateRating(productId);
    res.json({ success: true, message: 'Your review has been updated' });
    return;
  }

  await reviewModel.create({ productId, userId: req.user.id, orderId: purchase.id, rating, review });
  const stats = await productModel.recalculateRating(productId);

  await notifications.notifyAdmins({
    title: 'New product review',
    message: `${req.user.name} reviewed "${product.name}" (${rating}/5)`,
    type: 'review',
    link: '/admin/reviews',
  });

  res.status(201).json({ success: true, message: 'Thanks for your review!', data: stats });
});

/** PUT /api/reviews/:id - author edits their own review */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await reviewModel.findById(id);
  if (!existing) throw ApiError.notFound('Review not found');
  if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only edit your own review');
  }
  await reviewModel.update(id, { rating: req.body.rating, review: req.body.review });
  await productModel.recalculateRating(existing.product_id);
  res.json({ success: true, message: 'Review updated' });
});

/** DELETE /api/reviews/:id */
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await reviewModel.findById(id);
  if (!existing) throw ApiError.notFound('Review not found');
  if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own review');
  }
  await reviewModel.remove(id);
  await productModel.recalculateRating(existing.product_id);
  res.json({ success: true, message: 'Review deleted' });
});

/** GET /api/reviews/mine */
const mine = asyncHandler(async (req, res) => {
  const reviews = await reviewModel.listForUser(req.user.id);
  res.json({ success: true, data: { reviews } });
});

module.exports = { list, create, update, remove, mine };
