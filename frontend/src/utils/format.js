/** Money is stored as a decimal string by the API (e.g. "6764.00"). */
export const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const formatPrice = (value) => `৳${toNumber(value).toLocaleString('en-US')}`;

export const discountPercent = (product) =>
  Math.max(0, Math.round(toNumber(product?.discount) || 0));

export const formatRating = (value) => toNumber(value).toFixed(1);

/** Title-cases a snake/kebab/space separated API token for display. */
export const titleCase = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const PAYMENT_METHOD_LABELS = {
  cod: 'COD',
  card: 'Card',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bank: 'Bank transfer',
  stripe: 'Card',
  paypal: 'PayPal',
};

export const formatPaymentMethod = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] || titleCase(value);
};

export const formatPaymentStatus = (value) => titleCase(value);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
