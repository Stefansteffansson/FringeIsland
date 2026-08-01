import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminModerationQueue } from '@/components/admin/AdminModerationQueue';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H037 STORY-1 — /admin/moderation: the report queue. WRITTEN RED-FIRST
 * (2026-08-02): AdminModerationQueue does not exist at head; every case fails
 * on the missing component.
 *
 * The contract under test: honest filters mapping 1:1 onto FEAT-PC022's open
 * namespace (open default / resolved / all), client-side target grouping (N
 * reports on one piece of content read as one cluster; per-report resolution
 * stays the law), snapshot excerpts, a first-class empty state, the 404 shape
 * on refusal, error + Retry, B6 skeleton, axe-clean loaded state.
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

type Row = {
  id: string;
  target_kind: string;
  target_id: string;
  target_group_id: string | null;
  target_group_name: string | null;
  reporter_display_name: string | null;
  reason: string;
  details: string | null;
  content_snapshot: string | null;
  status: string;
  created_at: string;
  resolution_kind: string | null;
  resolved_at: string | null;
};

const POST_A = '99999999-9999-4999-8999-999999999999';
const R1: Row = {
  id: '11111111-1111-4111-8111-111111111111',
  target_kind: 'forum_post',
  target_id: POST_A,
  target_group_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  target_group_name: 'Fixture Group',
  reporter_display_name: 'Rita Reporter',
  reason: 'harmful content',
  details: null,
  content_snapshot: 'The exact words at report time',
  status: 'open',
  created_at: '2026-08-02T10:00:00+00:00',
  resolution_kind: null,
  resolved_at: null,
};
// A second report on the SAME target — the cluster case.
const R2: Row = {
  ...R1,
  id: '22222222-2222-4222-8222-222222222222',
  reporter_display_name: 'Sven Second',
  reason: 'spam',
  created_at: '2026-08-02T09:00:00+00:00',
};
// A DM report on a different target.
const R3: Row = {
  ...R1,
  id: '33333333-3333-4333-8333-333333333333',
  target_kind: 'direct_message',
  target_id: '88888888-8888-4888-8888-888888888888',
  target_group_name: null,
  reporter_display_name: 'Rita Reporter',
  reason: 'harassment',
  content_snapshot: 'A dm line',
  created_at: '2026-08-02T08:00:00+00:00',
};
const RESOLVED: Row = {
  ...R1,
  id: '44444444-4444-4444-8444-444444444444',
  status: 'resolved',
  resolution_kind: 'dismissed',
  resolved_at: '2026-08-02T11:00:00+00:00',
};

const okReports = (reports: Row[]) =>
  ({ ok: true, status: 200, json: async () => ({ reports }) }) as Response;
const errResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({ error: 'x' }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminModerationQueue (FEAT-H037 STORY-1)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminModerationQueue />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('the default view fetches open and renders rows with kind chip, reporter, reason, and snapshot excerpt', async () => {
    fetchMock.mockResolvedValue(okReports([R1, R3]));
    render(<AdminModerationQueue />);
    const row = await screen.findByTestId(`admin-report-row-${R1.id}`);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports?filter=open');
    expect(row).toHaveTextContent('Rita Reporter');
    expect(row).toHaveTextContent('harmful content');
    expect(row).toHaveTextContent('The exact words at report time');
    expect(row).toHaveTextContent('forum_post');
    const dmRow = screen.getByTestId(`admin-report-row-${R3.id}`);
    expect(dmRow).toHaveTextContent('direct_message');
    // Rows link into detail.
    expect(row.closest('a') ?? row.querySelector('a')).not.toBeNull();
  });

  it('reports on the same target read as one cluster; per-report rows stay distinct inside it', async () => {
    fetchMock.mockResolvedValue(okReports([R1, R2, R3]));
    render(<AdminModerationQueue />);
    await screen.findByTestId(`admin-report-row-${R1.id}`);
    const cluster = screen.getByTestId(`admin-report-cluster-forum_post-${POST_A}`);
    expect(cluster).toHaveTextContent('2 reports');
    // Both rows render inside the one cluster.
    expect(cluster.querySelector(`[data-testid="admin-report-row-${R1.id}"]`)).not.toBeNull();
    expect(cluster.querySelector(`[data-testid="admin-report-row-${R2.id}"]`)).not.toBeNull();
    // The DM report clusters separately.
    expect(cluster.querySelector(`[data-testid="admin-report-row-${R3.id}"]`)).toBeNull();
  });

  it('switching to Resolved refetches with that filter and rows name their outcome', async () => {
    fetchMock.mockResolvedValueOnce(okReports([R1])).mockResolvedValue(okReports([RESOLVED]));
    render(<AdminModerationQueue />);
    await screen.findByTestId(`admin-report-row-${R1.id}`);
    await userEvent.click(screen.getByRole('tab', { name: 'Resolved' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports?filter=resolved'),
    );
    const row = await screen.findByTestId(`admin-report-row-${RESOLVED.id}`);
    expect(row).toHaveTextContent('dismissed');
  });

  it('an empty queue is a first-class render, never a blank page', async () => {
    fetchMock.mockResolvedValue(okReports([]));
    render(<AdminModerationQueue />);
    expect(await screen.findByText(/no open reports/i)).toBeInTheDocument();
  });

  it('a refused load renders the 404 shape — no admin chrome for non-admins', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminModerationQueue />);
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('a failed load is a visible error with Retry', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValue(okReports([R1]));
    render(<AdminModerationQueue />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId(`admin-report-row-${R1.id}`)).toBeInTheDocument();
  });

  it('the loaded queue is axe-clean', async () => {
    fetchMock.mockResolvedValue(okReports([R1, R2, R3]));
    const { container } = render(<AdminModerationQueue />);
    await screen.findByTestId(`admin-report-row-${R1.id}`);
    expect(await axe(container)).toHaveNoViolations();
  });
});
