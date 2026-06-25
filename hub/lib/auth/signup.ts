/**
 * FEAT-H002 — credentialed FIM sign-up (IDN-3 sign-up surface; IDN-2 FIM outcome).
 *
 * The lib-behind-route pattern (mirrors lib/groups/queries.ts): a single testable
 * function that wraps Supabase Auth `signUp`. It enforces the consent gate before
 * creating anything (Privacy/GDPR), passes the display name through
 * `raw_user_meta_data.display_name` — the key the `handle_new_user` trigger reads —
 * and normalises the result. The trigger does the rest server-side: profile +
 * personal group + "Myself" zero-perm role + "FringeIsland Members" enrolment +
 * display-name defaults + pending-invite auto-claim.
 *
 * Auth is the narrow direct-Supabase exception (Hub CLAUDE.md). This function does
 * no table reads/writes — only the auth call.
 */
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

export const CONSENT_REQUIRED_ERROR =
  'You must accept the terms and privacy policy to create an account.';
export const DUPLICATE_EMAIL_ERROR = 'An account with this email already exists.';

export type SignUpParams = {
  email: string;
  password: string;
  displayName: string;
  consentAccepted: boolean;
};

export type SignUpResult = {
  user: User | null;
  session: Session | null;
  pendingConfirmation: boolean;
  error: string | null;
};

export async function signUpFim(
  supabase: SupabaseClient,
  { email, password, displayName, consentAccepted }: SignUpParams,
): Promise<SignUpResult> {
  // Consent gate — refuse before creating anything (STORY-3, Privacy/GDPR).
  if (!consentAccepted) {
    return { user: null, session: null, pendingConfirmation: false, error: CONSENT_REQUIRED_ERROR };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  // Confirmations OFF: a duplicate email returns an error here.
  if (error) {
    return { user: null, session: null, pendingConfirmation: false, error: error.message };
  }

  // Confirmations ON: a duplicate email returns a user with an empty identities
  // array and no error (Supabase anti-enumeration). Treat as duplicate.
  const isDuplicate =
    !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
  if (isDuplicate) {
    return { user: null, session: null, pendingConfirmation: false, error: DUPLICATE_EMAIL_ERROR };
  }

  return {
    user: data.user,
    session: data.session,
    // No session despite a user => email confirmation is required (STORY-2 fork).
    pendingConfirmation: data.user != null && data.session == null,
    error: null,
  };
}
