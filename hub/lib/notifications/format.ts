/**
 * FEAT-H030 — pure notification-presentation helpers (NTF-4/5 passive render).
 * Kept out of the components so the status logic is unit-tested directly and
 * the rendering stays kind-agnostic (server authors copy; the surface never
 * re-words — V3 surfaces law). No sealed kind/category maps: an unrecognised
 * kind renders through the generic path, never a crash.
 */

export interface NotificationChip {
  label: string;
  /** Design-system tone token, not a colour — the DS grammar owns appearance.
   *
   *  `declined` exists because `done` renders green, and green on a refusal
   *  reads as congratulation for the thing the member declined (W-03 #3, gate
   *  walk 2026-07-27). An outcome the member chose deserves a tone that does
   *  not editorialise about the choice. */
  tone: 'pending' | 'done' | 'declined' | 'expired';
}

interface ActionableFields {
  action_type: string | null;
  action_taken: string | null;
  expires_at: string | null;
  /** N-B: convergence context (resolved_by_name / resolved_outcome) lives here. */
  action_data?: Record<string, unknown> | null;
}

/**
 * The status chip for a smart (actionable) notification, or null for a passive
 * one. The chip states where the action stands. Order matters: a lazily-expired
 * row (`action_taken='expired'`, NTF-8) reads "Expired"; any other taken action
 * reads "Answered by [name]" when convergence recorded a resolver (an acting
 * sibling — ADR-U051), else "Handled" (a single-recipient nomination); an
 * unanswered past-expiry row reads "Expired"; otherwise "Awaiting response".
 */
export function notificationStatusChip(
  row: ActionableFields,
  now: Date = new Date(),
): NotificationChip | null {
  if (row.action_type == null) return null;
  if (row.action_taken === 'expired') return { label: 'Expired', tone: 'expired' };
  // FEAT-H042 (N-E): a cancelled convergence is fact-only — FEAT-PD017
  // withholds the resolver on cancel (the invitee may stand outside the
  // group), and this branch must not name one even if a value leaks in.
  if (row.action_taken === 'cancelled') return { label: 'Withdrawn', tone: 'expired' };
  if (row.action_taken != null) {
    const by = resolvedByName(row);
    // W-03 #2: the outcome was in `action_taken` all along and went unread, so
    // an accept and a decline rendered identically — the platform's record of a
    // meaningful choice was invisible to the person who made it. "Handled" is
    // queue vocabulary; a member thinks "I said no."
    //
    // The vocabulary is NOT sealed (U008 open set): an outcome this surface does
    // not recognise falls through to the neutral wording rather than being
    // guessed at. That fallback is the pre-W-03 behaviour, kept deliberately.
    const outcome =
      row.action_taken === 'accepted'
        ? { verb: 'Accepted', tone: 'done' as const }
        : row.action_taken === 'declined'
          ? { verb: 'Declined', tone: 'declined' as const }
          : { verb: 'Answered', tone: 'done' as const };
    if (by) return { label: `${outcome.verb} by ${firstToken(by)}`, tone: outcome.tone };
    // No resolver recorded — a single-recipient nomination answered by its only
    // recipient. "Answered" with nobody to name reads oddly, so the unrecognised
    // branch keeps its original bare wording.
    return outcome.verb === 'Answered'
      ? { label: 'Handled', tone: outcome.tone }
      : { label: outcome.verb, tone: outcome.tone };
  }
  if (row.expires_at != null && new Date(row.expires_at).getTime() < now.getTime()) {
    return { label: 'Expired', tone: 'expired' };
  }
  return { label: 'Awaiting response', tone: 'pending' };
}

/** True when a row still awaits the caller's response (buttons should show). */
export function isActionable(row: ActionableFields, now: Date = new Date()): boolean {
  if (row.action_type == null || row.action_taken != null) return false;
  if (row.expires_at != null && new Date(row.expires_at).getTime() < now.getTime()) {
    return false;
  }
  return true;
}

import type { NotificationResponse } from '@/lib/notifications/queries';

export type { NotificationResponse } from '@/lib/notifications/queries';

const RESPONSE_INTENTS: ReadonlySet<string> = new Set(['primary', 'danger', 'neutral']);

/**
 * The responses a row offers — COR-C W3 (AC3-5): the registry lives
 * platform-side (`notification_action_types`, carried per row by
 * `get_own_notifications`); this is a rendering-only validator, no local map.
 * A passive row, an absent set, or a malformed entry yields no responses, so
 * the row falls back to the read-only render (ADR-U051 / U008 open-set); an
 * unrecognised intent degrades to 'neutral' rather than crashing the render.
 */
export function notificationResponses(
  row: Pick<ActionableFields, 'action_type'> & { responses?: unknown },
): NotificationResponse[] {
  if (row.action_type == null || !Array.isArray(row.responses)) return [];
  return (row.responses as Array<Record<string, unknown> | null>)
    .filter(
      (r): r is Record<string, unknown> =>
        r != null &&
        typeof r.key === 'string' &&
        typeof r.label === 'string' &&
        typeof r.accept === 'boolean',
    )
    .map((r) => ({
      key: r.key as string,
      label: r.label as string,
      accept: r.accept as boolean,
      intent: RESPONSE_INTENTS.has(r.intent as string)
        ? (r.intent as NotificationResponse['intent'])
        : 'neutral',
    }));
}

/** The first whitespace-delimited token of a display name (nickname render). */
export function firstToken(name: string): string {
  const trimmed = name.trim();
  const [head] = trimmed.split(/\s+/);
  return head || trimmed;
}

function resolvedByName(row: ActionableFields): string | null {
  const v = row.action_data?.resolved_by_name;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Cap for the unread badge — 9+ beyond nine (shell-chrome convention). */
export function formatBadgeCount(n: number): string {
  return n > 9 ? '9+' : String(n);
}
