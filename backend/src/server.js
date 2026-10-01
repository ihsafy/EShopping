'use strict';

const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

/**
 * Vercel (and any other serverless runtime) *imports* this file and drives the
 * exported Express app, so it must never bind a port there. Locally the file is
 * executed directly by `npm start` / `nodemon`, which is when the listener and
 * the shutdown wiring belong.
 */
const isDirectRun = require.main === module;

let server = null;

if (isDirectRun) {
  server = app.listen(env.port, () => {
    console.log(`EShopping API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  /** Fails fast with a clear message when MySQL is unreachable. */
  pool
    .query('SELECT 1')
    .then(() => console.log('MySQL connection established'))
    .catch((error) => {
      console.error('\n[Database] Cannot reach MySQL.');
      console.error(`  ${error.message}`);
      console.error('  Check DATABASE_HOST / DATABASE_PORT / DATABASE_USER / DATABASE_PASSWORD in backend/.env\n');
    });

  const shutdown = (signal) => async () => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

module.exports = app;
