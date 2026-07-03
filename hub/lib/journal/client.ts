/**
 * FEAT-H011 — the Hub's API-first journal client (IDN-5).
 *
 * The browser surface reads + writes the member's own journal ONLY through
 * the FEAT-PD001-backed BFF at `/api/journal` — never a direct
 * `supabase.from('journal_entries')` call (ADR-U009 / Hub CLAUDE.md
 * narrow-exception rule; the substrate refuses direct table access anyway).
 * Thin transports that surface the route's error message on failure — entry
 * content never appears in errors (FEAT-PD001 Observability no-go).
 */
import type { JournalEntry } from '@/lib/journal/queries';

export type { JournalEntry } from '@/lib/journal/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Read the caller's own entries, newest-first; `before` pages older ones. */
export async function fetchJournalEntries(options?: {
  before?: string;
}): Promise<JournalEntry[]> {
  const qs = options?.before ? `?before=${encodeURIComponent(options.before)}` : '';
  const res = await fetch(`/api/journal${qs}`);
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { entries: JournalEntry[] };
  return data.entries;
}

export async function postJournalEntry(
  title: string | null,
  body: string,
): Promise<JournalEntry> {
  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { entry: JournalEntry };
  return data.entry;
}

export async function patchJournalEntry(
  id: string,
  title: string | null,
  body: string,
): Promise<JournalEntry> {
  const res = await fetch(`/api/journal/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { entry: JournalEntry };
  return data.entry;
}

export async function removeJournalEntry(id: string): Promise<void> {
  const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
}
