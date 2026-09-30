'use strict';

const mysql = require('mysql2/promise');
const env = require('./env');

/**
 * Shared connection pool. Every query in the app goes through here and always
 * uses parameterised statements / placeholders, which is what protects the
 * application from SQL injection.
 */
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: false,
  enableKeepAlive: true,
  multipleStatements: false, // hard protection against stacked-query injection
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/** Runs a set of operations inside a transaction. */
async function transaction(handler) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function healthCheck() {
  const row = await queryOne('SELECT 1 AS ok');
  return row && row.ok === 1;
}

module.exports = { pool, query, queryOne, transaction, healthCheck };
