/**
 * FEAT-H031 (N-B) — the pure typed-action helpers: the data-driven response
 * registry (extensible, no sealed accept/decline pair — ADR-U051/U008), the
 * actionable gate, the first-token resolver name, and the convergence chip
 * ("Answered by [name]"). Unit tier — logic lives here, not only in the
 * component. Red-first: written before these helpers exist in
 * `@/lib/notifications/format`.
 */
import { describe, it, expect } from '@jest/globals';
import {
  isActionable,
  notificationResponses,
  firstToken,
  notificationStatusChip,
  type NotificationChip,
} from '@/lib/notifications/format';

const base = {
  id: 'n1',
  kind: 'acting_invitation',
  category: 'membership',
  title: 'T',
  body: 'B',
  group_id: null,
  created_at: '2026-07-24T10:00:00Z',
  is_read: false,
  read_at: null,
  action_type: null as string | null,
  action_data: null as Record<string, unknown> | null,
  action_taken: null as string | null,
  expires_at: null as string | null,
};

const NOW = new Date('2026-07-24T12:00:00Z');

describe('isActionable', () => {
  it('an unanswered, unexpired actionable row is actionable', () => {
    expect(isActionable({ ...base, action_type: 'accept_decline' }, NOW)).toBe(true);
  });
  it('a passive row is not actionable', () => {
    expect(isActionable(base, NOW)).toBe(false);
  });
  it('an already-answered row is not actionable', () => {
    expect(
      isActionable({ ...base, action_type: 'accept_decline', action_taken: 'accepted' }, NOW),
    ).toBe(false);
  });
  it('a past-expiry row is not actionable', () => {
    expect(
      isActionable(
        { ...base, action_type: 'accept_decline', expires_at: '2026-07-24T11:00:00Z' },
        NOW,
      ),
    ).toBe(false);
  });
});

describe('notificationResponses (data-driven, extensible — no sealed set)', () => {
  it('accept_decline yields Accept + Decline mapped to the accept boolean', () => {
    const rs = notificationResponses('accept_decline');
    expect(rs.map((r) => r.key)).toEqual(['accept', 'decline']);
    expect(rs.find((r) => r.key === 'accept')!.accept).toBe(true);
    expect(rs.find((r) => r.key === 'decline')!.accept).toBe(false);
  });
  it('an unrecognised action_type yields no responses (safe passive fallback)', () => {
    expect(notificationResponses('some_future_kind')).toEqual([]);
  });
  it('a null action_type yields no responses', () => {
    expect(notificationResponses(null)).toEqual([]);
  });
});

describe('firstToken (nickname render)', () => {
  it('takes the first whitespace-delimited token', () => {
    expect(firstToken('Bob Smith Jones')).toBe('Bob');
  });
  it('trims and tolerates extra whitespace', () => {
    expect(firstToken('  Carol   Danvers ')).toBe('Carol');
  });
});

describe('notificationStatusChip — N-B convergence + expiry', () => {
  it('a converged acting sibling reads "Answered by [first token]"', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'accepted',
        action_data: { resolved_by_name: 'Bob Smith', resolved_outcome: 'accepted' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Answered by Bob');
    expect(chip.tone).toBe('done');
  });
  it('a lazily-expired row (action_taken="expired") reads "Expired"', () => {
    const chip = notificationStatusChip(
      { ...base, action_type: 'accept_decline', action_taken: 'expired' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Expired');
    expect(chip.tone).toBe('expired');
  });
  it('a nomination handled without a resolver name still reads "Handled" (N-A preserved)', () => {
    const chip = notificationStatusChip(
      { ...base, kind: 'stewardship_nomination', action_type: 'accept_decline', action_taken: 'accepted' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Handled');
    expect(chip.tone).toBe('done');
  });
});
