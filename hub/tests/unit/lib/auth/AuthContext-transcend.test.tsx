import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
const updateUser = jest.fn(
  async (args: unknown): Promise<{ data: { user: unknown }; error: { message: string } | null }> => {
    void args;
    return { data: { user: { id: 'u1', is_anonymous: false } }, error: null };
  },
);

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: fakeSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: (args: unknown) => updateUser(args),
      signInWithPassword: async () => ({ error: null }),
      signInAnonymously: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => {},
      setSession: async () => ({ error: null }),
    },
  }),
}));

const fetchMock = jest.fn();

function TranscendProbe({ consent }: { consent: boolean }) {
  const { transcend } = useAuth();
  const [result, setResult] = useState('');
  return (
    <div>
      <span data-testid="result">{result}</span>
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
  updateUser.mockClear();
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
