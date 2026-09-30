const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STEP_LABELS = {
  pending: 'Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

export function StatusPill({ status }) {
  return (
    <span className="status-pill" data-status={status}>
      {status}
    </span>
  );
}

export default function OrderSteps({ status }) {
  if (status === 'cancelled') {
    return <p className="track-note">This order was cancelled.</p>;
  }

  const activeIndex = STEPS.indexOf(status);

  return (
    <ol className="track-steps">
      {STEPS.map((step, index) => (
        <li key={step} className={index <= activeIndex ? 'is-done' : index === activeIndex + 1 ? 'is-next' : ''}>
          <span className="track-steps__dot" aria-hidden="true" />
          <span className="track-steps__label">{STEP_LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}
