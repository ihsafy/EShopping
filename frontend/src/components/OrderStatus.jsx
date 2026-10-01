import { FiAlertCircle, FiCheck, FiCheckCircle, FiClock, FiTruck, FiXCircle } from 'react-icons/fi';

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

/* Dual-indicator status icons: colour is never the only signal. */
const STATUS_ICON = {
  pending: FiClock,
  confirmed: FiCheckCircle,
  processing: FiClock,
  shipped: FiTruck,
  delivered: FiCheckCircle,
  cancelled: FiXCircle,
};

const STEP_LABELS = {
  pending: 'Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const capitalise = (value) =>
  value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : '';

export function StatusPill({ status }) {
  const Icon = STATUS_ICON[String(status || '').toLowerCase()] || FiAlertCircle;
  return (
    <span className="status-pill" data-status={status}>
      <Icon className="status-pill__icon" aria-hidden="true" />
      {capitalise(status)}
    </span>
  );
}

export default function OrderSteps({ status }) {
  if (status === 'cancelled') {
    return <p className="track-note">This order was cancelled.</p>;
  }

  const rawIndex = STEPS.indexOf(status);
  const activeIndex = rawIndex < 0 ? 0 : rawIndex;
  const progress = STEPS.length > 1 ? activeIndex / (STEPS.length - 1) : 0;

  return (
    <ol className="track-steps" style={{ '--progress': progress }}>
      {STEPS.map((step, index) => {
        const state = index < activeIndex ? 'is-complete' : index === activeIndex ? 'is-current' : 'is-upcoming';
        return (
          <li
            key={step}
            className={state}
            style={{ '--i': index }}
            aria-current={index === activeIndex ? 'step' : undefined}
          >
            <span className="track-steps__dot" aria-hidden="true">
              {index < activeIndex ? <FiCheck size={11} strokeWidth={3} /> : null}
            </span>
            <span className="track-steps__label">{STEP_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
