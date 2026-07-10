/**
 * FEAT-H011 — the Hub's API-first journal client (IDN-5).
 *
 * The browser surface reads + writes the member's own journal ONLY through
 * the FEAT-PD001-backed BFF at `/api/journal` — never a direct
 * `supabase.from('journal_entries')` call (ADR-U009 / Hub CLAUDE.md
 * narrow-exception rule; the substrate refuses direct table access anyway).
 * Thin transports that surface the route's error message on failure — entry
 * content never appears in errors (FEAT-PD001 Observability no-go).
 *
 * Revision 2026-07-10 (Cycle J-E rider, ADR-U043 B4): the first-page read
 * gains the groups/journeys session cache — `peekJournalEntries` paints the
 * last resolved first page instantly on revisit, `fetchJournalEntries()`
 * always revalidates and concurrent callers share one in-flight request, a
 * FAILED read is never cached, keyset pages (`before`) bypass the cache, and
 * MUTATIONS drop the peek so a stale list can never paint after a write.
 * AuthContext drops the cache on session end via `invalidateJournalCache`.
 */
import type { JournalEntry } from '@/lib/journal/queries';

export type { JournalEntry } from '@/lib/journal/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

// --- first-page session cache (B4) -------------------------------------------

let cachedEntries: JournalEntry[] | null = null;
let entriesInFlight: Promise<JournalEntry[]> | null = null;

async function requestEntries(before?: string): Promise<JournalEntry[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await fetch(`/api/journal${qs}`);
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { entries: JournalEntry[] };
  return data.entries;
}

/** The last resolved first page this session — instant revisit paint (B4). */
export function peekJournalEntries(): JournalEntry[] | null {
  return cachedEntries;
}

/** Read the caller's own entries, newest-first; `before` pages older ones.
 *  First-page reads always revalidate, share one in-flight request, and never
 *  cache a failure; keyset pages stay plain transports. */
export function fetchJournalEntries(options?: {
  before?: string;
}): Promise<JournalEntry[]> {
  if (options?.before) return requestEntries(options.before);
  if (entriesInFlight) return entriesInFlight;
  const inFlight: Promise<JournalEntry[]> = requestEntries()
    .then((entries) => {
      cachedEntries = entries;
      return entries;
    })
    .finally(() => {
      if (entriesInFlight === inFlight) entriesInFlight = null;
    });
  inFlight.catch(() => {}); // never unhandled if a caller drops it
  entriesInFlight = inFlight;
  return inFlight;
}

/** Drop the session journal cache (sign-out / session end / after a write). */
export function invalidateJournalCache(): void {
  cachedEntries = null;
  entriesInFlight = null;
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
  invalidateJournalCache(); // the list changed — never paint a stale peek
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
  invalidateJournalCache(); // the list changed — never paint a stale peek
  const data = (await res.json()) as { entry: JournalEntry };
  return data.entry;
}

export async function removeJournalEntry(id: string): Promise<void> {
  const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  invalidateJournalCache(); // the list changed — never paint a stale peek
}
