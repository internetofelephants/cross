import { useEffect, useRef } from 'react';

/**
 * Calls `onEscape` when the Escape key is pressed, while `enabled` is true.
 * The handler is read through a ref, so callers can pass a fresh closure every
 * render without re-binding the listener.
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  const handlerRef = useRef(onEscape);
  useEffect(() => {
    handlerRef.current = onEscape;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
