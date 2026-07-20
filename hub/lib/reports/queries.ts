import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H028 — server-side courier over the FEAT-PD011 report contract (COM-13,
 * Cycle C-D; CB-4). The write goes through the platform RPC — never a direct
 * table touch (ADR-U009/U038). It runs in the BFF route with the caller's
 * session client, so the substrate sees the real actor and applies the
 * visibility/own-content/idempotency rules. `target_kind` is open TEXT
 * (validated additively platform-side), not a client-closed set.
 */

export type ReportTargetKind = 'forum_post' | 'direct_message';

export interface ContentReport {
  id: string;
  status: string;
  created_at: string;
}

export async function submitContentReportRpc(
  supabase: SupabaseClient,
  targetKind: string,
  targetId: string,
  reason: string,
  details?: string,
): Promise<ContentReport> {
  const { data, error } = await supabase.rpc('submit_content_report', {
    p_target_kind: targetKind,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details ?? null,
  });
  if (error) throw error;
  return data as ContentReport;
}
