'use strict';

const categoryModel = require('../models/category');
const productModel = require('../models/product');
const bannerModel = require('../models/banner');
const couponModel = require('../models/coupon');
const { getSettings } = require('../services/settings');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/** GET /api/categories */
const list = asyncHandler(async (req, res) => {
  const includeInactive = req.user && req.user.role === 'admin';
  const categories = await categoryModel.list({ includeInactive });
  res.json({ success: true, data: { categories } });
});

/** GET /api/categories/:slug */
const detail = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await categoryModel.findBySlug(slug);
  if (!category || (category.status !== 'active' && !(req.user && req.user.role === 'admin'))) {
    throw ApiError.notFound('Category not found');
  }
  const subcategories = await categoryModel.listSubcategories(category.id);
  res.json({ success: true, data: { category, subcategories } });
});

/** GET /api/categories/:slug/products */
const products = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await categoryModel.findBySlug(slug);
  if (!category) throw ApiError.notFound('Category not found');
  const result = await productModel.list({ ...req.query, category: slug });
  res.json({ success: true, data: result });
});

/** GET /api/categories/:slug/subcategories */
const subcategories = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await categoryModel.findBySlug(slug);
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, data: { subcategories: await categoryModel.listSubcategories(category.id) } });
});

/** GET /api/banners - active banners for the storefront carousel */
const banners = asyncHandler(async (req, res) => {
  const rows = await bannerModel.list({ onlyActive: true });
  res.json({ success: true, data: { banners: rows } });
});

/** GET /api/store - public store settings for header/footer */
const store = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  res.json({
    success: true,
    data: {
      storeName: settings.store_name,
      tagline: settings.store_tagline,
      logo: settings.store_logo,
      favicon: settings.store_favicon,
      phone: settings.store_phone,
      email: settings.store_email,
      address: settings.store_address,
      insideDhakaFee: Number(settings.inside_dhaka_fee),
      outsideDhakaFee: Number(settings.outside_dhaka_fee),
      freeDeliveryOver: Number(settings.free_delivery_over),
      allowCancel: settings.allow_cancel === '1',
    },
  });
});

/**
 * GET /api/promotions
 * Public, currently-runnable coupon codes used by the storefront notice bar.
 * Only safe fields are exposed - never usage counters or internal ids.
 */
const promotions = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await couponModel.list({ onlyActive: true });
  const usable = coupons
    .filter((coupon) => {
      if (coupon.start_date && new Date(coupon.start_date) > now) return false;
      if (coupon.expiry_date && new Date(coupon.expiry_date) < now) return false;
      if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) return false;
      return true;
    })
    .map((coupon) => ({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      minimumOrder: Number(coupon.minimum_order) || 0,
      expiryDate: coupon.expiry_date || null,
    }))
    .sort((a, b) => b.discountValue - a.discountValue);

  res.json({ success: true, data: { promotions: usable } });
});

/** POST /api/coupons/validate */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const result = await couponModel.validate(code, Number(subtotal) || 0, req.user ? req.user.id : null);
  res.json({
    success: true,
    message: `Coupon applied: you saved ৳${Number(result.discount || 0).toFixed(2)}`,
    data: {
      code: result.coupon.code,
      discount: result.discount,
      discountType: result.coupon.discount_type,
      discountValue: Number(result.coupon.discount_value),
    },
  });
});

module.exports = { list, detail, products, subcategories, banners, store, promotions, validateCoupon };
