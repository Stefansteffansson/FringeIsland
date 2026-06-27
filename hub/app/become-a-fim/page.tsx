'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { LoadingState } from '@/components/ui/LoadingState';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { TRANSCENDENCE_POLICY_VERSION } from '@/lib/auth/transcendence';

/**
 * FEAT-H004 — the in-place become-a-FIM flow (the real transcendence, replacing
 * the FEAT-H003 /signup redirect). Reuses the FEAT-H002 sign-up fields + a
 * REQUIRED consent control (STORY-2). Mist-gated by status, never a role string:
 * a FIM is already there (-> /groups), a sessionless visitor must first arrive
 * (-> /). On success the new FIM lands on /groups with the SAME session continued
 * (continuity is platform-side, via id-preservation — the Hub copies no rows); on
 * failure the error is surfaced and the flow does NOT navigate (no half-FIM UI,
 * STORY-1).
 */
export default function BecomeAFimPage() {
  const { identity, loading, transcend } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Status-driven gating: only a Mist transcends.
  useEffect(() => {
    if (loading) return;
    if (identity === 'fim') router.replace('/groups');
    else if (identity === 'sessionless') router.replace('/');
  }, [identity, loading, router]);

  if (loading || identity !== 'mist') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingState label="Finding your footing..." />
      </main>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client consent gate (the route enforces it too) — STORY-2.
    if (!consent) {
      setError('Please give your consent to become a FIM and keep your journey.');
      emitTelemetry('transcendence.failed', { reason: 'consent_missing_client' });
      return;
    }

    setSubmitting(true);
    emitTelemetry('transcendence.started_client'); // V4

    const { error: transcendError } = await transcend(email, password, fullName, consent);

    if (transcendError) {
      // No navigation — surface the failure, leave no half-FIM in the UI (STORY-1).
      setError(transcendError);
      setSubmitting(false);
      return;
    }

    // Continuity — the same session, continued; the new FIM lands on /groups.
    router.push('/groups');
  }

  return (
    <AppShell title="FringeIsland">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Become a FIM</h1>
          <p className="text-gray-600">
            Keep the journey you&rsquo;ve started. Your session continues &mdash; nothing restarts.
          </p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="mb-4">
              <InlineError message={error} />
            </div>
          )}
          <TextField
            label="Full name"
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <TextField
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Password"
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label htmlFor="consent" className="mb-4 mt-1 flex items-start gap-2 text-sm text-gray-600">
            <input
              id="consent"
              data-testid="consent-checkbox"
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I consent to FringeIsland keeping my journey and to becoming a FIM, under the{' '}
              <Link href="/terms" className="text-indigo-600 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-indigo-600 hover:underline">
                Privacy Policy
              </Link>{' '}
              (policy {TRANSCENDENCE_POLICY_VERSION}).
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Becoming a FIM...' : 'Become a FIM'}
          </Button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Not ready?{' '}
            <Link href="/mist" className="text-indigo-600 hover:underline">
              Keep looking around
            </Link>
          </p>
        </form>
      </div>
    </AppShell>
  );
}
