'use strict';

const express = require('express');
const productController = require('../controllers/product.controller');
const catalogController = require('../controllers/catalog.controller');
const reviewController = require('../controllers/review.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Static segments must be declared before the :idOrSlug wildcard.
router.get('/products/filters', productController.filters);
router.get('/products/suggest', productController.suggest);
router.get('/products/home', productController.home);
router.get('/products/offers', productController.offers);
router.get('/products/:idOrSlug/can-review', protect, productController.canReview);
router.get('/products/:idOrSlug/similar', productController.similar);
router.get('/products/:idOrSlug', optionalAuth, productController.detail);
router.get('/products', productController.list);

router.get('/categories', catalogController.list);
router.get('/categories/:slug/products', catalogController.products);
router.get('/categories/:slug/subcategories', catalogController.subcategories);
router.get('/categories/:slug', optionalAuth, catalogController.detail);

router.get('/banners', catalogController.banners);
router.get('/store', catalogController.store);

router.post(
  '/coupons/validate',
  optionalAuth,
  validate({ body: { code: [['required'], ['max', 40]], subtotal: [['required'], ['numeric'], ['minValue', 0]] } }),
  catalogController.validateCoupon
);

router.get('/reviews/mine', protect, reviewController.mine);
router.get('/products/:productId/reviews', reviewController.list);
router.post(
  '/products/:productId/reviews',
  protect,
  validate({
    body: {
      rating: [['required'], ['integer'], ['in', [1, 2, 3, 4, 5]]],
      review: [['max', 2000]],
    },
  }),
  reviewController.create
);
router.put(
  '/reviews/:id',
  protect,
  validate({ body: { rating: [['integer'], ['in', [1, 2, 3, 4, 5]]], review: [['max', 2000]] } }),
  reviewController.update
);
router.delete('/reviews/:id', protect, reviewController.remove);

module.exports = router;
