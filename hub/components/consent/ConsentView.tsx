import type { ConsentState, ConsentEffectiveEntry, ConsentHistoryEntry } from '@/lib/consent/queries';
import { LoadingState } from '@/components/ui/LoadingState';
import { InlineError } from '@/components/ui/InlineError';

/**
 * FEAT-H008 — render consent state (IDN-6). Pure, read-only surface over the
 * caller's own consent (from the FEAT-PC006 contract). Shows two honest views:
 * **effective** (current decision per catalogued purpose, with a quiet drift hint
 * when a decision is stale against the policy) and **history** (the full
 * append-only GDPR trail). It renders only — grant/withdraw controls are
 * FEAT-H009. Loading/error/empty are explicit (never a frozen or silently-blank
 * UI). Unknown decision values render as data, not a crash (extensibility).
 */
function decisionLabel(decision: string | null): string {
  switch (decision) {
    case 'granted':
      return 'Granted';
    case 'withdrawn':
      return 'Withdrawn';
    case null:
      return 'Not yet decided';
    default:
      // Safe default for a future decision class — render the raw value as data.
      return decision;
  }
}

function formatWhen(value: string): string {
  // Platform/Hub gotcha: parse via Date, never string-compare timestamptz.
  return new Date(value).toLocaleString();
}

function EffectiveRow({
  entry,
  onRequestChange,
  busy,
}: {
  entry: ConsentEffectiveEntry;
  /** When provided, withdrawable purposes get a grant/withdraw control (FEAT-H009). */
  onRequestChange?: (purpose: string, nextDecision: string) => void;
  busy?: boolean;
}) {
  // The control toggles toward the opposite of the current effective decision.
  const nextDecision = entry.decision === 'granted' ? 'withdrawn' : 'granted';
  const actionLabel = entry.decision === 'granted' ? 'Withdraw' : 'Grant';

  return (
    <li
      data-testid={`consent-effective-row-${entry.purpose}`}
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{entry.label}</p>
          {entry.description && (
            <p className="mt-1 text-sm text-gray-600">{entry.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {decisionLabel(entry.decision)}
          </span>
          {onRequestChange &&
            (entry.withdrawable ? (
              <button
                type="button"
                data-testid={`consent-action-${entry.purpose}`}
                onClick={() => onRequestChange(entry.purpose, nextDecision)}
                disabled={busy}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Saving...' : actionLabel}
              </button>
            ) : (
              // Non-withdrawable → locked: never offer an action the platform refuses.
              <span
                data-testid={`consent-locked-${entry.purpose}`}
                className="text-xs text-gray-400"
              >
                Required
              </span>
            ))}
        </div>
      </div>
      {entry.needs_reconsent && (
        <p
          data-testid={`consent-drift-${entry.purpose}`}
          className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700"
        >
          The policy for this has been updated since you decided.
        </p>
      )}
    </li>
  );
}

function HistoryRow({ event }: { event: ConsentHistoryEntry }) {
  return (
    <li
      data-testid="consent-history-row"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-2 text-sm last:border-b-0"
    >
      <span className="font-medium text-gray-800">{event.purpose}</span>
      <span className="text-gray-700">{decisionLabel(event.decision)}</span>
      <span className="text-gray-400">policy {event.policy_version}</span>
      <span className="text-gray-500">{formatWhen(event.captured_at)}</span>
    </li>
  );
}

export function ConsentView({
  loading,
  error,
  state,
  onRetry,
  onRequestChange,
  busyPurpose,
}: {
  loading: boolean;
  error: string | null;
  state: ConsentState | null;
  onRetry: () => void;
  /**
   * FEAT-H009: when provided, withdrawable purposes get a grant/withdraw control.
   * Omitted → the surface is read-only (FEAT-H008).
   */
  onRequestChange?: (purpose: string, nextDecision: string) => void;
  /** The purpose whose decision is currently in flight (its control is disabled). */
  busyPurpose?: string | null;
}) {
  if (loading) {
    return <LoadingState label="Loading your consent..." />;
  }

  if (error) {
    return (
      <div data-testid="consent-error" className="space-y-4">
        <InlineError message={error} />
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="space-y-10">
      <section data-testid="consent-effective">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">What you consent to</h2>
        <ul className="space-y-3">
          {state.effective.map((entry) => (
            <EffectiveRow
              key={entry.purpose}
              entry={entry}
              onRequestChange={onRequestChange}
              busy={busyPurpose === entry.purpose}
            />
          ))}
        </ul>
      </section>

      <section data-testid="consent-history">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Your consent history</h2>
        {state.history.length === 0 ? (
          <p className="text-sm text-gray-500">No consent events recorded yet.</p>
        ) : (
          <ul className="rounded-lg border border-gray-200 bg-white px-4">
            {state.history.map((event, i) => (
              <HistoryRow key={`${event.purpose}-${event.captured_at}-${i}`} event={event} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
