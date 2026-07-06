'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { emitTelemetry } from '@/lib/observability/telemetry';

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/groups';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      emitTelemetry('auth.sign_in_failed', { email }); // V4 — failure is an event
      setSubmitting(false);
      return;
    }

    emitTelemetry('auth.sign_in_succeeded', { email }); // V4
    // V1 audit seam — record the auth action server-side (API-first, best-effort).
    // Fire-and-forget: the audit POST must NOT serialize before the redirect
    // (measured ~0.7 s cold on the post-login path). The request outlives this
    // component's unmount; failures are swallowed (best-effort seam).
    void fetch('/api/auth/audit', { method: 'POST' }).catch(() => {
      /* best-effort seam; never block or fail the redirect */
    });
    router.push(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4">
          <InlineError message={error} />
        </div>
      )}
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
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="mt-4 text-center text-sm text-gray-600">
        New to FringeIsland?{' '}
        <Link href="/signup" className="text-indigo-600 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue your journey</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
