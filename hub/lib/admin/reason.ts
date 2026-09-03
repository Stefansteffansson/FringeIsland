/**
 * FEAT-H049 (DB-4) — the BFF's reading of the member-facing reason from a
 * ceremony's JSON body. Pure (no imports, no side effects): the routes stay
 * presentation-only under ADR-U038 — the CONTRACT owns the rule (FEAT-PC030's
 * `22023 'Reason required'`); this is defense-in-depth so a blank reason never
 * costs a round-trip, and the trimming rule matches the contract's (blank =
 * none). The reason is never logged or placed in telemetry.
 */

/** The parsed JSON body, or `{}` when absent/malformed. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The non-blank `reason`, verbatim (untrimmed — the platform stores what the
 *  admin wrote), or `null` when missing/blank. */
export function requiredReason(body: Record<string, unknown>): string | null {
  const raw = body.reason;
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  return raw;
}

/** The Steward's optional `note`: the string when non-blank, else undefined
 *  (the old call shape — the contract's defaulted parameter). */
export function optionalNote(body: Record<string, unknown>): string | undefined {
  const raw = body.note;
  if (typeof raw !== 'string' || raw.trim().length === 0) return undefined;
  return raw;
}
