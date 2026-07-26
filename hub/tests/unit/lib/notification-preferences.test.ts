import { describe, it, expect } from '@jest/globals';
import {
  groupPreferencesByCategory,
  renderableChannels,
  storedOnlyChannels,
  type NotificationPreferenceCell,
} from '@/lib/notifications/preferences';

/**
 * FEAT-H033 — the pure shaping helpers behind the preference matrix.
 *
 * These are unit-tested rather than left to the E2E because each one encodes a
 * DECISION from the N-D board rather than incidental plumbing, and a decision
 * that lives only in a rendered page is a decision nobody can see change:
 *
 *  - ND-3: a non-delivering channel gets NO column. `email` is stored so the
 *    preference binds the day email ships, but a toggle that cannot change
 *    anything would be a promise the Hub can't keep.
 *  - The kind-agnostic rule: categories and channels come FROM THE PAYLOAD, so a
 *    new registry row renders with no Hub change. The test proves it by feeding
 *    a category and a channel that do not exist in Ferd's registry at all.
 */

const cell = (
  overrides: Partial<NotificationPreferenceCell> & {
    category_key: string;
    channel: string;
  },
): NotificationPreferenceCell => ({
  category_label: `Label for ${overrides.category_key}`,
  interruption_grade: 'badge',
  member_suppressible: true,
  channel_label: `Channel ${overrides.channel}`,
  channel_delivers: true,
  allowed: true,
  ...overrides,
});

describe('notification preference shaping (FEAT-H033)', () => {
  const matrix: NotificationPreferenceCell[] = [
    cell({ category_key: 'membership', channel: 'in_app' }),
    cell({ category_key: 'membership', channel: 'email', channel_delivers: false }),
    cell({ category_key: 'account', channel: 'in_app', member_suppressible: false }),
    cell({ category_key: 'account', channel: 'email', channel_delivers: false, member_suppressible: false }),
  ];

  describe('renderableChannels', () => {
    it('renders only channels that actually deliver — email is stored, not shown', () => {
      expect(renderableChannels(matrix)).toEqual(['in_app']);
    });

    it('adds a channel with no code change the moment it starts delivering', () => {
      const withLiveEmail = matrix.map((c) =>
        c.channel === 'email' ? { ...c, channel_delivers: true } : c,
      );
      expect(renderableChannels(withLiveEmail)).toEqual(['in_app', 'email']);
    });

    it('renders a channel the Hub has never heard of, because the list comes from the payload', () => {
      const withPush = [
        ...matrix,
        cell({ category_key: 'membership', channel: 'push', channel_label: 'Push' }),
      ];
      expect(renderableChannels(withPush)).toContain('push');
    });
  });

  describe('storedOnlyChannels', () => {
    it('names the non-delivering channels so the surface can say so honestly', () => {
      expect(storedOnlyChannels(matrix)).toEqual(['Channel email']);
    });

    it('names nothing when every channel delivers', () => {
      const allLive = matrix.map((c) => ({ ...c, channel_delivers: true }));
      expect(storedOnlyChannels(allLive)).toEqual([]);
    });
  });

  describe('groupPreferencesByCategory', () => {
    it('collapses the flat matrix to one row per category, channels nested', () => {
      const rows = groupPreferencesByCategory(matrix);
      expect(rows.map((r) => r.category_key)).toEqual(['membership', 'account']);
      expect(rows.every((r) => r.cells.length === 2)).toBe(true);
    });

    it('carries member_suppressible onto the row so a locked category renders its reason', () => {
      const rows = groupPreferencesByCategory(matrix);
      expect(rows.find((r) => r.category_key === 'account')?.member_suppressible).toBe(false);
      expect(rows.find((r) => r.category_key === 'membership')?.member_suppressible).toBe(true);
    });

    it('groups a category the Hub has never heard of — no hardcoded category list', () => {
      const withNewCategory = [
        ...matrix,
        cell({ category_key: 'weather-warnings', channel: 'in_app' }),
      ];
      const rows = groupPreferencesByCategory(withNewCategory);
      expect(rows.map((r) => r.category_key)).toContain('weather-warnings');
      expect(rows.find((r) => r.category_key === 'weather-warnings')?.category_label).toBe(
        'Label for weather-warnings',
      );
    });

    it('returns nothing for an empty matrix rather than throwing', () => {
      expect(groupPreferencesByCategory([])).toEqual([]);
      expect(renderableChannels([])).toEqual([]);
      expect(storedOnlyChannels([])).toEqual([]);
    });
  });
});
