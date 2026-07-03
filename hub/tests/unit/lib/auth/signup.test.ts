import { describe, it, expect, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signUpFim, CONSENT_REQUIRED_ERROR, DUPLICATE_EMAIL_ERROR } from '@/lib/auth/signup';

/**
 * FEAT-H002 (unit) — signUpFim branch logic.
 *
 * BACKFILLED TEST-AFTER: FEAT-H002 shipped without a unit tier, so these are
 * characterization tests, NOT a red-first TDD cycle. They pin signUpFim's pure
 * branching with a hand-rolled fake client (no network), covering branches the
 * integration tests can't easily reach on the live project — notably the
 * confirmations-on duplicate path (empty `identities`). From FEAT-H003 onward
 * the unit tier is written red-first.
 */
function clientWith(signUp: ReturnType<typeof jest.fn>): SupabaseClient {
  return { auth: { signUp } } as unknown as SupabaseClient;
}

const params = {
  email: 'new@fringeisland.test',
  password: 'Test123!@#$',
  displayName: 'Ada Lovelace',
  consentAccepted: true,
};

describe('FEAT-H002 (unit) — signUpFim branch logic', () => {
  it('refuses without consent and never calls signUp (STORY-3)', async () => {
    const signUp = jest.fn();
    const result = await signUpFim(clientWith(signUp), { ...params, consentAccepted: false });
    expect(result.error).toBe(CONSENT_REQUIRED_ERROR);
    expect(result.user).toBeNull();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('passes the display name through as user metadata (the key handle_new_user reads)', async () => {
    const signUp = jest.fn(async () => ({
      data: {
        user: { id: 'u1', identities: [{}] },
        session: { access_token: 'a', refresh_token: 'r' },
      },
      error: null,
    }));
    await signUpFim(clientWith(signUp), params);
    expect(signUp).toHaveBeenCalledWith({
      email: params.email,
      password: params.password,
      // consent_accepted rides along since the ADR-U038 S3 substrate gate —
      // handle_new_user refuses a credentialed FIM without it.
      options: { data: { display_name: 'Ada Lovelace', consent_accepted: 'true' } },
    });
  });

  it('surfaces a signUp error', async () => {
    const signUp = jest.fn(async () => ({
      data: { user: null, session: null },
      error: { message: 'boom' },
    }));
    const result = await signUpFim(clientWith(signUp), params);
    expect(result.error).toBe('boom');
    expect(result.user).toBeNull();
  });

  it('treats an empty identities array as a duplicate (confirmations-on anti-enumeration)', async () => {
    const signUp = jest.fn(async () => ({
      data: { user: { id: 'u1', identities: [] }, session: null },
      error: null,
    }));
    const result = await signUpFim(clientWith(signUp), params);
    expect(result.error).toBe(DUPLICATE_EMAIL_ERROR);
    expect(result.user).toBeNull();
  });

  it('returns the session on success with no pending confirmation', async () => {
    const session = { access_token: 'a', refresh_token: 'r' };
    const signUp = jest.fn(async () => ({
      data: { user: { id: 'u1', identities: [{}] }, session },
      error: null,
    }));
    const result = await signUpFim(clientWith(signUp), params);
    expect(result.error).toBeNull();
    expect(result.session).toBe(session);
    expect(result.pendingConfirmation).toBe(false);
  });

  it('flags pending confirmation when a user is created without a session', async () => {
    const signUp = jest.fn(async () => ({
      data: { user: { id: 'u1', identities: [{}] }, session: null },
      error: null,
    }));
    const result = await signUpFim(clientWith(signUp), params);
    expect(result.error).toBeNull();
    expect(result.pendingConfirmation).toBe(true);
  });
});
