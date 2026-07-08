/**
 * FEAT-H021 (JRN-11) — coarse, own-data time formatting over the FEAT-PD004 `timing`
 * block. The platform owns the accounting (completed engagements only; open ones cost
 * nothing) and serves seconds; the Hub only FORMATS — it never re-derives time from
 * instances, and it never compares the traveller to anyone (invariant 8). Engagement
 * time (time-on-step, its sum) and the enrolled→completed calendar span are two
 * different numbers, formatted by two different helpers so they are never conflated.
 */
import type { PlayerTiming } from '@/lib/journeys/queries';

/**
 * Time engaged, coarse: an em-dash for no accrued time (null / zero — never "0 min",
 * never fabricated); whole minutes below an hour (rounded, floor of one minute);
 * "H:MM h" from an hour up, with no :60 minute carry.
 */
export function formatEngagementTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—';
  if (seconds < 3600) {
    return `${Math.max(1, Math.round(seconds / 60))} min`;
  }
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')} h`;
}

/**
 * The enrolled→completed calendar span — a DISTINCT number from engagement time. Null
 * when either bound is missing (a via-group walk whose row never took `completed_at`)
 * or the span is negative; whole days at day-grade, else the coarse sub-day grade.
 */
export function formatCalendarSpan(
  from: string | null | undefined,
  to: string | null | undefined,
): string | null {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} ${days === 1 ? 'day' : 'days'}`;
  return formatEngagementTime(Math.floor(ms / 1000));
}

/**
 * The per-step engagement seconds for a step, or null when the timing block carries
 * no entry for it (only an open engagement, or none). A zero-second entry surfaces as
 * its own value — the rendering surface decides that zero reads as an em-dash.
 */
export function stepSeconds(timing: PlayerTiming | undefined, stepId: string): number | null {
  if (!timing) return null;
  const entry = timing.per_step.find((p) => p.step_id === stepId);
  return entry ? entry.seconds : null;
}
