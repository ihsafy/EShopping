import api from './client';

/**
 * Chat API surface (customer + admin). Reads are never cached: a
 * conversation has to feel live, so every poll hits the server.
 */

// ---- storefront (signed-in customer) ---------------------------------------

/** GET /api/chat - the customer's own conversation, marking it read. */
export const fetchMyConversation = async () => (await api.get('/chat')).data;

/** POST /api/chat/messages - { message } -> 201 { message } */
export const sendChatMessage = async (message) =>
  (await api.post('/chat/messages', { message })).data;

/** GET /api/chat/unread - badge counter for the header. */
export const fetchChatUnread = async () =>
  Number((await api.get('/chat/unread')).data?.unread) || 0;

/** Broadcasts the unread counter so the header badge updates in place. */
export const announceUnread = (unread) =>
  window.dispatchEvent(
    new CustomEvent('eshopping:chat-unread', { detail: { unread: Number(unread) || 0 } })
  );

// ---- admin -----------------------------------------------------------------

/** GET /api/admin/chat/conversations - { rows, total, unread } */
export const fetchConversations = async (params = {}) =>
  (await api.get('/admin/chat/conversations', { params })).data;

/** GET /api/admin/chat/conversations/:id - { conversation, messages } */
export const fetchConversation = async (id) =>
  (await api.get(`/admin/chat/conversations/${id}`)).data;

/** POST /api/admin/chat/conversations/:id/messages - { message } */
export const adminSendMessage = async (id, message) =>
  (await api.post(`/admin/chat/conversations/${id}/messages`, { message })).data;

/** PUT /api/admin/chat/conversations/:id/status - { status: open | closed } */
export const setConversationStatus = async (id, status) =>
  (await api.put(`/admin/chat/conversations/${id}/status`, { status })).data;

/** POST /api/admin/chat/conversations/:id/read */
export const markConversationRead = async (id) =>
  (await api.post(`/admin/chat/conversations/${id}/read`)).data;
