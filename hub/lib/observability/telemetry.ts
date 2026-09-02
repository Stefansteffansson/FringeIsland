/**
 * V4 Observability seam (ADR-U002).
 *
 * The walking skeleton proves the pattern exists from line one: every
 * meaningful action emits a structured telemetry event, and error states are
 * events too (never silently swallowed). The Phase-3 deep build binds this to
 * the PC-1 telemetry sink; here it emits structured records + keeps an
 * in-memory sink the tests can assert against.
 */
export type TelemetryEvent = {
  name: string;
  props?: Record<string, unknown>;
  ts: string;
  surface: 'hub';
};

const sink: TelemetryEvent[] = [];

export function emitTelemetry(name: string, props?: Record<string, unknown>): TelemetryEvent {
  const event: TelemetryEvent = { name, props, ts: new Date().toISOString(), surface: 'hub' };
  sink.push(event);
  console.info('[telemetry]', JSON.stringify(event));
  return event;
}

/** Test affordance — the in-memory event sink. */
export function getTelemetrySink(): readonly TelemetryEvent[] {
  return sink;
}

/**
 * Test affordance — empties the sink between cells. The sink is handed out
 * `readonly` on purpose; route suites used to reach past that with
 * `getTelemetrySink().length = 0`, which tsc rightly refuses (TASK-DBT-01).
 */
export function resetTelemetrySink(): void {
  sink.length = 0;
}

// The durable leg (emitDurableTelemetry) lives in ./telemetry-server.ts — a
// deliberate pure-module split (the COR-C GC-7 pattern): this module is
// browser-reachable through every client component that emits, so it must
// carry no database contract call. The outer-ring gate enforces the split.
