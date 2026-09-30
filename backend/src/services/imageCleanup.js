'use strict';

const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { queryOne } = require('../config/db');

/**
 * Removes uploaded files that no database row points at any more, so editing
 * or deleting a product/banner does not leave dead files behind.
 *
 * Everything is deliberately fail-safe: a broken path or a failed lookup can
 * never make the CRUD operation itself fail.
 */
function toDiskPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return null;
  const name = path.basename(url);
  if (!name) return null;
  return path.join(env.uploadDir, name);
}

async function isReferenced(url) {
  const checks = await Promise.all([
    queryOne('SELECT 1 AS hit FROM product_images WHERE image_url = ? LIMIT 1', [url]),
    queryOne('SELECT 1 AS hit FROM banners WHERE image_url = ? OR mobile_image_url = ? LIMIT 1', [url, url]),
    queryOne('SELECT 1 AS hit FROM categories WHERE image_url = ? LIMIT 1', [url]),
    queryOne('SELECT 1 AS hit FROM store_settings WHERE setting_value = ? LIMIT 1', [url]),
  ]);
  return checks.some(Boolean);
}

async function cleanupImages(urls) {
  const list = [...new Set((Array.isArray(urls) ? urls : [urls]).filter(Boolean))];
  for (const url of list) {
    try {
      const disk = toDiskPath(url);
      if (!disk) continue;
      if (await isReferenced(url)) continue;
      if (fs.existsSync(disk)) fs.unlinkSync(disk);
    } catch (err) {
      // Cleanup is best effort only.
    }
  }
}

/** Returns the URLs that were present before but are gone from `after`. */
function removedUrls(before = [], after = []) {
  const keep = new Set(after.filter(Boolean));
  return before.filter((url) => url && !keep.has(url));
}

module.exports = { cleanupImages, removedUrls };
