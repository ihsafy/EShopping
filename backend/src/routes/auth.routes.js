'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const env = require('../config/env');

const router = express.Router();

/** Extra throttling on credential endpoints to slow down brute-force attempts. */
const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

const passwordMatch = (data) =>
  (data.password === data.confirmPassword ? true : 'Passwords do not match');

router.post(
  '/register',
  authLimiter,
  validate({
    body: {
      name: [['required'], ['min', 2], ['max', 120]],
      mobile: [['required'], ['mobile']],
      password: [['required'], ['min', 6], ['max', 100]],
      confirmPassword: [['required']],
      email: [['email']],
      $passwordMatch: passwordMatch,
    },
  }),
  controller.register
);

router.post(
  '/login',
  authLimiter,
  validate({
    body: {
      mobile: [['required'], ['mobile']],
      password: [['required']],
    },
  }),
  controller.login
);

router.post(
  '/admin-login',
  authLimiter,
  validate({
    body: {
      identifier: [['required'], ['min', 3]],
      password: [['required']],
    },
  }),
  controller.adminLogin
);

router.get('/me', protect, controller.me);
router.post('/logout', protect, controller.logout);

router.patch(
  '/profile',
  protect,
  validate({ body: { name: [['required'], ['min', 2], ['max', 120]] } }),
  controller.updateProfile
);

router.post(
  '/change-password',
  protect,
  authLimiter,
  validate({
    body: {
      currentPassword: [['required']],
      newPassword: [['required'], ['min', 6], ['max', 100]],
    },
  }),
  controller.changePassword
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: { mobile: [['required'], ['mobile']] } }),
  controller.forgotPassword
);

module.exports = router;
