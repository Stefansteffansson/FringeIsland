import { describe, it, expect, jest } from '@jest/globals';

/**
 * FEAT-H038 STORY-5 (W-3 surface half, unit) — the availability refusals reach
 * member copy. WRITTEN RED-FIRST (2026-08-03): the FEAT-PC023 doors refuse
 * P0001 with the canonical messages 'group is resting' / 'group is suspended',
 * but no Hub mapper carries them — mapForumError collapses P0001 to a generic
 * 400 "Invalid request", mapAnnouncementError and mapContractError have no
 * P0001 branch at all (→ 500 "Request failed").
 *
 * The fix shape pinned here: a shared `availabilityRefusal` helper
 * (lib/groups/http.ts — keyed on SQLSTATE + canonical message, open to new
 * cases) returning 409 with the substrate's message passed through verbatim,
 * consulted first by the domain mappers; every non-availability case keeps its
 * existing mapping.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));

import { availabilityRefusal } from '@/lib/groups/http';
import { mapForumError, mapForumOwnMutationError } from '@/lib/forum/http';
import { mapAnnouncementError } from '@/lib/announcements/http';
import { mapContractError } from '@/lib/messages/http';

type MockResponse = { status: number; body: { error?: string } };

const resting = { code: 'P0001', message: 'group is resting' };
const suspended = { code: 'P0001', message: 'group is suspended' };

describe('availabilityRefusal (FEAT-H038 STORY-5)', () => {
  it("maps P0001 'group is resting' to 409 with the canonical message through", () => {
    const res = availabilityRefusal(resting) as unknown as MockResponse | null;
    expect(res).not.toBeNull();
    expect(res!.status).toBe(409);
    expect(res!.body.error).toBe('group is resting');
  });

  it("maps P0001 'group is suspended' to 409 with the canonical message through", () => {
    const res = availabilityRefusal(suspended) as unknown as MockResponse | null;
    expect(res!.status).toBe(409);
    expect(res!.body.error).toBe('group is suspended');
  });

  it('declines every other P0001 (domain semantics stay with their mapper)', () => {
    expect(availabilityRefusal({ code: 'P0001', message: 'replies cannot be nested' })).toBeNull();
  });

  it('declines a non-P0001 even when the message matches (SQLSTATE is the key)', () => {
    expect(availabilityRefusal({ code: '42501', message: 'group is resting' })).toBeNull();
  });
});

describe('the domain mappers carry the availability refusals (FEAT-H038 STORY-5)', () => {
  it('mapForumError: availability → 409 verbatim; flat-threading P0001 keeps its 400', () => {
    const held = mapForumError(resting, 'forum.post_refused', 'u1') as unknown as MockResponse;
    expect(held.status).toBe(409);
    expect(held.body.error).toBe('group is resting');

    const nested = mapForumError(
      { code: 'P0001', message: 'replies cannot be nested' },
      'forum.post_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(nested.status).toBe(400);
  });

  it('mapForumOwnMutationError: availability -> 409 verbatim; a 42501 maps to the generic 403 (TASK-EDT-01: the window branch is retired)', () => {
    const held = mapForumOwnMutationError(
      suspended,
      'forum.edit_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(held.status).toBe(409);
    expect(held.body.error).toBe('group is suspended');

    const refusal = mapForumOwnMutationError(
      { code: '42501', message: 'Only the author may edit their post' },
      'forum.edit_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(refusal.status).toBe(403);
    expect(refusal.body.error).toBe('Not allowed');

    // The discriminating cell: a window-worded 42501 no longer gets the
    // retired window copy — the branch itself is gone, not just unreachable.
    const windowWorded = mapForumOwnMutationError(
      { code: '42501', message: 'The edit window (15 minutes) has closed' },
      'forum.edit_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(windowWorded.body.error).toBe('Not allowed');
  });

  it('mapAnnouncementError: availability → 409 verbatim; P0002 keeps its 404', () => {
    const held = mapAnnouncementError(
      resting,
      'announcements.send_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(held.status).toBe(409);
    expect(held.body.error).toBe('group is resting');

    const missing = mapAnnouncementError(
      { code: 'P0002', message: 'not found' },
      'announcements.send_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(missing.status).toBe(404);
  });

  it('mapContractError: availability → 409 verbatim; 42501 keeps its 403', () => {
    const held = mapContractError(
      suspended,
      'messages.send_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(held.status).toBe(409);
    expect(held.body.error).toBe('group is suspended');

    const refused = mapContractError(
      { code: '42501', message: 'not a participant' },
      'messages.send_refused',
      'u1',
    ) as unknown as MockResponse;
    expect(refused.status).toBe(403);
  });
});
