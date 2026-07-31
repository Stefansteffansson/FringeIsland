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
// COR-C W7 (GC-7): the validation constants live in constants.ts (pure) so
// browser importers never value-import this rpc-bearing module. Imported for
// the validation below and re-exported for the server-side callers.
import { PROFILE_BIO_MAX_LENGTH, PROFILE_FULL_NAME_MIN_LENGTH } from './constants';

export { PROFILE_BIO_MAX_LENGTH, PROFILE_FULL_NAME_MIN_LENGTH } from './constants';

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
 * Read the caller's own identity-scope profile via the platform contract
 * `get_own_profile()` (ADR-U038 F1 — the contract lives in the substrate, not in
 * Hub code; a sibling Surface calls the same RPC). The RPC self-scopes by
 * `auth.uid()`, returns only the identity-scope fields (never email), and yields
 * no rows for a sessionless caller — so this returns null with no session or no
 * profile row, and never exposes another user's row.
 */
export async function fetchMyProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('get_own_profile');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as Profile | undefined) ?? null;
}

/**
 * Update the caller's own identity-scope fields via the platform contract
 * `update_own_profile()` (ADR-U038 F1). `validateProfilePatch` runs first as a
 * client-side UX pre-check (ADR-U038: an app-layer gate is defense-in-depth, not
 * the enforcement layer) — the RPC re-validates authoritatively and gates the
 * writable column set at the substrate, so a sibling Surface inherits both. The
 * `sync_display_name_to_personal_group` trigger cascades a display-name change to
 * the personal-group name atomically inside the RPC's UPDATE.
 */
export async function updateMyProfile(
  supabase: SupabaseClient,
  patch: ProfilePatch,
): Promise<Profile> {
  const validated = validateProfilePatch(patch);

  const { data, error } = await supabase.rpc('update_own_profile', { p_patch: validated });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as Profile;
}
