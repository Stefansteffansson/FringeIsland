'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';

/**
 * Design-system primitive (COR-C W5, Audit III AC3-17) — the Hub's shared
 * menu button, per the WAI-ARIA APG pattern: trigger with `aria-haspopup` +
 * `aria-expanded`; popup `role="menu"` with roving-tabindex `menuitem`
 * children; ArrowUp/Down wrap, Home/End jump, Escape closes and returns focus
 * to the trigger; click-outside closes. Items are links (Next `Link`) or
 * actions; a menu that needs richer children is not a menu — use a disclosure
 * popup instead (the NotificationBell precedent).
 */
export interface MenuEntry {
  key: string;
  label: ReactNode;
  /** Rendered as a Next Link when given; otherwise a button running onSelect. */
  href?: string;
  onSelect?: () => void;
  /** Item styling override (e.g. the destructive sign-out row). */
  className?: string;
}

/** Colour left to the entry (default gray) so overrides like the destructive
 *  sign-out row never fight the base class for the same utility slot. */
const ITEM_CLASS =
  'block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none';

export function Menu({
  buttonContent,
  buttonAriaLabel,
  buttonClassName =
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100',
  menuLabel,
  items,
  menuClassName =
    'absolute right-0 z-40 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-xl',
}: {
  buttonContent: ReactNode;
  buttonAriaLabel: string;
  buttonClassName?: string;
  menuLabel?: string;
  items: MenuEntry[];
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  const close = useCallback(
    (returnFocus: boolean) => {
      setOpen(false);
      setActiveIndex(0);
      if (returnFocus) triggerRef.current?.focus();
    },
    [],
  );

  // Focus follows the roving index while open (APG: focus, not aria-activedescendant).
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(items.length - 1);
    }
  };

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      // Tab leaves the menu; close without stealing the move.
      close(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={buttonAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={onTriggerKeyDown}
        className={buttonClassName}
      >
        {buttonContent}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden="true" onClick={() => close(false)} />
          <div
            role="menu"
            aria-label={menuLabel ?? buttonAriaLabel}
            onKeyDown={onMenuKeyDown}
            className={menuClassName}
          >
            {items.map((item, index) => {
              const shared = {
                role: 'menuitem' as const,
                tabIndex: index === activeIndex ? 0 : -1,
                className: `${ITEM_CLASS} ${item.className ?? 'text-gray-700'}`,
                onFocus: () => setActiveIndex(index),
              };
              return item.href ? (
                <Link
                  key={item.key}
                  href={item.href}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => close(false)}
                  {...shared}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => {
                    close(false);
                    item.onSelect?.();
                  }}
                  {...shared}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
