'use strict';

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/** 404 handler for unmatched routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} was not found`));
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational || statusCode < 500;

  if (statusCode >= 500) {
    // Full detail only ever goes to the server log, never to the client.
    console.error('[ERROR]', {
      method: req.method,
      url: req.originalUrl,
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
  }

  const body = {
    success: false,
    message: isOperational ? err.message : 'Something went wrong on our side. Please try again.',
  };

  if (err.details) body.errors = err.details;

  // Translate common database errors into safe, meaningful messages.
  if (err.code === 'ER_DUP_ENTRY') {
    body.message = 'That record already exists';
    body.statusCode = 409;
  } else if (
    [
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EPIPE',
      'PROTOCOL_CONNECTION_LOST',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
      'ER_ACCESS_DENIED_ERROR',
      'ER_CON_COUNT_ERROR',
    ].includes(err.code)
  ) {
    body.message = 'Service temporarily unavailable. Please try again shortly.';
    body.statusCode = 503;
  } else if (err.type === 'entity.parse.failed') {
    // Never surface the raw JSON parser message (it echoes the payload).
    body.message = 'Invalid JSON payload. Please try again.';
    body.statusCode = 400;
  } else if (err.type === 'entity.too.large') {
    body.message = 'Request too large.';
    body.statusCode = 413;
  }

  body.statusCode = body.statusCode || statusCode;
  if (env.isProd) delete body.stack;

  res.status(body.statusCode).json(body);
}
/* eslint-enable no-unused-vars */

module.exports = { notFound, errorHandler };
