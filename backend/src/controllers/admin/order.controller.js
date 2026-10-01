'use strict';

const orderModel = require('../../models/order');
const userModel = require('../../models/user');
const reviewModel = require('../../models/review');
const productModel = require('../../models/product');
const settings = require('../../services/settings');
const notifications = require('../../services/notifications');
const activityLog = require('../../services/activityLog');
const { ORDER_STATUSES, PURCHASE_STATUSES, normaliseOrderStatus } = require('../../utils/helpers');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { query } = require('../../config/db');

/** GET /api/admin/orders */
const list = asyncHandler(async (req, res) => {
  const result = await orderModel.list({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    status: req.query.status || '',
    search: req.query.search || '',
    from: req.query.from || null,
    to: req.query.to || null,
  });
  res.json({ success: true, data: { ...result, statuses: ORDER_STATUSES } });
});

/** GET /api/admin/orders/:id */
const detail = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, data: { order } });
});

/** PUT /api/admin/orders/:id/status */
const updateStatus = asyncHandler(async (req, res) => {
  const { note } = req.body;
  // Any spelling the UI or a script sends is folded into the canonical
  // pipeline status before it is compared or stored.
  const status = normaliseOrderStatus(req.body.status);
  if (!ORDER_STATUSES.includes(status)) throw ApiError.badRequest('Invalid order status');

  const order = await orderModel.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const current = normaliseOrderStatus(order.order_status);
  if (current === status) throw ApiError.badRequest(`Order is already ${status}`);
  if (current === 'cancelled') {
    throw ApiError.badRequest('A cancelled order cannot change status');
  }

  // Cancelling releases the reserved stock back to inventory.
  const updated = status === 'cancelled' ? await orderModel.cancelOrder(order.id) : await orderModel.updateStatus(order.id, status, note);

  await activityLog.log(
    req.user,
    'order_status',
    `${order.order_number}: ${normaliseOrderStatus(order.order_status)} -> ${status}`
  );

  await notifications.notifyOrderStatus(updated, note || null);

  res.json({ success: true, message: `Order marked as ${status}`, data: { order: updated } });
});

/** PUT /api/admin/orders/:id  (edit customer/fulfilment notes) */
const updateOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const { notes, statusNote, paymentStatus } = req.body;
  const { queryOne } = require('../../config/db');
  await queryOne(
    `UPDATE orders SET notes = ?, status_note = ?, payment_status = ? WHERE id = ?`,
    [
      notes !== undefined ? notes : order.notes,
      statusNote !== undefined ? statusNote : order.status_note,
      paymentStatus && ['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)
        ? paymentStatus
        : order.payment_status,
      order.id,
    ]
  );

  await activityLog.log(req.user, 'order_updated', `Edited order ${order.order_number}`);
  const updated = await orderModel.findById(order.id);
  res.json({ success: true, message: 'Order updated', data: { order: updated } });
});

/** GET /api/admin/orders/:id/invoice-style summary for print */
const printable = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  const store = await settings.getSettings();
  res.json({ success: true, data: { order, store } });
});

// ---- customers -------------------------------------------------------------

/** GET /api/admin/customers */
const listCustomers = asyncHandler(async (req, res) => {
  const result = await userModel.listCustomers({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    search: req.query.search || '',
    status: req.query.status || '',
  });
  res.json({ success: true, data: result });
});

/** GET /api/admin/customers/:id */
const customerDetail = asyncHandler(async (req, res) => {
  const customer = await userModel.findById(req.params.id);
  if (!customer || customer.role !== 'customer') throw ApiError.notFound('Customer not found');

  const [orders, spent, conversation] = await Promise.all([
    orderModel.list({ userId: customer.id, limit: 20, page: 1 }),
    require('../../config/db')
      .queryOne("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE user_id = ? AND order_status <> 'cancelled'", [customer.id]),
    require('../../models/chat').findByUser(customer.id),
  ]);

  res.json({
    success: true,
    data: {
      customer,
      orders: orders.orders,
      totalSpent: spent ? Number(spent.total) : 0,
      conversation: conversation || null,
    },
  });
});

/** PUT /api/admin/customers/:id/status */
const setCustomerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'disabled'].includes(status)) throw ApiError.badRequest('Invalid status');
  const customer = await userModel.findById(req.params.id);
  if (!customer || customer.role !== 'customer') throw ApiError.notFound('Customer not found');
  if (Number(customer.id) === Number(req.user.id)) {
    throw ApiError.badRequest('You cannot disable your own account');
  }

  await userModel.update(customer.id, { status });
  await activityLog.log(req.user, 'customer_status', `${customer.name} account ${status}`);

  await notifications.notify(customer.id, {
    title: status === 'active' ? 'Your account is active again' : 'Your account has been disabled',
    message:
      status === 'active'
        ? 'You can now sign in and shop with us again.'
        : 'Please contact support if you think this is a mistake.',
    type: 'account',
  });

  res.json({ success: true, message: `Customer ${status === 'active' ? 'enabled' : 'disabled'}`, data: { customer } });
});

/** DELETE /api/admin/customers/:id */
const removeCustomer = asyncHandler(async (req, res) => {
  const customer = await userModel.findById(req.params.id);
  if (!customer || customer.role !== 'customer') throw ApiError.notFound('Customer not found');
  await userModel.remove(customer.id);
  await activityLog.log(req.user, 'customer_deleted', `Deleted customer ${customer.name} (${customer.mobile})`);
  res.json({ success: true, message: 'Customer removed' });
});

// ---- reviews ---------------------------------------------------------------

/** GET /api/admin/reviews */
const listReviews = asyncHandler(async (req, res) => {
  const result = await reviewModel.listAll({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    search: req.query.search || '',
    status: req.query.status || '',
    rating: req.query.rating || '',
  });
  res.json({ success: true, data: result });
});

/** PUT /api/admin/reviews/:id/status */
const setReviewStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['visible', 'hidden'].includes(status)) throw ApiError.badRequest('Invalid status');
  const review = await reviewModel.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  await reviewModel.setStatus(review.id, status);
  await productModel.recalculateRating(review.product_id);
  await activityLog.log(req.user, 'review_moderated', `Review #${review.id} set to ${status}`);

  res.json({ success: true, message: `Review ${status === 'hidden' ? 'hidden' : 'published'}` });
});

/** DELETE /api/admin/reviews/:id */
const removeReview = asyncHandler(async (req, res) => {
  const review = await reviewModel.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  await reviewModel.remove(review.id);
  await productModel.recalculateRating(review.product_id);
  await activityLog.log(req.user, 'review_deleted', `Deleted review #${review.id}`);
  res.json({ success: true, message: 'Review deleted' });
});

// ---- activity log ----------------------------------------------------------

/** GET /api/admin/activity-logs */
const listLogs = asyncHandler(async (req, res) => {
  const result = await activityLog.list({
    page: req.query.page || 1,
    limit: req.query.limit || 30,
    action: req.query.action || null,
    search: req.query.search || '',
  });
  const actions = await query('SELECT DISTINCT action FROM admin_activity_logs ORDER BY action ASC');
  res.json({ success: true, data: { ...result, actions: actions.map((a) => a.action) } });
});

module.exports = {
  list,
  detail,
  updateStatus,
  updateOrder,
  printable,
  listCustomers,
  customerDetail,
  setCustomerStatus,
  removeCustomer,
  listReviews,
  setReviewStatus,
  removeReview,
  listLogs,
  ORDER_STATUSES,
  PURCHASE_STATUSES,
};
