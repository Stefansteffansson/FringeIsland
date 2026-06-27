/**
 * FEAT-H004 — transcendence finalisation route (the Platform API boundary the Hub
 * crosses for the FEAT-PC002 finalisation RPC). The anon->permanent conversion
 * already happened client-side (auth SDK, the narrow exception); this route,
 * reading the now-converted JWT from cookies, enforces the consent gate
 * SERVER-SIDE (STORY-2 — defense-in-depth, mirroring the sign-up route), runs the
 * finalisation RPC behind the API boundary (no browser RPC — ADR-U009), records
 * the V1 audit + V4 telemetry seams, and emits the Notifications welcome trigger.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finaliseTranscendence, TRANSCENDENCE_POLICY_VERSION } from '@/lib/auth/transcendence';
import { recordAuditEntry } from '@/lib/audit/audit';
import { emitTelemetry } from '@/lib/observability/telemetry';

type TranscendBody = { consentAccepted?: boolean };

export async function POST(request: Request) {
  let body: TranscendBody;
  try {
    body = (await request.json()) as TranscendBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Server-side consent gate (independent of the client gate) — no consent, no
  // finalisation (transcendence is impossible without consent — ADR-U031).
  if (!body.consentAccepted) {
    emitTelemetry('transcendence.failed', { reason: 'consent_missing' });
    return NextResponse.json({ error: 'Consent is required to become a FIM.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('transcendence.failed', { reason: 'unauthenticated' });
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  emitTelemetry('transcendence.started', { actor: user.id });

  const { outcome, error } = await finaliseTranscendence(supabase, {
    policyVersion: TRANSCENDENCE_POLICY_VERSION,
    captureContext: { surface: 'hub', flow: 'mist-transcendence' },
  });

  if (error || !outcome) {
    // V4 — failure surfaced, never swallowed. The platform RPC is atomic, so the
    // caller remains a valid Mist (no half-FIM persisted).
    emitTelemetry('transcendence.failed', { actor: user.id, reason: 'finalisation_error' });
    return NextResponse.json(
      { error: error ?? 'Transcendence failed. Please try again.' },
      { status: 400 },
    );
  }

  // V1 audit — the lifecycle event. V4 — success. V3 — the welcome/onboarding
  // trigger seam (the Hub fires it; copy/routing is the Notifications area's).
  recordAuditEntry({
    actorAuthId: user.id,
    action: 'identity.transcended',
    props: { consentId: outcome.consentId, policyVersion: TRANSCENDENCE_POLICY_VERSION },
  });
  emitTelemetry('transcendence.succeeded', {
    actor: user.id,
    personalGroupId: outcome.personalGroupId,
    consentId: outcome.consentId,
  });
  emitTelemetry('notifications.welcome_trigger', { actor: user.id, trigger: 'transcendence' });

  return NextResponse.json({ ok: true, outcome });
}
