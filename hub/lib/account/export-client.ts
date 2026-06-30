/**
 * FEAT-H010 — the Hub's API-first data-export client (IDN-8).
 *
 * The browser surface reads the member's own export ONLY through the paired PC-4
 * Governance contract at `/api/account/export` — never a direct
 * `supabase.from(...)` call (ADR-U009 / Hub CLAUDE.md narrow-exception rule).
 * A thin transport that surfaces the contract's error on failure (never a silent
 * swallow); the authoritative assembly lives server-side (FEAT-PC008). The
 * document is treated as opaque data the Hub couriers to the member as a file —
 * the Hub never parses, reshapes, or re-orders its sections.
 */
import type { DataExport } from '@/lib/account/export';

export const DEFAULT_EXPORT_FILENAME = 'fringeisland-data-export.json';

/** Read the caller's own export document via the FEAT-PC008 contract. */
export async function fetchDataExport(): Promise<DataExport> {
  const res = await fetch('/api/account/export');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  // The body IS the document (a downloadable attachment the Hub couriers as a file).
  return (await res.json()) as DataExport;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Deliver a JSON document to the member as a file download (Blob + object URL +
 * a transient anchor click). Pretty-printed for human readability; the data is a
 * faithful copy of what the contract returned. Runs in the browser only.
 */
export function downloadJson(data: unknown, filename: string = DEFAULT_EXPORT_FILENAME): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
