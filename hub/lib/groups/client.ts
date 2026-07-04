/**
 * FEAT-H013 — the Hub's API-first groups client (Cycle G-A).
 *
 * The browser surface creates, reads, and stewards groups ONLY through the
 * FEAT-PC010-backed BFF at `/api/groups` — never a direct Supabase call
 * (ADR-U009 / Hub CLAUDE.md narrow-exception rule). Thin transports that
 * surface the route's error message and status on failure; group content
 * renders to the member and never enters telemetry.
 */
import type { CreateGroupInput, GroupDetail, UpdateGroupSettingsInput } from '@/lib/groups/queries';

export type { CreateGroupInput, GroupDetail, UpdateGroupSettingsInput } from '@/lib/groups/queries';

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
