'use strict';

const wishlistModel = require('../models/wishlist');
const cartModel = require('../models/cart');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/** GET /api/wishlist */
const list = asyncHandler(async (req, res) => {
  const products = await wishlistModel.list(req.user.id);
  res.json({ success: true, data: { products, count: products.length } });
});

/** POST /api/wishlist */
const add = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const result = await wishlistModel.add(req.user.id, productId);
  if (result.error) throw ApiError.notFound(result.error);
  res.status(result.added ? 201 : 200).json({
    success: true,
    message: result.added ? 'Added to your wishlist' : 'This product is already in your wishlist',
    data: { id: result.id, added: result.added, count: await wishlistModel.count(req.user.id) },
  });
});

/** DELETE /api/wishlist/:productId */
const remove = asyncHandler(async (req, res) => {
  await wishlistModel.remove(req.user.id, req.params.productId);
  res.json({ success: true, message: 'Removed from your wishlist', data: { count: await wishlistModel.count(req.user.id) } });
});

/** POST /api/wishlist/:productId/move-to-cart */
const moveToCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await wishlistModel.has(req.user.id, productId)
    ? { id: productId }
    : null;
  if (!product) throw ApiError.notFound('That product is not in your wishlist');

  const cart = await cartModel.addItem(req.user.id, productId, 1);
  await wishlistModel.remove(req.user.id, productId);

  res.json({ success: true, message: 'Moved to your cart', data: { cart, count: await wishlistModel.count(req.user.id) } });
});

/** GET /api/wishlist/ids - used to flag hearts in listings */
const ids = asyncHandler(async (req, res) => {
  const list_ = await wishlistModel.ids(req.user.id);
  res.json({ success: true, data: { ids: list_ } });
});

module.exports = { list, add, remove, moveToCart, ids };
