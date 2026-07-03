import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeviceSession } from '@/lib/sessions/queries';

/**
 * FEAT-H012 STORY-1/2 (unit) — the sessions panel.
 * Inventory render (as served, newest-last-active first) with the derived
 * device line and the "This device" badge; ConfirmModal-gated targeted revoke
 * (list re-read, never an optimistic splice); distinct current-device copy
 * whose confirm ends in a local signOut (the page gate then redirects);
 * failures are non-destructive. The client module is mocked — the panel's
 * contract is behaviour over the FEAT-PC009-backed BFF, not transport.
 * Red-first for TASK-H012-02.
 */

const fetchSessions = jest.fn<() => Promise<DeviceSession[]>>();
const revokeSession = jest.fn<(id: string) => Promise<void>>();
const signOut = jest.fn<() => Promise<void>>();

jest.mock('@/lib/sessions/client', () => ({
  fetchSessions: () => fetchSessions(),
  revokeSession: (id: string) => revokeSession(id),
}));
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ signOut }),
}));

import { SessionsPanel } from '@/components/sessions/SessionsPanel';

const CURRENT: DeviceSession = {
  id: 'sess-current',
  created_at: '2026-07-01T10:00:00+00:00',
  last_active: '2026-07-03T09:00:00+00:00',
  user_agent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  ip: '203.0.113.7',
  is_current: true,
};
const OTHER: DeviceSession = {
  id: 'sess-other',
  created_at: '2026-06-28T08:00:00+00:00',
  last_active: '2026-07-02T20:00:00+00:00',
  user_agent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ip: '198.51.100.4',
  is_current: false,
};

describe('FEAT-H012 — SessionsPanel (STORY-1/2)', () => {
  beforeEach(() => {
    // mockReset (not clear) — drops leftover mockResolvedValueOnce queues so
    // tests stay independent.
    fetchSessions.mockReset().mockResolvedValue([CURRENT, OTHER]);
    revokeSession.mockReset().mockResolvedValue(undefined);
    signOut.mockReset().mockResolvedValue(undefined);
  });

  it('renders one row per session in served order, with the "This device" badge on the current one', async () => {
    render(<SessionsPanel />);
    const rows = await screen.findAllByTestId('session-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByTestId('this-device')).toBeInTheDocument();
    expect(within(rows[1]).queryByTestId('this-device')).not.toBeInTheDocument();
  });

  it('derives a friendly device line from the raw user agent, with an honest fallback', async () => {
    fetchSessions.mockResolvedValue([
      CURRENT,
      { ...OTHER, id: 'sess-null-ua', user_agent: null },
    ]);
    render(<SessionsPanel />);
    const rows = await screen.findAllByTestId('session-row');
    expect(within(rows[0]).getByText('Chrome · Windows')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Unknown device')).toBeInTheDocument();
  });

  it('shows the IP so the member can judge the session', async () => {
    render(<SessionsPanel />);
    expect(await screen.findByText(/203\.0\.113\.7/)).toBeInTheDocument();
    expect(screen.getByText(/198\.51\.100\.4/)).toBeInTheDocument();
  });

  it('revokes another device through the ConfirmModal and re-reads the list (STORY-2)', async () => {
    const user = userEvent.setup();
    fetchSessions.mockResolvedValueOnce([CURRENT, OTHER]).mockResolvedValueOnce([CURRENT]);
    render(<SessionsPanel />);

    const rows = await screen.findAllByTestId('session-row');
    await user.click(within(rows[1]).getByRole('button', { name: /sign out/i }));
    await user.click(screen.getByRole('button', { name: /yes, sign out/i }));

    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith('sess-other'));
    await waitFor(() => expect(screen.getAllByTestId('session-row')).toHaveLength(1));
    expect(fetchSessions).toHaveBeenCalledTimes(2);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('cancelling the modal revokes nothing', async () => {
    const user = userEvent.setup();
    render(<SessionsPanel />);
    const rows = await screen.findAllByTestId('session-row');
    await user.click(within(rows[1]).getByRole('button', { name: /sign out/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(revokeSession).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('session-row')).toHaveLength(2);
  });

  it('revoking the CURRENT device uses distinct copy and ends in a local sign-out (STORY-2)', async () => {
    const user = userEvent.setup();
    render(<SessionsPanel />);
    const rows = await screen.findAllByTestId('session-row');
    await user.click(within(rows[0]).getByRole('button', { name: /sign out/i }));

    expect(screen.getByText(/sign you out on this device, right now/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /yes, sign out/i }));

    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith('sess-current'));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it('a failed revoke surfaces an error and leaves the list truthful (non-destructive)', async () => {
    const user = userEvent.setup();
    revokeSession.mockRejectedValue(new Error('Failed to sign out the session'));
    render(<SessionsPanel />);

    const rows = await screen.findAllByTestId('session-row');
    await user.click(within(rows[1]).getByRole('button', { name: /sign out/i }));
    await user.click(screen.getByRole('button', { name: /yes, sign out/i }));

    expect(await screen.findByText(/failed to sign out the session/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('session-row')).toHaveLength(2);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('re-reads the list when the session guard dispatches sessionsChanged (STORY-3)', async () => {
    fetchSessions.mockResolvedValueOnce([CURRENT, OTHER]).mockResolvedValueOnce([CURRENT]);
    render(<SessionsPanel />);
    expect(await screen.findAllByTestId('session-row')).toHaveLength(2);

    const { SESSIONS_CHANGED_EVENT } = await import('@/lib/auth/session-guard');
    window.dispatchEvent(new Event(SESSIONS_CHANGED_EVENT));

    await waitFor(() => expect(screen.getAllByTestId('session-row')).toHaveLength(1));
    expect(fetchSessions).toHaveBeenCalledTimes(2);
  });

  it('a failed initial load shows an error, not a frozen or empty UI', async () => {
    fetchSessions.mockRejectedValue(new Error('Failed to load sessions'));
    render(<SessionsPanel />);
    expect(await screen.findByText(/failed to load sessions/i)).toBeInTheDocument();
  });
});
