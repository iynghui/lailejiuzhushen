import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

export default function Modal({ title, children, onClose, wide = false }) {
  const panel = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('button,input,select')?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = [
          ...panel.current.querySelectorAll(
            'button:not([disabled]),input:not([disabled]),select,[tabindex="0"]',
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={panel}
        className={`sheet ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={22} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
