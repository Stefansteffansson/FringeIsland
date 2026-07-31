'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Design-system a11y primitive (COR-C W5, Audit III AC3-8) — the focus
 * contract `aria-modal="true"` promises. While `active`: initial focus lands
 * on `initialFocusRef` (else the container's first focusable), Tab/Shift+Tab
 * cycle inside the container, and on deactivation focus returns to the
 * element that had it before the trap engaged. Declaring a modal without this
 * tells AT the page behind is inert while Tab walks straight into it — worse
 * than omitting the dialog role.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), ' +
  'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const initial =
      initialFocusRef?.current ?? container.querySelector<HTMLElement>(FOCUSABLE);
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !container.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreRef.current?.focus();
    };
  }, [active, containerRef, initialFocusRef]);
}
