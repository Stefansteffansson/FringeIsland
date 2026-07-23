/**
 * FEAT-H030 — pure notification-presentation helpers (NTF-4/5 passive render).
 * Kept out of the components so the status logic is unit-tested directly and
 * the rendering stays kind-agnostic (server authors copy; the surface never
 * re-words — V3 surfaces law). No sealed kind/category maps: an unrecognised
 * kind renders through the generic path, never a crash.
 */

export interface NotificationChip {
  label: string;
  /** Design-system tone token, not a colour — the DS grammar owns appearance. */
  tone: 'pending' | 'done' | 'expired';
}

interface ActionableFields {
  action_type: string | null;
  action_taken: string | null;
  expires_at: string | null;
}

/**
 * The status chip for a smart (actionable) notification, or null for a passive
 * one. In N-A actionable rows render read-only (the Accept/Decline UI is N-B) —
 * the chip states where the action stands. "Handled" wins over "Expired" (a
 * taken action is done regardless of the clock).
 */
export function notificationStatusChip(
  row: ActionableFields,
  now: Date = new Date(),
): NotificationChip | null {
  if (row.action_type == null) return null;
  if (row.action_taken != null) return { label: 'Handled', tone: 'done' };
  if (row.expires_at != null && new Date(row.expires_at).getTime() < now.getTime()) {
    return { label: 'Expired', tone: 'expired' };
  }
  return { label: 'Awaiting response', tone: 'pending' };
}

/** Cap for the unread badge — 9+ beyond nine (shell-chrome convention). */
export function formatBadgeCount(n: number): string {
  return n > 9 ? '9+' : String(n);
}
