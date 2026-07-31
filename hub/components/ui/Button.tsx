import type { ButtonHTMLAttributes } from 'react';

/** Design-system primitive — primary button. Tokens only (COR-C W6, AC3-7):
 *  the blue/indigo fork resolved here — primary IS the accent token. */
export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}
