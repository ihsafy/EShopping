import Modal from './Modal';

/**
 * Two-step deletion guard: destructive actions are never executed by a single
 * click, the administrator always has to confirm the exact wording first.
 */
export default function Confirm({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <Modal
      title={title}
      onClose={busy ? undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="admin-confirm__text">{message}</p>
    </Modal>
  );
}
