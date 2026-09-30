'use strict';

const productModel = require('../models/product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const reviewModel = require('../models/review');
const wishlistModel = require('../models/wishlist');
const { getSettings, getNumber } = require('../services/settings');
const { query } = require('../config/db');

const parseList = (value) =>
  Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

/** GET /api/products */
const list = asyncHandler(async (req, res) => {
  const { page, limit, search, category, subcategory, brand, minPrice, maxPrice, minDiscount, minRating, availability, sort } = req.query;

  const perPage = await getNumber('per_page', 12);
  const result = await productModel.list({
    page: page || 1,
    limit: limit || perPage,
    search,
    category,
    subcategory,
    brands: parseList(brand),
    minPrice,
    maxPrice,
    minDiscount,
    minRating,
    availability,
    sort,
  });

  res.json({ success: true, data: result });
});

/** GET /api/products/filters - brands, price bounds, category list for the UI */
const filters = asyncHandler(async (req, res) => {
  const [brands, range] = await Promise.all([productModel.distinctBrands(), productModel.priceRange()]);
  res.json({
    success: true,
    data: {
      brands: brands.map((b) => b.brand),
      priceRange: range,
      sorts: [
        { value: 'newest', label: 'Newest' },
        { value: 'price_asc', label: 'Price: low to high' },
        { value: 'price_desc', label: 'Price: high to low' },
        { value: 'popular', label: 'Most popular' },
        { value: 'rating', label: 'Highest rated' },
        { value: 'discount', label: 'Biggest discount' },
      ],
    },
  });
});

/** GET /api/products/:idOrSlug */
const detail = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const product = /^\d+$/.test(idOrSlug)
    ? await productModel.findById(idOrSlug, { includeInactive: false })
    : await productModel.findBySlug(idOrSlug, { includeInactive: false });

  if (!product || product.status !== 'active') throw ApiError.notFound('Product not found');

  const reviews = await reviewModel.listForProduct(product.id, { page: 1, limit: 10 });
  const inWishlist = req.user ? await wishlistModel.has(req.user.id, product.id) : false;

  const related = await productModel.list({
    category: product.category_id || undefined,
    limit: 8,
    sort: 'rating',
  });

  res.json({
    success: true,
    data: {
      product,
      reviews,
      inWishlist,
      related: related.products.filter((p) => p.id !== product.id).slice(0, 4),
    },
  });
});

/** GET /api/products/:idOrSlug/similar */
const similar = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const product = /^\d+$/.test(idOrSlug)
    ? await productModel.findById(idOrSlug)
    : await productModel.findBySlug(idOrSlug);
  if (!product) throw ApiError.notFound('Product not found');

  const result = await productModel.list({
    category: product.category_id,
    limit: 9,
    sort: 'popular',
  });
  res.json({ success: true, data: { products: result.products.filter((p) => p.id !== product.id).slice(0, 8) } });
});

/** GET /api/products/:idOrSlug/can-review */
const canReview = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const product = /^\d+$/.test(idOrSlug)
    ? await productModel.findById(idOrSlug)
    : await productModel.findBySlug(idOrSlug);
  if (!product) throw ApiError.notFound('Product not found');

  const purchase = await reviewModel.findPurchase(req.user.id, product.id);
  const existing = await reviewModel.findByUserAndProduct(req.user.id, product.id);
  res.json({
    success: true,
    data: {
      purchased: Boolean(purchase),
      purchase,
      alreadyReviewed: Boolean(existing),
      review: existing || null,
    },
  });
});

/** GET /api/products/suggest?q= */
const suggest = asyncHandler(async (req, res) => {
  const results = await productModel.suggest(req.query.q, 8);
  res.json({ success: true, data: { results } });
});

/** GET /api/products/home - every section the homepage needs, in one call */
const home = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const [featuredLimit, bestLimit, newLimit] = await Promise.all([
    getNumber('featured_limit', 8),
    getNumber('best_seller_limit', 8),
    getNumber('new_arrival_limit', 8),
  ]);

  const [featured, bestSellers, newArrivals, discounted, topRated] = await Promise.all([
    productModel.list({ featured: true, limit: featuredLimit }),
    productModel.list({ bestSeller: true, limit: bestLimit, sort: 'popular' }),
    productModel.list({ newArrival: true, limit: newLimit }),
    productModel.list({ minDiscount: 10, limit: featuredLimit, sort: 'discount' }),
    productModel.list({ limit: featuredLimit, sort: 'rating' }),
  ]);

  res.json({
    success: true,
    data: {
      storeName: settings.store_name,
      sections: {
        featured: featured.products,
        bestSellers: bestSellers.products,
        newArrivals: newArrivals.products,
        discounted: discounted.products,
        topRated: topRated.products,
      },
    },
  });
});

/** GET /api/products/offers */
const offers = asyncHandler(async (req, res) => {
  const result = await productModel.list({ minDiscount: 1, limit: 12, sort: 'discount' });
  const stats = await query(
    `SELECT COUNT(*) AS total, MIN(discount) AS max_discount FROM products WHERE status = 'active' AND discount > 0`
  );
  res.json({ success: true, data: { ...result, summary: stats[0] } });
});

module.exports = { list, detail, filters, suggest, similar, canReview, home, offers };
