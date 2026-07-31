import type { SupabaseClient } from '@supabase/supabase-js';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * V1 Administration seam (ADR-U002) — durable since Cycle ADM-A.
 *
 * Two layers, deliberately kept distinct:
 *  - `recordAuditEntry` — the structured console + telemetry MIRROR wired at
 *    the walking skeleton. It stays: an ops-visible record that works even
 *    when no session exists (the pre-session sign-up edge).
 *  - `persistAuditEntry` — the durable binding to the PC-4 audit substrate
 *    (`admin_audit_log`) via the paired FEAT-PC019 `record_auth_event()`
 *    contract. Awaited-but-NON-FATAL: a refusal or failure logs and mirrors,
 *    it never fails the auth flow (FEAT-H034 STORY-3).
 *
 * History: console-only was audit finding AC-6 (Audit I), re-homed to the
 * Platform-Ops area (A-ADM) and sharpened by AC3-O6 (four callers, three
 * GDPR-relevant). Discharged here. Durable metadata is CONTENT-FREE by
 * discipline — the mirror may carry operator context (e.g. an email) but the
 * durable row never does.
 */
export type AuditEntry = {
  actorAuthId: string | null;
  action: string;
  props?: Record<string, unknown>;
  ts: string;
};

export function recordAuditEntry(entry: {
  actorAuthId: string | null;
  action: string;
  props?: Record<string, unknown>;
}): AuditEntry {
  const record: AuditEntry = { ...entry, ts: new Date().toISOString() };
  console.info('[audit]', JSON.stringify(record));
  emitTelemetry('audit.recorded', { action: record.action });
  return record;
}

/**
 * Durable audit write through the platform contract. The actor is resolved
 * platform-side from the client's session (never passed); `metadata` must stay
 * content-free (names, ids, flags — never member-authored text or emails).
 * Returns whether the row landed; callers ignore the result by design.
 */
export async function persistAuditEntry(
  client: SupabaseClient,
  entry: { action: string; metadata?: Record<string, unknown> },
): Promise<boolean> {
  try {
    const { error } = await client.rpc('record_auth_event', {
      p_action: entry.action,
      p_metadata: entry.metadata ?? {},
    });
    if (error) {
      console.warn(
        '[audit] durable write refused',
        JSON.stringify({ action: entry.action, code: error.code }),
      );
      emitTelemetry('audit.persist_failed', { action: entry.action, code: error.code });
      return false;
    }
    emitTelemetry('audit.persisted', { action: entry.action });
    return true;
  } catch {
    console.warn('[audit] durable write failed', JSON.stringify({ action: entry.action }));
    emitTelemetry('audit.persist_failed', { action: entry.action });
    return false;
  }
}
