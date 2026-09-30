/** Money is stored as a decimal string by the API (e.g. "6764.00"). */
export const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const formatPrice = (value) => `৳${toNumber(value).toLocaleString('en-US')}`;

export const discountPercent = (product) =>
  Math.max(0, Math.round(toNumber(product?.discount) || 0));

export const formatRating = (value) => toNumber(value).toFixed(1);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
