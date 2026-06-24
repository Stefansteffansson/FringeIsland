/** Design-system primitive — inline error. Surfaces failures; never silent. */
export function InlineError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      data-testid="inline-error"
      className="rounded-lg border border-red-200 bg-red-50 p-3"
    >
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
