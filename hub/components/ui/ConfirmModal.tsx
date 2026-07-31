'use client';

import { useEffect, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

/**
 * Design-system primitive — the Hub's confirmation modal. Every destructive or
 * yes/no decision flows through this, never browser `confirm()`/`alert()` (Hub
 * CLAUDE.md): native dialogs are unstyled, blocking, inconsistent across
 * browsers, and bypass the component-test path. Copy-with-correction from the
 * hub-legacy oracle, adapted to house style — named export (like `Button`),
 * `data-testid` hooks, and a `busy` in-flight state for async confirms (e.g. the
 * explicit-erase farewell, which awaits a server round-trip before navigating).
 */
export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  busy?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
  busy = false,
}: ConfirmModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // COR-C W5 (AC3-8): the focus contract aria-modal promises — initial focus
  // on Cancel for a destructive ask (the safe default), Confirm otherwise;
  // Tab cycles inside; focus returns to the opener on close.
  useFocusTrap(containerRef, isOpen, variant === 'danger' ? cancelRef : confirmRef);

  // Close on Escape (but never mid-flight — a busy confirm must resolve).
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, busy, onCancel]);

  if (!isOpen) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-danger hover:bg-danger-hover'
      : variant === 'warning'
        ? 'bg-warning hover:bg-warning-hover'
        : 'bg-primary hover:bg-primary-hover';

  return (
    <div
      ref={containerRef}
      data-testid="confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        data-testid="confirm-modal-backdrop"
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-ink">{title}</h2>
        <p className="mb-6 text-center text-ink-muted">{message}</p>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            data-testid="confirm-modal-cancel"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border-2 border-edge px-4 py-3 font-semibold text-ink-mid transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            data-testid="confirm-modal-confirm"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
