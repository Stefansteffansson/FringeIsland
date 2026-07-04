import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H013 STORY-2/3/4 (unit) — the group detail panel.
 * Fields + vocabulary-tolerant status badge (GRP-5), member list exactly as
 * the payload provides (honest "hidden" copy when omitted), edit affordance
 * gated by the viewer capability flag (never client-side permission logic),
 * settings editor sends only changed fields and re-reads via onRefresh;
 * failures are non-destructive. Red-first for TASK-H013-02.
 */

const updateGroupSettings = jest.fn<(id: string, input: Record<string, unknown>) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  updateGroupSettings: (id: string, input: Record<string, unknown>) =>
    updateGroupSettings(id, input),
}));

import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';

const BASE: GroupDetail = {
  id: 'grp-1',
  name: 'Book Circle',
  description: 'We read.',
  label: 'circle',
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 2,
  viewer: { is_member: true, joined_at: '2026-07-01T10:00:00+00:00', can_manage_settings: true },
  members: [
    { display_name: 'Stefan', joined_at: '2026-07-01T10:00:00+00:00' },
    { display_name: 'Ada', joined_at: '2026-07-02T10:00:00+00:00' },
  ],
};

describe('FEAT-H013 — GroupDetailPanel (STORY-2/3/4)', () => {
  const onRefresh = jest.fn();

  beforeEach(() => {
    updateGroupSettings.mockReset().mockResolvedValue(BASE);
    onRefresh.mockReset();
  });

  it('renders the group fields, the member count, and the member list as provided', () => {
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    expect(screen.getByRole('heading', { name: 'Book Circle' })).toBeInTheDocument();
    expect(screen.getByText('We read.')).toBeInTheDocument();
    const list = screen.getByTestId('member-list');
    expect(within(list).getByText('Stefan')).toBeInTheDocument();
    expect(within(list).getByText('Ada')).toBeInTheDocument();
  });

  it('renders honest copy when the contract omits the member list — no client-side inference', () => {
    const hidden: GroupDetail = { ...BASE };
    delete hidden.members;
    render(<GroupDetailPanel group={hidden} onRefresh={onRefresh} />);
    expect(screen.queryByTestId('member-list')).toBeNull();
    expect(screen.getByText(/member list hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
  });

  it('badges non-active lifecycle states distinctly and tolerates unknown vocabulary (GRP-5)', () => {
    const { rerender } = render(
      <GroupDetailPanel group={{ ...BASE, status: 'closed' }} onRefresh={onRefresh} />,
    );
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent(/closed/i);
    rerender(<GroupDetailPanel group={{ ...BASE, status: 'hibernating' }} onRefresh={onRefresh} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent(/hibernating/i);
  });

  it('does not badge an active group and offers no edit affordance without the capability flag', () => {
    render(
      <GroupDetailPanel
        group={{ ...BASE, viewer: { ...BASE.viewer, can_manage_settings: false } }}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.queryByTestId('status-badge')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit settings/i })).toBeNull();
  });

  it('opens the settings editor from the capability-gated affordance and sends only the changed fields', async () => {
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /edit settings/i }));
    const name = screen.getByLabelText(/group name/i);
    await userEvent.clear(name);
    await userEvent.type(name, 'Bigger Book Circle');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(updateGroupSettings).toHaveBeenCalledWith('grp-1', { name: 'Bigger Book Circle' });
  });

  it('moves each visibility toggle independently (GRP-3) — one changed toggle, one field sent', async () => {
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /edit settings/i }));
    await userEvent.click(screen.getByLabelText(/group visibility/i));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(updateGroupSettings).toHaveBeenCalledWith('grp-1', { is_public: true });
  });

  it('keeps the form state and surfaces the error when a save fails — never destructive', async () => {
    updateGroupSettings.mockRejectedValue(new Error('Not permitted'));
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /edit settings/i }));
    const name = screen.getByLabelText(/group name/i);
    await userEvent.clear(name);
    await userEvent.type(name, 'Hijack Attempt');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText(/not permitted/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/group name/i)).toHaveValue('Hijack Attempt');
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
