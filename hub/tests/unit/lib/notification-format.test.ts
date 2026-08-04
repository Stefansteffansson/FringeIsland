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

  // LABELLED SIBLING ADAPTATION (W-03 #2, 2026-07-28). This test previously
  // asserted `label === 'Handled'` for an ACCEPTED row — which is the defect the
  // gate walk named: accepted and declined rendered identically, so the
  // platform's record of a meaningful choice was invisible to the person who
  // made it. The outcome was in `action_taken` the whole time and unread.
  it('an ACCEPTED actionable notification says so by name, and stays "done" (even if also expired)', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'accepted',
        expires_at: '2026-07-23T11:00:00Z',
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Accepted');
    expect(chip.tone).toBe('done');
  });

  // W-03 #2 + #3 — the outcome is legible, and the tone stops congratulating a
  // refusal. "Green is a claim": `done` renders green, and green on a DECLINE
  // reads as congratulation for a thing the member declined.
  it('a DECLINED actionable notification says "Declined" and carries its own tone, not the accepted one', () => {
    const chip = notificationStatusChip(
      { ...base, action_type: 'accept_decline', action_taken: 'declined' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Declined');
    expect(chip.tone).toBe('declined');
    expect(chip.tone).not.toBe('done');
  });

  it('a converged ACCEPT names the outcome and the resolver, not just the resolver', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'accepted',
        action_data: { resolved_by_name: 'Bob Andersson' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Accepted by Bob');
    expect(chip.tone).toBe('done');
  });

  it('a converged DECLINE is as true as a converged accept — "Answered by Bob" hid which it was', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'declined',
        action_data: { resolved_by_name: 'Bob Andersson' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Declined by Bob');
    expect(chip.tone).toBe('declined');
  });

  // U008 open-set: the outcome vocabulary is not sealed. An action_taken value
  // the surface does not recognise must render through the generic path rather
  // than crash or assert a meaning it cannot know.
  it('an UNRECOGNISED outcome falls back to the neutral wording, never to a guess', () => {
    const bare = notificationStatusChip(
      { ...base, action_type: 'accept_decline', action_taken: 'deferred' },
      NOW,
    ) as NotificationChip;
    expect(bare.label).toBe('Handled');
    expect(bare.tone).toBe('done');

    const named = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'deferred',
        action_data: { resolved_by_name: 'Bob Andersson' },
      },
      NOW,
    ) as NotificationChip;
    expect(named.label).toBe('Answered by Bob');
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

  // FEAT-H042 (N-E): a cancelled invitation converges fact-only — the chip
  // says "Withdrawn" and NEVER names an actor (FEAT-PD017 withholds
  // resolved_by_name on cancel; the invitee may stand outside the group).
  it('a cancelled convergence renders "Withdrawn" with no actor named', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'cancelled',
        expires_at: null,
        action_data: { resolved_outcome: 'cancelled' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Withdrawn');
    expect(chip.label).not.toMatch(/by /);
  });

  it('a cancelled convergence ignores a resolver name even if one leaks into action_data', () => {
    // Defense-in-depth for the withholding rule: the surface must not render
    // an actor for a withdrawal even if a future platform change records one.
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'cancelled',
        expires_at: null,
        action_data: { resolved_outcome: 'cancelled', resolved_by_name: 'Some Steward' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Withdrawn');
    expect(chip.label).not.toContain('Some');
  });
});
