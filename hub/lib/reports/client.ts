/**
 * FEAT-H028 — the Hub's API-first content-report client (COM-13, Cycle C-D).
 *
 * The browser surface submits reports ONLY through the `/api/reports` BFF
 * (ADR-U009 / the Hub narrow-exception rule). The store itself is idempotent
 * per (reporter, target) — a resubmit returns the existing row, never a
 * duplicate. To let the surface read that resubmit as "already reported"
 * instead of a fresh success, the client keeps a session-scoped memory of the
 * targets this reporter has already reported; the memory is dropped at session
 * end via the auth-owned registry (COR-A W9). There is no report-history read
 * this cycle — submission + confirmation only (the ADM-10 queue is A-ADM's).
 */
import type { ReportTargetKind, ContentReport } from '@/lib/reports/queries';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';

export type { ReportTargetKind, ContentReport } from '@/lib/reports/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

const reported = new Set<string>();
const keyOf = (kind: ReportTargetKind, id: string) => `${kind}:${id}`;

/** Whether this session has already reported the target (drives "already
 *  reported" affordance state without a server round-trip). */
export function hasReported(kind: ReportTargetKind, id: string): boolean {
  return reported.has(keyOf(kind, id));
}

/** Drop the reported-target memory (sign-out / session end). */
export function invalidateReportsCache(): void {
  reported.clear();
}
registerCacheInvalidator(invalidateReportsCache);

export interface ReportResult {
  report: ContentReport;
  /** True when this session had already reported the target before this call —
   *  the idempotent resubmit path (read as "already reported", not an error). */
  alreadyReported: boolean;
}

export async function submitReport(
  kind: ReportTargetKind,
  id: string,
  reason: string,
  details?: string,
): Promise<ReportResult> {
  const key = keyOf(kind, id);
  const alreadyReported = reported.has(key);
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_kind: kind, target_id: id, reason, details }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { report: ContentReport };
  reported.add(key);
  return { report: data.report, alreadyReported };
}
