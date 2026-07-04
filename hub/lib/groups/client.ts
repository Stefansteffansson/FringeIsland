/**
 * FEAT-H013 — the Hub's API-first groups client (Cycle G-A).
 *
 * The browser surface creates, reads, and stewards groups ONLY through the
 * FEAT-PC010-backed BFF at `/api/groups` — never a direct Supabase call
 * (ADR-U009 / Hub CLAUDE.md narrow-exception rule). Thin transports that
 * surface the route's error message and status on failure; group content
 * renders to the member and never enters telemetry.
 */
import type {
  CreateGroupInput,
  CreateGroupRoleInput,
  GroupDetail,
  RoleEntry,
  RolesFabric,
  RoleTemplateOption,
  UpdateGroupSettingsInput,
} from '@/lib/groups/queries';

export type {
  CreateGroupInput,
  CreateGroupRoleInput,
  GroupDetail,
  RoleEntry,
  RolesFabric,
  RoleTemplateOption,
  UpdateGroupSettingsInput,
} from '@/lib/groups/queries';

/** The fabric BFF response: the contract payload + the template vocabulary. */
export interface RolesReadResult {
  fabric: RolesFabric;
  templates: RoleTemplateOption[];
}

/** Carries the BFF's HTTP status so pages can render 404 honestly. */
export class GroupsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GroupsApiError';
    this.status = status;
  }
}

async function throwFrom(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new GroupsApiError(body?.error ?? fallback, res.status);
}

/** GRP-1: create an engagement group; resolves to the new group's id. */
export async function createGroup(input: CreateGroupInput): Promise<string> {
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** GRP-4/GRP-5: the visibility-honest group detail. */
export async function fetchGroupDetail(groupId: string): Promise<GroupDetail> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { group: GroupDetail };
  return data.group;
}

/** GRP-2/GRP-3: partial settings update; resolves to the fresh detail. */
export async function updateGroupSettings(
  groupId: string,
  input: UpdateGroupSettingsInput,
): Promise<GroupDetail> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { group: GroupDetail };
  return data.group;
}

/**
 * FEAT-H014 — the role transports (Cycle G-B). Thin couriers over the
 * FEAT-PC011-backed BFF; refusal messages (the two anti-escalation walls, the
 * last-Steward invariant) surface verbatim via GroupsApiError for the panels
 * to show in place.
 */

/** GRP-6/7 read: the role fabric (+ viewer flags, catalog, and templates). */
export async function fetchGroupRoles(groupId: string): Promise<RolesReadResult> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/roles`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as RolesReadResult;
}

/** GRP-6: add a role (template or custom); resolves to the new role's id. */
export async function createGroupRole(
  groupId: string,
  input: CreateGroupRoleInput,
): Promise<string> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** GRP-6: flip one grant; resolves to the fresh role entry. */
export async function setGroupRolePermission(
  groupId: string,
  roleId: string,
  permissionName: string,
  granted: boolean,
): Promise<RoleEntry> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/roles/${encodeURIComponent(roleId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set_permission: { name: permissionName, granted } }),
    },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { role: RoleEntry };
  return data.role;
}

/** GRP-6: delete a custom, unheld role (refusals surface as GroupsApiError). */
export async function deleteGroupRole(groupId: string, roleId: string): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/roles/${encodeURIComponent(roleId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** GRP-7: assign a role to an active member. */
export async function assignMemberRole(
  groupId: string,
  memberGroupId: string,
  roleId: string,
): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberGroupId)}/roles/${encodeURIComponent(roleId)}`,
    { method: 'POST' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** GRP-7: remove a member's role binding (invariant refusals surface verbatim). */
export async function removeMemberRole(
  groupId: string,
  memberGroupId: string,
  roleId: string,
): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberGroupId)}/roles/${encodeURIComponent(roleId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** GRP-8: the caller's effective permissions in this group (as themselves). */
export async function fetchMyPermissions(groupId: string): Promise<string[]> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/my-permissions`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { permissions: string[] };
  return data.permissions;
}
