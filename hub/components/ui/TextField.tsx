import type { InputHTMLAttributes } from 'react';

/** Design-system primitive — labelled text field. */
export function TextField({
  label,
  id,
  className = '',
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
