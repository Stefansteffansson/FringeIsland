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

  it('surfaces a failed load visibly and Retry re-reads', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValueOnce(okResponse({ stats: STATS }));
    render(<AdminDashboard />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Members')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Refresh re-reads and repaints from the fresh payload', async () => {
    const second = {
      ...STATS,
      members: { ...STATS.members, total: 43 },
      generated_at: '2026-07-31T12:05:00Z',
    };
    fetchMock.mockResolvedValueOnce(okResponse({ stats: STATS })).mockResolvedValueOnce(okResponse({ stats: second }));
    render(<AdminDashboard />);
    expect(await screen.findByText('42')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(await screen.findByText('43')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('is axe-clean in the loaded state (COR-C W7b gate)', async () => {
    fetchMock.mockResolvedValue(okResponse({ stats: STATS }));
    const { container } = render(<AdminDashboard />);
    await screen.findByText('Members');
    expect(await axe(container)).toHaveNoViolations();
  });
});
