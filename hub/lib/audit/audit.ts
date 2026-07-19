/**
 * V1 Administration seam (ADR-U002).
 *
 * Sign-in/auth is an audit-relevant action. The walking skeleton wires the
 * seam — a structured audit record + a telemetry mirror — so the pattern is
 * present from line one. Durable persistence (binding to the PC-4 audit
 * substrate, admin_audit_log) is owned by the Platform-Ops area (A-OPS) —
 * see audit finding AC-6 (ANATOMY-CONFORMANCE-AUDIT.md) and the
 * anatomy-correction plan's "AC-6 durable audit binding — deferred to
 * Platform-Ops" section; until then this is deliberately a structured
 * record, not a table write.
 */
import { emitTelemetry } from '@/lib/observability/telemetry';

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
  // TODO (A-OPS — Platform-Ops area): persist to PC-4 admin_audit_log via a
  // SECURITY DEFINER auth-event recorder (audit finding AC-6; deferred per
  // anatomy-correction-plan.md §"AC-6 durable audit binding — deferred to
  // Platform-Ops" — the Platform-Ops decomposition carries the backlog row).
  console.info('[audit]', JSON.stringify(record));
  emitTelemetry('audit.recorded', { action: record.action });
  return record;
}
