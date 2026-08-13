import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';

/**
 * FEAT-H004 STORY-1/2 (unit) — the AuthContext `transcend` glue. Convert THEN
 * finalise: the client consent gate blocks before any conversion (STORY-2); the
 * Supabase auth-SDK `updateUser` does the anon->permanent conversion (the narrow
 * exception); the FEAT-PC002 finalisation RPC is reached through the Platform API
 * route `/api/auth/transcend` (never a browser RPC call — ADR-U009 / Hub gotcha).
 */

let fakeSession: Session | null = null;
// TASK-TRX-02: captured so cells can deliver the USER_UPDATED the real SDK
// fires at conversion — the race under test happens between that event and
// the finalisation route resolving.
let authCallback: ((event: string, session: Session | null) => void) | null = null;
const updateUser = jest.fn(
  async (args: unknown): Promise<{ data: { user: unknown }; error: { message: string } | null }> => {
    void args;
    return { data: { user: { id: 'u1', is_anonymous: false } }, error: null };
  },
);

jest.mock('@/lib/supabase/client', () => {
  // TASK-TRX-02: cell 1's post-resolve flip to 'fim' (live session) arms the
  // ADR-U039 session guard + realtime tenants — give them inert seams.
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: async () => 'ok',
  };
  return {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: fakeSession } }),
        onAuthStateChange: (cb: (event: string, session: Session | null) => void) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        updateUser: (args: unknown) => updateUser(args),
        signInWithPassword: async () => ({ error: null }),
        signInAnonymously: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => {},
        setSession: async () => ({ error: null }),
      },
      realtime: { setAuth: () => {} },
      channel: () => channel,
      removeChannel: async () => 'ok',
    }),
  };
});

// TASK-TRX-02: the success path must drop every Mist-era cache; spied here.
const invalidateAllCachesMock = jest.fn();
jest.mock('@/lib/auth/cache-registry', () => ({
  invalidateAllCaches: () => invalidateAllCachesMock(),
  registerCacheInvalidator: () => {},
}));

const fetchMock = jest.fn();

function TranscendProbe({ consent }: { consent: boolean }) {
  const { transcend, identity } = useAuth();
  const [result, setResult] = useState('');
  return (
    <div>
      <span data-testid="result">{result}</span>
      <span data-testid="identity">{identity}</span>
      <button
        onClick={async () => {
          const { error } = await transcend('new@fim.test', 'Secret123!@#', 'New Fim', consent);
          setResult(error ?? 'ok');
        }}
      >
        go
      </button>
    </div>
  );
}

beforeEach(() => {
  fakeSession = { user: { is_anonymous: true } } as unknown as Session;
  authCallback = null;
  updateUser.mockClear();
  invalidateAllCachesMock.mockClear();
  fetchMock.mockReset();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('FEAT-H004 STORY-2 (unit) — transcend consent gate', () => {
  it('returns an error and does NOT convert or call the finalisation route without consent', async () => {
    render(
      <AuthProvider>
        <TranscendProbe consent={false} />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('result')).not.toHaveTextContent('ok'));
    expect(updateUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('FEAT-H004 STORY-1 (unit) — transcend convert-then-finalise', () => {
  it('converts via the auth SDK then POSTs the finalisation route, returning success', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
    render(
      <AuthProvider>
        <TranscendProbe consent />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('ok'));
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/transcend',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces a conversion error and never reaches the finalisation route', async () => {
    updateUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'email taken' } });
    render(
      <AuthProvider>
        <TranscendProbe consent />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('email taken'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a finalisation-route error (no half-FIM swallow)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'finalisation failed' }),
    } as never);
    render(
      <AuthProvider>
        <TranscendProbe consent />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('finalisation failed'));
    expect(updateUser).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// TASK-TRX-02 — the post-transcendence read race (found 2026-08-13, live walk).
// `updateUser` flips `is_anonymous` BEFORE `finalise_transcendence` commits, so
// identity read 'fim' mid-transaction and every fim-keyed read fired into a
// substrate refusal ("invitations are FIM-only"), which then stuck in session
// caches. The seam must (1) hold identity at 'mist' until the finalisation
// resolves, and (2) converge on success: drop every Mist-era cache and fire
// the house refreshNavigation event. TDD red-first for cells 1-2.
// ---------------------------------------------------------------------------
describe('TASK-TRX-02 (unit) — the transcend window holds identity and converges caches', () => {
  const permanentSession = { user: { id: 'u1', is_anonymous: false } } as unknown as Session;

  it('holds identity at mist between the conversion event and the finalisation resolving', async () => {
    let releaseFetch: (() => void) | null = null;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseFetch = () => resolve({ ok: true, json: async () => ({ ok: true }) } as never);
        }),
    );
    render(
      <AuthProvider>
        <TranscendProbe consent />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('mist'));
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));

    // The real SDK fires USER_UPDATED at conversion — mid-flight, pre-commit.
    act(() => authCallback!('USER_UPDATED', permanentSession));

    // The substrate still sees a Mist (the finalisation txn is open): the
    // surface must not believe FIM yet, or every fim-keyed read fires into a
    // mid-transaction refusal.
    expect(screen.getByTestId('identity')).toHaveTextContent('mist');
    expect(screen.getByTestId('result')).not.toHaveTextContent('ok');

    act(() => releaseFetch!());
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('ok'));
    expect(screen.getByTestId('identity')).toHaveTextContent('fim');
  });

  it('drops every session cache and fires refreshNavigation on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
    const refreshed = jest.fn();
    window.addEventListener('refreshNavigation', refreshed);
    try {
      render(
        <AuthProvider>
          <TranscendProbe consent />
        </AuthProvider>,
      );
      await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: 'go' }));
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('ok'));

      // No Mist-era cache survives into the FIM session; mounted listeners re-read.
      expect(invalidateAllCachesMock).toHaveBeenCalledTimes(1);
      expect(refreshed).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('refreshNavigation', refreshed);
    }
  });

  // Boundary guard for the new behaviour (green-by-construction: the negative
  // of a behaviour that did not previously exist — labelled, not claimed red).
  it('a finalisation failure invalidates nothing and fires no refresh', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'finalisation failed' }),
    } as never);
    const refreshed = jest.fn();
    window.addEventListener('refreshNavigation', refreshed);
    try {
      render(
        <AuthProvider>
          <TranscendProbe consent />
        </AuthProvider>,
      );
      await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: 'go' }));
      await waitFor(() =>
        expect(screen.getByTestId('result')).toHaveTextContent('finalisation failed'),
      );
      expect(invalidateAllCachesMock).not.toHaveBeenCalled();
      expect(refreshed).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('refreshNavigation', refreshed);
    }
  });
});
