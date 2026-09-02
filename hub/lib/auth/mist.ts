/**
 * FEAT-H003 — the Mist (anonymous entrant) seam + three-state identity.
 *
 * Consumes FEAT-PC001 (the platform substrate): anonymous sign-in triggers
 * `handle_new_user`, which materialises an `is_temporary` profile + proto
 * personal group server-side. Auth is the narrow direct-Supabase exception
 * (Hub CLAUDE.md); this module does no table reads/writes — only the auth call.
 */
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

export type Identity = 'sessionless' | 'mist' | 'fim';

export type MistSessionResult = {
  user: User | null;
  session: Session | null;
  error: string | null;
};

/**
 * Three-state identity, derived purely from the auth user — a Mist is an
 * anonymous Supabase user (`is_anonymous`). Pure + synchronous, so it is safe to
 * call inside render and from the auth-state listener (no query, no deadlock).
 */
/**
 * TASK-MIST-01 — the ghost window. The BFF names a 42501 from an actor-bound
 * read with this code: the JWT is still signed, but the substrate can no
 * longer resolve the actor behind it — a Mist erased server-side (the
 * ADR-U033 reaper, a goodbye said on another domain) while this browser kept
 * its session. Nothing will ever resolve that actor again, so it is not a
 * transient: the honest response is to drop the local session.
 */
export const NO_RESOLVABLE_ACTOR = 'no_resolvable_actor';

/** True for a BFF refusal carrying the ghost code (any client error shape). */
export function isGhostSessionRefusal(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === NO_RESOLVABLE_ACTOR;
}

export function deriveIdentity(user: User | null): Identity {
  if (!user) return 'sessionless';
  return user.is_anonymous ? 'mist' : 'fim';
}

/**
 * Begin acting as a Mist — the lazy materialisation seam (STORY-2). Idempotent
 * within a live session: if a session already exists (Mist or FIM) it is
 * returned unchanged (at most one Mist per live session). Otherwise an anonymous
 * Supabase session is created; FEAT-PC001's `handle_new_user` does the rest.
 */
export async function beginMistSession(supabase: SupabaseClient): Promise<MistSessionResult> {
  const {
    data: { session: existing },
  } = await supabase.auth.getSession();
  if (existing) {
    return { user: existing.user, session: existing, error: null };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    return { user: null, session: null, error: error.message };
  }
  return { user: data.user, session: data.session, error: null };
}
