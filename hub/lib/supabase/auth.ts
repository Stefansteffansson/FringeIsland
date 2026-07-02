import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ADR-U037 — resolve the caller's identity from the session JWT via LOCAL
 * signature verification (`getClaims`): with the project's asymmetric (ES256)
 * signing keys the check is pure WebCrypto against a cached JWKS — no
 * Auth-server round-trip on the hot path. Returns the `sub` claim (the
 * `auth.users.id`) or `null` for any unauthenticated/unverifiable shape.
 *
 * Scope: READ routes only. Mutations keep the server-verified
 * `supabase.auth.getUser()` check (defense-in-depth where state changes).
 * Trade-off, stated plainly (ADR-U037): a revoked-but-unexpired JWT is trusted
 * on reads until expiry (≤1 h); RLS at the DB remains the authority regardless.
 */
export async function getVerifiedUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}
