import { describe, it, expect } from '@jest/globals';
import { isManagementApiTransient } from '@/tests/helpers/supabase';

/**
 * TASK-INT-04 — the retry predicate guarding `runAdminSql`.
 *
 * LABELLED HONESTLY: this coverage is **test-after**, exactly as its TASK-INT-01
 * sibling is. The predicate and its retry loop were written first, then this
 * suite was added. It is NOT a red-first TDD cycle and must not be counted as
 * one.
 *
 * Why it exists anyway: the entire risk of retrying `runAdminSql` is
 * OVER-MATCHING. `runAdminSql` is how the integration suites assert against
 * substrate the contracts deliberately hide, so a predicate that is too broad
 * turns a real SQL regression — a dropped column, a violated constraint, a
 * function that no longer exists — from a fast, honest failure into a slow one
 * that still fails but wastes four attempts and reads as flake. **The negative
 * cases below are the point of this file.**
 */
describe('isManagementApiTransient — TASK-INT-04 retry predicate', () => {
  describe('matches the captured transport failure', () => {
    it('matches the exact message captured on the failing run (2026-07-28, run 4 of 8)', () => {
      expect(
        isManagementApiTransient(
          '{"message":"upstream connect error or disconnect/reset before headers. ' +
            'reset reason: connection termination"}',
        ),
      ).toBe(true);
    });

    it('matches socket-level resets thrown by fetch itself', () => {
      expect(isManagementApiTransient('{"message":"fetch failed"}')).toBe(true);
      expect(isManagementApiTransient('{"message":"socket hang up"}')).toBe(true);
      expect(isManagementApiTransient('{"message":"read ECONNRESET"}')).toBe(true);
      expect(isManagementApiTransient('{"message":"connect ETIMEDOUT 1.2.3.4:443"}')).toBe(true);
    });
  });

  /**
   * Every one of these is a failure the suites MUST see immediately. If any
   * starts returning true, `runAdminSql` has begun hiding real breakage behind
   * four slow attempts.
   */
  describe('does NOT match a genuine SQL error', () => {
    it('a missing column fails fast', () => {
      expect(
        isManagementApiTransient(
          '{"message":"Failed to run sql query: ERROR:  42703: column cp.member_group_id does not exist"}',
        ),
      ).toBe(false);
    });

    it('a constraint violation fails fast', () => {
      expect(
        isManagementApiTransient(
          '{"message":"ERROR:  23514: new row for relation \\"notifications\\" violates check ' +
            'constraint \\"notifications_action_consistency\\""}',
        ),
      ).toBe(false);
    });

    it('a missing function fails fast', () => {
      expect(
        isManagementApiTransient(
          '{"message":"ERROR:  42883: function public.get_own_notifications() does not exist"}',
        ),
      ).toBe(false);
    });

    it('an aggregate-function definition error fails fast (the real one hit while scoping the orphan cleanup)', () => {
      expect(
        isManagementApiTransient('{"message":"ERROR:  42809: \\"array_agg\\" is an aggregate function"}'),
      ).toBe(false);
    });

    it('a permission refusal fails fast — a 42501 is an ANSWER, not an outage', () => {
      expect(
        isManagementApiTransient('{"message":"ERROR:  42501: permission denied for table notifications"}'),
      ).toBe(false);
    });

    it('a raised domain refusal fails fast — these are what the contracts assert ON', () => {
      expect(
        isManagementApiTransient(
          '{"message":"ERROR:  P0001: Cannot remove the last Steward from the group."}',
        ),
      ).toBe(false);
    });

    it('an auth failure fails fast — a bad token is not going to fix itself in 250ms', () => {
      expect(isManagementApiTransient('{"message":"Unauthorized"}')).toBe(false);
      expect(isManagementApiTransient('{"message":"Invalid access token"}')).toBe(false);
    });

    it('the empty and trivial cases do not match', () => {
      expect(isManagementApiTransient('')).toBe(false);
      expect(isManagementApiTransient('{}')).toBe(false);
    });
  });

  /**
   * The HTML-error-page signature is deliberately NOT matched here.
   *
   * The first pass at this fix pattern-matched thrown errors too, and the very
   * next verification run failed on `SyntaxError: Unexpected token '<',
   * "<!DOCTYPE "... is not valid JSON` — the same outage wearing a different
   * message. Adding a regex for it would have invited a third face.
   *
   * `runAdminSql` now retries the THROWN branch structurally instead: a thrown
   * error can never be a SQL answer, because Postgres always replies with a
   * well-formed JSON body. These stay false so the predicate keeps its single
   * job — judging what the API REPORTED — and so that a future reader does not
   * "fix" it by widening it.
   */
  describe('leaves thrown-parse failures to the structural branch', () => {
    it('does not match the HTML-error-page parse failure (handled by the throw branch)', () => {
      expect(
        isManagementApiTransient(
          '{"message":"SyntaxError: Unexpected token \'<\', \\"<!DOCTYPE \\"... is not valid JSON"}',
        ),
      ).toBe(false);
    });
  });

  /**
   * The near-miss set: messages that mention connections or resets but are NOT
   * the transient. This is where an over-broad rewrite of the predicate would
   * first show up.
   */
  describe('does not over-match on connection-adjacent wording', () => {
    it('a SQL error merely containing the word "connection" fails fast', () => {
      expect(
        isManagementApiTransient(
          '{"message":"ERROR:  42P01: relation \\"connection_log\\" does not exist"}',
        ),
      ).toBe(false);
    });

    it('a password-reset message is not a connection reset', () => {
      expect(isManagementApiTransient('{"message":"password reset required"}')).toBe(false);
    });
  });
});
