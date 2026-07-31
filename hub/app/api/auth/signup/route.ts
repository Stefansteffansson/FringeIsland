/**
 * FEAT-H002 — sign-up API route.
 *
 * The sign-up form posts here. The route enforces the consent gate SERVER-SIDE
 * (business logic behind the API, Hub CLAUDE.md), performs the auth `signUp` via
 * `signUpFim` (auth is the narrow Supabase exception — no table access here),
 * records the account-created + consent audit entry (V1 seam) and emits sign-up
 * telemetry (V4 seam), and returns the session tokens for the client to
 * `setSession` (keeping AuthContext coherent) — or a pending-confirmation signal.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signUpFim } from '@/lib/auth/signup';
import { recordAuditEntry, persistAuditEntry } from '@/lib/audit/audit';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

type SignUpBody = {
  email?: string;
  password?: string;
  displayName?: string;
  consentAccepted?: boolean;
};

export async function POST(request: Request) {
  let body: SignUpBody;
  try {
    body = (await request.json()) as SignUpBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email, password, displayName, consentAccepted } = body;

  if (!email || !password || !displayName) {
    emitTelemetry('auth.sign_up_failed', { reason: 'missing_fields' });
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
  }

  // Server-side consent gate — independent of the client gate (STORY-3).
  if (!consentAccepted) {
    emitTelemetry('auth.sign_up_failed', { reason: 'consent_missing' });
    return NextResponse.json(
      { error: 'You must accept the terms and privacy policy to create an account.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const result = await signUpFim(supabase, { email, password, displayName, consentAccepted: true });

  if (result.error) {
    emitTelemetry('auth.sign_up_failed', { reason: 'signup_error' });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // V1 audit seam — account creation + initial consent. Durable since ADM-A
  // (FEAT-PC019's record_auth_event): once the sign-up yields a session, the
  // actor exists and the row persists. The pending-confirmation edge has no
  // session and stays mirror-only — a recorded limitation, not a silent gap
  // (whether pre-session moments deserve durable security logging is ADM-D's
  // open question).
  recordAuditEntry({
    actorAuthId: result.user?.id ?? null,
    action: 'account.created',
    props: { consentAccepted: true },
  });
  if (result.session) {
    await persistAuditEntry(supabase, {
      action: 'account.created',
      metadata: { consentAccepted: true },
    });
    await emitDurableTelemetry(supabase, 'auth.sign_up_succeeded', {
      pendingConfirmation: result.pendingConfirmation,
    });
  } else {
    emitTelemetry('auth.sign_up_succeeded', { pendingConfirmation: result.pendingConfirmation });
  }

  if (result.pendingConfirmation || !result.session) {
    return NextResponse.json({ ok: true, pendingConfirmation: true });
  }

  return NextResponse.json({
    ok: true,
    session: {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    },
  });
}
