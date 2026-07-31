import type { SupabaseClient } from '@supabase/supabase-js';
import { emitTelemetry, type TelemetryEvent } from '@/lib/observability/telemetry';

/**
 * The durable telemetry leg (Cycle ADM-A, ADR-U052) — SERVER-ONLY by module
 * split: `telemetry.ts` is browser-reachable through every emitting client
 * component, so the database contract call lives here instead (the COR-C GC-7
 * pure-module pattern; the outer-ring gate fails red on the merged shape).
 *
 * Emits locally AND persists to the PC-1 sink via the paired FEAT-PC018
 * recorder. Fire-and-forget end to end: the recorder never raises by
 * construction, and a transport failure is swallowed here too — a sink outage
 * must never surface to the request path (ADR-U052 §2).
 */
export async function emitDurableTelemetry(
  client: SupabaseClient,
  name: string,
  props?: Record<string, unknown>,
): Promise<TelemetryEvent> {
  const event = emitTelemetry(name, props);
  try {
    await client.rpc('record_telemetry_event', { p_event_name: name, p_props: props ?? {} });
  } catch {
    // Deliberate: the emit discipline's fire-and-forget promise (ADR-U052 §2).
  }
  return event;
}
