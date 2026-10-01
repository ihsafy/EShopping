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

/**
 * Canonical order-status list, in the order the pipeline actually runs.
 * Everything the app stores, validates, filters and charts must match one of
 * these lowercase keys.
 */
const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

/** Human labels for the canonical statuses (charts, badges, filters). */
const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/**
 * Spellings that show up in real data (imports, older rows, manual edits) and
 * the canonical status each one belongs to. Keys are compared after the raw
 * value has been trimmed and lower-cased.
 */
const ORDER_STATUS_ALIASES = {
  '': 'pending',
  new: 'pending',
  order: 'pending',
  placed: 'pending',
  awaiting: 'pending',
  confirm: 'confirmed',
  accepted: 'confirmed',
  pack: 'processing',
  packed: 'processing',
  preparing: 'processing',
  in_progress: 'processing',
  'in progress': 'processing',
  dispatched: 'shipped',
  out_for_delivery: 'shipped',
  'out for delivery': 'shipped',
  completed: 'delivered',
  complete: 'delivered',
  success: 'delivered',
  cancel: 'cancelled',
  canceled: 'cancelled',
  cancel_Requested: 'cancelled',
  returned: 'cancelled',
};

/**
 * Normalises any raw `order_status` coming from the database (or a client) to
 * the canonical key. Case, padding, dashes/underscores and the
 * canceled/cancelled spelling are all absorbed here, so callers never have to
 * guess. Unknown values collapse to `pending` (the schema default) instead of
 * leaking a stray bucket into charts and filters.
 */
function normaliseOrderStatus(value) {
  const raw = String(value == null ? '' : value).trim().toLowerCase();
  if (!raw) return 'pending';
  if (ORDER_STATUSES.includes(raw)) return raw;
  const squashed = raw.replace(/[\s_-]+/g, ' ');
  if (ORDER_STATUS_ALIASES[squashed]) return ORDER_STATUS_ALIASES[squashed];
  if (ORDER_STATUS_ALIASES[raw]) return ORDER_STATUS_ALIASES[raw];
  return 'pending';
}

/** Sorts a list of status values into the canonical pipeline order. */
const orderStatusRank = (value) => {
  const index = ORDER_STATUSES.indexOf(normaliseOrderStatus(value));
  return index === -1 ? ORDER_STATUSES.length : index;
};

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
  ORDER_STATUS_LABELS,
  normaliseOrderStatus,
  orderStatusRank,
  PURCHASE_STATUSES,
  randomCode,
  pickDefined,
  toBool,
};
