'use strict';

/**
 * Where uploaded images end up.
 *
 * Uploads arrive as in-memory buffers. Each one is then persisted either to
 * Cloudinary (production, where the serverless filesystem is ephemeral and gets
 * wiped on every cold start) or to local disk (development, so the existing
 * workflow needs no third-party account).
 *
 * Both paths return the same shape so no caller has to know which one ran.
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const extensionFor = (file) =>
  EXTENSION_BY_MIME[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.jpg';

let cloudinary = null;

/** Lazily configured so a build/test run without credentials still imports. */
const getCloudinary = () => {
  if (!env.usesCloudinary) return null;
  if (!cloudinary) {
    const { v2 } = require('cloudinary');
    cloudinary = v2;
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
  }
  return cloudinary;
};

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const client = getCloudinary();
    const stream = client.uploader.upload_stream(
      { folder: env.cloudinary.folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url) {
          return reject(new Error('Cloudinary returned no URL'));
        }
        return resolve({ url: result.secure_url, name: result.public_id || '' });
      }
    );
    stream.end(buffer);
  });

const writeBufferToDisk = async (buffer, file) => {
  await fs.mkdir(env.uploadDir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extensionFor(file)}`;
  await fs.writeFile(path.join(env.uploadDir, name), buffer);
  return { url: `/uploads/${name}`, name };
};

/**
 * Persists one multer memory-storage file and returns its public URL.
 * Throws an ApiError so a storage outage surfaces as a clean 5xx rather than a
 * raw SDK exception.
 */
const storeFile = async (file) => {
  if (!file || !Buffer.isBuffer(file.buffer)) return null;
  try {
    if (getCloudinary()) return await uploadBufferToCloudinary(file.buffer);
    return await writeBufferToDisk(file.buffer, file);
  } catch (error) {
    console.error('[uploads] failed to persist file:', error.message);
    throw ApiError.internal('Image storage is unavailable. Please try again shortly.');
  }
};

/** Stores every file attached to a request and records its URL on the file. */
const storeRequestFiles = async (req) => {
  const files = req.files;
  if (!files) return req;

  const groups = Array.isArray(files) ? [files] : Object.values(files);
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const file of group) {
      // eslint-disable-next-line no-await-in-loop
      const stored = await storeFile(file);
      if (stored) {
        file.url = stored.url;
        file.storedName = stored.name;
      }
    }
  }
  return req;
};

/** Removes a previously uploaded Cloudinary asset. Best effort. */
const destroyCloudinaryImage = async (publicId) => {
  const client = getCloudinary();
  if (!client) return false;
  try {
    await client.uploader.destroy(publicId, { resource_type: 'image' });
    return true;
  } catch (error) {
    console.error('[uploads] failed to delete', publicId, '-', error.message);
    return false;
  }
};

module.exports = { storeFile, storeRequestFiles, extensionFor, destroyCloudinaryImage };
