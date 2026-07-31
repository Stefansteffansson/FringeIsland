/** Design-system primitive — empty state. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div data-testid="empty-state" className="rounded-2xl bg-surface p-12 text-center shadow-sm">
      <h2 className="mb-2 text-2xl font-bold text-ink-strong">{title}</h2>
      {description && <p className="mx-auto max-w-md text-ink-muted">{description}</p>}
    </div>
  );
}
