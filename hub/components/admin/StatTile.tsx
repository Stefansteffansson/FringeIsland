/**
 * FEAT-H034 — one dashboard tile: a named aggregate with labelled sub-values.
 * Feature component (components/admin/), not a ui/ primitive — it renders
 * ADM-1's specific tile shape, nothing reusable beyond the dashboard yet.
 */
export function StatTile({
  title,
  primary,
  primaryLabel,
  subs,
}: {
  title: string;
  primary: number;
  primaryLabel: string;
  subs: { label: string; value: number }[];
}) {
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-medium text-gray-500">{title}</h2>
      <p className="mt-1">
        <span className="text-3xl font-semibold text-gray-900">{primary}</span>{' '}
        <span className="text-sm text-gray-500">{primaryLabel}</span>
      </p>
      <dl className="mt-2 flex gap-4">
        {subs.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1">
            <dt className="text-xs text-gray-500">{s.label}</dt>
            <dd className="text-sm font-medium text-gray-700">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
