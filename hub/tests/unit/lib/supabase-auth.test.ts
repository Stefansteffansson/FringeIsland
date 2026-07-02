import { describe, it, expect, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ADR-U037 (unit) — `getVerifiedUserId` resolves the caller's identity from the
 * session JWT via local signature verification (`getClaims`): the `sub` claim on
 * success, `null` on any failure shape (no session, error, missing sub). It must
 * never call `getUser` (that is the mutation-path check).
 *
 * Red-first: fails to import until `lib/supabase/auth.ts` exists.
 */
import { getVerifiedUserId } from '@/lib/supabase/auth';

function clientWith(
  result: { data: { claims: { sub?: string } } | null; error: unknown },
): SupabaseClient {
  return {
    auth: { getClaims: jest.fn(async () => result) },
  } as unknown as SupabaseClient;
}

describe('getVerifiedUserId', () => {
  it('returns the sub claim for a locally-verified session', async () => {
    await expect(
      getVerifiedUserId(clientWith({ data: { claims: { sub: 'u-42' } }, error: null })),
    ).resolves.toBe('u-42');
  });

  it('returns null when there is no session', async () => {
    await expect(getVerifiedUserId(clientWith({ data: null, error: null }))).resolves.toBeNull();
  });

  it('returns null on a verification error', async () => {
    await expect(
      getVerifiedUserId(clientWith({ data: null, error: new Error('bad signature') })),
    ).resolves.toBeNull();
  });

  it('returns null when claims carry no sub', async () => {
    await expect(
      getVerifiedUserId(clientWith({ data: { claims: {} }, error: null })),
    ).resolves.toBeNull();
  });
});
