'use strict';

const productModel = require('../../models/product');
const categoryModel = require('../../models/category');
const orderModel = require('../../models/order');
const userModel = require('../../models/user');
const { getNumber, getSettings } = require('../../services/settings');
const { query, queryOne } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');

/** Reorders the home page sections based on admin config. */
async function revenueByPeriod(period = 'all') {
  const ranges = {
    today: ['DATE(created_at) = CURDATE()', 'all'],
    week: ['created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)', 'daily'],
    '30d': ['created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)', 'daily'],
    month: ['created_at >= DATE_FORMAT(CURDATE(), "%Y-%m-01")', 'daily'],
    '6m': ['created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)', 'monthly'],
    year: ['YEAR(created_at) = YEAR(CURDATE())', 'monthly'],
    all: ['1 = 1', 'monthly'],
  };
  const [condition, group] = ranges[period] || ranges.all;

  return query(
    `SELECT
        DATE_FORMAT(o.created_at, '${
          group === 'daily' ? '%Y-%m-%d' : group === 'monthly' ? '%Y-%m' : '%Y-%m-%d'
        }') AS period,
        COUNT(*) AS orders,
        COALESCE(SUM(o.total), 0) AS revenue
     FROM orders o
     WHERE o.order_status <> 'cancelled' AND ${condition}
     GROUP BY period ORDER BY period ASC`
  );
}

/** GET /api/admin/dashboard - KPI cards + headline chart series */
const dashboard = asyncHandler(async (req, res) => {
  const [revenue, statusCounts, productStats, customerStats, series, latestOrders] = await Promise.all([
    queryOne(
      `SELECT
         COALESCE(SUM(CASE WHEN order_status <> 'cancelled' THEN total ELSE 0 END), 0) AS total_revenue,
         COALESCE(SUM(CASE WHEN order_status <> 'cancelled' AND DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) AS today_revenue,
         COALESCE(SUM(CASE WHEN order_status <> 'cancelled' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN total ELSE 0 END), 0) AS month_revenue,
         COUNT(*) AS total_orders,
         COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN total ELSE 0 END), 0) AS cancelled_value
       FROM orders`
    ),
    orderModel.countByStatus(),
    productModel.stats(),
    userModel.countCustomers(),
    revenueByPeriod('month'),
    orderModel.list({ page: 1, limit: 8 }),
  ]);

  const lowStockThreshold = await getNumber('low_stock_threshold', 5);
  const lowStockRows = await query(
    `SELECT id, name, slug, sku, stock, category_id FROM products
     WHERE stock <= ? AND status = 'active' ORDER BY stock ASC, name ASC LIMIT 10`,
    [lowStockThreshold]
  );

  const outOfStock = await query(
    "SELECT id, name, slug, sku, stock FROM products WHERE stock <= 0 AND status = 'active' ORDER BY name ASC LIMIT 10"
  );

  res.json({
    success: true,
    data: {
      kpis: {
        totalRevenue: Number(revenue.total_revenue),
        todayRevenue: Number(revenue.today_revenue),
        monthRevenue: Number(revenue.month_revenue),
        totalOrders: Number(revenue.total_orders),
        pendingOrders: statusCounts.pending || 0,
        confirmedOrders: statusCounts.confirmed || 0,
        processingOrders: statusCounts.processing || 0,
        shippedOrders: statusCounts.shipped || 0,
        deliveredOrders: statusCounts.delivered || 0,
        cancelledOrders: statusCounts.cancelled || 0,
        totalCustomers: customerStats ? Number(customerStats.total) : 0,
        totalProducts: productStats ? Number(productStats.total) : 0,
        activeProducts: productStats ? Number(productStats.active) : 0,
        lowStockProducts: productStats ? Number(productStats.low_stock) : 0,
        outOfStockProducts: productStats ? Number(productStats.out_of_stock) : 0,
      },
      revenueSeries: series,
      latestOrders: latestOrders.orders,
      lowStockProducts: lowStockRows,
      outOfStockProducts: outOfStock,
      lowStockThreshold,
    },
  });
});

/** GET /api/admin/analytics/revenue?period= */
const analyticsRevenue = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const series = await revenueByPeriod(period);
  res.json({ success: true, data: { period, series } });
});

/** GET /api/admin/analytics/orders */
const analyticsOrders = asyncHandler(async (req, res) => {
  const [byStatus, byDay, cancelRequests] = await Promise.all([
    query("SELECT order_status AS status, COUNT(*) AS total FROM orders GROUP BY order_status"),
    query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period, COUNT(*) AS total
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY period ORDER BY period ASC`
    ),
    queryOne('SELECT COUNT(*) AS total FROM orders WHERE cancel_requested = 1 AND order_status = ?', ['pending']),
  ]);

  res.json({ success: true, data: { byStatus, byDay, cancelRequests: cancelRequests ? Number(cancelRequests.total) : 0 } });
});

/** GET /api/admin/analytics/products */
const analyticsProducts = asyncHandler(async (req, res) => {
  const [topProducts, byCategory, lowStock, outOfStock] = await Promise.all([
    query(
      `SELECT oi.product_id, oi.product_name, oi.product_image,
              SUM(oi.quantity) AS units, SUM(oi.total) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status <> 'cancelled'
       GROUP BY oi.product_id, oi.product_name, oi.product_image
       ORDER BY units DESC LIMIT 10`
    ),
    query(
      `SELECT c.name AS category,
              COALESCE(SUM(oi.total), 0) AS revenue,
              COALESCE(SUM(oi.quantity), 0) AS units
       FROM categories c
       LEFT JOIN order_items oi ON oi.category_id = c.id
       LEFT JOIN orders o ON o.id = oi.order_id AND o.order_status <> 'cancelled'
       GROUP BY c.id, c.name ORDER BY revenue DESC`
    ),
    query(
      `SELECT id, name, sku, stock FROM products WHERE stock > 0 ORDER BY stock ASC LIMIT 10`
    ),
    query(
      `SELECT id, name, sku, stock FROM products WHERE stock <= 0 ORDER BY name ASC LIMIT 10`
    ),
  ]);

  res.json({ success: true, data: { topProducts, byCategory, lowStock, outOfStock } });
});

/** GET /api/admin/analytics/customers */
const analyticsCustomers = asyncHandler(async (req, res) => {
  const [growth, topSpenders] = await Promise.all([
    query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS period, COUNT(*) AS total
       FROM users WHERE role = 'customer' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
       GROUP BY period ORDER BY period ASC`
    ),
    query(
      `SELECT u.id, u.name, u.mobile, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent
       FROM users u JOIN orders o ON o.user_id = u.id AND o.order_status <> 'cancelled'
       GROUP BY u.id, u.name, u.mobile ORDER BY spent DESC LIMIT 10`
    ),
  ]);
  res.json({ success: true, data: { growth, topSpenders } });
});

/** GET /api/admin/inventory */
const inventory = asyncHandler(async (req, res) => {
  const threshold = await getNumber('low_stock_threshold', 5);
  const [stats, lowStock, outOfStock, bestSellers] = await Promise.all([
    productModel.stats(),
    query(
      'SELECT id, name, sku, stock FROM products WHERE stock > 0 AND stock <= ? ORDER BY stock ASC LIMIT 50',
      [threshold]
    ).then(async (rows) => {
      if (!rows.length) return rows;
      const ids = rows.map((r) => r.id);
      const images = await query(
        `SELECT product_id, image_url FROM product_images WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order, id`,
        ids
      );
      const map = new Map();
      images.forEach((img) => {
        if (!map.has(img.product_id)) map.set(img.product_id, img.image_url);
      });
      return rows.map((row) => ({ ...row, image: map.get(row.id) || null }));
    }),
    query('SELECT id, name, sku, stock FROM products WHERE stock <= 0 ORDER BY name ASC LIMIT 50'),
    query('SELECT id, name, sku, stock, sold_count FROM products ORDER BY sold_count DESC LIMIT 10'),
  ]);

  res.json({
    success: true,
    data: { threshold, stats, lowStock, outOfStock, bestSellers },
  });
});

/** POST /api/admin/inventory/:id/stock */
const adjustStock = asyncHandler(async (req, res) => {
  const { delta } = req.body;
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ success: false, message: 'Enter a non-zero adjustment' });
  }
  await productModel.adjustStock(null, req.params.id, amount);
  const product = await queryOne('SELECT id, name, stock FROM products WHERE id = ?', [req.params.id]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, message: `Stock updated to ${product.stock}`, data: { product } });
});

/** GET /api/admin/overview - lightweight counters for the sidebar badges */
const overview = asyncHandler(async (req, res) => {
  const [counts, unreadChat] = await Promise.all([
    queryOne(
      `SELECT
         (SELECT COUNT(*) FROM orders WHERE order_status = 'pending') AS pending_orders,
         (SELECT COUNT(*) FROM products WHERE stock <= 0 AND status = 'active') AS out_of_stock,
         (SELECT COUNT(*) FROM reviews WHERE status = 'visible' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS new_reviews,
         (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unread_notifications`,
      [req.user.id]
    ),
    require('../../models/chat').unreadForAdmin(),
  ]);

  res.json({ success: true, data: { ...counts, unreadChat } });
});

module.exports = {
  dashboard,
  analyticsRevenue,
  analyticsOrders,
  analyticsProducts,
  analyticsCustomers,
  inventory,
  adjustStock,
  overview,
  revenueByPeriod,
};
