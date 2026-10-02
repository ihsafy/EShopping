'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * backend/.env is loaded from its own directory rather than from process.cwd()
 * so it is picked up whether the API is started from the repository root
 * (`npm run dev:backend`) or from inside `backend/`.
 *
 * Without this call the whole file was silently ignored and every setting fell
 * back to the localhost defaults further down - which is exactly why a
 * deployment with no Vercel environment variables tried to reach MySQL on
 * 127.0.0.1. Real environment variables still win, so Vercel is unaffected.
 */
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// TiDB Cloud Serverless is addressed with the DB_* names, while the local
// MySQL setup (and every existing .env) uses DATABASE_*. Reading both keeps a
// single codebase working against either without duplicating config.
const dbVar = (primary, legacy, fallback) => {
  const value = process.env[primary] || process.env[legacy];
  return value !== undefined && value !== '' ? value : fallback;
};

const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
};

/**
 * TiDB Cloud signs its server certificate with its own CA rather than a public
 * one, so certificate verification only works when that CA is supplied. Paste
 * it into DB_SSL_CA (newlines may be written as literal \n) or point
 * DB_SSL_CA_PATH at a file bundled with the deployment.
 */
const readSslCa = () => {
  const inline = process.env.DB_SSL_CA;
  if (inline) return inline.replace(/\\n/g, '\n');
  const caPath = process.env.DB_SSL_CA_PATH;
  if (!caPath) return undefined;
  try {
    return fs.readFileSync(caPath, 'utf8');
  } catch (error) {
    console.warn(`[config] DB_SSL_CA_PATH "${caPath}" could not be read: ${error.message}`);
    return undefined;
  }
};

const sslCa = readSslCa();

const dbHost = dbVar('DB_HOST', 'DATABASE_HOST', '127.0.0.1');
const dbPort = Number(dbVar('DB_PORT', 'DATABASE_PORT', 3306));

// TiDB Cloud Serverless requires TLS. A plain MySQL server may not support it
// at all and fails the handshake with HANDSHAKE_NO_SSL_SUPPORT, so TLS is only
// switched on for TiDB hosts (or when DB_SPL says so explicitly) rather than
// unconditionally.
const sslEnabled = bool(process.env.DB_SSL, /tidbcloud\.com$/i.test(dbHost));

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
    host: dbHost,
    port: dbPort,
    name: dbVar('DB_NAME', 'DATABASE_NAME', 'eshopping'),
    user: dbVar('DB_USER', 'DATABASE_USER', 'root'),
    password: dbVar('DB_PASSWORD', 'DATABASE_PASSWORD', ''),
    connectionLimit: Number(dbVar('DB_POOL_SIZE', 'DATABASE_POOL_SIZE', 10)),
    ssl: sslEnabled
      ? {
          ...(sslCa ? { ca: sslCa } : {}),
          minVersion: 'TLSv1.2',
          // Verification is only meaningful with the CA present; without it a
          // strict check fails the handshake instead of connecting.
          rejectUnauthorized: Boolean(sslCa),
        }
      : undefined,
  },

  jwt: {
    secret: required('JWT_SECRET', 'eshopping_dev_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '12h',
  },

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Where new uploads are written. Ephemeral on Vercel.
  // On Vercel the writable disk is temporary, so without Cloudinary the upload
  // directory is forced to the OS temp dir. An explicit UPLOAD_DIR is honoured
  // everywhere EXCEPT on Vercel, where a relative or repository path would be
  // read-only or would write into the bundle: backend/.env ships
  // UPLOAD_DIR=./uploads for development, and that value previously won on
  // Vercel too, so uploads were written to a path the function cannot persist.
  uploadDir:
    (process.env.VERCEL ? '' : process.env.UPLOAD_DIR) ||
    (process.env.VERCEL
      ? path.join(os.tmpdir(), 'eshopping-uploads')
      : path.join(__dirname, '..', '..', 'uploads')),

  /**
   * The uploads folder as committed to the repository. Existing product,
   * banner and category rows still reference /uploads/<file>, so this read-only
   * copy keeps those images resolving after deployment even once new uploads go
   * to Cloudinary. Identical to uploadDir during local development.
   */
  bundledUploadDir: path.join(__dirname, '..', '..', 'uploads'),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'eshopping',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
  },
};

env.isProd = env.nodeEnv === 'production' || Boolean(process.env.VERCEL);

/**
 * Names of the variables a production deployment must define. Only the NAMES are
 * ever exposed (through /api/health) so a misconfigured deployment can be
 * diagnosed from the outside without any secret reaching the browser.
 */
env.requiredProdVars = [
  { key: 'JWT_SECRET', set: () => Boolean(process.env.JWT_SECRET) },
  { key: 'DB_HOST', set: () => Boolean(dbVar('DB_HOST', 'DATABASE_HOST', '')) },
  { key: 'DB_NAME', set: () => Boolean(dbVar('DB_NAME', 'DATABASE_NAME', '')) },
  { key: 'DB_USER', set: () => Boolean(dbVar('DB_USER', 'DATABASE_USER', '')) },
  { key: 'DB_PASSWORD', set: () => dbVar('DB_PASSWORD', 'DATABASE_PASSWORD', 'x') !== 'x' },
  { key: 'CLIENT_URL', set: () => Boolean(process.env.CLIENT_URL) },
];

env.missingProdVars = env.requiredProdVars.filter((v) => !v.set()).map((v) => v.key);

env.usesCloudinary = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

// A deployment that boots with the built-in development secret would sign every
// session with a value that is published in this repository. Throwing here
// produces a readable stack trace in the function logs; process.exit() would
// only report "function crashed" on a serverless runtime.
if (env.isProd && (!process.env.JWT_SECRET || env.jwt.secret.includes('dev_secret'))) {
  const msg = !process.env.JWT_SECRET
    ? 'Missing required environment variable in production: JWT_SECRET'
    : 'JWT_SECRET must be set to a strong unique value in production (the built-in development secret is refused).';
  const error = new Error(msg);
  error.code = 'CONFIG_MISSING_ENV';
  throw error;
}

// CORS only accepts the origins in clientUrl when running in production, so a
// deployment that leaves CLIENT_URL at its localhost default will reject every
// POST (login, cart, checkout) with a 403 that looks nothing like a CORS bug.
if (env.isProd && /localhost|127\.0\.0\.1|\[::1\]/i.test(env.clientUrl)) {
  console.warn(
    `[config] CLIENT_URL is "${env.clientUrl}" in production. Set it to the deployed origin, e.g. https://your-app.vercel.app, otherwise CORS will reject browser requests.`
  );
}

if (env.isProd && env.db.ssl && !env.db.ssl.ca) {
  console.warn(
    '[config] TLS is enabled for the database but no CA was supplied, so the certificate cannot be verified. Set DB_SSL_CA to the PEM certificate from TiDB Cloud to enable full verification.'
  );
}

if (env.isProd && !env.usesCloudinary) {
  console.warn(
    '[config] CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are not all set, so uploads fall back to local disk. On Vercel that disk is ephemeral and images will disappear on the next cold start.'
  );
}

// Falling through to the built-in 127.0.0.1 default means the deployment is
// still pointing at a developer's own machine, which is unreachable from
// Vercel. Unlike the JWT check this only warns: the read endpoints still answer
// with a clean 503 (and /api/health reports database=down), which is a far more
// useful symptom than refusing to boot at all.
if (env.isProd && !process.env.DB_HOST && !process.env.DATABASE_HOST) {
  console.warn(
    '[config] Neither DB_HOST nor DATABASE_HOST is set, so the database falls back to 127.0.0.1. A Vercel deployment cannot reach a database on the local machine - set DB_HOST to a remote MySQL/TiDB host.'
  );
}

if (env.isProd && env.missingProdVars.length) {
  console.warn(
    `[config] Not set in this deployment: ${env.missingProdVars.join(', ')} (names only, values are never logged).`
  );
}

module.exports = env;
