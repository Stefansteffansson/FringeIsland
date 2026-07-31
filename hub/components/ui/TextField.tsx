'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { InlineError } from './InlineError';

/**
 * Design-system primitive — labelled text field. COR-C W5 (Audit III AC3-18):
 * the label can never be orphaned — an omitted `id` falls back to `useId()`,
 * so label-for wiring always holds; an `error` renders the InlineError
 * primitive and wires `aria-invalid` + `aria-describedby` to it.
 */
export function TextField({
  label,
  id,
  error,
  className = '',
  ...props
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none ${className}`}
        {...props}
      />
      {error && (
        <div className="mt-2">
          <InlineError id={errorId} message={error} />
        </div>
      )}
    </div>
  );
}
