import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H003 STORY-3 + STORY-5 (unit) — the three-state identity AuthContext
 * exposes a `sessionless / mist / fim` status (derived from `is_anonymous`, not
 * queried inside the auth listener) and a `beginMist` facade that emits Mist
 * telemetry (failures included). The pure `deriveIdentity` is unit-tested in
 * lib/auth/mist.test.ts; here we cover the context glue against a fake client.
 */

// Module-scoped controllable fake of the browser Supabase client.
let fakeSession: Session | null = null;
let signInAnonymouslyImpl: () => Promise<{
  data: { user: unknown; session: unknown };
  error: { message: string } | null;
}> = async () => ({ data: { user: null, session: null }, error: null });

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: fakeSession } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInAnonymously: () => signInAnonymouslyImpl(),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => {},
      setSession: async () => ({ error: null }),
    },
  }),
}));

function IdentityProbe() {
  const { identity, beginMist, loading } = useAuth();
  return (
    <div>
      <span data-testid="identity">{loading ? 'loading' : identity}</span>
      <button onClick={() => beginMist()}>begin</button>
    </div>
  );
}

beforeEach(() => {
  fakeSession = null;
  signInAnonymouslyImpl = async () => ({ data: { user: null, session: null }, error: null });
});

describe('FEAT-H003 STORY-3 (unit) — three-state identity', () => {
  it('resolves to sessionless when there is no session', async () => {
    fakeSession = null;
    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('sessionless'));
  });

  it('resolves to mist for an anonymous session', async () => {
    fakeSession = { user: { is_anonymous: true } } as unknown as Session;
    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('mist'));
  });

  it('resolves to fim for a credentialed session', async () => {
    fakeSession = { user: { is_anonymous: false } } as unknown as Session;
    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('fim'));
  });
});

describe('FEAT-H003 STORY-5 (unit) — beginMist facade telemetry', () => {
  it('emits a mist.entered event on success', async () => {
    fakeSession = null;
    signInAnonymouslyImpl = async () => ({
      data: { user: { id: 'mist-1', is_anonymous: true }, session: { access_token: 't' } },
      error: null,
    });
    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('sessionless'));

    await userEvent.click(screen.getByRole('button', { name: 'begin' }));

    await waitFor(() =>
      expect(getTelemetrySink().some((e) => e.name === 'mist.entered')).toBe(true),
    );
  });

  it('emits a mist.enter_failed event (failure is never swallowed)', async () => {
    fakeSession = null;
    signInAnonymouslyImpl = async () => ({
      data: { user: null, session: null },
      error: { message: 'Anonymous sign-ins are disabled' },
    });
    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('sessionless'));

    await userEvent.click(screen.getByRole('button', { name: 'begin' }));

    await waitFor(() =>
      expect(getTelemetrySink().some((e) => e.name === 'mist.enter_failed')).toBe(true),
    );
  });
});
