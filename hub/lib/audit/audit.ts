/**
 * V1 Administration seam (ADR-U002).
 *
 * Sign-in/auth is an audit-relevant action. The walking skeleton wires the
 * seam — a structured audit record + a telemetry mirror — so the pattern is
 * present from line one. The Phase-3 Identity build binds this to the PC-4
 * audit substrate (admin_audit_log) "where the substrate supports it"; until
 * then this is deliberately a structured record, not a table write.
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
  // TODO (Phase 3 — Identity area): persist to PC-4 admin_audit_log.
  console.info('[audit]', JSON.stringify(record));
  emitTelemetry('audit.recorded', { action: record.action });
  return record;
}
