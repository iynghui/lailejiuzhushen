import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { allowsInteractionMotion } from '../useInteractionMode.js';

export default function Modal({ title, children, onClose, wide = false, kind }) {
  const panel = useRef();
  const latestClose = useRef(onClose);
  latestClose.current = onClose;
  const closeTimer = useRef();
  const isClosing = useRef(false);
  const backdropPress = useRef(false);
  const [closing, setClosing] = useState(false);
  const dismiss = useCallback((afterClose) => {
    if (isClosing.current) return;
    isClosing.current = true;
    const finish = () => {
      if (typeof afterClose === 'function') afterClose();
      else latestClose.current();
    };
    if (!allowsInteractionMotion()) {
      finish();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(finish, 140);
  }, []);

  useEffect(() => {
    const previous = document.activeElement;
    const scrollY = window.scrollY;
    const body = document.body;
    const properties = ['overflow', 'position', 'top', 'width', 'paddingRight'];
    const original = Object.fromEntries(properties.map((key) => [key, body.style[key]]));
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, {
      overflow: 'hidden',
      position: 'fixed',
      top: `-${scrollY}px`,
      width: '100%',
      paddingRight: `${padding + scrollbar}px`,
    });
    panel.current?.querySelector('button,input,select,a[href]')?.focus({ preventScroll: true });
    const key = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
      if (event.key !== 'Tab') return;
      const nodes = [
        ...panel.current.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length && !node.closest('[hidden],[inert]'));
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || !panel.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      window.clearTimeout(closeTimer.current);
      Object.assign(body.style, original);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      document.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [dismiss]);

  return createPortal(
    <div
      className="overlay"
      data-state={closing ? 'closing' : 'open'}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) dismiss();
        backdropPress.current = false;
      }}
      onPointerCancel={() => {
        backdropPress.current = false;
      }}
    >
      <section
        ref={panel}
        className={`sheet ${wide ? 'wide' : ''}`}
        data-kind={kind}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        inert={closing ? true : undefined}
      >
        <header className="sheet-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={() => dismiss()} aria-label="关闭">
            <X size={22} />
          </button>
        </header>
        {typeof children === 'function' ? children(dismiss) : children}
      </section>
    </div>,
    document.body,
  );
}
