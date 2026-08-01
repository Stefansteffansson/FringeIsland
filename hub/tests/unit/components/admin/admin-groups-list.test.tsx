import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminGroupsList } from '@/components/admin/AdminGroupsList';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H035 STORY-1 — the /admin/groups list with the caretaker tab.
 * WRITTEN RED-FIRST (2026-08-01): AdminGroupsList does not exist at head;
 * every case below fails on the missing component before implementation.
 */

jest.mock('next/link', () => {
  return function Link({ href, children, ...rest }: { href: string; children: React.ReactNode }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

type ListRow = {
  id: string;
  name: string;
  group_type: string;
  status: string;
  member_count: number;
  non_system_member_count: number;
  deusex_stewarded: boolean;
  created_at: string;
};

const rowActive: ListRow = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Harbour Circle',
  group_type: 'engagement',
  status: 'active',
  member_count: 3,
  non_system_member_count: 3,
  deusex_stewarded: false,
  created_at: '2026-07-01T10:00:00+00:00',
};

const rowCaretaker: ListRow = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Driftwood Cohort',
  group_type: 'engagement',
  status: 'active',
  member_count: 2,
  non_system_member_count: 1,
  deusex_stewarded: true,
  created_at: '2026-07-10T10:00:00+00:00',
};

const rowSuspended: ListRow = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Quiet Meadow',
  group_type: 'engagement',
  status: 'suspended',
  member_count: 4,
  non_system_member_count: 4,
  deusex_stewarded: false,
  created_at: '2026-06-20T10:00:00+00:00',
};

const okResponse = (rows: ListRow[]) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ groups: rows }),
  }) as Response;

const errResponse = (status: number) =>
  ({
    ok: false,
    status,
    json: async () => ({ error: 'x' }),
  }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminGroupsList (FEAT-H035 STORY-1)', () => {
  it('renders the loading skeleton while the list is pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminGroupsList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the walked rows: names, status badge for non-active, caretaker flag, the honest count pair', async () => {
    fetchMock.mockResolvedValue(okResponse([rowActive, rowCaretaker, rowSuspended]));
    render(<AdminGroupsList />);
    expect(await screen.findByText('Harbour Circle')).toBeInTheDocument();
    expect(screen.getByText('Driftwood Cohort')).toBeInTheDocument();
    expect(screen.getByText('Quiet Meadow')).toBeInTheDocument();

    // GRP-5 vocabulary: no badge for active, a badge naming the status otherwise.
    const badges = screen.getAllByTestId('status-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('suspended');

    // The caretaker flag on the flagged row only.
    expect(screen.getAllByTestId('caretaker-flag')).toHaveLength(1);

    // Gracy-honest pair: total and people rendered distinctly for the caretaker row.
    const caretakerRow = screen.getByTestId(`admin-group-row-${rowCaretaker.id}`);
    expect(caretakerRow).toHaveTextContent('2');
    expect(caretakerRow).toHaveTextContent('1');

    // Rows link to detail.
    expect(screen.getByRole('link', { name: /Driftwood Cohort/ })).toHaveAttribute(
      'href',
      `/admin/groups/${rowCaretaker.id}`,
    );
  });

  it('fetches fresh on mount with the all filter and refetches on tab switch (fresh-per-mount, no cache)', async () => {
    fetchMock.mockResolvedValue(okResponse([rowCaretaker]));
    render(<AdminGroupsList />);
    await screen.findByText('Driftwood Cohort');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/groups?filter=all');

    await userEvent.click(screen.getByRole('tab', { name: 'Platform-stewarded' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/groups?filter=deusex_stewarded');
  });

  it('renders all four tabs mapping 1:1 to the contract filter namespace', async () => {
    fetchMock.mockResolvedValue(okResponse([]));
    render(<AdminGroupsList />);
    for (const label of ['All', 'Engagement', 'Platform-stewarded', 'Suspended']) {
      expect(await screen.findByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('renders the 404 shape when the platform refuses (non-admin)', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminGroupsList />);
    expect(await screen.findByText(/could not be found/i)).toBeInTheDocument();
    expect(screen.queryByText(/forbidden|not authorized/i)).not.toBeInTheDocument();
  });

  it('renders a visible error with Retry on a failed load, and Retry refetches', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValueOnce(okResponse([rowActive]));
    render(<AdminGroupsList />);
    const retry = await screen.findByRole('button', { name: /retry/i });
    await userEvent.click(retry);
    expect(await screen.findByText('Harbour Circle')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('loaded list state is axe-clean', async () => {
    fetchMock.mockResolvedValue(okResponse([rowActive, rowCaretaker, rowSuspended]));
    const { container } = render(<AdminGroupsList />);
    await screen.findByText('Harbour Circle');
    expect(await axe(container)).toHaveNoViolations();
  });
});
