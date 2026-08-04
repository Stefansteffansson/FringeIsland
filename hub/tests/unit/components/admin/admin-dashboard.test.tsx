import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H034 STORY-1/2 (unit) — the /admin dashboard surface. WRITTEN RED-FIRST
 * (the component does not exist yet).
 *
 * The contract under test:
 *  - B6 skeleton while loading (role="status", no frozen/empty-zero dashboard);
 *  - tiles + trend render from EXACTLY the walked payload keys (FEAT-PC018's
 *    walk table) with the "as of" caption from generated_at;
 *  - a refused probe (404 from the BFF) renders the 404 shape — no admin
 *    chrome, no distinct "forbidden" signal;
 *  - a failed load is a visible error with a working Retry — never swallowed;
 *  - Refresh re-reads and repaints from the fresh payload;
 *  - jest-axe clean on the loaded state (the COR-C W7b gate, from first commit).
 */

const STATS = {
  version: 1,
  generated_at: '2026-07-31T12:00:00Z',
  members: { total: 42, active: 40, mists: 7 },
  groups: { total: 12, engagement: 9 },
  journeys: { active_enrollments: 21, completions_30d: 5 },
  activity_daily: [
    { day: '2026-07-30', count: 3 },
    { day: '2026-07-31', count: 8 },
  ],
};

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const errResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({ error: 'x' }) }) as Response;

let fetchMock: jest.Mock<(input: RequestInfo | URL) => Promise<Response>>;

// FEAT-H035: the Groups card renders a next/link anchor; inert for H034 cases.
jest.mock('next/link', () => {
  return function Link({ href, children, ...rest }: { href: string; children: React.ReactNode }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

import React from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

beforeEach(() => {
  fetchMock = jest.fn<(input: RequestInfo | URL) => Promise<Response>>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('FEAT-H034 — AdminDashboard', () => {
  it('shows a skeleton while the read is pending (B6), never an empty-zero dashboard', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined)); // never resolves
    render(<AdminDashboard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
  });

  it('renders every walked payload key: tiles, trend, and the as-of caption', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    render(<AdminDashboard />);

    expect(await screen.findByText('Members')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument(); // members.total
    expect(screen.getByText('40')).toBeInTheDocument(); // members.active
    expect(screen.getByText('7')).toBeInTheDocument(); // members.mists
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // groups.total
    expect(screen.getByText('9')).toBeInTheDocument(); // groups.engagement
    expect(screen.getByText('Journeys')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument(); // journeys.active_enrollments
    expect(screen.getByText('5')).toBeInTheDocument(); // journeys.completions_30d
    // The trend table renders one row per activity_daily bucket.
    expect(screen.getByRole('table', { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByText('2026-07-30')).toBeInTheDocument();
    expect(screen.getByText('2026-07-31')).toBeInTheDocument();
    // The as-of caption carries the generated_at moment.
    expect(screen.getByText(/as of/i)).toBeInTheDocument();
  });

  it('renders the 404 shape on a refused probe — no admin chrome, no forbidden signal', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminDashboard />);
    expect(await screen.findByText(/could not be found/i)).toBeInTheDocument();
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
    expect(screen.queryByText(/forbidden|not authorized/i)).not.toBeInTheDocument();
  });

  // ADAPTED at FEAT-H037 (2026-08-02): the dashboard now also fires the
  // non-blocking open-report count fetch, so these two cells scope their
  // sequencing to the statistics URL instead of positional once-mocks.
  it('surfaces a failed load visibly and Retry re-reads', async () => {
    const statsResponses = [errResponse(500), okResponse({ stats: STATS })];
    fetchMock.mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        String(input).startsWith('/api/admin/reports')
          ? okResponse({ reports: [] })
          : (statsResponses.shift() ?? okResponse({ stats: STATS })),
      ),
    );
    render(<AdminDashboard />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Members')).toBeInTheDocument();
    expect(statsResponses).toHaveLength(0); // exactly two statistics reads
  });

  it('Refresh re-reads and repaints from the fresh payload', async () => {
    const second = {
      ...STATS,
      members: { ...STATS.members, total: 43 },
      generated_at: '2026-07-31T12:05:00Z',
    };
    const statsResponses = [okResponse({ stats: STATS }), okResponse({ stats: second })];
    fetchMock.mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        String(input).startsWith('/api/admin/reports')
          ? okResponse({ reports: [] })
          : (statsResponses.shift() ?? okResponse({ stats: second })),
      ),
    );
    render(<AdminDashboard />);
    expect(await screen.findByText('42')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(await screen.findByText('43')).toBeInTheDocument();
    expect(statsResponses).toHaveLength(0); // exactly two statistics reads
  });

  it('is axe-clean in the loaded state (COR-C W7b gate)', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    const { container } = render(<AdminDashboard />);
    await screen.findByText('Members');
    expect(await axe(container)).toHaveNoViolations();
  });

  // FEAT-H035 STORY-1 (red-first 2026-08-01): the dashboard gains a "Groups"
  // navigation card once loaded — the entry to /admin/groups.
  it('FEAT-H035: the loaded dashboard offers the Groups administration card', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    render(<AdminDashboard />);
    await screen.findByText('Members');
    const card = screen.getByTestId('admin-nav-groups');
    expect(card).toHaveAttribute('href', '/admin/groups');
  });

  // FEAT-H036 STORY-1 (red-first 2026-08-01): the dashboard gains the
  // "Member administration" card — the entry to /admin/members.
  it('FEAT-H036: the loaded dashboard offers the Member administration card', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    render(<AdminDashboard />);
    await screen.findByText('Members');
    const card = screen.getByTestId('admin-nav-members');
    expect(card).toHaveAttribute('href', '/admin/members');
  });

  // FEAT-H037 STORY-6 (red-first 2026-08-02): the dashboard gains the
  // Moderation card (with the open-report count from the queue read) and the
  // Audit log card — the last two A-ADM console entries.
  it('FEAT-H037: the loaded dashboard offers the Moderation card with the open-report count', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/admin/reports')) {
        return Promise.resolve(
          okResponse({ reports: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }] }),
        );
      }
      return Promise.resolve(okResponse({ stats: STATS }));
    });
    render(<AdminDashboard />);
    await screen.findByText('Members');
    const card = screen.getByTestId('admin-nav-moderation');
    expect(card).toHaveAttribute('href', '/admin/moderation');
    await waitFor(() =>
      expect(screen.getByTestId('admin-nav-moderation-count')).toHaveTextContent('3'),
    );
  });

  it('FEAT-H037: the loaded dashboard offers the Audit log card', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    render(<AdminDashboard />);
    await screen.findByText('Members');
    const card = screen.getByTestId('admin-nav-audit');
    expect(card).toHaveAttribute('href', '/admin/audit');
  });

  // WRITTEN RED-FIRST (2026-08-04): the fifth card does not exist at head.
  it('FEAT-H040: the loaded dashboard offers the Roles card', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    render(<AdminDashboard />);
    await screen.findByText('Members');
    const card = screen.getByTestId('admin-nav-roles');
    expect(card).toHaveAttribute('href', '/admin/roles');
  });
});
