'use strict';

/**
 * Centralised, validated environment configuration.
 * Secrets are read once here and never logged.
 */
const path = require('path');

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

  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
  },
};

env.isProd = env.nodeEnv === 'production';

module.exports = env;
