import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H037 — outer-ring wrapper for the FEAT-PC022 audit-log read (ADM-16).
 * Server-side only; client injected ('import type' discipline). The platform
 * owns the wall (is_platform_admin inside the RPC) and the paging (keyset on
 * created_at, cap 200); the prefix narrows server-side over the OPEN dotted
 * namespace — this wrapper polices nothing.
 */

export type AdminAuditRow = {
  id: string;
  actor_group_id: string | null;
  actor_display_name: string | null;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export class AdminAuditError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function fetchAdminAuditLog(
  client: SupabaseClient,
  opts: { limit?: number; before?: string | null; prefix?: string | null } = {},
): Promise<{ rows: AdminAuditRow[] | null; refused: boolean }> {
  const { data, error } = await client.rpc('admin_get_audit_log', {
    p_limit: opts.limit ?? 50,
    p_before: opts.before ?? null,
    p_action_prefix: opts.prefix ?? null,
  });
  if (error) {
    if (error.code === '42501') return { rows: null, refused: true };
    throw new AdminAuditError(error.code ?? 'unknown', error.message ?? 'unknown error');
  }
  return { rows: (data ?? []) as AdminAuditRow[], refused: false };
}
