/**
 * GRP-4 read path — the member's group list, via the platform contract
 * `get_member_groups()` (ADR-U038 F2 — the 4-step composition lives in the
 * substrate, not in Hub code; a sibling Surface calls the same RPC). The RPC
 * self-scopes by the caller's personal group and returns each active engagement
 * group with its live active-member count. Run by the /api/groups route and
 * exercised directly by the integration tests.
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
  const { data, error } = await supabase.rpc('get_member_groups');
  if (error) throw error;

  return (data ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: g.name as string,
    description: (g.description as string | null) ?? null,
    label: (g.label as string | null) ?? null,
    is_public: g.is_public as boolean,
    created_at: g.created_at as string,
    member_count: Number(g.member_count),
  }));
}
