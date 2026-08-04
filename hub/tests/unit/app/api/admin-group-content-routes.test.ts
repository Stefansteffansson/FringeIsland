/**
 * @jest-environment node
 *
 * FEAT-H041 STORY-1/6 — the six content-wing BFF routes: four-step admin
 * guard on every route (identity → wrapper flags → 404 collapse → durable
 * telemetry on success only), ids-only telemetry props, per-verb identity
 * convention (GET getVerifiedUserId / POST getUser — the house divergence,
 * matched deliberately), and SQLSTATE→HTTP maps on the two acts.
 * WRITTEN RED-FIRST (2026-08-04): neither the routes nor lib/admin/content
 * exist at head; every case fails on module resolution before
 * implementation. This file also establishes the route-tier suite pattern —
 * no BFF route suite existed before it (recorded in the spec's
 * Implementation notes; durable-telemetry assertions had no home until now).
 */
import type { NextResponse } from 'next/server';

const getVerifiedUserId = jest.fn<Promise<string | null>, [unknown]>();
const getUser = jest.fn();
const supabaseStub = { auth: { getUser } };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => supabaseStub),
}));
jest.mock('@/lib/supabase/auth', () => ({
  getVerifiedUserId: (c: unknown) => getVerifiedUserId(c),
}));

const contentMocks = {
  fetchAdminGroupForum: jest.fn(),
  fetchAdminGroupAnnouncements: jest.fn(),
  fetchAdminGroupConversations: jest.fn(),
  fetchAdminGroupConversationDetail: jest.fn(),
  moderateAdminGroupForumPost: jest.fn(),
};
jest.mock('@/lib/admin/content', () => {
  class AdminContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return { AdminContentError, ...contentMocks };
});

const removeAdminUserFromGroup = jest.fn();
jest.mock('@/lib/admin/users', () => {
  class AdminUsersError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return { AdminUsersError, removeAdminUserFromGroup };
});

const emitDurableTelemetry = jest.fn();
jest.mock('@/lib/observability/telemetry-server', () => ({
  emitDurableTelemetry: (...args: unknown[]) => emitDurableTelemetry(...args),
}));
jest.mock('@/lib/observability/telemetry', () => ({
  emitTelemetry: jest.fn(),
}));

import { AdminContentError } from '@/lib/admin/content';
import { AdminUsersError } from '@/lib/admin/users';
import { GET as forumGET } from '@/app/api/admin/groups/[id]/forum/route';
import { GET as announcementsGET } from '@/app/api/admin/groups/[id]/announcements/route';
import { GET as conversationsGET } from '@/app/api/admin/groups/[id]/conversations/route';
import { GET as conversationDetailGET } from '@/app/api/admin/groups/[id]/conversations/[conversationId]/route';
import { POST as moderatePOST } from '@/app/api/admin/groups/[id]/forum/[postId]/moderate/route';
import { POST as removePOST } from '@/app/api/admin/groups/[id]/members/[userId]/remove/route';

const GROUP_ID = '44444444-4444-4444-8444-444444444444';
const CONVERSATION_ID = 'c0000000-0000-4000-8000-000000000001';
const POST_ID = 'f0000000-0000-4000-8000-000000000001';
const TARGET_USER_ID = 'ee222222-2222-4222-8222-222222222222';
const ACTOR = 'ad000000-0000-4000-8000-00000000000a';

const req = (body?: unknown) =>
  new Request('http://localhost/x', {
    method: body === undefined ? 'GET' : 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

const groupParams = { params: Promise.resolve({ id: GROUP_ID }) };

beforeEach(() => {
  jest.clearAllMocks();
  getVerifiedUserId.mockResolvedValue(ACTOR);
  getUser.mockResolvedValue({ data: { user: { id: ACTOR } } });
});

type GetCase = {
  label: string;
  call: () => Promise<NextResponse | Response>;
  wrapper: jest.Mock;
  flagsOk: { data: unknown; refused: boolean; notFound: boolean };
  payloadKey: string;
  event: string;
  props: Record<string, string>;
};

const getCases: GetCase[] = [
  {
    label: 'forum',
    call: () => forumGET(req(), groupParams) as never,
    wrapper: contentMocks.fetchAdminGroupForum,
    flagsOk: { data: [{ id: POST_ID }], refused: false, notFound: false },
    payloadKey: 'posts',
    event: 'admin.group_forum_read',
    props: { actor: ACTOR, group: GROUP_ID },
  },
  {
    label: 'announcements',
    call: () => announcementsGET(req(), groupParams) as never,
    wrapper: contentMocks.fetchAdminGroupAnnouncements,
    flagsOk: { data: [{ id: 'a1' }], refused: false, notFound: false },
    payloadKey: 'announcements',
    event: 'admin.group_announcements_read',
    props: { actor: ACTOR, group: GROUP_ID },
  },
  {
    label: 'conversations',
    call: () => conversationsGET(req(), groupParams) as never,
    wrapper: contentMocks.fetchAdminGroupConversations,
    flagsOk: { data: [{ id: CONVERSATION_ID }], refused: false, notFound: false },
    payloadKey: 'conversations',
    event: 'admin.group_conversations_read',
    props: { actor: ACTOR, group: GROUP_ID },
  },
  {
    label: 'conversation detail',
    call: () =>
      conversationDetailGET(req(), {
        params: Promise.resolve({ id: GROUP_ID, conversationId: CONVERSATION_ID }),
      }) as never,
    wrapper: contentMocks.fetchAdminGroupConversationDetail,
    flagsOk: { data: { id: CONVERSATION_ID, messages: [] }, refused: false, notFound: false },
    payloadKey: 'detail',
    event: 'admin.group_conversation_detail_read',
    props: { actor: ACTOR, group: GROUP_ID, conversation: CONVERSATION_ID },
  },
];

describe.each(getCases)('GET $label (four-step admin guard)', (c) => {
  it('401 when unauthenticated — and no durable emit', async () => {
    getVerifiedUserId.mockResolvedValue(null);
    const res = await c.call();
    expect(res.status).toBe(401);
    expect(emitDurableTelemetry).not.toHaveBeenCalled();
  });

  it('collapses a refusal to the admin-plane 404 shape — and no durable emit', async () => {
    c.wrapper.mockResolvedValue({ data: null, refused: true, notFound: false });
    const res = await c.call();
    expect(res.status).toBe(404);
    expect(await (res as Response).json()).toEqual({ error: 'Not found' });
    expect(emitDurableTelemetry).not.toHaveBeenCalled();
  });

  it('serves the payload and emits the durable read event with ids only', async () => {
    c.wrapper.mockResolvedValue(c.flagsOk);
    const res = await c.call();
    expect(res.status).toBe(200);
    const body = (await (res as Response).json()) as Record<string, unknown>;
    expect(body[c.payloadKey]).toEqual(c.flagsOk.data);
    expect(emitDurableTelemetry).toHaveBeenCalledTimes(1);
    const [, name, props] = emitDurableTelemetry.mock.calls[0];
    expect(name).toBe(c.event);
    expect(props).toEqual(c.props); // exact — ids only, never content
  });
});

describe('POST moderate (the "clean forums" act)', () => {
  const moderateParams = { params: Promise.resolve({ id: GROUP_ID, postId: POST_ID }) };
  const result = {
    post_id: POST_ID,
    group_id: GROUP_ID,
    author_group_id: 'bbbb2222-2222-4222-8222-222222222222',
    is_deleted: true,
  };

  it('400 on a missing or empty reason — the wrapper is never called', async () => {
    for (const body of [{}, { reason: '' }, { reason: '   ' }]) {
      const res = await moderatePOST(req(body), moderateParams);
      expect(res.status).toBe(400);
    }
    expect(contentMocks.moderateAdminGroupForumPost).not.toHaveBeenCalled();
  });

  it('401 when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await moderatePOST(req({ reason: 'harassment' }), moderateParams);
    expect(res.status).toBe(401);
  });

  it('maps refusals: 42501/P0002 → the 404 shape; P0001 → 409 verbatim; 22023 → 400', async () => {
    const cases: Array<[string, string, number, string]> = [
      ['42501', 'platform administrator required', 404, 'Not found'],
      ['P0002', 'Post not found', 404, 'Not found'],
      ['P0001', 'group is not suspended', 409, 'group is not suspended'],
      ['22023', 'Reason required', 400, 'Reason required'],
    ];
    for (const [code, message, status, expected] of cases) {
      contentMocks.moderateAdminGroupForumPost.mockRejectedValueOnce(
        new AdminContentError(code, message),
      );
      const res = await moderatePOST(req({ reason: 'harassment' }), moderateParams);
      expect(res.status).toBe(status);
      expect(((await res.json()) as { error: string }).error).toBe(expected);
    }
    expect(emitDurableTelemetry).not.toHaveBeenCalled();
  });

  it('moderates, returns the platform result, and emits the durable act event with ids only', async () => {
    contentMocks.moderateAdminGroupForumPost.mockResolvedValue(result);
    const res = await moderatePOST(req({ reason: 'harassment' }), moderateParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(contentMocks.moderateAdminGroupForumPost).toHaveBeenCalledWith(
      supabaseStub,
      POST_ID,
      'harassment',
    );
    const [, name, props] = emitDurableTelemetry.mock.calls[0];
    expect(name).toBe('admin.group_forum_post_moderate');
    expect(props).toEqual({ actor: ACTOR, group: GROUP_ID, post: POST_ID }); // reason NEVER in telemetry
  });
});

describe('POST remove member (rides the PC021 door, keyed by user_id)', () => {
  const removeParams = { params: Promise.resolve({ id: GROUP_ID, userId: TARGET_USER_ID }) };
  const result = { group_id: GROUP_ID, group_name: 'Harbour Circle', scenario: 'regular_leave' };

  it('401 when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await removePOST(req({}), removeParams);
    expect(res.status).toBe(401);
  });

  it('collapses 42501 and P0002 to the admin-plane 404 shape', async () => {
    for (const [code, message] of [
      ['42501', 'platform administrator required'],
      ['P0002', 'user not found'],
    ] as const) {
      removeAdminUserFromGroup.mockRejectedValueOnce(new AdminUsersError(code, message));
      const res = await removePOST(req({}), removeParams);
      expect(res.status).toBe(404);
      expect(((await res.json()) as { error: string }).error).toBe('Not found');
    }
  });

  it('removes via the shared wrapper and emits the durable act event with the platform scenario', async () => {
    removeAdminUserFromGroup.mockResolvedValue(result);
    const res = await removePOST(req({}), removeParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(removeAdminUserFromGroup).toHaveBeenCalledWith(supabaseStub, TARGET_USER_ID, GROUP_ID);
    const [, name, props] = emitDurableTelemetry.mock.calls[0];
    expect(name).toBe('admin.member_remove_from_group');
    expect(props).toEqual({
      actor: ACTOR,
      user: TARGET_USER_ID,
      group: GROUP_ID,
      scenario: 'regular_leave',
    });
  });
});
