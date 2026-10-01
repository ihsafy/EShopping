import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Button from './Button';

/**
 * The one "nothing here" surface. Every list, table and chart that can come
 * back empty renders this instead of a blank region or a fake zero.
 */
export default function EmptyState({
  icon: Icon = FiAlertCircle,
  title,
  text,
  actionLabel,
  onAction,
  action,
  tone = 'neutral',
  compact = false,
}) {
  return (
    <div
      className={`state ${tone === 'danger' ? 'state-danger' : ''} ${compact ? 'state-compact' : ''}`.trim()}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className="state-icon" aria-hidden="true">
        <Icon />
      </span>
      {title ? <p className="state-title">{title}</p> : null}
      {text ? <p className="state-text">{text}</p> : null}
      {action ??
        (actionLabel && onAction ? (
          <div className="state-actions">
            <Button variant="outline" size="sm" icon={FiRefreshCw} onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        ) : null)}
    </div>
  );
}

/** Shown when a request failed - always paired with a retry affordance. */
export function ErrorState({ title = 'Something went wrong', text, onRetry, retrying }) {
  return (
    <EmptyState
      tone="danger"
      icon={FiAlertCircle}
      title={title}
      text={text || 'We could not load this data. Check your connection and try again.'}
      action={
        onRetry ? (
          <div className="state-actions">
            <Button variant="outline" size="sm" icon={FiRefreshCw} loading={retrying} onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : null
      }
    />
  );
}