import type { PlayerFreeze } from '@/lib/journeys/player';

/**
 * FEAT-H022 STORY-1 (JRN-14) — the freeze banner above the player canvas. Canon
 * voice: honest and gentle, an explanation not an alarm. One keyed line per known
 * reason (`group_closed`, `group_archived`, `left_group`, `removed_from_group`),
 * a verbatim fallback for any future reason (open vocabulary — the platform's
 * frozen_reason is not exhaustively switched), and `frozen_at` rendered when it
 * is present. It is a read-only frame only: no affordance, and it never sets or
 * clears freeze (cascades own that; there is no unfreeze here — ADR-U038).
 */
const FREEZE_COPY: Record<string, string> = {
  group_closed: 'The group you walked this with has closed. Your walk stays here, yours to revisit.',
  group_archived: 'The group you walked this with was archived. Your walk stays here, yours to revisit.',
  left_group: 'You left the group you walked this with. Your walk stays here, yours to revisit.',
  removed_from_group:
    'You are no longer in the group you walked this with. Your walk stays here, yours to revisit.',
};

function reasonLine(reason: string | null): string {
  if (reason && FREEZE_COPY[reason]) return FREEZE_COPY[reason];
  if (reason) return `This walk is held (${reason}). Your walk stays here, yours to revisit.`;
  return 'This walk is held. Your walk stays here, yours to revisit.';
}

function formatFrozenAt(frozenAt: string | null): string | null {
  if (!frozenAt) return null;
  const d = new Date(frozenAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function FreezeBanner({ freeze }: { freeze?: PlayerFreeze | null }) {
  if (!freeze) return null;
  const when = formatFrozenAt(freeze.frozen_at);
  return (
    <section
      data-testid="freeze-banner"
      role="status"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
    >
      <p className="text-sm font-medium text-amber-800">{reasonLine(freeze.reason)}</p>
      {when && (
        <p data-testid="freeze-banner-when" className="mt-1 text-xs text-amber-700">
          Held since {when}.
        </p>
      )}
    </section>
  );
}
