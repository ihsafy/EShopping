/**
 * Canonical order pipeline shared by every admin and storefront screen.
 * Mirrors `backend/src/utils/helpers.js` so the UI and the API agree on the
 * status set, order and labels.
 */
export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const ALIASES = {
  canceled: 'cancelled',
  cancel: 'cancelled',
  complete: 'delivered',
  completed: 'delivered',
  intransit: 'shipped',
  shippedout: 'shipped',
  packed: 'processing',
  placed: 'confirmed',
};

/** Folds any spelling (case/space/hyphen/alias) into a canonical status. */
export function normaliseOrderStatus(value) {
  if (!value) return 'pending';
  const key = String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALIASES[key] || (ORDER_STATUSES.includes(key) ? key : 'pending');
}

export function orderStatusLabel(value) {
  return ORDER_STATUS_LABELS[normaliseOrderStatus(value)] || 'Pending';
}
