'use strict';

const express = require('express');
const cartController = require('../controllers/cart.controller');
const wishlistController = require('../controllers/wishlist.controller');
const orderController = require('../controllers/order.controller');
const chatController = require('../controllers/chat.controller');
const profileController = require('../controllers/profile.controller');
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Every route below requires a signed-in customer.
router.use(protect);

// ---- cart ------------------------------------------------------------------
router.get('/cart/summary', cartController.summary);
router.post('/cart/merge', cartController.merge);
router.get('/cart', cartController.get);
router.post(
  '/cart',
  validate({ body: { productId: [['required'], ['integer']], quantity: [['integer'], ['minValue', 1]] } }),
  cartController.add
);
router.put('/cart/:itemId', validate({ body: { quantity: [['required'], ['integer']] } }), cartController.update);
router.delete('/cart/:itemId', cartController.remove);
router.delete('/cart', cartController.clear);

// ---- wishlist --------------------------------------------------------------
router.get('/wishlist', wishlistController.list);
router.get('/wishlist/ids', wishlistController.ids);
router.post('/wishlist', validate({ body: { productId: [['required'], ['integer']] } }), wishlistController.add);
router.post('/wishlist/:productId/move-to-cart', wishlistController.moveToCart);
router.delete('/wishlist/:productId', wishlistController.remove);

// ---- checkout + orders -----------------------------------------------------
const customerRules = {
  name: [['required'], ['min', 2], ['max', 120]],
  phone: [['required'], ['mobile']],
  address: [['required'], ['min', 5], ['max', 500]],
  city: [['required'], ['max', 80]],
  area: [['required'], ['max', 80]],
  deliveryZone: [['in', ['inside_dhaka', 'outside_dhaka']]],
  email: [['email']],
  notes: [['max', 1000]],
  // Manual checkout only: the store is configured for cash on delivery.
  paymentMethod: [['in', ['cod']]],
};

router.post('/checkout/preview', orderController.preview);

router.post(
  '/orders',
  validate({ body: customerRules }),
  orderController.create
);
router.get('/orders', orderController.mine);
router.get('/orders/:id', orderController.detail);
router.post('/orders/:id/cancel', orderController.cancel);

// ---- chat ------------------------------------------------------------------
router.get('/chat', chatController.myConversation);
router.get('/chat/unread', chatController.unread);
router.post(
  '/chat/messages',
  validate({ body: { message: [['required'], ['max', 2000]] } }),
  chatController.send
);

// ---- profile + notifications ----------------------------------------------
router.get('/profile/summary', profileController.summary);
router.get('/notifications', notificationController.list);
router.get('/notifications/unread', notificationController.unread);
router.post('/notifications/read-all', notificationController.markAllRead);
router.post('/notifications/:id/read', notificationController.markRead);
router.delete('/notifications/:id', notificationController.remove);

module.exports = router;
