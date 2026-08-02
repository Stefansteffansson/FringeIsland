import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminReportDetail } from '@/components/admin/AdminReportDetail';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H037 STORY-2/3 — /admin/moderation/[id]: report detail with drift
 * honesty and the resolve ceremony. WRITTEN RED-FIRST (2026-08-02):
 * AdminReportDetail does not exist at head.
 *
 * The contract under test: the snapshot renders as the record ("what the
 * content said when reported"); live escalation links compose the ADM-B/C
 * consoles (author → /admin/members/[id], group → /admin/groups/[id]) and
 * render only when the platform resolved them; the drift-honesty line on
 * live_target_exists=false; the resolve panel is a bespoke inline panel
 * (ConfirmModal carries no children) whose consequence copy names exactly
 * what the reporter will and will not learn, confirm disabled until an
 * outcome is chosen; success repaints from the fresh read; a stale second
 * resolve renders the platform's 409 message VERBATIM; a resolved report
 * shows provenance + the admin-only note and no panel.
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

type Detail = {
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
  resolution_note: string | null;
  resolved_by_display_name: string | null;
  author_user_id: string | null;
  author_display_name: string | null;
  live_target_exists: boolean;
};

const RID = '11111111-1111-4111-8111-111111111111';
const AUTHOR_ID = '55555555-5555-4555-8555-555555555555';
const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const OPEN: Detail = {
  id: RID,
  target_kind: 'forum_post',
  target_id: '99999999-9999-4999-8999-999999999999',
  target_group_id: GROUP_ID,
  target_group_name: 'Fixture Group',
  reporter_display_name: 'Rita Reporter',
  reason: 'harmful content',
  details: 'more context',
  content_snapshot: 'The exact words at report time',
  status: 'open',
  created_at: '2026-08-02T10:00:00+00:00',
  resolution_kind: null,
  resolved_at: null,
  resolution_note: null,
  resolved_by_display_name: null,
  author_user_id: AUTHOR_ID,
  author_display_name: 'Astrid Author',
  live_target_exists: true,
};

const TOMBSTONED: Detail = { ...OPEN, live_target_exists: false };
const AUTHORLESS: Detail = { ...OPEN, author_user_id: null, author_display_name: null, live_target_exists: false };
const RESOLVED: Detail = {
  ...OPEN,
  status: 'resolved',
  resolution_kind: 'actioned',
  resolved_at: '2026-08-02T12:00:00+00:00',
  resolution_note: 'escalated to member console',
  resolved_by_display_name: 'Oda Admin',
};

const okDetail = (report: Detail) =>
  ({ ok: true, status: 200, json: async () => ({ report }) }) as Response;
const errResponse = (status: number, error = 'x') =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminReportDetail (FEAT-H037 STORY-2/3)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminReportDetail reportId={RID} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('a live target: snapshot as the record, reporter identity, both escalation links', async () => {
    fetchMock.mockResolvedValue(okDetail(OPEN));
    render(<AdminReportDetail reportId={RID} />);
    expect(await screen.findByText('The exact words at report time')).toBeInTheDocument();
    expect(screen.getByText(/what the content said when reported/i)).toBeInTheDocument();
    expect(screen.getByText('Rita Reporter')).toBeInTheDocument();
    expect(screen.getByTestId('report-author-link')).toHaveAttribute(
      'href',
      `/admin/members/${AUTHOR_ID}`,
    );
    expect(screen.getByTestId('report-group-link')).toHaveAttribute(
      'href',
      `/admin/groups/${GROUP_ID}`,
    );
    expect(screen.queryByTestId('report-drift-line')).not.toBeInTheDocument();
  });

  it('a tombstoned target: the drift-honesty line renders; the author link survives (the row knows its author)', async () => {
    fetchMock.mockResolvedValue(okDetail(TOMBSTONED));
    render(<AdminReportDetail reportId={RID} />);
    expect(await screen.findByTestId('report-drift-line')).toHaveTextContent(
      /no longer present/i,
    );
    expect(screen.getByTestId('report-author-link')).toBeInTheDocument();
    expect(screen.getByText('The exact words at report time')).toBeInTheDocument();
  });

  it('a vanished author yields no author link — the platform said NULL, the surface offers nothing', async () => {
    fetchMock.mockResolvedValue(okDetail(AUTHORLESS));
    render(<AdminReportDetail reportId={RID} />);
    await screen.findByText('The exact words at report time');
    expect(screen.queryByTestId('report-author-link')).not.toBeInTheDocument();
  });

  it('the resolve panel: consequence copy names what the reporter will and will not learn; confirm disabled until an outcome is chosen', async () => {
    fetchMock.mockResolvedValue(okDetail(OPEN));
    render(<AdminReportDetail reportId={RID} />);
    const panel = await screen.findByTestId('resolve-panel');
    expect(panel).toHaveTextContent(/the reporter will be told the outcome/i);
    expect(panel).toHaveTextContent(/not your name/i);
    expect(panel).toHaveTextContent(/not this note/i);
    const confirm = screen.getByRole('button', { name: /resolve report/i });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /dismissed/i }));
    expect(confirm).toBeEnabled();
  });

  it('resolving posts the outcome + note and repaints from the fresh read', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(OPEN))
      .mockResolvedValueOnce(
        ({ ok: true, status: 200, json: async () => ({}) }) as Response,
      )
      .mockResolvedValue(okDetail(RESOLVED));
    render(<AdminReportDetail reportId={RID} />);
    await screen.findByTestId('resolve-panel');
    await userEvent.click(screen.getByRole('radio', { name: /actioned/i }));
    await userEvent.type(screen.getByRole('textbox', { name: /note/i }), 'escalated');
    await userEvent.click(screen.getByRole('button', { name: /resolve report/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/reports/${RID}/resolve`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const postCall = fetchMock.mock.calls.find(
      (c) => c[0] === `/api/admin/reports/${RID}/resolve`,
    )!;
    expect(JSON.parse((postCall[1] as RequestInit).body as string)).toEqual({
      resolution_kind: 'actioned',
      resolution_note: 'escalated',
    });
    // Repaint: the fresh read renders the resolved provenance, the panel is gone.
    expect(await screen.findByTestId('report-provenance')).toHaveTextContent('Oda Admin');
    expect(screen.queryByTestId('resolve-panel')).not.toBeInTheDocument();
  });

  it('a stale second resolve renders the platform 409 message VERBATIM', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(OPEN))
      .mockResolvedValueOnce(errResponse(409, 'Report already resolved'))
      .mockResolvedValue(okDetail(RESOLVED));
    render(<AdminReportDetail reportId={RID} />);
    await screen.findByTestId('resolve-panel');
    await userEvent.click(screen.getByRole('radio', { name: /dismissed/i }));
    await userEvent.click(screen.getByRole('button', { name: /resolve report/i }));
    expect(await screen.findByText('Report already resolved')).toBeInTheDocument();
  });

  it('a resolved report: provenance + the admin-only note render; no resolve panel', async () => {
    fetchMock.mockResolvedValue(okDetail(RESOLVED));
    render(<AdminReportDetail reportId={RID} />);
    expect(await screen.findByTestId('report-provenance')).toHaveTextContent('Oda Admin');
    expect(screen.getByTestId('report-provenance')).toHaveTextContent('actioned');
    expect(screen.getByText('escalated to member console')).toBeInTheDocument();
    expect(screen.queryByTestId('resolve-panel')).not.toBeInTheDocument();
  });

  it('a refused load renders the 404 shape', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminReportDetail reportId={RID} />);
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('the loaded detail is axe-clean (open and resolved states)', async () => {
    fetchMock.mockResolvedValue(okDetail(OPEN));
    const { container, unmount } = render(<AdminReportDetail reportId={RID} />);
    await screen.findByTestId('resolve-panel');
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    fetchMock.mockResolvedValue(okDetail(RESOLVED));
    const { container: c2 } = render(<AdminReportDetail reportId={RID} />);
    await screen.findByTestId('report-provenance');
    expect(await axe(c2)).toHaveNoViolations();
  });
});
