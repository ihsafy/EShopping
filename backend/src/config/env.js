'use strict';

/**
 * Centralised, validated environment configuration.
 * Secrets are read once here and never logged.
 */
const path = require('path');
const os = require('os');

const required = (key, fallback) => {
  const value = process.env[key];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),

  db: {
    host: required('DATABASE_HOST', '127.0.0.1'),
    port: Number(process.env.DATABASE_PORT || 3306),
    name: required('DATABASE_NAME', 'eshopping'),
    user: required('DATABASE_USER', 'root'),
    password: process.env.DATABASE_PASSWORD || '',
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE || 10),
  },

  jwt: {
    secret: required('JWT_SECRET', 'eshopping_dev_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '12h',
  },

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // The serverless filesystem is read-only apart from the temp directory, so
  // uploads are written there when UPLOAD_DIR is not configured. Note that the
  // temp directory is per-instance and does not survive a cold start: point
  // UPLOAD_DIR at real storage (or move uploads to object storage) before
  // serving real traffic, otherwise admin images vanish on redeploy.
  uploadDir:
    process.env.UPLOAD_DIR ||
    (process.env.VERCEL
      ? path.join(os.tmpdir(), 'eshopping-uploads')
      : path.join(__dirname, '..', '..', 'uploads')),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
  },
};

env.isProd = env.nodeEnv === 'production';

// CORS only accepts the origins in clientUrl when running in production, so a
// deployment that leaves CLIENT_URL at its localhost default will reject every
// POST (login, cart, checkout) with a 403 that looks nothing like a CORS bug.
if (env.isProd && /localhost|127\.0\.0\.1|\[::1\]/i.test(env.clientUrl)) {
  console.warn(
    `[config] CLIENT_URL is "${env.clientUrl}" in production. Set it to the deployed origin, e.g. https://your-app.vercel.app, otherwise CORS will reject browser requests.`
  );
}

module.exports = env;
