'use strict';

const productModel = require('../../models/product');
const categoryModel = require('../../models/category');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const activityLog = require('../../services/activityLog');
const notifications = require('../../services/notifications');
const { cleanupImages, removedUrls } = require('../../services/imageCleanup');

/** GET /api/admin/products */
const list = asyncHandler(async (req, res) => {
  const result = await productModel.list({ ...req.query, includeInactive: true });
  res.json({ success: true, data: result });
});

/** GET /api/admin/products/:id */
const detail = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: { product } });
});

/** POST /api/admin/products */
const create = asyncHandler(async (req, res) => {
  const data = normalisePayload(req.body);
  const id = await productModel.create(data);
  await activityLog.log(req.user, 'product_created', `Created product "${data.name}"`);

  if (Number(data.stock) > 0) await notifications.checkLowStock({ name: data.name, stock: Number(data.stock) });

  res.status(201).json({ success: true, message: 'Product created', data: { id } });
});

/** PUT /api/admin/products/:id */
const update = asyncHandler(async (req, res) => {
  const before = await productModel.findById(req.params.id);
  if (!before) throw ApiError.notFound('Product not found');

  const data = normalisePayload(req.body);
  await productModel.update(req.params.id, data);
  await activityLog.log(req.user, 'product_updated', `Updated product "${data.name || before.name}"`);

  const after = await productModel.findById(req.params.id);
  if (Number(after.stock) <= 10 && Number(after.stock) < Number(before.stock)) {
    await notifications.checkLowStock(after);
  }

  const stale = removedUrls(
    (before.images || []).map((img) => img.image_url),
    (after.images || []).map((img) => img.image_url)
  );
  if (stale.length) await cleanupImages(stale);

  res.json({ success: true, message: 'Product updated', data: { product: after } });
});

/** DELETE /api/admin/products/:id */
const remove = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const imageUrls = (product.images || []).map((img) => img.image_url);
  await productModel.remove(req.params.id);
  await activityLog.log(req.user, 'product_deleted', `Deleted product "${product.name}"`);
  if (imageUrls.length) await cleanupImages(imageUrls);
  res.json({ success: true, message: 'Product deleted' });
});

/** POST /api/admin/products/:id/status */
const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) throw ApiError.badRequest('Invalid status');
  const product = await productModel.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  await productModel.update(product.id, { status });
  await activityLog.log(req.user, 'product_status', `${product.name} set to ${status}`);
  res.json({ success: true, message: `Product ${status === 'active' ? 'activated' : 'disabled'}`, data: { product } });
});

/** Accepts multipart form-data from the admin form and JSON from the API. */
function normalisePayload(body) {
  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return undefined;
    return String(value)
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);
  };

  return {
    name: body.name,
    slug: body.slug,
    categoryId: body.categoryId ? Number(body.categoryId) || null : undefined,
    subcategoryId: body.subcategoryId ? Number(body.subcategoryId) || null : undefined,
    description: body.description,
    shortDescription: body.shortDescription,
    sku: body.sku,
    brand: body.brand || null,
    tags: toArray(body.tags),
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    seoKeywords: toArray(body.seoKeywords),
    originalPrice: body.originalPrice,
    discount: body.discount,
    salePrice: body.salePrice,
    stock: body.stock,
    featured: ['1', 'true', 'on', true, 1].includes(body.featured),
    bestSeller: ['1', 'true', 'on', true, 1].includes(body.bestSeller),
    newArrival: ['1', 'true', 'on', true, 1].includes(body.newArrival),
    status: body.status,
    images: toArray(body.images),
    specs: body.specs ? JSON.parse(body.specs) : undefined,
  };
}

// ---- categories ------------------------------------------------------------

/** GET /api/admin/categories */
const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryModel.list({ includeInactive: true });
  res.json({ success: true, data: { categories } });
});

/** POST /api/admin/categories */
const createCategory = asyncHandler(async (req, res) => {
  const id = await categoryModel.create(req.body);
  await activityLog.log(req.user, 'category_created', `Created category "${req.body.name}"`);
  res.status(201).json({ success: true, message: 'Category created', data: { id } });
});

/** PUT /api/admin/categories/:id */
const updateCategory = asyncHandler(async (req, res) => {
  const ok = await categoryModel.update(req.params.id, req.body);
  if (!ok) throw ApiError.notFound('Category not found');
  await activityLog.log(req.user, 'category_updated', `Updated category "${req.body.name || req.params.id}"`);
  res.json({ success: true, message: 'Category updated' });
});

/** DELETE /api/admin/categories/:id */
const removeCategory = asyncHandler(async (req, res) => {
  const category = await categoryModel.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const subcategories = await categoryModel.listSubcategories(category.id);
  if (subcategories.length > 0) {
    throw ApiError.badRequest(
      `${subcategories.length} subcategory(ies) still belong to this category. Delete them first.`
    );
  }
  const count = await categoryModel.productCount(category.id);
  if (count > 0) {
    throw ApiError.badRequest(
      `${count} product(s) are still assigned to this category. Move or delete them first.`
    );
  }
  await categoryModel.remove(category.id);
  await activityLog.log(req.user, 'category_deleted', `Deleted category "${category.name}"`);
  res.json({ success: true, message: 'Category deleted' });
});

/** GET /api/admin/subcategories?categoryId= */
const listSubcategories = asyncHandler(async (req, res) => {
  const categoryId = Number(req.query.categoryId);
  if (!categoryId) return res.json({ success: true, data: { subcategories: [] } });
  const subcategories = await categoryModel.listSubcategories(categoryId);
  return res.json({ success: true, data: { subcategories } });
});

/** POST /api/admin/subcategories */
const createSubcategory = asyncHandler(async (req, res) => {
  const id = await categoryModel.createSubcategory(req.body);
  await activityLog.log(req.user, 'category_created', `Created subcategory "${req.body.name}"`);
  res.status(201).json({ success: true, message: 'Subcategory created', data: { id } });
});

/** DELETE /api/admin/subcategories/:id */
const removeSubcategory = asyncHandler(async (req, res) => {
  const subcategory = await categoryModel.findSubcategoryById(req.params.id);
  if (!subcategory) throw ApiError.notFound('Subcategory not found');
  const count = await categoryModel.subcategoryProductCount(subcategory.id);
  if (count > 0) {
    throw ApiError.badRequest(
      `${count} product(s) are still assigned to this subcategory. Move or delete them first.`
    );
  }
  await categoryModel.removeSubcategory(subcategory.id);
  await activityLog.log(req.user, 'category_deleted', `Deleted subcategory "${subcategory.name}"`);
  res.json({ success: true, message: 'Subcategory deleted' });
});

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  setStatus,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  listSubcategories,
  createSubcategory,
  removeSubcategory,
};
