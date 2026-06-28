/**
 * FEAT-PC003 — self-service profile contract (PC-2 Identity).
 *
 * The own-profile read + identity-scope-gated update over `public.users`, run as
 * the AUTHENTICATED caller under the existing own-row RLS (`users_update_own`:
 * `auth_user_id = auth.uid()`) — never `service_role` / `SECURITY DEFINER`
 * (contrast the admin RPCs). Shared data-access functions exercised directly by
 * the integration suite and run by the `/api/profile/me` route, mirroring
 * `lib/groups/queries.ts`.
 *
 * Two enforcement layers, by design (FEAT-PC003 §Rabbit holes):
 *  1. Own-row RLS authorises *which row* (already on disk).
 *  2. Identity-scope column gating here authorises *which columns* — RLS does
 *     NOT restrict the column set, so identity-state / ownership columns
 *     (`is_temporary`, `email`, `auth_user_id`, `personal_group_id`,
 *     `is_active`, `is_decommissioned`) can never be written through this path.
 *
 * Own-row *read* is by construction: the contract only ever resolves the
 * caller's own row, so it never exposes another user's profile even though the
 * `users_select_active` SELECT policy is broad (`is_active = true`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The identity-scope profile fields — the only columns this contract reads and
 * writes. A defined, GROWABLE set (ADR-U018 spirit), not a sealed enum; it
 * deliberately excludes every identity-state / ownership column.
 */
export const IDENTITY_SCOPE_FIELDS = [
  'full_name',
  'nickname',
  'display_preference',
  'show_real_name',
  'bio',
  'avatar_url',
] as const;

export type IdentityScopeField = (typeof IDENTITY_SCOPE_FIELDS)[number];

/**
 * Bio length bound. Single source of truth for the contract validation; the DB
 * CHECK (`bio_max_length`, migration 20260628*) mirrors this literal — a future
 * tweak updates the constant AND adds a new additive migration.
 */
export const PROFILE_BIO_MAX_LENGTH = 500;

/** Full-name minimum length (copy-with-correction from the hub-legacy oracle). */
export const PROFILE_FULL_NAME_MIN_LENGTH = 2;

export type DisplayPreference = 'real_name' | 'nickname';

export interface Profile {
  full_name: string;
  nickname: string;
  display_preference: DisplayPreference;
  show_real_name: boolean;
  bio: string | null;
  avatar_url: string | null;
}

export type ProfilePatch = Partial<Profile>;

/** Thrown for any input the contract refuses (bad column or invalid value) — the
 * route maps it to 400. Distinct from substrate/RLS errors, which map to 500. */
export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

const PROFILE_COLUMNS = IDENTITY_SCOPE_FIELDS.join(', ');

function isIdentityScopeField(key: string): key is IdentityScopeField {
  return (IDENTITY_SCOPE_FIELDS as readonly string[]).includes(key);
}

/**
 * Identity-scope gating + field validation. Returns a patch containing ONLY the
 * identity-scope columns, trimmed where appropriate. Throws ProfileValidationError
 * for any non-identity-scope key, any invalid value, or an empty patch.
 */
export function validateProfilePatch(patch: ProfilePatch): ProfilePatch {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new ProfileValidationError('Invalid profile payload.');
  }

  const keys = Object.keys(patch);
  const forbidden = keys.filter((k) => !isIdentityScopeField(k));
  if (forbidden.length > 0) {
    throw new ProfileValidationError(
      `Cannot update non-identity-scope field(s): ${forbidden.join(', ')}`,
    );
  }
  if (keys.length === 0) {
    throw new ProfileValidationError('No identity-scope fields to update.');
  }

  const out: ProfilePatch = {};

  if ('full_name' in patch) {
    const v = patch.full_name;
    if (typeof v !== 'string' || v.trim().length < PROFILE_FULL_NAME_MIN_LENGTH) {
      throw new ProfileValidationError(
        `Full name must be at least ${PROFILE_FULL_NAME_MIN_LENGTH} characters.`,
      );
    }
    out.full_name = v.trim();
  }

  if ('nickname' in patch) {
    const v = patch.nickname;
    if (typeof v !== 'string' || v.trim().length < 1) {
      throw new ProfileValidationError('Nickname cannot be empty.');
    }
    out.nickname = v.trim();
  }

  if ('display_preference' in patch) {
    const v = patch.display_preference;
    if (v !== 'real_name' && v !== 'nickname') {
      throw new ProfileValidationError("Display preference must be 'real_name' or 'nickname'.");
    }
    out.display_preference = v;
  }

  if ('show_real_name' in patch) {
    const v = patch.show_real_name;
    if (typeof v !== 'boolean') {
      throw new ProfileValidationError('show_real_name must be a boolean.');
    }
    out.show_real_name = v;
  }

  if ('bio' in patch) {
    const v = patch.bio;
    if (v !== null && typeof v !== 'string') {
      throw new ProfileValidationError('Bio must be text or null.');
    }
    if (typeof v === 'string' && v.length > PROFILE_BIO_MAX_LENGTH) {
      throw new ProfileValidationError(`Bio must be at most ${PROFILE_BIO_MAX_LENGTH} characters.`);
    }
    out.bio = v;
  }

  if ('avatar_url' in patch) {
    const v = patch.avatar_url;
    if (v !== null && typeof v !== 'string') {
      throw new ProfileValidationError('Avatar URL must be text or null.');
    }
    out.avatar_url = v;
  }

  return out;
}

/**
 * Read the caller's own identity-scope profile. Resolves the caller via the auth
 * SDK and scopes the read to their own row; returns null when there is no
 * session or no profile row. Never exposes another user's row.
 */
export async function fetchMyProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  // supabase-js types a string-column `.select()` result as a union that includes
  // GenericStringError, so a direct cast to Profile is rejected by `next build`'s
  // type-check; narrow through `unknown` (the row shape is the PROFILE_COLUMNS set).
  return (data as unknown as Profile | null) ?? null;
}

/**
 * Update the caller's own identity-scope fields. Validates + gates the patch,
 * then writes the caller's own row under the own-row UPDATE RLS policy. The
 * `sync_display_name_to_personal_group` trigger cascades any display-name change
 * to the personal-group name atomically — this contract writes no group name.
 * The returning select re-reads the row (the broad SELECT policy makes the
 * readback safe — no dual-policy trip).
 */
export async function updateMyProfile(
  supabase: SupabaseClient,
  patch: ProfilePatch,
): Promise<Profile> {
  const validated = validateProfilePatch(patch);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProfileValidationError('Not authenticated.');

  const { data, error } = await supabase
    .from('users')
    .update(validated)
    .eq('auth_user_id', user.id)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  // See fetchMyProfile: narrow the supabase-js string-`.select()` union through
  // `unknown` so `next build`'s type-check accepts the Profile shape.
  return data as unknown as Profile;
}
