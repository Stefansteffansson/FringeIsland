import { describe, it, expect } from '@jest/globals';
import { isAuthAdminTransient } from '@/tests/helpers/supabase';

/**
 * TASK-INT-01 — the retry predicate guarding `createTestUser`.
 *
 * LABELLED HONESTLY: this coverage is **test-after**. The predicate and its
 * retry loop were written first, then this suite was added. It is NOT a
 * red-first TDD cycle and must not be counted as one.
 *
 * Why it exists anyway: the entire risk of adding a retry to `createTestUser`
 * is OVER-MATCHING. A predicate that is too broad converts real regressions —
 * a duplicate email, a rejected password, a broken `handle_new_user` trigger —
 * from fast, honest failures into slow ones that still fail but waste four
 * attempts and read as flake. The negative cases below are the point of this
 * file; the positive cases are almost incidental.
 */
describe('isAuthAdminTransient — TASK-INT-01 retry predicate', () => {
  describe('matches the known dev-DB transient', () => {
    it('matches the exact observed ES256 failure', () => {
      expect(
        isAuthAdminTransient(
          'invalid JWT: unable to parse or verify signature, token is unverifiable: ' +
            'error while executing keyfunc: unrecognized JWT kid <nil> for algorithm ES256',
        ),
      ).toBe(true);
    });

    it('matches on the kid fragment alone', () => {
      expect(isAuthAdminTransient('unrecognized JWT kid <nil> for algorithm ES256')).toBe(true);
    });

    it('matches on the unverifiable fragment alone', () => {
      expect(isAuthAdminTransient('token is unverifiable: error while executing keyfunc')).toBe(
        true,
      );
    });

    it('is case-insensitive on the prose fragments', () => {
      expect(isAuthAdminTransient('Unrecognized JWT Kid <nil>')).toBe(true);
      expect(isAuthAdminTransient('TOKEN IS UNVERIFIABLE')).toBe(true);
    });
  });

  describe('does NOT match real errors — these must fail fast, not retry', () => {
    const realErrors: Array<[string, string]> = [
      ['duplicate email', 'A user with this email address has already been registered'],
      ['weak password', 'Password should be at least 6 characters'],
      ['invalid email', 'Unable to validate email address: invalid format'],
      ['broken signup trigger', 'Database error creating new user'],
      ['consent gate refusal', 'new row violates row-level security policy for table "users"'],
      ['missing personal group', 'Failed to fetch user profile: JSON object requested'],
      ['generic server error', 'Internal Server Error'],
      ['rate limit', 'Request rate limit reached'],
      ['permission denied', 'permission denied for table users'],
      ['not-null violation', 'null value in column "display_name" violates not-null constraint'],
      ['empty message', ''],
    ];

    it.each(realErrors)('does not retry on %s', (_label, message) => {
      expect(isAuthAdminTransient(message)).toBe(false);
    });
  });

  describe('does not over-match on incidental substrings', () => {
    it('does not match a different algorithm name that merely contains digits', () => {
      expect(isAuthAdminTransient('unsupported algorithm RS256')).toBe(false);
      expect(isAuthAdminTransient('unsupported algorithm HS256')).toBe(false);
    });

    it('does not match ES256 embedded in a larger token (word-boundary guard)', () => {
      // `\bES256\b` must not fire on an id or hash that happens to contain it
      expect(isAuthAdminTransient('request id: 7fES256abc')).toBe(false);
      expect(isAuthAdminTransient('trace ES256X failed')).toBe(false);
    });

    it('does match ES256 as a standalone token', () => {
      expect(isAuthAdminTransient('algorithm ES256 not recognised')).toBe(true);
    });
  });
});
