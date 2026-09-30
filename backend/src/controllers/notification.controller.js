'use strict';

const express = require('express');
const notifications = require('../services/notifications');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const list = asyncHandler(async (req, res) => {
  const rows = await notifications.list(req.user.id, { limit: req.query.limit || 30 });
  res.json({ success: true, data: { notifications: rows } });
});

const unread = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { unread: await notifications.unreadCount(req.user.id) } });
});

const markAllRead = asyncHandler(async (req, res) => {
  await notifications.markAllRead(req.user.id);
  res.json({ success: true, message: 'All notifications marked as read' });
});

const markRead = asyncHandler(async (req, res) => {
  await notifications.markRead(req.user.id, req.params.id);
  res.json({ success: true, message: 'Marked as read' });
});

const remove = asyncHandler(async (req, res) => {
  await notifications.remove(req.user.id, req.params.id);
  res.json({ success: true, message: 'Notification removed' });
});

module.exports = { list, unread, markAllRead, markRead, remove };
