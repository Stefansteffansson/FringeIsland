import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import { AdminClosedThreadsSection } from '@/components/admin/AdminClosedThreadsSection';

/**
 * TASK-SEAL-01, Hub half — the preserved-threads section on
 * /admin/groups/[id] for a CLOSED engagement group (unit).
 *
 * Ruling B1's bounds, as rendered: the section lists the closed group's
 * group-kind threads INCLUDING sealed ones; a sealed thread is LABELLED
 * ("Sealed", with when) and is never presented as live — no open affordance,
 * no "reply", no live chrome. Direct conversations are never here (bound 2 —
 * the contract never returns them). A 404 from the BFF (the group is no
 * longer closed, or the reader is no longer an admin) collapses the section
 * through the parent's re-read, the wing's posture.
 *
 * Red at head: the component does not exist.
 */

const GROUP_ID = '44444444-4444-4444-8444-444444444444';

const threads = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    title: 'Planning the retreat',
    created_at: '2026-08-01T10:00:00+00:00',
    last_message_at: '2026-08-02T10:00:00+00:00',
    sealed_at: '2026-08-05T09:00:00+00:00',
    is_sealed: true,
    message_count: 7,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    title: null,
    created_at: '2026-08-03T10:00:00+00:00',
    last_message_at: null,
    sealed_at: null,
    is_sealed: false,
    message_count: 0,
  },
];

let fetchMock: jest.Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const err = (status: number) => ({ ok: false, status, json: async () => ({ error: 'x' }) }) as Response;

beforeEach(() => {
  fetchMock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminClosedThreadsSection (TASK-SEAL-01)', () => {
  it('fetches the closed group\'s thread set and lists every thread, sealed ones labelled and never live', async () => {
    fetchMock.mockResolvedValue(ok({ threads }));
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="Harbour Circle" onStateDrift={jest.fn()} />);

    const section = await screen.findByTestId('closed-threads-section');
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/groups/${GROUP_ID}/closed-threads`);
    expect(within(section).getByRole('heading', { name: /preserved threads/i })).toBeInTheDocument();

    const rows = await within(section).findAllByTestId('closed-thread-row');
    expect(rows).toHaveLength(2);

    // The sealed thread: labelled, dated, counted — and not a door.
    const sealed = rows[0];
    expect(within(sealed).getByText('Planning the retreat')).toBeInTheDocument();
    expect(within(sealed).getByTestId('sealed-badge')).toHaveTextContent(/sealed/i);
    expect(within(sealed).getByText(/7 messages/i)).toBeInTheDocument();
    expect(within(sealed).queryByRole('link')).not.toBeInTheDocument();
    expect(within(sealed).queryByRole('button')).not.toBeInTheDocument();

    // The unsealed thread of a closed group: no sealed badge, an honest title.
    const live = rows[1];
    expect(within(live).queryByTestId('sealed-badge')).not.toBeInTheDocument();
    expect(within(live).getByText(/untitled thread/i)).toBeInTheDocument();
  });

  it('says plainly what this door does and does not show', async () => {
    fetchMock.mockResolvedValue(ok({ threads }));
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="Harbour Circle" onStateDrift={jest.fn()} />);
    const section = await screen.findByTestId('closed-threads-section');
    // Sealed = preserved after the group closed; contents stay behind the
    // platform's own doors (no message-level admin read exists yet).
    expect(within(section).getByText(/preserved when the group closed/i)).toBeInTheDocument();
    expect(within(section).getByText(/not readable from the admin plane/i)).toBeInTheDocument();
  });

  it('an empty thread set renders the section with an honest empty state', async () => {
    fetchMock.mockResolvedValue(ok({ threads: [] }));
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="Harbour Circle" onStateDrift={jest.fn()} />);
    const section = await screen.findByTestId('closed-threads-section');
    expect(within(section).getByText(/no group threads/i)).toBeInTheDocument();
  });

  it('a 404 (no longer closed, or no longer an admin) hands the drift to the parent', async () => {
    fetchMock.mockResolvedValue(err(404));
    const onStateDrift = jest.fn();
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="Harbour Circle" onStateDrift={onStateDrift} />);
    await waitFor(() => expect(onStateDrift).toHaveBeenCalledTimes(1));
  });
});
