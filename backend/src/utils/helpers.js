'use strict';

const crypto = require('crypto');

/** URL-safe slug: "Samsung Galaxy A55" -> "samsung-galaxy-a55" */
function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'item';
}

/** Escapes LIKE wildcards so user input cannot alter the search pattern. */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Bangladeshi / international mobile normalisation used for uniqueness. */
function normaliseMobile(value) {
  let mobile = String(value || '').replace(/[\s\-()]/g, '');
  if (mobile.startsWith('+880')) mobile = `0${mobile.slice(4)}`;
  if (mobile.startsWith('880') && mobile.length === 13) mobile = `0${mobile.slice(3)}`;
  return mobile;
}

const isValidMobile = (value) => /^01[3-9]\d{8}$/.test(normaliseMobile(value));

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());

/** Rounds money to 2 decimals to avoid floating point drift. */
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * sale_price = original_price - (original_price * discount / 100)
 * Returns the discounted price, never below 0.
 */
function computeSalePrice(originalPrice, discountPercent) {
  const original = Number(originalPrice) || 0;
  const discount = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
  return money(original - (original * discount) / 100);
}

/** Human readable order number, e.g. ESH-2026-000042 */
function buildOrderNumber(id, date = new Date()) {
  const year = date.getFullYear();
  return `ESH-${year}-${String(id).padStart(6, '0')}`;
}

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

/** Statuses in which an order still counts as a valid purchase. */
const PURCHASE_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

function randomCode(bytes = 4) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase();
}

/** Removes undefined/null keys so partial UPDATEs build clean SQL. */
function pickDefined(object, keys) {
  const result = {};
  keys.forEach((key) => {
    if (object[key] !== undefined) result[key] = object[key];
  });
  return result;
}

function toBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

module.exports = {
  slugify,
  escapeLike,
  normaliseMobile,
  isValidMobile,
  isValidEmail,
  money,
  computeSalePrice,
  buildOrderNumber,
  ORDER_STATUSES,
  PURCHASE_STATUSES,
  randomCode,
  pickDefined,
  toBool,
};
