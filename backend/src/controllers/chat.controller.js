'use strict';

const chatModel = require('../models/chat');
const userModel = require('../models/user');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const notifications = require('../services/notifications');

/** GET /api/chat - the signed-in customer's own conversation */
const myConversation = asyncHandler(async (req, res) => {
  const conversation = await chatModel.ensureConversation(req.user.id);
  const messages = await chatModel.listMessages(conversation.id, { limit: 200 });
  await chatModel.markRead(conversation.id, 'user');

  res.json({
    success: true,
    data: {
      conversation,
      messages,
      unread: 0,
      status: conversation.status,
    },
  });
});

/** POST /api/chat/messages - customer sends the first/new message */
const send = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) throw ApiError.badRequest('Message cannot be empty');
  if (String(message).length > 2000) throw ApiError.badRequest('Message is too long (max 2000 characters)');

  const conversation = await chatModel.ensureConversation(req.user.id);
  if (conversation.status === 'closed') {
    throw ApiError.badRequest('This support conversation has been closed. Please start a new one from the contact page.');
  }

  const saved = await chatModel.addMessage({
    conversationId: conversation.id,
    senderId: req.user.id,
    senderRole: 'customer',
    message: String(message).trim(),
  });

  await notifications.notifyAdmins({
    title: 'New customer message',
    message: `${req.user.name}: ${String(message).slice(0, 120)}`,
    type: 'chat',
    link: '/admin/messages',
  });

  res.status(201).json({ success: true, message: 'Message sent', data: { message: saved } });
});

/** GET /api/chat/unread */
const unread = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { unread: await chatModel.countForUser(req.user.id) } });
});

module.exports = { myConversation, send, unread };
