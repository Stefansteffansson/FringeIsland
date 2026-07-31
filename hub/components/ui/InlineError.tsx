/** Design-system primitive — inline error. Surfaces failures; never silent.
 *  `id` (COR-C W5): lets a field point `aria-describedby` at this error. */
export function InlineError({ message, id }: { message: string; id?: string }) {
  return (
    <div
      id={id}
      role="alert"
      data-testid="inline-error"
      className="rounded-lg border border-danger-edge bg-danger-soft p-3"
    >
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}
