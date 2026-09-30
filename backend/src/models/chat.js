'use strict';

const { query, queryOne } = require('../config/db');

/** Returns the user's conversation, creating it on first message. */
async function ensureConversation(userId, connection = null) {
  // Normalise the two executor shapes: `connection.execute` -> [rows, fields],
  // the shared `query` helper -> rows.
  const run = async (sql, params) => {
    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows;
    }
    return query(sql, params);
  };

  const rows = await run('SELECT * FROM conversations WHERE user_id = ? LIMIT 1', [userId]);
  if (rows[0]) return rows[0];
  const result = await run('INSERT INTO conversations (user_id, status) VALUES (?, ?)', [userId, 'open']);
  const created = await run('SELECT * FROM conversations WHERE id = ?', [result.insertId]);
  return created[0];
}

const findById = (id) => queryOne('SELECT * FROM conversations WHERE id = ?', [id]);

const findByUser = (userId) => queryOne('SELECT * FROM conversations WHERE user_id = ? LIMIT 1', [userId]);

const listForAdmin = async ({ search = '', status = '', page = 1, limit = 30 } = {}) => {
  const filters = [];
  const params = [];
  if (status) {
    filters.push('c.status = ?');
    params.push(status);
  }
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    filters.push('(u.name LIKE ? OR u.mobile LIKE ?)');
    params.push(like, like);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT c.*, u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email
     FROM conversations c
     JOIN users u ON u.id = c.user_id
     ${where}
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM conversations c JOIN users u ON u.id = c.user_id ${where}`,
    params
  );

  return { rows, total: countRow ? countRow.total : 0 };
};

const listMessages = async (conversationId, { after = null, limit = 100 } = {}) => {
  const params = [conversationId];
  let afterClause = '';
  if (after) {
    afterClause = 'AND m.id > ?';
    params.push(after);
  }
  return query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.sender_role, m.message, m.is_read, m.created_at,
            u.name AS sender_name
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ${afterClause}
     ORDER BY m.id ASC LIMIT ?`,
    [...params, Number(limit)]
  );
};

const addMessage = async ({ conversationId, senderId, senderRole, message }) => {
  const result = await query(
    'INSERT INTO messages (conversation_id, sender_id, sender_role, message) VALUES (?,?,?,?)',
    [conversationId, senderId, senderRole, message]
  );

  const unreadFor = senderRole === 'admin' ? 'unread_user' : 'unread_admin';
  await query(
    `UPDATE conversations SET last_message = ?, last_message_at = NOW(), ${unreadFor} = ${unreadFor} + 1 WHERE id = ?`,
    [String(message).slice(0, 300), conversationId]
  );

  return queryOne('SELECT * FROM messages WHERE id = ?', [result.insertId]);
};

const markRead = (conversationId, role) => {
  const column = role === 'admin' ? 'unread_user' : 'unread_admin';
  const readColumn = role === 'admin' ? 'unread_admin' : 'unread_user';
  return Promise.all([
    query('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_role <> ? AND is_read = 0', [
      conversationId,
      role,
    ]),
    query(`UPDATE conversations SET ${column} = 0 WHERE id = ?`, [conversationId]).then(() => readColumn),
  ]);
};

const setStatus = (conversationId, status) =>
  query('UPDATE conversations SET status = ? WHERE id = ?', [status, conversationId]);

const unreadForAdmin = () =>
  queryOne('SELECT COALESCE(SUM(unread_admin), 0) AS total FROM conversations').then((r) => (r ? r.total : 0));

const countForUser = async (userId) => {
  const conversation = await findByUser(userId);
  return conversation ? conversation.unread_user : 0;
};

module.exports = {
  ensureConversation,
  findById,
  findByUser,
  listForAdmin,
  listMessages,
  addMessage,
  markRead,
  setStatus,
  unreadForAdmin,
  countForUser,
};
