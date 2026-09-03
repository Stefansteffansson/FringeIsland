import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
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

    // The sealed thread: labelled, dated, counted — and ONE door only.
    // TASK-SEAL-02 (2026-09-03, labelled adaptation): SEAL-01 pinned "not a door"
    // (no button at all); the rider gives every row exactly one affordance —
    // Open — and still no link, no live chrome. The thread-view cells below pin
    // what that door leads to.
    const sealed = rows[0];
    expect(within(sealed).getByText('Planning the retreat')).toBeInTheDocument();
    expect(within(sealed).getByTestId('sealed-badge')).toHaveTextContent(/sealed/i);
    expect(within(sealed).getByText(/7 messages/i)).toBeInTheDocument();
    expect(within(sealed).queryByRole('link')).not.toBeInTheDocument();
    expect(within(sealed).getAllByRole('button')).toHaveLength(1);
    expect(within(sealed).getByRole('button', { name: /^open$/i })).toBeInTheDocument();

    // The unsealed thread of a closed group: no sealed badge, an honest title.
    const live = rows[1];
    expect(within(live).queryByTestId('sealed-badge')).not.toBeInTheDocument();
    expect(within(live).getByText(/untitled thread/i)).toBeInTheDocument();
  });

  it('says plainly what this door does and does not show', async () => {
    fetchMock.mockResolvedValue(ok({ threads }));
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="Harbour Circle" onStateDrift={jest.fn()} />);
    const section = await screen.findByTestId('closed-threads-section');
    // Sealed = preserved after the group closed. TASK-SEAL-02 (2026-09-03, labelled
    // adaptation): the SEAL-01 sentence "not readable from the admin plane" is
    // RETIRED — a thread can be opened here, read-only and audited.
    expect(within(section).getByText(/preserved when the group closed/i)).toBeInTheDocument();
    expect(within(section).queryByText(/not readable from the admin plane/i)).not.toBeInTheDocument();
    expect(within(section).getByText(/read-only and audited/i)).toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// TASK-SEAL-02 — the rider: from "you can see it exists" to "you can read it".
// Red at head: no Open affordance, no thread view, no detail fetch.
// ---------------------------------------------------------------------------
const SEALED_ID = 'c0000000-0000-4000-8000-000000000001';
const detail = {
  id: SEALED_ID,
  kind: 'group',
  title: 'Planning the retreat',
  group_id: GROUP_ID,
  group_name: 'The Cohort',
  group_status: 'closed',
  created_at: '2026-08-01T10:00:00+00:00',
  sealed_at: '2026-08-05T09:00:00+00:00',
  is_sealed: true,
  message_count: 2,
  truncated: false,
  messages: [
    {
      id: 'm1',
      sender_group_id: 'pg-morgan',
      content: 'the words that are the evidence',
      is_deleted: false,
      created_at: '2026-08-01T11:00:00+00:00',
    },
    {
      id: 'm2',
      sender_group_id: 'pg-stella',
      content: 'the steward answers',
      is_deleted: false,
      created_at: '2026-08-01T12:00:00+00:00',
    },
  ],
  senders: {
    'pg-morgan': { display_name: 'Former member', attribution: 'former' },
    'pg-stella': { display_name: 'Stella', attribution: 'active', kind: 'person' },
  },
};

const routeFetch = (detailRes: Response = ok({ detail })) =>
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    return url.includes(`/closed-threads/${SEALED_ID}`) ? detailRes : ok({ threads });
  });

describe('AdminClosedThreadsSection — TASK-SEAL-02, the read-only thread view', () => {
  it('a sealed row carries exactly one affordance — Open — and still no link', async () => {
    routeFetch();
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="The Cohort" onStateDrift={jest.fn()} />);
    const rows = await screen.findAllByTestId('closed-thread-row');
    const sealedRow = rows[0];
    expect(within(sealedRow).getByTestId(`open-closed-thread-${SEALED_ID}`)).toBeInTheDocument();
    expect(within(sealedRow).getAllByRole('button')).toHaveLength(1);
    expect(within(sealedRow).queryByRole('link')).not.toBeInTheDocument();
    // The SEAL-01 sentence is retired from the surface copy.
    expect(screen.queryByText(/not readable from the admin plane/i)).not.toBeInTheDocument();
  });

  it('Open fetches the thread route and renders the sealed label, every message oldest-first with the ladder-resolved sender, and no composer', async () => {
    routeFetch();
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="The Cohort" onStateDrift={jest.fn()} />);
    fireEvent.click(await screen.findByTestId(`open-closed-thread-${SEALED_ID}`));
    const view = await screen.findByTestId('closed-thread-view');
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/groups/${GROUP_ID}/closed-threads/${SEALED_ID}`);
    await waitFor(() => expect(within(view).getAllByTestId('closed-thread-message')).toHaveLength(2));
    expect(within(view).getByTestId('sealed-thread-label').textContent).toMatch(/sealed .*nothing here is live/i);
    const messages = within(view).getAllByTestId('closed-thread-message');
    expect(messages[0].textContent).toContain('the words that are the evidence');
    expect(messages[0].textContent).toContain('Former member');
    expect(messages[1].textContent).toContain('Stella');
    expect(within(view).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(view).queryByRole('button', { name: /send|reply|react|join|leave/i })).not.toBeInTheDocument();
    // The list is out of the way while a thread is open.
    expect(screen.queryByTestId('closed-thread-row')).not.toBeInTheDocument();
  });

  it('Back returns to the list of preserved threads', async () => {
    routeFetch();
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="The Cohort" onStateDrift={jest.fn()} />);
    fireEvent.click(await screen.findByTestId(`open-closed-thread-${SEALED_ID}`));
    await screen.findByTestId('closed-thread-view');
    fireEvent.click(screen.getByTestId('closed-thread-back'));
    expect(await screen.findAllByTestId('closed-thread-row')).toHaveLength(2);
    expect(screen.queryByTestId('closed-thread-view')).not.toBeInTheDocument();
  });

  it('a 404 on Open (no longer closed, or no longer an admin) hands the drift to the parent and shows no view', async () => {
    const onStateDrift = jest.fn();
    routeFetch(err(404));
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="The Cohort" onStateDrift={onStateDrift} />);
    fireEvent.click(await screen.findByTestId(`open-closed-thread-${SEALED_ID}`));
    await waitFor(() => expect(onStateDrift).toHaveBeenCalled());
    expect(screen.queryByTestId('closed-thread-view')).not.toBeInTheDocument();
  });

  it('a removed message renders as a tombstone, never as empty content', async () => {
    routeFetch(
      ok({
        detail: {
          ...detail,
          messages: [{ ...detail.messages[0], content: null, is_deleted: true }],
          message_count: 1,
        },
      }),
    );
    render(<AdminClosedThreadsSection groupId={GROUP_ID} groupName="The Cohort" onStateDrift={jest.fn()} />);
    fireEvent.click(await screen.findByTestId(`open-closed-thread-${SEALED_ID}`));
    const view = await screen.findByTestId('closed-thread-view');
    await waitFor(() => expect(within(view).getAllByTestId('closed-thread-message')).toHaveLength(1));
    expect(within(view).getByTestId('closed-thread-message').textContent).toMatch(/removed by its author/i);
  });
});
