import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H014 (unit) — the role BFF routes (Cycle G-B): GET/POST
 * /api/groups/[id]/roles, PATCH/DELETE /api/groups/[id]/roles/[roleId],
 * POST/DELETE /api/groups/[id]/members/[memberGroupId]/roles/[roleId],
 * GET /api/groups/[id]/my-permissions.
 *
 * Private BFF per ADR-U038 — the FEAT-PC011 contracts self-gate; these routes
 * only map session → 401 and SQLSTATE → HTTP (42501 → 403, P0002 → 404,
 * 22023 → 400, 23505/P0001 → 409 with the invariant's message passed through,
 * else 500 content-free). Telemetry is id-only: role names are member content
 * and never appear in events (STORY-5).
 *
 * Red-first: fails until the four route modules exist.
 */

const getUser = jest.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
// ADR-U037: hot reads (fabric, my-permissions) resolve identity via local JWT
// verification (getClaims); mutations keep the per-request getUser round-trip.
const getClaims = jest.fn<
  () => Promise<{ data: { claims: { sub: string } } | null; error: null }>
>();
const fetchGroupRoles = jest.fn<() => Promise<unknown>>();
const fetchRoleTemplates = jest.fn<() => Promise<unknown>>();
const createGroupRole = jest.fn<() => Promise<unknown>>();
const updateGroupRole = jest.fn<() => Promise<unknown>>();
const setGroupRolePermission = jest.fn<() => Promise<unknown>>();
const deleteGroupRole = jest.fn<() => Promise<unknown>>();
const assignMemberRole = jest.fn<() => Promise<unknown>>();
const removeMemberRole = jest.fn<() => Promise<unknown>>();
const fetchMyPermissions = jest.fn<() => Promise<unknown>>();

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
jest.mock('@/lib/groups/queries', () => ({
  fetchGroupRoles: (...a: unknown[]) =>
    (fetchGroupRoles as unknown as (...x: unknown[]) => unknown)(...a),
  fetchRoleTemplates: (...a: unknown[]) =>
    (fetchRoleTemplates as unknown as (...x: unknown[]) => unknown)(...a),
  createGroupRole: (...a: unknown[]) =>
    (createGroupRole as unknown as (...x: unknown[]) => unknown)(...a),
  updateGroupRole: (...a: unknown[]) =>
    (updateGroupRole as unknown as (...x: unknown[]) => unknown)(...a),
  setGroupRolePermission: (...a: unknown[]) =>
    (setGroupRolePermission as unknown as (...x: unknown[]) => unknown)(...a),
  deleteGroupRole: (...a: unknown[]) =>
    (deleteGroupRole as unknown as (...x: unknown[]) => unknown)(...a),
  assignMemberRole: (...a: unknown[]) =>
    (assignMemberRole as unknown as (...x: unknown[]) => unknown)(...a),
  removeMemberRole: (...a: unknown[]) =>
    (removeMemberRole as unknown as (...x: unknown[]) => unknown)(...a),
  fetchMyPermissions: (...a: unknown[]) =>
    (fetchMyPermissions as unknown as (...x: unknown[]) => unknown)(...a),
}));

import { GET as GET_ROLES, POST as POST_ROLE } from '@/app/api/groups/[id]/roles/route';
import { PATCH as PATCH_ROLE, DELETE as DELETE_ROLE } from '@/app/api/groups/[id]/roles/[roleId]/route';
import {
  POST as ASSIGN,
  DELETE as UNASSIGN,
} from '@/app/api/groups/[id]/members/[memberGroupId]/roles/[roleId]/route';
import { GET as GET_MY_PERMISSIONS } from '@/app/api/groups/[id]/my-permissions/route';

const emitted = (name: string, actor?: string) =>
  getTelemetrySink().some(
    (e) => e.name === name && (actor === undefined || e.props?.actor === actor),
  );

/** Role names and permission labels are member content — never in events. */
const telemetryIsContentFree = () =>
  getTelemetrySink().every((e) => {
    const s = JSON.stringify(e.props ?? {});
    return !s.includes('Reading Guide') && !s.includes('Secret Wrangler');
  });

const FABRIC = {
  group_id: 'grp-1',
  roles: [
    {
      id: 'role-1',
      name: 'Reading Guide',
      description: null,
      created_from_role_template_id: 'tmpl-1',
      holder_count: 1,
      permissions: ['view_forum'],
    },
  ],
  viewer: { can_manage_roles: true, can_assign_roles: true, can_remove_roles: true },
  available_permissions: [{ name: 'view_forum', category: 'communication' }],
};

const ROLE_ENTRY = FABRIC.roles[0];

/** Foundational templates ride the fabric response — platform vocabulary,
 *  RLS-readable by any authenticated client (the BFF composes, not owns). */
const TEMPLATES = [{ id: 'tmpl-1', name: 'Guide Role Template', description: null }];

const jsonRequest = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const fakeRequest = {} as unknown as Request;
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const roleParams = (id: string, roleId: string) => ({
  params: Promise.resolve({ id, roleId }),
});
const bindingParams = (id: string, memberGroupId: string, roleId: string) => ({
  params: Promise.resolve({ id, memberGroupId, roleId }),
});

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
  fetchGroupRoles.mockReset().mockResolvedValue(FABRIC);
  fetchRoleTemplates.mockReset().mockResolvedValue(TEMPLATES);
  createGroupRole.mockReset().mockResolvedValue('role-new');
  updateGroupRole.mockReset().mockResolvedValue(ROLE_ENTRY);
  setGroupRolePermission.mockReset().mockResolvedValue(ROLE_ENTRY);
  deleteGroupRole.mockReset().mockResolvedValue(undefined);
  assignMemberRole.mockReset().mockResolvedValue(undefined);
  removeMemberRole.mockReset().mockResolvedValue(undefined);
  fetchMyPermissions.mockReset().mockResolvedValue(['view_forum']);
});

describe('GET /api/groups/[id]/roles (fabric)', () => {
  it('returns 401 sessionless via local claims, never reaching the contract', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET_ROLES(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchGroupRoles).not.toHaveBeenCalled();
    expect(emitted('roles.fabric_unauthenticated')).toBe(true);
  });

  it('returns 200 with the fabric pass-through + the foundational templates, telemetry id-only', async () => {
    const res = (await GET_ROLES(fakeRequest, idParams('grp-1'))) as {
      status: number;
      body: { fabric: typeof FABRIC; templates: typeof TEMPLATES };
    };
    expect(res.status).toBe(200);
    expect(res.body.fabric).toEqual(FABRIC);
    expect(res.body.templates).toEqual(TEMPLATES);
    expect(emitted('roles.fabric', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps P0002 → 404 and 42501 → 403', async () => {
    fetchGroupRoles.mockRejectedValue({ code: 'P0002' });
    let res = (await GET_ROLES(fakeRequest, idParams('ghost'))) as { status: number };
    expect(res.status).toBe(404);
    expect(emitted('roles.fabric_missing', 'u1')).toBe(true);

    fetchGroupRoles.mockRejectedValue({ code: '42501' });
    res = (await GET_ROLES(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('roles.fabric_refused', 'u1')).toBe(true);
  });
});

describe('POST /api/groups/[id]/roles (create)', () => {
  it('returns 401 when sessionless, never reaching the contract', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = (await POST_ROLE(jsonRequest({ name: 'X' }), idParams('grp-1'))) as {
      status: number;
    };
    expect(res.status).toBe(401);
    expect(createGroupRole).not.toHaveBeenCalled();
    expect(emitted('roles.create_unauthenticated')).toBe(true);
  });

  it('creates and returns 201 { id }, telemetry id-only', async () => {
    const res = (await POST_ROLE(
      jsonRequest({ name: 'Secret Wrangler', permissions: ['view_forum'] }),
      idParams('grp-1'),
    )) as { status: number; body: { id: string } };
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('role-new');
    expect(createGroupRole).toHaveBeenCalledWith(
      expect.anything(),
      'grp-1',
      expect.objectContaining({ name: 'Secret Wrangler' }),
    );
    expect(emitted('roles.create', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps the walls: 42501 → 403 (anti-escalation), 22023 → 400, 23505 → 409', async () => {
    createGroupRole.mockRejectedValue({ code: '42501' });
    let res = (await POST_ROLE(jsonRequest({ name: 'X' }), idParams('grp-1'))) as {
      status: number;
    };
    expect(res.status).toBe(403);
    expect(emitted('roles.create_refused', 'u1')).toBe(true);

    createGroupRole.mockRejectedValue({ code: '22023' });
    res = (await POST_ROLE(jsonRequest({ name: 'X' }), idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(400);
    expect(emitted('roles.create_invalid', 'u1')).toBe(true);

    createGroupRole.mockRejectedValue({ code: '23505' });
    res = (await POST_ROLE(jsonRequest({ name: 'X' }), idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(409);
    expect(emitted('roles.create_conflict', 'u1')).toBe(true);
  });

  it('maps other failures to 500, content-free', async () => {
    createGroupRole.mockRejectedValue({ code: 'XX000', message: 'Secret Wrangler exploded' });
    const res = (await POST_ROLE(jsonRequest({ name: 'Secret Wrangler' }), idParams('grp-1'))) as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('Secret Wrangler');
    expect(emitted('roles.create_failed', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });
});

describe('PATCH /api/groups/[id]/roles/[roleId] (update / grant toggle)', () => {
  it('flips a grant via set_permission and returns the fresh entry', async () => {
    const res = (await PATCH_ROLE(
      jsonRequest({ set_permission: { name: 'view_forum', granted: true } }),
      roleParams('grp-1', 'role-1'),
    )) as { status: number; body: { role: typeof ROLE_ENTRY } };
    expect(res.status).toBe(200);
    expect(res.body.role).toEqual(ROLE_ENTRY);
    expect(setGroupRolePermission).toHaveBeenCalledWith(
      expect.anything(),
      'role-1',
      'view_forum',
      true,
    );
    expect(updateGroupRole).not.toHaveBeenCalled();
    expect(emitted('roles.update', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('renames via name/description and refuses a mixed or empty body (400)', async () => {
    let res = (await PATCH_ROLE(
      jsonRequest({ name: 'Secret Wrangler' }),
      roleParams('grp-1', 'role-1'),
    )) as { status: number };
    expect(res.status).toBe(200);
    expect(updateGroupRole).toHaveBeenCalledWith(
      expect.anything(),
      'role-1',
      expect.objectContaining({ name: 'Secret Wrangler' }),
    );

    res = (await PATCH_ROLE(
      jsonRequest({ name: 'X', set_permission: { name: 'view_forum', granted: true } }),
      roleParams('grp-1', 'role-1'),
    )) as { status: number };
    expect(res.status).toBe(400);

    res = (await PATCH_ROLE(jsonRequest({}), roleParams('grp-1', 'role-1'))) as {
      status: number;
    };
    expect(res.status).toBe(400);
  });

  it('maps the anti-escalation wall (42501 → 403) with the message surfaced', async () => {
    setGroupRolePermission.mockRejectedValue({
      code: '42501',
      message: 'cannot grant a permission you do not hold: edit_group_settings',
    });
    const res = (await PATCH_ROLE(
      jsonRequest({ set_permission: { name: 'edit_group_settings', granted: true } }),
      roleParams('grp-1', 'role-1'),
    )) as { status: number; body: { error: string } };
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('cannot grant');
    expect(emitted('roles.update_refused', 'u1')).toBe(true);
  });
});

describe('DELETE /api/groups/[id]/roles/[roleId]', () => {
  it('deletes and returns 200 { ok }', async () => {
    const res = (await DELETE_ROLE(fakeRequest, roleParams('grp-1', 'role-1'))) as {
      status: number;
      body: { ok: boolean };
    };
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(deleteGroupRole).toHaveBeenCalledWith(expect.anything(), 'role-1');
    expect(emitted('roles.delete', 'u1')).toBe(true);
  });

  it('maps held-role refusal (P0001 → 409) with the invariant message passed through', async () => {
    deleteGroupRole.mockRejectedValue({
      code: 'P0001',
      message: 'role is held by members — remove the role from all holders first',
    });
    const res = (await DELETE_ROLE(fakeRequest, roleParams('grp-1', 'role-1'))) as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('remove the role from all holders first');
    expect(emitted('roles.delete_conflict', 'u1')).toBe(true);
  });

  it('maps template-derived refusal (42501 → 403) and no-leak (P0002 → 404)', async () => {
    deleteGroupRole.mockRejectedValue({ code: '42501', message: 'template-derived' });
    let res = (await DELETE_ROLE(fakeRequest, roleParams('grp-1', 'role-1'))) as {
      status: number;
    };
    expect(res.status).toBe(403);
    expect(emitted('roles.delete_refused', 'u1')).toBe(true);

    deleteGroupRole.mockRejectedValue({ code: 'P0002' });
    res = (await DELETE_ROLE(fakeRequest, roleParams('grp-1', 'ghost'))) as { status: number };
    expect(res.status).toBe(404);
    expect(emitted('roles.delete_missing', 'u1')).toBe(true);
  });
});

describe('POST/DELETE /api/groups/[id]/members/[memberGroupId]/roles/[roleId] (assign/remove)', () => {
  it('assigns and returns 201, telemetry id-only (member + role ids, never names)', async () => {
    const res = (await ASSIGN(fakeRequest, bindingParams('grp-1', 'pg-2', 'role-1'))) as {
      status: number;
    };
    expect(res.status).toBe(201);
    expect(assignMemberRole).toHaveBeenCalledWith(expect.anything(), 'grp-1', 'pg-2', 'role-1');
    expect(emitted('roles.assign', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps the assignment-time wall (42501 → 403), non-active target (22023 → 400), double-assign (23505 → 409)', async () => {
    assignMemberRole.mockRejectedValue({
      code: '42501',
      message: 'cannot assign a role granting permissions you do not hold',
    });
    let res = (await ASSIGN(fakeRequest, bindingParams('grp-1', 'pg-2', 'role-1'))) as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('cannot assign');
    expect(emitted('roles.assign_refused', 'u1')).toBe(true);

    assignMemberRole.mockRejectedValue({ code: '22023' });
    res = (await ASSIGN(fakeRequest, bindingParams('grp-1', 'pg-2', 'role-1'))) as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(400);
    expect(emitted('roles.assign_invalid', 'u1')).toBe(true);

    assignMemberRole.mockRejectedValue({ code: '23505' });
    res = (await ASSIGN(fakeRequest, bindingParams('grp-1', 'pg-2', 'role-1'))) as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(409);
    expect(emitted('roles.assign_conflict', 'u1')).toBe(true);
  });

  it('removes and returns 200; the last-Steward invariant (P0001) maps to 409 with the message', async () => {
    let res = (await UNASSIGN(fakeRequest, bindingParams('grp-1', 'pg-2', 'role-1'))) as {
      status: number;
    };
    expect(res.status).toBe(200);
    expect(removeMemberRole).toHaveBeenCalledWith(expect.anything(), 'grp-1', 'pg-2', 'role-1');
    expect(emitted('roles.unassign', 'u1')).toBe(true);

    removeMemberRole.mockRejectedValue({
      code: 'P0001',
      message: 'Cannot remove the last Steward from the group. Assign another Steward first.',
    });
    res = (await UNASSIGN(fakeRequest, bindingParams('grp-1', 'pg-1', 'role-s'))) as {
      status: number;
      body: { error: string };
    };
    expect(res.status).toBe(409);
    expect((res as { body: { error: string } }).body.error).toContain('last Steward');
    expect(emitted('roles.unassign_conflict', 'u1')).toBe(true);
  });

  it('returns 401 sessionless on both verbs, never reaching the contracts', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r1 = (await ASSIGN(fakeRequest, bindingParams('g', 'm', 'r'))) as { status: number };
    const r2 = (await UNASSIGN(fakeRequest, bindingParams('g', 'm', 'r'))) as { status: number };
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect(assignMemberRole).not.toHaveBeenCalled();
    expect(removeMemberRole).not.toHaveBeenCalled();
  });
});

describe('GET /api/groups/[id]/my-permissions (GRP-8 read)', () => {
  it('returns 401 sessionless via local claims', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = (await GET_MY_PERMISSIONS(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(401);
    expect(fetchMyPermissions).not.toHaveBeenCalled();
    expect(emitted('roles.my_permissions_unauthenticated')).toBe(true);
  });

  it('returns 200 { permissions }, telemetry id-only', async () => {
    const res = (await GET_MY_PERMISSIONS(fakeRequest, idParams('grp-1'))) as {
      status: number;
      body: { permissions: string[] };
    };
    expect(res.status).toBe(200);
    expect(res.body.permissions).toEqual(['view_forum']);
    expect(fetchMyPermissions).toHaveBeenCalledWith(expect.anything(), 'grp-1');
    expect(emitted('roles.my_permissions', 'u1')).toBe(true);
    expect(telemetryIsContentFree()).toBe(true);
  });

  it('maps 42501 → 403 (Mist) and other failures → 500', async () => {
    fetchMyPermissions.mockRejectedValue({ code: '42501' });
    let res = (await GET_MY_PERMISSIONS(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(403);
    expect(emitted('roles.my_permissions_refused', 'u1')).toBe(true);

    fetchMyPermissions.mockRejectedValue({ code: 'XX000' });
    res = (await GET_MY_PERMISSIONS(fakeRequest, idParams('grp-1'))) as { status: number };
    expect(res.status).toBe(500);
    expect(emitted('roles.my_permissions_failed', 'u1')).toBe(true);
  });
});
