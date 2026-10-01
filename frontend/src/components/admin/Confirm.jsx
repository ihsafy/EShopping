import Modal from './Modal';
import Button from '../ui/Button';

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
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="admin-confirm__text">{message}</p>
    </Modal>
  );
}
