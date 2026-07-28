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
  // LABELLED SIBLING ADAPTATION (W-03 #2, 2026-07-28). This asserted
  // "Answered by Bob" for an ACCEPTED row. The convergence half is unchanged and
  // still proved — who answered is named, by first token — but "Answered" hid
  // WHICH way they answered, which is the defect the gate walk named: a co-leader
  // could not tell from their own copy whether the group had joined or refused.
  it('a converged acting sibling names the outcome AND the resolver, by first token', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'accepted',
        action_data: { resolved_by_name: 'Bob Smith', resolved_outcome: 'accepted' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Accepted by Bob');
    expect(chip.tone).toBe('done');
  });

  it('a converged acting sibling that was DECLINED says so, and does not render as an accept', () => {
    const chip = notificationStatusChip(
      {
        ...base,
        action_type: 'accept_decline',
        action_taken: 'declined',
        action_data: { resolved_by_name: 'Bob Smith', resolved_outcome: 'declined' },
      },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Declined by Bob');
    expect(chip.tone).toBe('declined');
  });
  it('a lazily-expired row (action_taken="expired") reads "Expired"', () => {
    const chip = notificationStatusChip(
      { ...base, action_type: 'accept_decline', action_taken: 'expired' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Expired');
    expect(chip.tone).toBe('expired');
  });
  // LABELLED SIBLING ADAPTATION (W-03 #2, 2026-07-28). "Handled" was the N-A
  // wording for a single-recipient nomination — there is no resolver to name
  // because the only recipient is the answerer. But the outcome was knowable and
  // went unsaid: a member who declined a stewardship saw the same word as one
  // who accepted. Nobody to name is not the same as nothing to say.
  it('a nomination answered by its only recipient names the outcome, with nobody to attribute it to', () => {
    const accepted = notificationStatusChip(
      { ...base, kind: 'stewardship_nomination', action_type: 'accept_decline', action_taken: 'accepted' },
      NOW,
    ) as NotificationChip;
    expect(accepted.label).toBe('Accepted');
    expect(accepted.tone).toBe('done');

    const declined = notificationStatusChip(
      { ...base, kind: 'stewardship_nomination', action_type: 'accept_decline', action_taken: 'declined' },
      NOW,
    ) as NotificationChip;
    expect(declined.label).toBe('Declined');
    expect(declined.tone).toBe('declined');
  });

  // N-A's bare "Handled" survives where it is still the honest answer: an
  // outcome this surface does not recognise (U008 open set).
  it('an unrecognised outcome still reads "Handled" — the N-A fallback is preserved, not deleted', () => {
    const chip = notificationStatusChip(
      { ...base, kind: 'stewardship_nomination', action_type: 'accept_decline', action_taken: 'withdrawn' },
      NOW,
    ) as NotificationChip;
    expect(chip.label).toBe('Handled');
    expect(chip.tone).toBe('done');
  });
});
