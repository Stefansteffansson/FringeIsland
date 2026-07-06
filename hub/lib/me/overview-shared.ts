/**
 * ADR-U042 — shared marker for the bootstrap bundle's transport failures.
 *
 * Lives in its own leaf module so the per-resource clients (groups, profile,
 * account) can distinguish "the bundle itself failed to arrive" (fall back to
 * the standalone contract read — the bundle is droppable transport,
 * guardrail 3) from "a slice's substrate read failed" (surface it — the
 * standalone read would have failed identically) without importing the
 * overview client and creating a cycle.
 */
export class OverviewTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverviewTransportError';
  }
}
