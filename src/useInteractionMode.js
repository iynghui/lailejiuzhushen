import { useEffect } from 'react';

export function allowsInteractionMotion() {
  return (
    document.documentElement.dataset.inputMode !== 'keyboard' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function useInteractionMode() {
  useEffect(() => {
    const pointer = () => {
      document.documentElement.dataset.inputMode = 'pointer';
    };
    const keyboard = () => {
      document.documentElement.dataset.inputMode = 'keyboard';
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      delete document.documentElement.dataset.inputMode;
    };
  }, []);
}
