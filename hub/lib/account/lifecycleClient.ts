/**
 * FEAT-H029 + FEAT-H007 — the browser-side lifecycle transport (IDN-10/IDN-12).
 *
 * The surface initiates pause / delete / reactivate ONLY through the private
 * BFF routes (ADR-U009/U038) — never a direct table or rpc call from the
 * browser. Thin transports: they surface the contract's refusal message on
 * failure (never a silent swallow) and return nothing on success — the caller
 * re-reads account state via the FEAT-PC004 read (the single source of truth)
 * rather than trusting a response body.
 */

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

async function post(path: string, fallback: string): Promise<void> {
  const res = await fetch(path, { method: 'POST' });
  if (!res.ok) {
    throw new Error(await errorMessage(res, fallback));
  }
}

/** FEAT-H029: pause my account (reversible absence). */
export function requestPause(): Promise<void> {
  return post('/api/account/pause', 'Could not pause your account');
}

/** FEAT-H029: delete my account (terminal — the platform ends the sessions). */
export function requestDelete(): Promise<void> {
  return post('/api/account/delete', 'Could not delete your account');
}

/** FEAT-H007: reactivate my paused account. */
export function requestReactivate(): Promise<void> {
  return post('/api/account/reactivate', 'Could not reactivate your account');
}
