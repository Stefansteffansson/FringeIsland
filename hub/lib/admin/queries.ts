import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H034 — the admin statistics read (server-side RPC wrapper; client
 * injected, `import type` only, so browser leakage is structurally impossible).
 * Consumes the paired FEAT-PC018 `get_platform_statistics()` contract.
 */

export type PlatformStatistics = {
  version: number;
  generated_at: string;
  members: { total: number; active: number; mists: number };
  groups: { total: number; engagement: number };
  journeys: { active_enrollments: number; completions_30d: number };
  activity_daily: { day: string; count: number }[];
};

export async function fetchPlatformStatistics(
  client: SupabaseClient,
): Promise<{ stats: PlatformStatistics | null; refused: boolean }> {
  const { data, error } = await client.rpc('get_platform_statistics');
  if (error) {
    // The platform's own gate is the authorization (typed 42501) — the BFF
    // never re-decides it, only maps it (ADR-U038).
    if (error.code === '42501') return { stats: null, refused: true };
    throw new Error(error.message);
  }
  return { stats: data as PlatformStatistics, refused: false };
}
