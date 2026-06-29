import type { ReactNode } from 'react';

/**
 * FEAT-H006 — the standalone account-state surface shell (IDN-9). A full-screen,
 * honest message shown INSTEAD of the normal Hub chrome when a FIM's account is
 * not active (suspended / closed / unknown / unreadable). Pure + presentational —
 * the gate wires the actions. Always offers a way out (sign-out) so the member is
 * never trapped; an optional retry serves the read-error case.
 */
export function AccountStateSurface({
  testId,
  title,
  message,
  role = 'status',
  onSignOut,
  onRetry,
  children,
}: {
  testId: string;
  title: string;
  message: string;
  role?: 'status' | 'alert';
  onSignOut?: () => void;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div
        data-testid={testId}
        role={role}
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm text-gray-600">{message}</p>
        {children}
        <div className="mt-6 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Try again
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
