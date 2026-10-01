import { useId } from 'react';
import { FiX } from 'react-icons/fi';
import Overlay from '../ui/Overlay';

/**
 * Centred dialog used for the admin forms and confirmations.
 * Thin adapter over the shared Overlay so every admin modal gets the same
 * focus trap, Escape handling, scroll lock and focus restore.
 */
export default function Modal({ title, onClose, children, footer, wide = false }) {
  const titleId = useId();

  return (
    <Overlay
      open
      onClose={() => onClose?.()}
      labelledBy={titleId}
      shellClass="admin-modal"
      panelClass={`admin-modal__card${wide ? ' admin-modal__card--wide' : ''}`}
    >
      <div className="admin-modal__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="admin-modal__x" aria-label="Close" onClick={onClose}>
          <FiX size={17} />
        </button>
      </div>
      <div className="admin-modal__body">{children}</div>
      {footer && <div className="admin-modal__foot">{footer}</div>}
    </Overlay>
  );
}