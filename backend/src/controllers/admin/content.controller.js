'use strict';

const chatModel = require('../../models/chat');
const bannerModel = require('../../models/banner');
const couponModel = require('../../models/coupon');
const notificationModel = require('../../services/notifications');
const settingsService = require('../../services/settings');
const activityLog = require('../../services/activityLog');
const { cleanupImages, removedUrls } = require('../../services/imageCleanup');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

// ---- chat ------------------------------------------------------------------

/** GET /api/admin/chat/conversations */
const listConversations = asyncHandler(async (req, res) => {
  const result = await chatModel.listForAdmin({
    search: req.query.search || '',
    status: req.query.status || '',
    page: req.query.page || 1,
    limit: req.query.limit || 30,
  });
  res.json({ success: true, data: { ...result, unread: await chatModel.unreadForAdmin() } });
});

/** GET /api/admin/chat/conversations/:id */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await chatModel.findById(req.params.id);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  const messages = await chatModel.listMessages(conversation.id, { limit: 200 });
  await chatModel.markRead(conversation.id, 'admin');
  res.json({ success: true, data: { conversation, messages } });
});

/** POST /api/admin/chat/conversations/:id/messages */
const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) throw ApiError.badRequest('Message cannot be empty');

  const conversation = await chatModel.findById(req.params.id);
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const saved = await chatModel.addMessage({
    conversationId: conversation.id,
    senderId: req.user.id,
    senderRole: 'admin',
    message: String(message).trim(),
  });

  await notificationModel.notify(conversation.user_id, {
    title: 'Support replied to your message',
    message: String(message).slice(0, 140),
    type: 'chat',
    link: '/profile/chat',
  });

  res.status(201).json({ success: true, message: 'Reply sent', data: { message: saved } });
});

/** PUT /api/admin/chat/conversations/:id/status */
const setConversationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed'].includes(status)) throw ApiError.badRequest('Invalid status');
  const conversation = await chatModel.findById(req.params.id);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  await chatModel.setStatus(conversation.id, status);
  res.json({ success: true, message: `Conversation ${status === 'closed' ? 'closed' : 'reopened'}` });
});

/** POST /api/admin/chat/conversations/:id/read */
const markRead = asyncHandler(async (req, res) => {
  await chatModel.markRead(req.params.id, 'admin');
  res.json({ success: true, message: 'Marked as read' });
});

// ---- banners ---------------------------------------------------------------

/** Maps multer's named files (image / mobileImage) onto the banner payload. */
const withUploadedFiles = (req) => {
  const body = { ...req.body };
  const files = req.files || {};
  // file.url is set by persistUploads: a Cloudinary https URL in production,
  // or a /uploads/... path when running against local disk.
  if (files.image && files.image[0] && files.image[0].url) body.imageUrl = files.image[0].url;
  if (files.mobileImage && files.mobileImage[0] && files.mobileImage[0].url) {
    body.mobileImageUrl = files.mobileImage[0].url;
  }
  return body;
};

/** GET /api/admin/banners */
const listBanners = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { banners: await bannerModel.list() } });
});

/** POST /api/admin/banners */
const createBanner = asyncHandler(async (req, res) => {
  const id = await bannerModel.create(withUploadedFiles(req));
  await activityLog.log(req.user, 'banner_created', `Created banner "${req.body.title}"`);
  res.status(201).json({ success: true, message: 'Banner created', data: { id } });
});

/** PUT /api/admin/banners/:id */
const updateBanner = asyncHandler(async (req, res) => {
  const current = await bannerModel.findById(req.params.id);
  if (!current) throw ApiError.notFound('Banner not found');

  const ok = await bannerModel.update(req.params.id, withUploadedFiles(req));
  if (!ok) throw ApiError.notFound('Banner not found');
  await activityLog.log(req.user, 'banner_updated', `Updated banner "${req.body.title || current.title}"`);

  const after = await bannerModel.findById(req.params.id);
  const stale = removedUrls(
    [current.image_url, current.mobile_image_url],
    [after.image_url, after.mobile_image_url]
  );
  if (stale.length) await cleanupImages(stale);

  res.json({ success: true, message: 'Banner updated' });
});

/** DELETE /api/admin/banners/:id */
const removeBanner = asyncHandler(async (req, res) => {
  const banner = await bannerModel.findById(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  await bannerModel.remove(banner.id);
  await activityLog.log(req.user, 'banner_deleted', `Deleted banner "${banner.title}"`);
  await cleanupImages([banner.image_url, banner.mobile_image_url]);
  res.json({ success: true, message: 'Banner deleted' });
});

// ---- coupons ---------------------------------------------------------------

/** GET /api/admin/coupons */
const listCoupons = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { coupons: await couponModel.list() } });
});

/** POST /api/admin/coupons */
const createCoupon = asyncHandler(async (req, res) => {
  const id = await couponModel.create(req.body);
  await activityLog.log(req.user, 'coupon_created', `Created coupon "${req.body.code}"`);
  res.status(201).json({ success: true, message: 'Coupon created', data: { id } });
});

/** PUT /api/admin/coupons/:id */
const updateCoupon = asyncHandler(async (req, res) => {
  const ok = await couponModel.update(req.params.id, req.body);
  if (!ok) throw ApiError.notFound('Coupon not found');
  await activityLog.log(req.user, 'coupon_updated', `Updated coupon "${req.body.code || req.params.id}"`);
  res.json({ success: true, message: 'Coupon updated' });
});

/** DELETE /api/admin/coupons/:id */
const removeCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponModel.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  await couponModel.remove(coupon.id);
  await activityLog.log(req.user, 'coupon_deleted', `Deleted coupon "${coupon.code}"`);
  res.json({ success: true, message: 'Coupon deleted' });
});

// ---- notifications ---------------------------------------------------------

/** GET /api/admin/notifications */
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationModel.list(req.user.id, { limit: 50 });
  res.json({ success: true, data: { notifications, unread: await notificationModel.unreadCount(req.user.id) } });
});

/** POST /api/admin/notifications/read-all */
const readAllNotifications = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  res.json({ success: true, message: 'All notifications marked as read' });
});

/** DELETE /api/admin/notifications/:id */
const removeNotification = asyncHandler(async (req, res) => {
  await notificationModel.remove(req.user.id, req.params.id);
  res.json({ success: true, message: 'Notification removed' });
});

// ---- settings --------------------------------------------------------------

/** GET /api/admin/settings */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(true);
  res.json({ success: true, data: { settings } });
});

/** PUT /api/admin/settings */
const updateSettings = asyncHandler(async (req, res) => {
  const allowed = Object.keys(settingsService.DEFAULTS);
  const patch = {};
  Object.keys(req.body || {}).forEach((key) => {
    if (allowed.includes(key)) patch[key] = req.body[key];
  });
  if (!Object.keys(patch).length) throw ApiError.badRequest('No valid settings were provided');

  const before = await settingsService.getSettings(true);
  const settings = await settingsService.saveSettings(patch);
  await activityLog.log(req.user, 'settings_updated', `Updated settings: ${Object.keys(patch).join(', ')}`);

  const stale = removedUrls([before.store_logo, before.store_favicon], [settings.store_logo, settings.store_favicon]);
  if (stale.length) await cleanupImages(stale);

  res.json({ success: true, message: 'Settings saved', data: { settings } });
});

module.exports = {
  listConversations,
  getConversation,
  sendMessage,
  setConversationStatus,
  markRead,
  listBanners,
  createBanner,
  updateBanner,
  removeBanner,
  listCoupons,
  createCoupon,
  updateCoupon,
  removeCoupon,
  listNotifications,
  readAllNotifications,
  removeNotification,
  getSettings,
  updateSettings,
};
