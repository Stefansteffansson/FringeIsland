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
export async function fetchMyPermissions(groupId: string): Promise<MyPermissionsRead> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/my-permissions`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as MyPermissionsRead;
}

/** The my-permissions BFF payload — permissions + the caller's own
 *  contract-resolved member_group_id (FEAT-H017 additive key). */
export interface MyPermissionsRead {
  permissions: string[];
  member_group_id: string;
}

/**
 * FEAT-H015 — the invitation transports (Cycle G-C). Thin couriers over the
 * FEAT-PC012-backed BFF; refusal messages surface verbatim via GroupsApiError
 * for the panels to show in place. Email addresses render to the inviter and
 * never enter telemetry.
 */
import type {
  InviteByEmailResult,
  MyInvitation,
  PendingInvitations,
  SearchHit,
} from '@/lib/groups/invitations';

export type {
  EmailInvitation,
  InviteByEmailResult,
  MemberInvitation,
  MyInvitation,
  PendingInvitations,
  SearchHit,
} from '@/lib/groups/invitations';

/** MEM-1 search (the D3 / DS-6 re-home seam): name-partial + exact-email, cap 8. */
export async function searchMembers(groupId: string, query: string): Promise<SearchHit[]> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/member-search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as SearchHit[];
}

/** MEM-1/2: invite by member_group_id XOR email; the contract may convert (Open Q2). */
export async function sendInvite(
  groupId: string,
  body: { member_group_id: string } | { email: string },
): Promise<InviteByEmailResult> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as InviteByEmailResult;
}

/** STORY-3 read: the group's outstanding invitations (invite_members-gated). */
export async function fetchGroupInvitations(groupId: string): Promise<PendingInvitations> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/invitations`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as PendingInvitations;
}

export async function cancelMemberInvite(
  groupId: string,
  memberGroupId: string,
): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/invitations/members/${encodeURIComponent(memberGroupId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

export async function cancelEmailInvite(
  groupId: string,
  invitationId: string,
): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/invitations/email/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** MEM-3 read: the caller's own pending invitations — invitation context only. */
export async function fetchMyInvitations(): Promise<MyInvitation[]> {
  const res = await fetch('/api/me/invitations');
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as MyInvitation[];
}

/** MEM-3: accept — invited→active substrate-side (role auto-bind included). */
export async function acceptInvitation(groupId: string): Promise<void> {
  const res = await fetch(`/api/me/invitations/${encodeURIComponent(groupId)}`, {
    method: 'POST',
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** MEM-3: decline — the row leaves; re-invitation stays possible. */
export async function declineInvitation(groupId: string): Promise<void> {
  const res = await fetch(`/api/me/invitations/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/**
 * FEAT-H016 — the membership lifecycle transports (Cycle G-D, FEAT-PC013).
 * Refusal messages pass through GroupsApiError — they carry the honest G-E
 * copy (sole-Steward / last-member) the Surface renders in place.
 */

/** MEM-4: pause a member's participation. */
export async function pauseMember(groupId: string, memberGroupId: string): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberGroupId)}/pause`,
    { method: 'POST' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** MEM-4: reactivate a paused member. */
export async function activateMember(groupId: string, memberGroupId: string): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberGroupId)}/activate`,
    { method: 'POST' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** MEM-5: remove a member (never conflated with invitation cancels). */
export async function removeGroupMember(groupId: string, memberGroupId: string): Promise<void> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberGroupId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
}

/** MEM-6: the caller's own regular exit. */
export async function leaveGroup(
  groupId: string,
): Promise<{ group_id: string; group_name: string }> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'POST',
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as { group_id: string; group_name: string };
}

/**
 * FEAT-H017 — the leadership-transfer + closure transports (Cycle G-E,
 * FEAT-PC014). Thin couriers; refusal messages surface verbatim via
 * GroupsApiError — they carry the honest outcome copy (nomination-in-flight,
 * last-member-close-instead, expired) the Surface renders in place.
 */
import type { PendingNomination } from '@/lib/groups/leadership';

export type { PendingNomination } from '@/lib/groups/leadership';

/** MEM-7: nominate ranked successors — the ordered ids ARE the ranking. */
export async function nominateSteward(
  groupId: string,
  nomineeGroupIds: string[],
): Promise<{ group_id: string; nominees_count: number }> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/nominate-steward`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominee_group_ids: nomineeGroupIds }),
    },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as { group_id: string; nominees_count: number };
}

/** MEM-7: the nominee's answer — the contract routes a decline on its own. */
export async function respondToNomination(
  notificationId: string,
  accept: boolean,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `/api/notifications/${encodeURIComponent(notificationId)}/nomination-response`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** MEM-7 / ADR-U019: hand the group to FringeIsland-DeusEx and depart. */
export async function handGroupToDeusEx(
  groupId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `/api/groups/${encodeURIComponent(groupId)}/hand-to-deusex`,
    { method: 'POST' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** MEM-8: the last active member's terminal act. */
export async function closeGroup(groupId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/close`, {
    method: 'POST',
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** GRP-9: the Steward's deliberate deletion — its own verb on the group
 *  resource, never conflated with member removal or leave. */
export async function deleteGroup(groupId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** STORY-2 read: the caller's own pending stewardship offers (A-NTF seam). */
export async function fetchMyNominations(): Promise<PendingNomination[]> {
  const res = await fetch('/api/me/nominations');
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as PendingNomination[];
}
