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

const signOutSpy = jest.fn<(opts?: { scope?: string }) => Promise<void>>();

jest.mock('@/lib/supabase/client', () => {
  // A credentialed session arms the FEAT-H012 session guard and the realtime
  // tenants, which the sessionless/mist cases below never exercised — hence the
  // channel surface. Inert stubs: this suite asserts context glue, not sockets.
  const channelStub = { on: () => channelStub, subscribe: () => channelStub };
  return {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: fakeSession } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signInAnonymously: () => signInAnonymouslyImpl(),
        signInWithPassword: async () => ({ error: null }),
        signOut: (opts?: { scope?: string }) => signOutSpy(opts),
        setSession: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      realtime: { setAuth: () => {} },
      channel: () => channelStub,
      removeChannel: () => {},
    }),
  };
});

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
  signOutSpy.mockReset();
  signOutSpy.mockResolvedValue(undefined);
  signInAnonymouslyImpl = async () => ({ data: { user: null, session: null }, error: null });
});

/**
 * Sign-out scope — deliberate sign-out ends THIS browser, nothing else.
 *
 * `supabase.auth.signOut()` defaults to `scope: 'global'`, so signing out on a
 * laptop also ended the member's phone and tablet — silently, with no way to
 * tell that had happened. That is the near-universal opposite of what "Sign
 * out" means: Google, Microsoft, Facebook, Apple, GitHub and Slack all treat it
 * as device-local and put "sign out everywhere" behind a separate, explicitly
 * named control next to a device list. Signing out is routine (a shared
 * machine, the end of a day); ending every session is a *security response* and
 * a different intent.
 *
 * Decided by Stefan 2026-07-27: local only; a deliberate "Sign out everywhere"
 * lands later on `/sessions` — which already lists devices and revokes them one
 * at a time, but has no bulk contract yet (only `DELETE /api/sessions/[id]`).
 *
 * This also makes the account menu consistent with the three sign-out call
 * sites that were already local: the session guard (W-05), `farewell`, and the
 * current-device revoke on `/sessions`.
 */
function SignOutProbe() {
  const { signOut } = useAuth();
  return <button onClick={() => signOut()}>sign out</button>;
}

function GhostProbe() {
  const { dropGhostSession } = useAuth();
  return <button onClick={() => dropGhostSession()}>drop ghost</button>;
}

describe('TASK-MIST-01 — dropGhostSession (the ghost window)', () => {
  // Labelled test-after (2026-09-02): the behaviour was driven red-first at the
  // call sites (OnboardingArrival, the Mist page, both BFF routes, both
  // clients, and the E2E arc); this cell pins the provider's own contract —
  // local scope, telemetry — so the door cannot quietly widen to global.
  it('ends THIS browser only (local scope) and says so in telemetry', async () => {
    fakeSession = { user: { id: 'ghost-1', is_anonymous: true } } as unknown as Session;
    render(
      <AuthProvider>
        <GhostProbe />
      </AuthProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /drop ghost/i }));

    await waitFor(() => expect(signOutSpy).toHaveBeenCalled());
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(signOutSpy.mock.calls.every(([opts]) => opts?.scope === 'local')).toBe(true);
    expect(getTelemetrySink().some((e) => e.name === 'mist.ghost_session_dropped')).toBe(true);
  });
});

describe('sign-out scope (2026-07-27 decision) — local, never global', () => {
  it('a deliberate sign-out ends THIS browser only', async () => {
    fakeSession = { user: { id: 'u1', is_anonymous: false } } as unknown as Session;
    render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(signOutSpy).toHaveBeenCalled());
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('never calls signOut bare — a bare call is a GLOBAL sign-out by default', async () => {
    fakeSession = { user: { id: 'u1', is_anonymous: false } } as unknown as Session;
    render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(signOutSpy).toHaveBeenCalled());
    expect(signOutSpy).not.toHaveBeenCalledWith(undefined);
    expect(signOutSpy.mock.calls.every(([opts]) => opts?.scope === 'local')).toBe(true);
  });
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
