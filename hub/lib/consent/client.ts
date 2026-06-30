/**
 * FEAT-H008 — the Hub's API-first consent read client (IDN-6).
 *
 * The browser surface reads the member's own consent ONLY through the paired
 * PC-4 Governance contract at `/api/account/consent` — never a direct
 * `supabase.from('consent_records')` call (ADR-U009 / Hub CLAUDE.md
 * narrow-exception rule). A thin transport that surfaces the contract's error on
 * failure (never a silent swallow); the authoritative read lives server-side
 * (FEAT-PC006). The grant/withdraw write client is added by FEAT-H009.
 */
import type { ConsentState } from '@/lib/consent/queries';

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
