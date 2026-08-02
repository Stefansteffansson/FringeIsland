import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H037 — outer-ring wrapper for the FEAT-PC022 moderation contracts.
 * Server-side only; the client is injected, never constructed ('import type'
 * discipline). Authorization is entirely the platform's (is_platform_admin
 * inside each RPC) — a 42501 surfaces as `refused` on the reads and as a
 * typed error on the resolve; the BFF maps both to the admin-plane 404 shape
 * (ADR-U038: the route never re-decides). The stale-second-resolve P0001
 * passes through with the platform's message VERBATIM.
 */

export type AdminReportRow = {
  id: string;
  target_kind: string;
  target_id: string;
  target_group_id: string | null;
  target_group_name: string | null;
  reporter_display_name: string | null;
  reason: string;
  details: string | null;
  content_snapshot: string | null;
  status: string;
  created_at: string;
  resolution_kind: string | null;
  resolved_at: string | null;
};

export type AdminReportDetail = AdminReportRow & {
  resolution_note: string | null;
  resolved_by_display_name: string | null;
  author_user_id: string | null;
  author_display_name: string | null;
  live_target_exists: boolean;
};

/** A refusal the route maps to an HTTP status; message passes through verbatim. */
export class AdminReportsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const throwTyped = (error: { code?: string; message?: string }): never => {
  throw new AdminReportsError(error.code ?? 'unknown', error.message ?? 'unknown error');
};

export async function fetchAdminReports(
  client: SupabaseClient,
  filter: string,
): Promise<{ reports: AdminReportRow[] | null; refused: boolean }> {
  const { data, error } = await client.rpc('admin_get_content_reports', { p_filter: filter });
  if (error) {
    if (error.code === '42501') return { reports: null, refused: true };
    return throwTyped(error);
  }
  // jsonb-array contract (the row-cap-honest shape).
  return { reports: (data ?? []) as AdminReportRow[], refused: false };
}

export async function fetchAdminReportDetail(
  client: SupabaseClient,
  reportId: string,
): Promise<{ report: AdminReportDetail | null; refused: boolean }> {
  const { data, error } = await client.rpc('admin_get_content_report_detail', {
    p_report_id: reportId,
  });
  if (error) {
    // Existence-hiding pair: unauthorized and not-found are the same 404 shape.
    if (error.code === '42501' || error.code === 'P0002') return { report: null, refused: true };
    return throwTyped(error);
  }
  return { report: data as AdminReportDetail, refused: false };
}

export async function resolveAdminReport(
  client: SupabaseClient,
  reportId: string,
  resolutionKind: string,
  resolutionNote: string | null,
): Promise<void> {
  const { error } = await client.rpc('admin_resolve_content_report', {
    p_report_id: reportId,
    p_resolution_kind: resolutionKind,
    p_resolution_note: resolutionNote,
  });
  if (error) throwTyped(error);
}
