import { Children, cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Focus-trapping overlay shared by Modal and Drawer.
 *
 * - ports into <body> so it is never clipped by a transformed ancestor
 * - closes on Escape and on backdrop click
 * - traps Tab, restores focus to the trigger, and locks background scroll
 */
export default function Overlay({
  open,
  onClose,
  variant = 'modal',
  size,
  labelledBy,
  className = '',
  shellClass: shellOverride,
  panelClass: panelOverride,
  children,
  closeOnBackdrop = true,
}) {
  const panelRef = useRef(null);
  const restoreTo = useRef(null);
  const titleId = useId();

  // Keep the latest onClose in a ref so the open/close effect below depends
  // only on `open`. Otherwise a new inline onClose from the parent on every
  // render would re-run the effect (and steal focus back to the first field)
  // on each keystroke, which broke typing inside admin modals.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    restoreTo.current = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    // Compensate for the disappearing scrollbar so the page does not shift.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((node) => node.offsetParent !== null);

    const timer = window.setTimeout(() => {
      const [first] = focusable();
      (first || panelRef.current)?.focus();
    }, 20);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const shellClass =
    shellOverride || (variant === 'drawer' ? 'drawer' : variant === 'backdrop' ? 'backdrop' : 'overlay');

  const defaultPanel = `${
    variant === 'drawer' ? 'drawer-panel' : variant === 'backdrop' ? 'backdrop-panel' : 'modal'
  } ${size ? `modal-${size}` : ''} ${className}`.trim();

  // Wire the generated heading id onto the first ModalHead so the dialog has a
  // real accessible name even though the head is caller-supplied.
  const content = Children.map(children, (child) =>
    isValidElement(child) && child.type === ModalHead ? cloneElement(child, { id: titleId }) : child
  );

  return createPortal(
    <div
      className={shellClass}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        className={panelOverride || defaultPanel}
      >
        {content}
      </div>
    </div>,
    document.body
  );
}

export function ModalHead({ title, subtitle, onClose, closeLabel = 'Close', id }) {
  return (
    <div className="modal-head">
      <div className="grow">
        <h2 className="modal-title" id={id}>
          {title}
        </h2>
        {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
      </div>
      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label={closeLabel}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ModalBody({ children }) {
  return <div className="modal-body">{children}</div>;
}

export function ModalFoot({ children }) {
  return <div className="modal-foot">{children}</div>;
}