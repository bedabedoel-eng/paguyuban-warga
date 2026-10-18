import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Dialog; tampil sebagai lembar bawah (bottom sheet) di HP. */
export default function Modal({ open, onClose, title, desc, children, footer, wide }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = [...f].filter((el) => !el.disabled && el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0]; const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const el = ref.current?.querySelector('[autofocus], .modal-body input, .modal-body select, .modal-body textarea') || ref.current?.querySelector('.modal-foot .btn:last-child');
      el?.focus();
    }, 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; prevFocus?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <div className="grow">
            <h2 id={titleId}>{title}</h2>
            {desc && <p>{desc}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
