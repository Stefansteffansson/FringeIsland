import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';

/**
 * FEAT-H004 STORY-3 (unit) — the AuthContext `sayGoodbye` glue. The explicit-erase
 * RPC is reached through the Platform API route `/api/auth/farewell` (never a
 * browser RPC — ADR-U009); on success the client signs out, dropping to the
 * sessionless entry. A route failure is surfaced and the session is NOT dropped.
 */
let fakeSession: Session | null = null;
const signOut = jest.fn(async () => {});

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: fakeSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => signOut(),
      updateUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ error: null }),
      signInAnonymously: async () => ({ data: { user: null, session: null }, error: null }),
      setSession: async () => ({ error: null }),
    },
  }),
}));

const fetchMock = jest.fn();

function GoodbyeProbe() {
  const { sayGoodbye } = useAuth();
  const [result, setResult] = useState('');
  return (
    <div>
      <span data-testid="result">{result}</span>
      <button
        onClick={async () => {
          const { error } = await sayGoodbye();
          setResult(error ?? 'gone');
        }}
      >
        go
      </button>
    </div>
  );
}

beforeEach(() => {
  fakeSession = { user: { is_anonymous: true } } as unknown as Session;
  signOut.mockClear();
  fetchMock.mockReset();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('FEAT-H004 STORY-3 (unit) — sayGoodbye', () => {
  it('POSTs the farewell route then signs out on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as never);
    render(
      <AuthProvider>
        <GoodbyeProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('gone'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/farewell', expect.objectContaining({ method: 'POST' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('surfaces a route failure and does NOT sign out (the Mist remains)', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'erase failed' }) } as never);
    render(
      <AuthProvider>
        <GoodbyeProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('result')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('erase failed'));
    expect(signOut).not.toHaveBeenCalled();
  });
});
