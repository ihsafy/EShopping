'use strict';

const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { handleUpload, upload, persistUploads } = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const dashboard = require('../controllers/admin/dashboard.controller');
const productAdmin = require('../controllers/admin/product.controller');
const orderAdmin = require('../controllers/admin/order.controller');
const contentAdmin = require('../controllers/admin/content.controller');

const router = express.Router();

// Every admin route is behind authentication + the admin role check.
router.use(protect, requireRole('admin'));

// ---- dashboard + analytics -------------------------------------------------
router.get('/dashboard', dashboard.dashboard);
router.get('/overview', dashboard.overview);
router.get('/analytics/revenue', dashboard.analyticsRevenue);
router.get('/analytics/orders', dashboard.analyticsOrders);
router.get('/analytics/products', dashboard.analyticsProducts);
router.get('/analytics/customers', dashboard.analyticsCustomers);

// ---- products --------------------------------------------------------------
router.get('/products', productAdmin.list);
router.get('/products/:id', productAdmin.detail);
router.post(
  '/products',
  handleUpload(upload.array('images', 8)),
  persistUploads,
  validate({
    body: {
      name: [['required'], ['max', 200]],
      originalPrice: [['required'], ['numeric'], ['minValue', 0]],
      stock: [['required'], ['integer'], ['minValue', 0]],
    },
  }),
  productAdmin.create
);
router.put('/products/:id', handleUpload(upload.array('images', 8)), persistUploads, productAdmin.update);
router.delete('/products/:id', productAdmin.remove);
router.post(
  '/products/:id/status',
  validate({ body: { status: [['required'], ['in', ['active', 'inactive']]] } }),
  productAdmin.setStatus
);

// ---- categories ------------------------------------------------------------
router.get('/categories', productAdmin.listCategories);
router.post('/categories', validate({ body: { name: [['required'], ['max', 120]] } }), productAdmin.createCategory);
router.put('/categories/:id', productAdmin.updateCategory);
router.delete('/categories/:id', productAdmin.removeCategory);
router.get('/subcategories', productAdmin.listSubcategories);
router.post(
  '/subcategories',
  validate({ body: { name: [['required'], ['max', 120]], categoryId: [['required'], ['integer']] } }),
  productAdmin.createSubcategory
);
router.delete('/subcategories/:id', productAdmin.removeSubcategory);

// ---- orders ----------------------------------------------------------------
router.get('/orders', orderAdmin.list);
router.get('/orders/:id', orderAdmin.detail);
router.put(
  '/orders/:id/status',
  validate({
    body: {
      status: [['required'], ['in', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']]],
    },
  }),
  orderAdmin.updateStatus
);
router.put('/orders/:id', orderAdmin.updateOrder);

// ---- customers -------------------------------------------------------------
router.get('/customers', orderAdmin.listCustomers);
router.get('/customers/:id', orderAdmin.customerDetail);
router.put(
  '/customers/:id/status',
  validate({ body: { status: [['required'], ['in', ['active', 'disabled']]] } }),
  orderAdmin.setCustomerStatus
);
router.delete('/customers/:id', orderAdmin.removeCustomer);

// ---- reviews ---------------------------------------------------------------
router.get('/reviews', orderAdmin.listReviews);
router.put(
  '/reviews/:id/status',
  validate({ body: { status: [['required'], ['in', ['visible', 'hidden']]] } }),
  orderAdmin.setReviewStatus
);
router.delete('/reviews/:id', orderAdmin.removeReview);

// ---- inventory -------------------------------------------------------------
router.get('/inventory', dashboard.inventory);
router.post(
  '/inventory/:id/stock',
  validate({ body: { delta: [['required'], ['integer']] } }),
  dashboard.adjustStock
);

// ---- banners ---------------------------------------------------------------
router.get('/banners', contentAdmin.listBanners);
router.post(
  '/banners',
  handleUpload(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }])),
  persistUploads,
  validate({ body: { title: [['required'], ['max', 200]] } }),
  contentAdmin.createBanner
);
router.put(
  '/banners/:id',
  handleUpload(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }])),
  persistUploads,
  contentAdmin.updateBanner
);
router.delete('/banners/:id', contentAdmin.removeBanner);

// ---- coupons ---------------------------------------------------------------
router.get('/coupons', contentAdmin.listCoupons);
router.post('/coupons', contentAdmin.createCoupon);
router.put('/coupons/:id', contentAdmin.updateCoupon);
router.delete('/coupons/:id', contentAdmin.removeCoupon);

// ---- chat ------------------------------------------------------------------
router.get('/chat/conversations', contentAdmin.listConversations);
router.get('/chat/conversations/:id', contentAdmin.getConversation);
router.post('/chat/conversations/:id/messages', contentAdmin.sendMessage);
router.put('/chat/conversations/:id/status', contentAdmin.setConversationStatus);
router.post('/chat/conversations/:id/read', contentAdmin.markRead);

// ---- notifications ---------------------------------------------------------
router.get('/notifications', contentAdmin.listNotifications);
router.post('/notifications/read-all', contentAdmin.readAllNotifications);
router.delete('/notifications/:id', contentAdmin.removeNotification);

// ---- settings + activity log ----------------------------------------------
router.get('/settings', contentAdmin.getSettings);
router.put('/settings', contentAdmin.updateSettings);
router.get('/activity-logs', orderAdmin.listLogs);

module.exports = router;
