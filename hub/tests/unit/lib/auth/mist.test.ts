import { describe, it, expect } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beginMistSession, deriveIdentity } from '@/lib/auth/mist';

/**
 * FEAT-H003 STORY-2/3 (unit) — the lazy Mist seam + three-state derivation.
 * Pure logic at the unit tier (mocked client); the real substrate contract is
 * covered by the integration tier (mist-session.test.ts / FEAT-PC001).
 */

describe('FEAT-H003 STORY-3 — deriveIdentity (three-state)', () => {
  it('returns sessionless when there is no user', () => {
    expect(deriveIdentity(null)).toBe('sessionless');
  });
  it('returns mist for an anonymous user', () => {
    expect(deriveIdentity({ is_anonymous: true } as never)).toBe('mist');
  });
  it('returns fim for a credentialed user (is_anonymous false or undefined)', () => {
    expect(deriveIdentity({ is_anonymous: false } as never)).toBe('fim');
    expect(deriveIdentity({} as never)).toBe('fim');
  });
});

describe('FEAT-H003 STORY-2 — beginMistSession (lazy materialisation seam)', () => {
  it('creates an anonymous session when none exists', async () => {
    let anonCalls = 0;
    const supabase = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signInAnonymously: async () => {
          anonCalls++;
          return {
            data: { user: { id: 'mist-1', is_anonymous: true }, session: { access_token: 't' } },
            error: null,
          };
        },
      },
    } as unknown as SupabaseClient;

    const result = await beginMistSession(supabase);
    expect(result.error).toBeNull();
    expect(result.user).toEqual({ id: 'mist-1', is_anonymous: true });
    expect(anonCalls).toBe(1);
  });

  it('is idempotent — returns the existing session without creating a second Mist', async () => {
    const existing = { access_token: 't', user: { id: 'mist-1', is_anonymous: true } };
    let anonCalls = 0;
    const supabase = {
      auth: {
        getSession: async () => ({ data: { session: existing } }),
        signInAnonymously: async () => {
          anonCalls++;
          return { data: { user: null, session: null }, error: null };
        },
      },
    } as unknown as SupabaseClient;

    const result = await beginMistSession(supabase);
    expect(result.session).toBe(existing);
    expect(anonCalls).toBe(0);
  });

  it('returns a normalised error when anonymous sign-in fails', async () => {
    const supabase = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signInAnonymously: async () => ({
          data: { user: null, session: null },
          error: { message: 'Anonymous sign-ins are disabled' },
        }),
      },
    } as unknown as SupabaseClient;

    const result = await beginMistSession(supabase);
    expect(result.user).toBeNull();
    expect(result.error).toBe('Anonymous sign-ins are disabled');
  });
});
