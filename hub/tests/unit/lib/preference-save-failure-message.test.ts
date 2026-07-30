import { describe, it, expect } from '@jest/globals';
import { preferenceSaveFailureMessage } from '@/lib/notifications/preferences';

/**
 * Gate walk 2026-07-30 — the message a member sees when a preference write fails.
 *
 * Observed: going offline and flipping a switch put the raw browser string
 * **"Failed to fetch"** in a red banner. The rollback was correct; the sentence
 * was not one.
 *
 * The risk in fixing it is OVER-REWRITING. A server that answered with a reason
 * wrote that reason for the member on purpose (the H030 law: the surface never
 * re-words server copy), so replacing it with a generic apology would destroy
 * information — the same class of mistake in the opposite direction. The
 * pass-through cases below are the point of this file.
 */
describe('preferenceSaveFailureMessage', () => {
  describe('replaces failures that never reached a server', () => {
    it('the exact string the walk captured while offline', () => {
      const msg = preferenceSaveFailureMessage(new TypeError('Failed to fetch'));
      expect(msg).not.toMatch(/failed to fetch/i);
      expect(msg).toMatch(/could not reach the server/i);
      // The member is told their change did not stick, and what to do.
      expect(msg).toMatch(/put back/i);
      expect(msg).toMatch(/try again/i);
    });

    it('the other browsers\' wording for the same condition', () => {
      for (const raw of ['NetworkError when attempting to fetch resource.', 'Load failed', 'fetch failed']) {
        expect(preferenceSaveFailureMessage(new Error(raw))).toMatch(/could not reach the server/i);
      }
    });

    it('a bare status with no body — "HTTP 500" is not something to show anyone', () => {
      const msg = preferenceSaveFailureMessage(new Error('HTTP 500'));
      expect(msg).not.toMatch(/HTTP|500/);
      expect(msg).toMatch(/put back/i);
    });
  });

  /**
   * These are the cases that must survive untouched. If any starts being
   * replaced, the surface has begun swallowing sentences the platform wrote.
   */
  describe('quotes a server that answered with a reason', () => {
    it('a refusal the route authored is passed through verbatim', () => {
      const reason = 'Notices about your own account and access cannot be switched off.';
      expect(preferenceSaveFailureMessage(new Error(reason))).toBe(reason);
    });

    it('a permission refusal keeps its own words', () => {
      const reason = 'You may not change preferences for another member.';
      expect(preferenceSaveFailureMessage(new Error(reason))).toBe(reason);
    });

    it('a reason that merely mentions the network is still the server talking', () => {
      // Near-miss guard: "network" appears, but this is an authored sentence,
      // not a transport rejection, and must not be swallowed.
      const reason = 'Your network administrator has disabled this channel.';
      expect(preferenceSaveFailureMessage(new Error(reason))).toBe(reason);
    });
  });

  it('never returns an empty message — a rollback with nothing to read is a silent revert', () => {
    for (const input of [new Error(''), '', null, undefined]) {
      const msg = preferenceSaveFailureMessage(input);
      expect(typeof msg).toBe('string');
    }
  });
});
