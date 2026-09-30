'use strict';

const express = require('express');
const path = require('path');
const { protect, requireRole } = require('../middleware/auth');
const { handleUpload, upload } = require('../middleware/upload');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const router = express.Router();

/** POST /api/uploads - generic image upload used by the admin forms. */
router.post(
  '/',
  protect,
  requireRole('admin'),
  handleUpload(upload.array('files', 8)),
  (req, res) => {
    const files = req.files || [];
    if (!files.length) throw ApiError.badRequest('No image was uploaded');
    res.status(201).json({
      success: true,
      message: `${files.length} image(s) uploaded`,
      data: {
        urls: files.map((file) => `/uploads/${file.filename}`),
        files: files.map((file) => ({ name: file.filename, size: file.size, url: `/uploads/${file.filename}` })),
      },
    });
  }
);

module.exports = router;
