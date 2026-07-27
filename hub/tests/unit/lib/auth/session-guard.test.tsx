import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, act, waitFor } from '@testing-library/react';
import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';

/**
 * FEAT-H012 STORY-3/4/5 (unit) — the AuthContext session guard, the first
 * tenant of the ADR-U039 socket doctrine.
 *
 * - One private-topic subscription per authenticated FIM (`account:<uid>:sessions`),
 *   torn down on unmount; none for a Mist or sessionless.
 * - VERIFY-ON-SIGNAL: a `session_revoked` hint naming THIS device's session
 *   triggers `getUser()`; only an auth-server refusal signs out locally and
 *   replaces to /login. A spoofed/stale hint (still valid) is a no-op.
 * - A hint naming ANOTHER session only dispatches the `sessionsChanged` event
 *   (an open /sessions page re-reads) — nothing destructive.
 * - Fallback (doctrine rule 6): revalidate on focus/visibility and on a slow
 *   visible-tab interval, so a missed hint costs latency, never security.
 *
 * Red-first for TASK-H012-03.
 */

const replaceMock = jest.fn();
jest.mock('@/lib/auth/redirect', () => ({
  replaceLocation: (url: string) => replaceMock(url),
}));

import {
  useSessionGuard,
  sessionIdOfToken,
  SESSIONS_CHANGED_EVENT,
} from '@/lib/auth/session-guard';

type BroadcastMsg = { payload?: { session_id?: string } };

const b64url = (s: string) =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeToken = (sessionId: string) =>
  `hdr.${b64url(JSON.stringify({ session_id: sessionId, sub: 'uid-1' }))}.sig`;

const makeSession = (sessionId: string): Session =>
  ({
    access_token: makeToken(sessionId),
    user: { id: 'uid-1' },
  }) as unknown as Session;

let broadcastHandler: ((msg: BroadcastMsg) => void) | null;
const channelObj: {
  on: jest.Mock;
  subscribe: jest.Mock;
} = {
  on: jest.fn((_type: unknown, _filter: unknown, cb: unknown) => {
    broadcastHandler = cb as (msg: BroadcastMsg) => void;
    return channelObj;
  }),
  subscribe: jest.fn(() => channelObj),
};

/** The auth server's refusal of a revoked session — a real typed error, because
 *  the guard must CLASSIFY it (W-05). A plain `{ message }` object cannot
 *  exercise the classification and is exactly how W-05 escaped. */
const refusal = () => new AuthApiError('Session from session_id claim in JWT does not exist', 403, 'session_not_found');

const getUser = jest.fn<() => Promise<{ error: AuthError | null }>>();
const authSignOut = jest.fn<(opts?: { scope?: string }) => Promise<{ error: null }>>();
const setAuth = jest.fn();
const channel = jest.fn(() => channelObj);
const removeChannel = jest.fn();

const supabase = {
  channel,
  removeChannel,
  realtime: { setAuth },
  auth: { getUser, signOut: authSignOut },
} as unknown as SupabaseClient;

function Harness({
  session,
  identity,
}: {
  session: Session | null;
  identity: 'sessionless' | 'mist' | 'fim';
}) {
  useSessionGuard(supabase, session, identity);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  broadcastHandler = null;
  getUser.mockResolvedValue({ error: null });
  authSignOut.mockResolvedValue({ error: null });
});

describe('FEAT-H012 — session guard (ADR-U039 first tenant)', () => {
  it('decodes the session_id claim from the access token', () => {
    expect(sessionIdOfToken(makeToken('abc-123'))).toBe('abc-123');
    expect(sessionIdOfToken('garbage')).toBeNull();
    expect(sessionIdOfToken(null)).toBeNull();
  });

  it('subscribes once to the OWN private topic for a FIM and tears down on unmount (STORY-5)', () => {
    const { unmount, rerender } = render(
      <Harness session={makeSession('my-sess')} identity="fim" />,
    );
    expect(channel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenCalledWith('account:uid-1:sessions', {
      config: { private: true },
    });
    expect(setAuth).toHaveBeenCalled();

    rerender(<Harness session={makeSession('my-sess')} identity="fim" />);
    expect(channel).toHaveBeenCalledTimes(1); // no duplicate on re-render

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });

  it('subscribes nothing for a Mist or a sessionless visitor', () => {
    render(<Harness session={null} identity="sessionless" />);
    render(<Harness session={makeSession('mist-sess')} identity="mist" />);
    expect(channel).not.toHaveBeenCalled();
  });

  it('verify-on-signal: a hint naming THIS session + auth refusal → local sign-out to /login (STORY-3)', async () => {
    getUser.mockResolvedValue({ error: refusal() });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      broadcastHandler!({ payload: { session_id: 'my-sess' } });
    });

    await waitFor(() => expect(authSignOut).toHaveBeenCalled());
    expect(getUser).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('a spoofed or stale hint (session still valid) is a no-op — a hint is never an authority (STORY-3)', async () => {
    getUser.mockResolvedValue({ error: null });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      broadcastHandler!({ payload: { session_id: 'my-sess' } });
    });

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(authSignOut).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('a hint naming ANOTHER session dispatches sessionsChanged and validates nothing (STORY-3)', async () => {
    const listener = jest.fn();
    window.addEventListener(SESSIONS_CHANGED_EVENT, listener);
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      broadcastHandler!({ payload: { session_id: 'someone-elses-device' } });
    });

    expect(listener).toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(authSignOut).not.toHaveBeenCalled();
    window.removeEventListener(SESSIONS_CHANGED_EVENT, listener);
  });

  it('fallback: revalidates when the window regains focus; a dead session signs out (STORY-4)', async () => {
    getUser.mockResolvedValue({ error: refusal() });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(authSignOut).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  // ── W-05: a hiccup is not a refusal ──────────────────────────────────────
  //
  // `supabase.auth.getUser()` RETURNS its network error (AuthRetryableFetchError
  // is an AuthError, so auth-js resolves rather than throws). The guard's
  // `catch` was therefore dead code for the one case it was written to handle,
  // and a transient blip took the `if (error)` branch — signing the member out.
  // Compounding it, `signOut()` defaults to `scope: 'global'`, so one device's
  // blip ended EVERY session the member had.
  //
  // The posture these lock in is a WHITELIST: sign out only on a positive
  // refusal (401/403, or the session genuinely missing). Everything else —
  // network, 5xx, an unrecognised shape — is INCONCLUSIVE and must be inert.

  it('W-05: a transient network failure is NOT a refusal — never signs out', async () => {
    getUser.mockResolvedValue({
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      broadcastHandler!({ payload: { session_id: 'my-sess' } });
    });

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(authSignOut).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('W-05: an inconclusive 5xx from the auth server never signs out', async () => {
    getUser.mockResolvedValue({
      error: new AuthApiError('unexpected_failure', 500, 'unexpected_failure'),
    });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(authSignOut).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('W-05: an unrecognised error shape is inconclusive, not destructive', async () => {
    getUser.mockResolvedValue({
      error: { message: 'something new we have never seen' } as unknown as AuthError,
    });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(authSignOut).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('W-05: a real refusal signs out THIS device only — never the others (scope: local)', async () => {
    getUser.mockResolvedValue({ error: refusal() });
    render(<Harness session={makeSession('my-sess')} identity="fim" />);

    await act(async () => {
      broadcastHandler!({ payload: { session_id: 'my-sess' } });
    });

    await waitFor(() => expect(authSignOut).toHaveBeenCalled());
    expect(authSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('W-05: a 401 and a genuinely missing session both count as refusals', async () => {
    for (const err of [
      new AuthApiError('invalid JWT', 401, 'bad_jwt'),
      new AuthSessionMissingError(),
    ]) {
      jest.clearAllMocks();
      getUser.mockResolvedValue({ error: err });
      const { unmount } = render(
        <Harness session={makeSession('my-sess')} identity="fim" />,
      );
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      await waitFor(() => expect(authSignOut).toHaveBeenCalledWith({ scope: 'local' }));
      unmount();
    }
  });

  it('fallback: the slow visible-tab interval revalidates (STORY-4)', async () => {
    jest.useFakeTimers();
    try {
      render(<Harness session={makeSession('my-sess')} identity="fim" />);
      expect(getUser).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(61_000);
      });
      expect(getUser).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
