/**
 * FEAT-H008 / FEAT-H009 — the Hub's API-first consent client (IDN-6 / IDN-7).
 *
 * The browser surface reads + writes the member's own consent ONLY through the
 * paired PC-4 Governance contracts at `/api/account/consent` — never a direct
 * `supabase.from('consent_records')` call (ADR-U009 / Hub CLAUDE.md
 * narrow-exception rule). Thin transports that surface the contract's error on
 * failure (never a silent swallow); the authoritative read/write lives
 * server-side (FEAT-PC006 / FEAT-PC007).
 */
import type { ConsentState, ConsentEffectiveEntry } from '@/lib/consent/queries';

export type {
  ConsentState,
  ConsentEffectiveEntry,
  ConsentHistoryEntry,
  KnownConsentDecision,
} from '@/lib/consent/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Read the caller's own consent state via the FEAT-PC006 read contract. */
export async function fetchConsentState(): Promise<ConsentState> {
  const res = await fetch('/api/account/consent');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { consent: ConsentState };
  return data.consent;
}

/**
 * FEAT-H009 — record a grant/withdraw decision via the FEAT-PC007 write
 * contract (IDN-7). Returns the updated effective entry. Surfaces the contract's
 * typed-refusal message (422 unknown purpose / 409 non-withdrawable / 403 no
 * subject) so the caller never shows a false success.
 */
export async function postConsentDecision(
  purpose: string,
  decision: string,
): Promise<ConsentEffectiveEntry> {
  const res = await fetch('/api/account/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, decision }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { entry: ConsentEffectiveEntry };
  return data.entry;
}
