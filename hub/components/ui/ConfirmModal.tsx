'use client';

import { useEffect } from 'react';

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
      ? 'bg-red-600 hover:bg-red-700'
      : variant === 'warning'
        ? 'bg-yellow-600 hover:bg-yellow-700'
        : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div
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
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mb-6 text-center text-gray-600">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            data-testid="confirm-modal-cancel"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
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
