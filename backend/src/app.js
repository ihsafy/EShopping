'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { healthCheck } = require('./config/db');
const ApiError = require('./utils/ApiError');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRouter = require('./routes/upload.routes');

const app = express();

// Behind Vercel/Render the client IP arrives in x-forwarded-for.
app.set('trust proxy', 1);

app.use(
  helmet({
    // The API only ever serves JSON and images, so a strict CSP is safe here.
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:'] } },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = env.clientUrl
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// In development the Vite dev server moves to another port (5174, 5175, ...)
// whenever 5173 is taken, and `npm run preview` serves on 4173. Those origins
// reach the API through the same-origin proxy, so rejecting them only made
// every POST (register/login) answer a misleading 500 while page loads - which
// carry no Origin header - kept working.
const DEV_LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // curl, server-to-server, same-origin GETs
  if (allowedOrigins.includes(origin)) return true;
  return !env.isProd && DEV_LOCAL_ORIGIN.test(origin);
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      // Operational 403 (not a raw Error) so this reads as a policy decision
      // instead of falling through the generic 500 handler.
      return callback(
        ApiError.forbidden('This origin is not allowed to call the API. Try again from the official site.')
      );
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!env.isProd) app.use(morgan('dev'));

app.use(
  '/api',
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);

// Uploaded product/banner images are served straight from disk.
app.use('/uploads', express.static(env.uploadDir, { maxAge: env.isProd ? '30d' : 0 }));

app.get('/api/health', async (req, res) => {
  let database = 'down';
  try {
    database = (await healthCheck()) ? 'up' : 'down';
  } catch (error) {
    database = 'down';
  }
  res.status(database === 'up' ? 200 : 503).json({
    success: database === 'up',
    service: 'EShopping API',
    version: require('../package.json').version,
    database,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api', userRoutes);
app.use('/api/uploads', uploadRouter);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
