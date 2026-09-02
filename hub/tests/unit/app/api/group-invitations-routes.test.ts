import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H015 (unit) — the invitation BFF routes (Cycle G-C):
 * GET/POST /api/groups/[id]/invitations,
 * DELETE /api/groups/[id]/invitations/members/[memberGroupId],
 * DELETE /api/groups/[id]/invitations/email/[invitationId],
 * GET /api/groups/[id]/member-search,
 * GET /api/me/invitations, POST/DELETE /api/me/invitations/[groupId].
 *
 * Private BFF per ADR-U038 — the FEAT-PC012 contracts self-gate; these routes
 * only map session → 401 and SQLSTATE → HTTP (42501 → 403, P0002 → 404,
 * 22023 → 400, 23505 → 409 with the house sentence (a constraint's message is never copy — 2026-09-02), else
 * 500 content-free). Telemetry is id-only: EMAIL ADDRESSES AND SEARCH QUERIES
 * ARE PII/member content and never appear in events (STORY-6).
 *
 * Red-first: fails until the five route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
// ADR-U037: hot reads (pending list, search, my-invitations) resolve identity
// via local JWT verification (getClaims); mutations keep per-request getUser.
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchGroupInvitations = jest.fn<() => Promise<unknown>>();
const searchInvitableMembers = jest.fn<() => Promise<unknown>>();
const inviteMember = jest.fn<() => Promise<unknown>>();
const inviteByEmail = jest.fn<() => Promise<unknown>>();
const cancelMemberInvitation = jest.fn<() => Promise<unknown>>();
const cancelEmailInvitation = jest.fn<() => Promise<unknown>>();
const fetchMyInvitations = jest.fn<() => Promise<unknown>>();
const acceptGroupInvitation = jest.fn<() => Promise<unknown>>();
const declineGroupInvitation = jest.fn<() => Promise<unknown>>();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser, getClaims } }),
}));
jest.mock('@/lib/groups/invitations', () => ({
  fetchGroupInvitations: (...a: unknown[]) =>
    (fetchGroupInvitations as unknown as (...x: unknown[]) => unknown)(...a),
  searchInvitableMembers: (...a: unknown[]) =>
    (searchInvitableMembers as unknown as (...x: unknown[]) => unknown)(...a),
  inviteMember: (...a: unknown[]) =>
    (inviteMember as unknown as (...x: unknown[]) => unknown)(...a),
  inviteByEmail: (...a: unknown[]) =>
    (inviteByEmail as unknown as (...x: unknown[]) => unknown)(...a),
  cancelMemberInvitation: (...a: unknown[]) =>
    (cancelMemberInvitation as unknown as (...x: unknown[]) => unknown)(...a),
  cancelEmailInvitation: (...a: unknown[]) =>
    (cancelEmailInvitation as unknown as (...x: unknown[]) => unknown)(...a),
  fetchMyInvitations: (...a: unknown[]) =>
    (fetchMyInvitations as unknown as (...x: unknown[]) => unknown)(...a),
  acceptGroupInvitation: (...a: unknown[]) =>
    (acceptGroupInvitation as unknown as (...x: unknown[]) => unknown)(...a),
  declineGroupInvitation: (...a: unknown[]) =>
    (declineGroupInvitation as unknown as (...x: unknown[]) => unknown)(...a),
}));

import {
  GET as GET_PENDING,
  POST as POST_INVITE,
} from '@/app/api/groups/[id]/invitations/route';
import { DELETE as CANCEL_MEMBER } from '@/app/api/groups/[id]/invitations/members/[memberGroupId]/route';
import { DELETE as CANCEL_EMAIL } from '@/app/api/groups/[id]/invitations/email/[invitationId]/route';
import { GET as SEARCH } from '@/app/api/groups/[id]/member-search/route';
import { GET as GET_MINE } from '@/app/api/me/invitations/route';
import {
  POST as ACCEPT,
  DELETE as DECLINE,
} from '@/app/api/me/invitations/[groupId]/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

/** Emails, search queries, and display names are PII/member content — never in events. */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => {
    const s = JSON.stringify(e.props ?? {});
    return (
      !s.includes('newcomer@example.test') &&
      !s.includes('GCFindme') &&
      !s.includes('@')
    );
  });

const PENDING = {
  group_id: 'grp-1',
  member_invitations: [
    {
      member_group_id: 'pg-2',
      display_name: 'GCFindmeTarget',
      invited_at: '2026-07-04T10:00:00+00:00',
      invited_by_display_name: 'GCInviterPerson',
    },
  ],
  email_invitations: [
    {
      id: 'inv-1',
      invited_email: 'newcomer@example.test',
      created_at: '2026-07-04T10:00:00+00:00',
      expires_at: '2026-08-03T10:00:00+00:00',
      expired: false,
    },
  ],
};

const HITS = [
  { member_group_id: 'pg-2', display_name: 'GCFindmeTarget', membership_status: null },
];

const MINE = [
  {
    group_id: 'grp-1',
    group_name: 'A Group',
    group_description: null,
    is_public: false,
    invited_at: '2026-07-04T10:00:00+00:00',
    invited_by_display_name: 'GCInviterPerson',
  },
];

const jsonRequest = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const fakeRequest = {} as unknown as Request;
const searchRequest = (q: string) =>
  ({ url: `http://localhost/api/groups/grp-1/member-search?q=${encodeURIComponent(q)}` }) as unknown as Request;
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const memberParams = (id: string, memberGroupId: string) => ({
  params: Promise.resolve({ id, memberGroupId }),
});
const emailParams = (id: string, invitationId: string) => ({
  params: Promise.resolve({ id, invitationId }),
});
const groupIdParams = (groupId: string) => ({ params: Promise.resolve({ groupId }) });

const sqlErr = (code: string, message = 'refused by the substrate') =>
  Object.assign(new Error(message), { code, message });

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  fetchGroupInvitations.mockReset().mockResolvedValue(PENDING);
  searchInvitableMembers.mockReset().mockResolvedValue(HITS);
  inviteMember.mockReset().mockResolvedValue(undefined);
  inviteByEmail.mockReset().mockResolvedValue({ kind: 'email_invitation' });
  cancelMemberInvitation.mockReset().mockResolvedValue(undefined);
  cancelEmailInvitation.mockReset().mockResolvedValue(undefined);
  fetchMyInvitations.mockReset().mockResolvedValue(MINE);
  acceptGroupInvitation.mockReset().mockResolvedValue(undefined);
  declineGroupInvitation.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/groups/[id]/invitations (pending list)', () => {
  it('401 sessionless via local claims, contract never reached', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET_PENDING(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchGroupInvitations).not.toHaveBeenCalled();
  });

  it('200 pass-through; telemetry id-only (no emails ever)', async () => {
    const res = (await GET_PENDING(fakeRequest, idParams('grp-1'))) as unknown as {
      status: number;
      body: typeof PENDING;
    };
    expect(res.status).toBe(200);
    expect(res.body).toEqual(PENDING);
    expect(emitted('invitations.list', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps 42501 → 403 (plain member) and P0002 → 404 (non-member, no-leak)', async () => {
    fetchGroupInvitations.mockRejectedValue(sqlErr('42501'));
    const forbidden = (await GET_PENDING(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(forbidden.status).toBe(403);
    fetchGroupInvitations.mockRejectedValue(sqlErr('P0002'));
    const missing = (await GET_PENDING(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(missing.status).toBe(404);
  });
});

describe('POST /api/groups/[id]/invitations (invite: member XOR email)', () => {
  it('invites a member by member_group_id (200, id-only telemetry)', async () => {
    const res = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2' }),
      idParams('grp-1'),
    )) as { status: number };
    expect(res.status).toBe(201);
    expect(inviteMember).toHaveBeenCalled();
    expect(inviteByEmail).not.toHaveBeenCalled();
    expect(emitted('invitations.invite_member', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('invites by email and relays the contract kind (conversion transparent)', async () => {
    inviteByEmail.mockResolvedValue({ kind: 'member_invitation' });
    const res = (await POST_INVITE(
      jsonRequest({ email: 'newcomer@example.test' }),
      idParams('grp-1'),
    )) as unknown as { status: number; body: { kind: string } };
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe('member_invitation');
    expect(emitted('invitations.invite_email', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('400 on both keys or neither — XOR, no contract call', async () => {
    const both = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2', email: 'x@y.test' }),
      idParams('grp-1'),
    )) as { status: number };
    expect(both.status).toBe(400);
    const neither = (await POST_INVITE(jsonRequest({}), idParams('grp-1'))) as {
      status: number;
    };
    expect(neither.status).toBe(400);
    expect(inviteMember).not.toHaveBeenCalled();
    expect(inviteByEmail).not.toHaveBeenCalled();
  });

  it('maps 23505 → 409 (already invited/member; duplicate email)', async () => {
    inviteMember.mockRejectedValue(sqlErr('23505', 'already invited'));
    const res = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2' }),
      idParams('grp-1'),
    )) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(409);
  });

  // CQ-017's "separate, still-wanted fix" (OPEN_QUESTIONS.md, 2026-07-05) —
  // found ALREADY FIXED platform-side at the Ferd leftovers pass (2026-09-02):
  // `invite_member` pre-checks and raises a human, state-specific message under
  // 23505 (FEAT-PC012 STORY-2b, `invitation-contracts.test.ts`), and that
  // message is the copy the panel shows. What remained was the guard below:
  // should a raw constraint ever fire instead, Postgres's own text must not
  // become member-facing copy. Demonstrated red at head (the raw text reached
  // the body), then green.
  it('guard: a raw Postgres constraint message under 23505 becomes the house sentence, never copy', async () => {
    inviteMember.mockRejectedValue(
      sqlErr(
        '23505',
        'duplicate key value violates unique constraint "group_memberships_group_id_member_group_id_key"',
      ),
    );
    const res = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2' }),
      idParams('grp-1'),
    )) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('This member has already been invited or is already a member.');
    expect(res.body.error).not.toMatch(/duplicate key|unique constraint/i);
  });

  // Labelled guard (green at head, kept on purpose): the contract's OWN human
  // message is the copy and must keep passing through — the guard above must
  // not flatten "a pending invitation already exists" into the generic line.
  it("the contract's state-specific 23505 message passes through as the copy", async () => {
    inviteMember.mockRejectedValue(
      sqlErr('23505', 'a pending invitation already exists for this member'),
    );
    const res = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2' }),
      idParams('grp-1'),
    )) as unknown as { status: number; body: { error: string } };
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('a pending invitation already exists for this member');
  });

  it('maps 22023 → 400 (malformed email), 42501 → 403, P0002 → 404', async () => {
    inviteByEmail.mockRejectedValue(sqlErr('22023', 'invalid email address'));
    const bad = (await POST_INVITE(
      jsonRequest({ email: 'not-an-email' }),
      idParams('grp-1'),
    )) as { status: number };
    expect(bad.status).toBe(400);
    inviteMember.mockRejectedValue(sqlErr('42501'));
    const denied = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2' }),
      idParams('grp-1'),
    )) as { status: number };
    expect(denied.status).toBe(403);
    inviteMember.mockRejectedValue(sqlErr('P0002'));
    const ghost = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-dead' }),
      idParams('grp-1'),
    )) as { status: number };
    expect(ghost.status).toBe(404);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('401 without a session (mutations use getUser)', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await POST_INVITE(
      jsonRequest({ member_group_id: 'pg-2' }),
      idParams('grp-1'),
    )) as { status: number };
    expect(res.status).toBe(401);
    expect(inviteMember).not.toHaveBeenCalled();
  });
});

describe('DELETE cancel routes (member + email shapes, never conflated)', () => {
  it('cancels a member invitation (200) and maps P0002 → 404', async () => {
    const res = (await CANCEL_MEMBER(fakeRequest, memberParams('grp-1', 'pg-2'))) as {
      status: number;
    };
    expect(res.status).toBe(200);
    expect(cancelMemberInvitation).toHaveBeenCalled();
    expect(emitted('invitations.cancel_member', 'u1')).toBe(true);
    cancelMemberInvitation.mockRejectedValue(sqlErr('P0002'));
    const missing = (await CANCEL_MEMBER(fakeRequest, memberParams('grp-1', 'pg-x'))) as {
      status: number;
    };
    expect(missing.status).toBe(404);
  });

  it('cancels an email invitation by id (200), 42501 → 403', async () => {
    const res = (await CANCEL_EMAIL(fakeRequest, emailParams('grp-1', 'inv-1'))) as {
      status: number;
    };
    expect(res.status).toBe(200);
    expect(cancelEmailInvitation).toHaveBeenCalled();
    expect(emitted('invitations.cancel_email', 'u1')).toBe(true);
    cancelEmailInvitation.mockRejectedValue(sqlErr('42501'));
    const denied = (await CANCEL_EMAIL(fakeRequest, emailParams('grp-1', 'inv-1'))) as {
      status: number;
    };
    expect(denied.status).toBe(403);
    expect(telemetryIsContentFree()).toBe(true);
  });
});

describe('GET /api/groups/[id]/member-search', () => {
  it('relays q and returns hits; the query itself never enters telemetry', async () => {
    const res = (await SEARCH(searchRequest('GCFindme'), idParams('grp-1'))) as unknown as {
      status: number;
      body: typeof HITS;
    };
    expect(res.status).toBe(200);
    expect(res.body).toEqual(HITS);
    expect(emitted('invitations.search', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('400 on a missing/empty q without reaching the contract; maps 22023 → 400', async () => {
    const empty = (await SEARCH(searchRequest(''), idParams('grp-1'))) as { status: number };
    expect(empty.status).toBe(400);
    expect(searchInvitableMembers).not.toHaveBeenCalled();
    searchInvitableMembers.mockRejectedValue(sqlErr('22023'));
    const bad = (await SEARCH(searchRequest('  '), idParams('grp-1'))) as { status: number };
    expect([400]).toContain(bad.status);
  });

  it('401 sessionless; 42501 → 403; P0002 → 404', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await SEARCH(searchRequest('x'), idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(401);
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
    searchInvitableMembers.mockRejectedValue(sqlErr('42501'));
    expect(
      ((await SEARCH(searchRequest('x'), idParams('grp-1'))) as { status: number }).status,
    ).toBe(403);
    searchInvitableMembers.mockRejectedValue(sqlErr('P0002'));
    expect(
      ((await SEARCH(searchRequest('x'), idParams('grp-1'))) as { status: number }).status,
    ).toBe(404);
  });
});

describe('GET /api/me/invitations + POST/DELETE /api/me/invitations/[groupId]', () => {
  it('returns my invitations (200); 401 sessionless', async () => {
    const res = (await GET_MINE()) as unknown as { status: number; body: typeof MINE };
    expect(res.status).toBe(200);
    expect(res.body).toEqual(MINE);
    expect(emitted('invitations.mine', 'u1')).toBe(true);
    getClaims.mockResolvedValue({ data: null, error: null });
    const anon = (await GET_MINE()) as { status: number };
    expect(anon.status).toBe(401);
  });

  it('accepts (200, telemetry) and maps P0002 → 404 (no pending invitation)', async () => {
    const res = (await ACCEPT(fakeRequest, groupIdParams('grp-1'))) as { status: number };
    expect(res.status).toBe(200);
    expect(acceptGroupInvitation).toHaveBeenCalled();
    expect(emitted('invitations.accept', 'u1')).toBe(true);
    acceptGroupInvitation.mockRejectedValue(sqlErr('P0002'));
    const missing = (await ACCEPT(fakeRequest, groupIdParams('grp-1'))) as { status: number };
    expect(missing.status).toBe(404);
  });

  it('declines (200, telemetry); 42501 → 403 (a Mist/suspended caller)', async () => {
    const res = (await DECLINE(fakeRequest, groupIdParams('grp-1'))) as { status: number };
    expect(res.status).toBe(200);
    expect(declineGroupInvitation).toHaveBeenCalled();
    expect(emitted('invitations.decline', 'u1')).toBe(true);
    declineGroupInvitation.mockRejectedValue(sqlErr('42501'));
    const denied = (await DECLINE(fakeRequest, groupIdParams('grp-1'))) as { status: number };
    expect(denied.status).toBe(403);
    expect(telemetryIsContentFree()).toBe(true);
  });
});
