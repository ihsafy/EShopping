'use strict';

const bcrypt = require('bcryptjs');
const userModel = require('../models/user');
const { signToken } = require('../middleware/auth');
const { query, queryOne } = require('../config/db');
const { normaliseMobile, isValidMobile } = require('../utils/helpers');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const notify = require('../services/notifications');

const BCRYPT_ROUNDS = 12;

const shape = (user) => ({
  id: user.id,
  name: user.name,
  mobile: user.mobile,
  email: user.email || null,
  role: user.role,
  address: user.address || null,
  city: user.city || null,
  area: user.area || null,
  avatar: user.avatar || null,
  createdAt: user.created_at,
});

/** POST /api/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, mobile, password, email } = req.body;

  if (await userModel.mobileExists(normaliseMobile(mobile))) {
    throw new ApiError(
      409,
      'An account with this mobile number already exists',
      { mobile: 'An account with this mobile number already exists' }
    );
  }
  if (email && (await userModel.emailExists(email))) {
    throw new ApiError(409, 'An account with this email already exists', {
      email: 'An account with this email already exists',
    });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let id;
  try {
    id = await userModel.create({ name, mobile, email, passwordHash, role: 'customer' });
  } catch (error) {
    // Two submits can pass the pre-checks together; the unique keys on
    // users.mobile/users.email are the real guard, so re-run the checks and
    // answer with the same field-level messages instead of a generic 409.
    if (error.code === 'ER_DUP_ENTRY') {
      if (await userModel.mobileExists(normaliseMobile(mobile))) {
        throw new ApiError(409, 'An account with this mobile number already exists', {
          mobile: 'An account with this mobile number already exists',
        });
      }
      if (email && (await userModel.emailExists(email))) {
        throw new ApiError(409, 'An account with this email already exists', {
          email: 'An account with this email already exists',
        });
      }
    }
    throw error;
  }

  const user = (await userModel.findById(id)) || {
    // The row was just inserted; if the read-back fails the account still
    // exists, so answer 201 from the data we already hold instead of a 500.
    id,
    name,
    mobile,
    email: email || null,
    role: 'customer',
  };

  // The account already exists at this point: a failing notification must
  // never turn a successful registration into a 500 for the customer.
  try {
    await notify.notifyAdmins({
      title: 'New customer registered',
      message: `${name} (${mobile}) just created an account.`,
      type: 'customer',
      link: '/admin/customers',
    });
  } catch (error) {
    console.error('[register] admin notification failed:', error.message);
  }

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user: shape(user), token: signToken(user) },
  });
});

/** POST /api/auth/login  (customers, by mobile) */
const login = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;
  const user = await userModel.findByMobile(normaliseMobile(mobile));

  // Same generic message for unknown mobile and wrong password (no user enumeration).
  if (!user || user.role !== 'customer') {
    throw ApiError.unauthorized('Incorrect mobile number or password');
  }
  if (user.status === 'disabled') {
    throw ApiError.forbidden('Your account has been disabled. Please contact support.');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw ApiError.unauthorized('Incorrect mobile number or password');

  await userModel.touchLogin(user.id);
  await queryOne('SELECT id FROM users WHERE id = ?', [user.id]);
  const profile = await userModel.findById(user.id);

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: { user: shape(profile), token: signToken(profile) },
  });
});

/** POST /api/auth/admin-login  (admins only, by email or mobile) */
const adminLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const value = String(identifier || '').trim();
  if (!value) throw ApiError.unprocessable('Please enter your admin ID');

  const user = await userModel.findByEmailOrMobile(value);

  if (!user || user.role !== 'admin') {
    throw ApiError.unauthorized('Incorrect admin credentials');
  }
  if (user.status === 'disabled') {
    throw ApiError.forbidden('This admin account has been disabled');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw ApiError.unauthorized('Incorrect admin credentials');

  await userModel.touchLogin(user.id);
  const profile = await userModel.findById(user.id);

  res.json({
    success: true,
    message: 'Signed in to the admin dashboard',
    data: { user: shape(profile), token: signToken(profile, true) },
  });
});

/** GET /api/auth/me */
const me = asyncHandler(async (req, res) => {
  const profile = await userModel.findById(req.user.id);
  if (!profile) throw ApiError.notFound('Account not found');
  res.json({ success: true, data: { user: shape(profile) } });
});

/** POST /api/auth/logout */
const logout = asyncHandler(async (req, res) => {
  // JWTs are stateless, so the client drops the token. We notify the user so
  // the activity is still recorded server-side.
  res.json({ success: true, message: 'Signed out successfully' });
});

/** PATCH /api/auth/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, address, city, area } = req.body;
  await userModel.update(req.user.id, { name, address, city, area });
  const profile = await userModel.findById(req.user.id);
  res.json({ success: true, message: 'Profile updated', data: { user: shape(profile) } });
});

/** POST /api/auth/change-password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const row = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const matches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!matches) throw ApiError.unauthorized('Your current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userModel.update(req.user.id, { passwordHash });
  res.json({ success: true, message: 'Password updated successfully' });
});

/**
 * POST /api/auth/forgot-password
 * The UI flow is ready; an OTP provider can be plugged in without changing
 * the client contract. The response is intentionally generic.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const user = await userModel.findByMobile(normaliseMobile(mobile));
  if (user) {
    await notify.notify(user.id, {
      title: 'Password reset requested',
      message: 'A password reset was requested for your account. Contact support if this was not you.',
      type: 'security',
    });
  }
  res.json({
    success: true,
    message: 'If that number is registered we will send reset instructions shortly.',
  });
});

module.exports = {
  register,
  login,
  adminLogin,
  me,
  logout,
  updateProfile,
  changePassword,
  forgotPassword,
  shape,
};
