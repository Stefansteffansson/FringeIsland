import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H037 STORY-5 — /admin/audit: the platform audit trail browser.
 * WRITTEN RED-FIRST (2026-08-02): AdminAuditLog does not exist at head.
 *
 * The contract under test: newest-first rows (action, target, expandable
 * metadata, timestamp), null-safe actor identity (erased actors and the
 * PC019 pre-session signup rows render, never crash), prefix chips over the
 * KNOWN families plus a free prefix input — conveniences over the OPEN
 * namespace, narrowing server-side via the contract's prefix param — Load
 * more keyset paging on the created_at cursor, the honest empty state, the
 * 404 shape on refusal, B6 skeleton, axe-clean loaded state.
 */

type Row = {
  id: string;
  actor_group_id: string | null;
  actor_display_name: string | null;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ROW1: Row = {
  id: '11111111-1111-4111-8111-111111111111',
  actor_group_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  actor_display_name: 'Oda Admin',
  action: 'moderation.report_resolved',
  target: '99999999-9999-4999-8999-999999999999',
  metadata: { resolution_kind: 'actioned', target_kind: 'forum_post' },
  created_at: '2026-08-02T12:00:00+00:00',
};
const ROW_NULL_ACTOR: Row = {
  id: '22222222-2222-4222-8222-222222222222',
  actor_group_id: null,
  actor_display_name: null,
  action: 'auth.sign_up',
  target: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  metadata: {},
  created_at: '2026-08-02T11:00:00+00:00',
};
const ROW_OLD: Row = {
  id: '33333333-3333-4333-8333-333333333333',
  actor_group_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  actor_display_name: 'Oda Admin',
  action: 'member.suspend',
  target: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  metadata: {},
  created_at: '2026-08-02T10:00:00+00:00',
};

const okRows = (rows: Row[]) =>
  ({ ok: true, status: 200, json: async () => ({ rows }) }) as Response;
const errResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({ error: 'x' }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminAuditLog (FEAT-H037 STORY-5)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminAuditLog />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('rows render action, actor, target, and time; a null actor renders null-safe, never a crash', async () => {
    fetchMock.mockResolvedValue(okRows([ROW1, ROW_NULL_ACTOR]));
    render(<AdminAuditLog />);
    const row = await screen.findByTestId(`admin-audit-row-${ROW1.id}`);
    expect(row).toHaveTextContent('moderation.report_resolved');
    expect(row).toHaveTextContent('Oda Admin');
    const nullRow = screen.getByTestId(`admin-audit-row-${ROW_NULL_ACTOR.id}`);
    expect(nullRow).toHaveTextContent('auth.sign_up');
    expect(nullRow).toHaveTextContent('—');
  });

  it('metadata expands to formatted detail — generic for any action, no per-action renderer zoo', async () => {
    fetchMock.mockResolvedValue(okRows([ROW1]));
    render(<AdminAuditLog />);
    const row = await screen.findByTestId(`admin-audit-row-${ROW1.id}`);
    await userEvent.click(row.querySelector('summary')!);
    expect(row).toHaveTextContent('resolution_kind');
    expect(row).toHaveTextContent('actioned');
  });

  it('a family chip narrows server-side with the prefix param', async () => {
    fetchMock.mockResolvedValue(okRows([ROW1]));
    render(<AdminAuditLog />);
    await screen.findByTestId(`admin-audit-row-${ROW1.id}`);
    await userEvent.click(screen.getByRole('tab', { name: 'moderation.' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('prefix=moderation.'),
      ),
    );
  });

  it('the free prefix input narrows with any prefix — the namespace stays open', async () => {
    fetchMock.mockResolvedValue(okRows([ROW1]));
    render(<AdminAuditLog />);
    await screen.findByTestId(`admin-audit-row-${ROW1.id}`);
    await userEvent.type(screen.getByRole('textbox', { name: /prefix/i }), 'data_ex');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('prefix=data_ex')),
    );
  });

  it('Load more pages on the created_at cursor and appends', async () => {
    // A FULL first page — a short page is honestly exhausted and hides the
    // button (the keyset heuristic under test).
    const fullPage: Row[] = Array.from({ length: 50 }, (_, i) => ({
      ...ROW1,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      created_at: `2026-08-01T12:00:${String(59 - i).padStart(2, '0')}+00:00`,
    }));
    const cursor = fullPage[fullPage.length - 1].created_at;
    fetchMock.mockResolvedValueOnce(okRows(fullPage)).mockResolvedValue(okRows([ROW_OLD]));
    render(<AdminAuditLog />);
    await screen.findByTestId(`admin-audit-row-${fullPage[0].id}`);
    await userEvent.click(screen.getByRole('button', { name: /load more/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`before=${encodeURIComponent(cursor)}`),
      ),
    );
    // Appended, not replaced.
    expect(await screen.findByTestId(`admin-audit-row-${ROW_OLD.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-audit-row-${fullPage[0].id}`)).toBeInTheDocument();
  });

  it('an unmatched prefix renders the honest empty state, never an error', async () => {
    fetchMock.mockResolvedValue(okRows([]));
    render(<AdminAuditLog />);
    expect(await screen.findByText(/no audit entries/i)).toBeInTheDocument();
  });

  it('a refused load renders the 404 shape', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminAuditLog />);
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('a failed load is a visible error with Retry', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValue(okRows([ROW1]));
    render(<AdminAuditLog />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId(`admin-audit-row-${ROW1.id}`)).toBeInTheDocument();
  });

  it('the loaded browser is axe-clean', async () => {
    fetchMock.mockResolvedValue(okRows([ROW1, ROW_NULL_ACTOR]));
    const { container } = render(<AdminAuditLog />);
    await screen.findByTestId(`admin-audit-row-${ROW1.id}`);
    expect(await axe(container)).toHaveNoViolations();
  });
});
