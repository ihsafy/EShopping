'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { queryOne } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user, isAdmin = false) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    env.jwt.secret,
    { expiresIn: isAdmin ? env.jwt.adminExpiresIn : env.jwt.expiresIn }
  );
}

/** Extracts a bearer token from the Authorization header. */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (typeof req.query.token === 'string' && req.query.token) return req.query.token;
  return null;
}

const loadUser = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch (error) {
    throw ApiError.unauthorized(
      error.name === 'TokenExpiredError' ? 'Session expired, please sign in again' : 'Invalid token'
    );
  }

  const user = await queryOne(
    'SELECT id, name, mobile, email, role, status, address, city, area, avatar, created_at FROM users WHERE id = ? LIMIT 1',
    [payload.sub]
  );

  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status === 'disabled') throw ApiError.forbidden('Your account has been disabled');
  return user;
};

/** Verifies a JWT and attaches req.user. */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Please sign in to continue');
  req.user = await loadUser(token);
  next();
});

/** Attaches req.user when a valid token is present, but never blocks. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await loadUser(token);
    } catch (error) {
      req.user = null;
    }
  }
  next();
});

/** Role guard. Use after `protect`. */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('This area is restricted to administrators'));
    }
    return next();
  };

module.exports = { signToken, protect, optionalAuth, requireRole };
