import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

/** Centred dialog used for the admin forms and confirmations. */
export default function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="admin-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={`admin-modal__card${wide ? ' admin-modal__card--wide' : ''}`}>
        <div className="admin-modal__head">
          <h2>{title}</h2>
          <button type="button" className="admin-modal__x" aria-label="Close" onClick={onClose}>
            <FiX size={17} />
          </button>
        </div>
        <div className="admin-modal__body">{children}</div>
        {footer && <div className="admin-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
