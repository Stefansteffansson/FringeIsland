/**
 * GRP-4 read path — the member's group list, via PC-3, RLS-scoped (V2).
 *
 * Shared data-access function run by the /api/groups route (server) and
 * exercised directly by the integration test (authenticated anon client). It
 * reproduces the oracle's two-phase query behind the API boundary; RLS scopes
 * every step to the viewer's own active memberships.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  created_at: string;
  member_count: number;
}

export async function fetchMemberGroups(supabase: SupabaseClient): Promise<GroupSummary[]> {
  // 1. Resolve the actor via PC-3 (group-keyed identity; D15 / ADR-U025).
  const { data: personalGroupId, error: actorError } =
    await supabase.rpc('get_current_personal_group_id');
  if (actorError) throw actorError;
  if (!personalGroupId) return [];

  // 2. The actor's ACTIVE memberships (RLS-scoped).
  const { data: memberships, error: membershipsError } = await supabase
    .from('group_memberships')
    .select('group_id')
    .eq('member_group_id', personalGroupId)
    .eq('status', 'active');
  if (membershipsError) throw membershipsError;

  const groupIds = (memberships ?? []).map((m) => m.group_id as string);
  if (groupIds.length === 0) return [];

  // 3. Engagement-group details + batch member counts (RLS-scoped).
  const [groupsResult, countsResult] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, description, label, is_public, created_at')
      .in('id', groupIds)
      .eq('group_type', 'engagement'),
    supabase.rpc('get_group_member_counts', { p_group_ids: groupIds }),
  ]);
  if (groupsResult.error) throw groupsResult.error;
  if (countsResult.error) throw countsResult.error;

  const countMap = new Map<string, number>();
  for (const row of countsResult.data ?? []) {
    countMap.set(row.group_id as string, Number(row.member_count));
  }

  return (groupsResult.data ?? []).map((g) => ({
    ...(g as Omit<GroupSummary, 'member_count'>),
    member_count: countMap.get(g.id as string) ?? 0,
  }));
}
