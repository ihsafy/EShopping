'use strict';

const orderModel = require('../models/order');
const wishlistModel = require('../models/wishlist');
const chatModel = require('../models/chat');
const notifications = require('../services/notifications');
const { queryOne } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/profile/summary - powers the profile dashboard header */
const summary = asyncHandler(async (req, res) => {
  const [wishlistCount, unreadChat, unreadNotifications, recent, totals] = await Promise.all([
    wishlistModel.count(req.user.id),
    chatModel.countForUser(req.user.id),
    notifications.unreadCount(req.user.id),
    orderModel.list({ userId: req.user.id, limit: 3, page: 1 }),
    queryOne(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN order_status <> 'cancelled' THEN total ELSE 0 END), 0) AS spent
       FROM orders WHERE user_id = ?`,
      [req.user.id]
    ),
  ]);

  res.json({
    success: true,
    data: {
      totalOrders: totals ? Number(totals.total) : 0,
      totalSpent: totals ? Number(totals.spent) : 0,
      wishlistCount,
      unreadChat,
      unreadNotifications,
      recentOrders: recent.orders,
    },
  });
});

module.exports = { summary };
