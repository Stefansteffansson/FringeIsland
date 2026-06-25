'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { emitTelemetry } from '@/lib/observability/telemetry';

function SignUpForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/groups';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client-side consent gate (the server enforces it too) — STORY-3.
    if (!consent) {
      setError('Please accept the terms and privacy policy to create your account.');
      emitTelemetry('auth.sign_up_failed', { reason: 'consent_missing_client' });
      return;
    }

    setSubmitting(true);
    emitTelemetry('auth.sign_up_started'); // V4

    const { error: signUpError, pendingConfirmation: pending } = await signUp(
      email,
      password,
      fullName,
      consent,
    );

    if (signUpError) {
      setError(signUpError);
      emitTelemetry('auth.sign_up_failed', { reason: 'signup_error' }); // V4
      setSubmitting(false);
      return;
    }

    if (pending) {
      setPendingConfirmation(true);
      setSubmitting(false);
      return;
    }

    router.push(redirectTo);
  }

  if (pendingConfirmation) {
    return (
      <div data-testid="confirm-email-state" className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Confirm your email</h2>
        <p className="text-gray-600">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Confirm it to
          finish creating your account, then sign in.
        </p>
        <p className="mt-6 text-sm text-gray-600">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
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

      <label
        htmlFor="consent"
        className="mb-4 mt-1 flex items-start gap-2 text-sm text-gray-600"
      >
        <input
          id="consent"
          data-testid="consent-checkbox"
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree to the{' '}
          <Link href="/terms" className="text-indigo-600 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating your account...' : 'Create account'}
      </Button>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600">Begin your journey on FringeIsland</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <Suspense fallback={null}>
            <SignUpForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
