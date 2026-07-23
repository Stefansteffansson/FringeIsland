/**
 * FEAT-H030 — the pure notification-presentation helpers (status chip +
 * kind-agnostic label). Unit tier: logic lives here, not only in the
 * component. Red-first: written before `@/lib/notifications/format` exists.
 */
import { describe, it, expect } from '@jest/globals';
import {
  notificationStatusChip,
  type NotificationChip,
} from '@/lib/notifications/format';

const base = {
  id: 'n1',
  kind: 'invitation_received',
  category: 'membership',
  title: 'T',
  body: 'B',
  group_id: null,
  created_at: '2026-07-23T10:00:00Z',
  is_read: false,
  read_at: null,
  action_type: null as string | null,
  action_taken: null as string | null,
  expires_at: null as string | null,
};

const NOW = new Date('2026-07-23T12:00:00Z');

describe('notificationStatusChip', () => {
  it('a passive (non-actionable) notification has no chip', () => {
    expect(notificationStatusChip(base, NOW)).toBeNull();
  });

  it('an unanswered, unexpired actionable notification is "Awaiting response"', () => {
    const chip = notificationStatusChip(
      { ...base, action_type: 'accept_decline' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Awaiting response');
    expect(chip.tone).toBe('pending');
  });

  it('an answered actionable notification is "Handled" (even if also expired)', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'accepted',
        expires_at: '2026-07-23T11:00:00Z',
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Handled');
    expect(chip.tone).toBe('done');
  });

  it('an unanswered but past-expiry actionable notification is "Expired"', () => {
    const chip = notificationStatusChip(
      { ...base, action_type: 'accept_decline', expires_at: '2026-07-23T11:00:00Z' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Expired');
    expect(chip.tone).toBe('expired');
  });

  it('an actionable notification with no expiry stays "Awaiting response"', () => {
    const chip = notificationStatusChip(
      { ...base, action_type: 'acknowledge', expires_at: null },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Awaiting response');
  });
});
