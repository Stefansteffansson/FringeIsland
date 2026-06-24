/**
 * Design-system primitive — loading state. UI convention: never present a
 * frozen UI; always show a loading state while data is in flight.
 */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent ${className}`}
    />
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div
      data-testid="loading-state"
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <Spinner />
      <p className="mt-4 text-gray-600">{label}</p>
    </div>
  );
}
