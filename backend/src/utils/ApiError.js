'use strict';

/** Error that is safe to surface to the client. */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'Authentication required') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'You do not have permission to perform this action') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Resource already exists') {
    return new ApiError(409, msg);
  }
  static unprocessable(msg = 'Validation failed', details) {
    return new ApiError(422, msg, details);
  }
  static tooMany(msg = 'Too many requests, please try again later') {
    return new ApiError(429, msg);
  }
  /** A dependency (storage, third-party API) failed. The detail is logged, not returned. */
  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg);
  }
}

module.exports = ApiError;
