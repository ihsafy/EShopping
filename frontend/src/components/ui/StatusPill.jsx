import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiMinusCircle,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi';

/**
 * Status pill for orders, payments and conversations.
 * `STATUS_TONE` is the single place that maps a status string to the shared
 * palette, so every screen agrees on colour without repeating the mapping.
 * Every tone also renders an icon so the state is conveyed without relying on
 * colour alone (colour-blind / low-vision accessible).
 */

const TONE_ICON = {
  success: FiCheckCircle,
  delivered: FiCheckCircle,
  confirmed: FiCheckCircle,
  pending: FiClock,
  processing: FiClock,
  shipped: FiTruck,
  warning: FiAlertTriangle,
  danger: FiXCircle,
  cancelled: FiXCircle,
  info: FiInfo,
  neutral: FiMinusCircle,
};

export const ORDER_STATUS_TONE = {
  pending: 'pending',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

export const GENERIC_TONE = {
  active: 'success',
  inactive: 'neutral',
  archived: 'neutral',
  draft: 'warning',
  published: 'success',
  scheduled: 'info',
  expired: 'danger',
  paid: 'success',
  unpaid: 'warning',
  refunded: 'neutral',
  open: 'info',
  closed: 'neutral',
  answered: 'success',
  pending_reply: 'warning',
  low: 'warning',
  out: 'danger',
};

const LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
  draft: 'Draft',
  published: 'Published',
  scheduled: 'Scheduled',
  expired: 'Expired',
  paid: 'Paid',
  unpaid: 'Unpaid',
  refunded: 'Refunded',
  open: 'Open',
  closed: 'Closed',
  answered: 'Answered',
  pending_reply: 'Awaiting reply',
  low: 'Low stock',
  out: 'Out of stock',
};

/** Accepts `confirmed`, `CONFIRMED`, `Confirmed`, ` confirmed ` - always returns a tone. */
export function statusTone(status) {
  if (!status) return 'neutral';
  const raw = String(status).trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ORDER_STATUS_TONE[raw] || GENERIC_TONE[raw] || 'neutral';
}

export function statusLabel(status, fallback) {
  if (!status) return fallback ?? 'Unknown';
  const raw = String(status).trim();
  return LABELS[raw.toLowerCase()] || fallback || raw;
}

export default function StatusPill({ status, label, tone, dot = false, icon = true, className = '' }) {
  const resolvedTone = tone || statusTone(status);
  const Icon = TONE_ICON[resolvedTone] || FiInfo;
  return (
    <span className={`badge status-${resolvedTone} ${className}`.trim()}>
      {icon ? (
        <Icon className="badge__icon" aria-hidden="true" />
      ) : dot ? (
        <i className="badge-dot" aria-hidden="true" />
      ) : null}
      <span className="badge__label">{label ?? statusLabel(status)}</span>
    </span>
  );
}