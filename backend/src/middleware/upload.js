'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Runs at import time. A read-only or otherwise unusable directory must not
// take the whole API down with it, so this warns and lets multer surface a
// per-request error instead of crashing every route during a cold start.
try {
  fs.mkdirSync(env.uploadDir, { recursive: true });
} catch (error) {
  console.error(`[uploads] Cannot create ${env.uploadDir}: ${error.message}`);
  console.error('[uploads] Image uploads will fail. Set UPLOAD_DIR to a writable location.\n');
}

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadDir),
  filename: (req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'));
    }
    return cb(null, true);
  },
});

/** Wraps multer so its errors become friendly ApiErrors. */
const handleUpload = (middleware) => (req, res, next) =>
  middleware(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Image is larger than the 4MB limit'));
      return next(ApiError.badRequest('Image upload failed'));
    }
    return next(err);
  });

module.exports = { upload, handleUpload };
