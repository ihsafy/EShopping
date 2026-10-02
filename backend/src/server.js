'use strict';

const express = require('express');

/**
 * Vercel (and any other serverless runtime) *imports* this file and drives the
 * exported Express app, so it must never bind a port there. Locally the file is
 * executed directly by `npm start` / `nodemon`, which is when the listener and
 * the shutdown wiring belong.
 */
const isDirectRun = require.main === module;

/**
 * Requiring ./app runs config/env, which deliberately refuses to boot in
 * production without a real JWT_SECRET (falling back to the development secret
 * would sign every session with a value published in this repository).
 *
 * On a serverless platform that refusal surfaces as a bare HTTP 500 HTML page,
 * which looks identical to an application bug and hides the real cause. So the
 * whole app graph is loaded inside one guard: on failure the module still
 * exports a valid Express handler that answers with a JSON explanation naming
 * the variable to set. The application stays fail-closed - no route is served
 * while the configuration is invalid - but the operator gets an actionable
 * message instead of an unexplained 500.
 */
const buildDiagnosticApp = (error) => {
  const diagnostic = express();
  diagnostic.disable('x-powered-by');
  diagnostic.all('*', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'The EShopping API is not configured correctly and cannot serve requests.',
      // Only the message thrown by config/env, which names environment
      // variables and never their values.
      error: error.message,
    });
  });
  return diagnostic;
};

let app;
let env = null;
let pool = null;
let startupError = null;

try {
  env = require('./config/env');
  pool = require('./config/db').pool;
  app = require('./app');
} catch (error) {
  startupError = error;
  // The stack goes to the function log, never to the browser.
  console.error('[startup] The API could not be initialised:', error.message);
  if (error.stack) {
    const firstStackLine = error.stack
      .split(/\r?\n/)
      .slice(1)
      .find((line) => line.trim() && !line.includes('node:internal'));
    if (firstStackLine) console.error(firstStackLine);
    else console.error(error.stack);
  }
  app = buildDiagnosticApp(error);
}

let server = null;

if (startupError) {
  if (isDirectRun) {
    console.error('\n[config] Startup aborted. Set the variables named above, then run `npm run dev` again.\n');
    process.exit(1);
  }
} else if (isDirectRun) {
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
