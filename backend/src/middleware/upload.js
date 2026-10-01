'use strict';

const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { storeRequestFiles } = require('../services/fileStorage');

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/**
 * Files are buffered in memory and then handed to the storage service, which
 * writes them to Cloudinary in production and to local disk in development.
 * Nothing is written to disk by multer itself, so the same middleware works on
 * a read-only serverless filesystem.
 */
const upload = multer({
  storage: multer.memoryStorage(),
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

/**
 * Runs after multer has populated req.files: persists every buffer and records
 * the resulting public URL on each file as `file.url`.
 */
const persistUploads = (req, res, next) => {
  storeRequestFiles(req)
    .then(() => next())
    // storeRequestFiles already converts storage failures into an ApiError.
    .catch(next);
};

module.exports = { upload, handleUpload, persistUploads };
