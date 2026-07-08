import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { GroupJourneyProgress } from '@/lib/journeys/queries';

/**
 * FEAT-H022 STORY-3/4 (unit) — the group progress panel (JRN-16/17). Permission-
 * gated on view_group_progress (never a role-name check), fetch-on-expand only
 * (never on mount), session reuse of fetched state. The panel renders the
 * aggregate with its HONEST basis ("of M sharing · N members"), the members
 * alphabetical AS SERVED (never re-sorted), sharers' marks + required-progress,
 * a quiet "not shared" for non-sharers, "shares but not started" DISTINCT from
 * "not shared", the honest zero-sharing empty state, and NO timing anywhere
 * (invariant 8). Red-first for TASK-JD-04.
 */

const fetchGroupJourneyProgress =
  jest.fn<(g: string, e: string) => Promise<GroupJourneyProgress>>();
const emitTelemetry = jest.fn();

jest.mock('@/lib/journeys/group-progress', () => ({
  fetchGroupJourneyProgress: (g: string, e: string) => fetchGroupJourneyProgress(g, e),
}));
jest.mock('@/lib/observability/telemetry', () => ({
  emitTelemetry: (...a: unknown[]) => (emitTelemetry as (...x: unknown[]) => unknown)(...a),
}));

import { GroupJourneyProgressSection } from '@/components/groups/GroupJourneyProgressSection';

const ENROLLMENTS = {
  data: {
    count: 1,
    enrollments: [{ enrollment_id: 'en1', journey_id: 'j1', title: 'Leadership Fundamentals', status: 'active' }],
  },
};

const PROGRESS = (over: Partial<GroupJourneyProgress> = {}): GroupJourneyProgress => ({
  enrollment_id: 'en1',
  journey: { id: 'j1', title: 'Leadership Fundamentals' },
  status: 'active',
  steps: [
    { step_id: 's1', step_order: 1, title: 'Orient', required: true },
    { step_id: 's2', step_order: 2, title: 'Reflect', required: false },
    { step_id: 's3', step_order: 3, title: 'Act', required: true },
  ],
  members: [
    { member_group_id: 'ma', display_name: 'Ada', sharing: true, traveller_completed: false, required_completed: 1, required_total: 2, per_step: [{ step_id: 's1', completed: true }, { step_id: 's2', completed: false }, { step_id: 's3', completed: false }] },
    { member_group_id: 'mb', display_name: 'Bo', sharing: false },
    { member_group_id: 'mc', display_name: 'Cy', sharing: true, traveller_completed: false, required_completed: 0, required_total: 2, per_step: [{ step_id: 's1', completed: false }, { step_id: 's2', completed: false }, { step_id: 's3', completed: false }] },
  ],
  members_meta: { total: 3, sharing: 2 },
  aggregate: { per_step: [{ step_id: 's1', completed_count: 1 }, { step_id: 's2', completed_count: 0 }, { step_id: 's3', completed_count: 0 }], basis: 'sharing-members' },
  ...over,
});

const renderSection = (
  props: Partial<React.ComponentProps<typeof GroupJourneyProgressSection>> = {},
) =>
  render(
    <GroupJourneyProgressSection
      groupId="g1"
      permissions={['view_group_progress']}
      enrollments={ENROLLMENTS}
      skeletonDelay={0}
      {...props}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  fetchGroupJourneyProgress.mockResolvedValue(PROGRESS());
});

describe('GroupJourneyProgressSection — permission gate + affordance', () => {
  it('renders nothing without view_group_progress (no fake door)', () => {
    const { container } = renderSection({ permissions: ['view_members'] });
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no enrolment carries an enrollment_id (dark until the summary serves it)', () => {
    const { container } = renderSection({
      enrollments: { data: { count: 1, enrollments: [{ journey_id: 'j1', title: 'X', status: 'active' }] } },
    });
    expect(container.firstChild).toBeNull();
  });

  it('offers a Progress expander per enrolment; fetches only on expand (never on mount) + emits telemetry', async () => {
    renderSection();
    expect(fetchGroupJourneyProgress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('progress-expand-en1'));
    await waitFor(() => expect(screen.getByTestId('progress-panel-en1')).toBeTruthy());
    expect(fetchGroupJourneyProgress).toHaveBeenCalledWith('g1', 'en1');
    expect(emitTelemetry).toHaveBeenCalled();
  });

  it('reuses fetched state on a re-expand within the session (one fetch)', async () => {
    renderSection();
    fireEvent.click(screen.getByTestId('progress-expand-en1'));
    await waitFor(() => expect(screen.getByTestId('progress-panel-en1')).toBeTruthy());
    fireEvent.click(screen.getByTestId('progress-expand-en1')); // collapse
    fireEvent.click(screen.getByTestId('progress-expand-en1')); // re-expand
    await waitFor(() => expect(screen.getByTestId('progress-panel-en1')).toBeTruthy());
    expect(fetchGroupJourneyProgress).toHaveBeenCalledTimes(1);
  });
});

describe('GroupJourneyProgressSection — the panel (STORY-3/4)', () => {
  const openPanel = async () => {
    renderSection();
    fireEvent.click(screen.getByTestId('progress-expand-en1'));
    await waitFor(() => expect(screen.getByTestId('progress-panel-en1')).toBeTruthy());
  };

  it('labels the aggregate with its honest basis (of M sharing · N members)', async () => {
    await openPanel();
    const agg = screen.getByTestId('progress-aggregate');
    expect(agg.textContent).toMatch(/of 2 sharing/);
    expect(agg.textContent).toMatch(/3 members/);
  });

  it('lists members alphabetically AS SERVED — never re-sorted', async () => {
    await openPanel();
    const rows = screen.getAllByTestId(/^progress-member-/);
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'progress-member-ma',
      'progress-member-mb',
      'progress-member-mc',
    ]);
  });

  it('shows a sharer their required-progress; a non-sharer a quiet "not shared"', async () => {
    await openPanel();
    expect(within(screen.getByTestId('progress-member-ma')).getByTestId('member-required').textContent).toContain('1 of 2 required');
    expect(within(screen.getByTestId('progress-member-mb')).getByTestId('member-not-shared')).toBeTruthy();
    expect(screen.getByTestId('progress-member-mb').textContent).toContain('not shared');
  });

  it('distinguishes "shares but not started" from "not shared" (honestly empty marks, not a blank)', async () => {
    await openPanel();
    const cy = screen.getByTestId('progress-member-mc');
    expect(within(cy).queryByTestId('member-not-shared')).toBeNull();
    expect(within(cy).getByTestId('member-required').textContent).toContain('0 of 2 required');
  });

  it('renders NO timing anywhere (no column, no em-dash placeholder implying one)', async () => {
    await openPanel();
    const panel = screen.getByTestId('progress-panel-en1');
    expect(panel.querySelector('[data-testid*="time"]')).toBeNull();
    expect(panel.textContent).not.toMatch(/\bmin\b/);
  });
});

describe('GroupJourneyProgressSection — zero-sharing honesty', () => {
  it('renders the honest empty state (counts absent, basis shown) — never fabricated zeros as coverage', async () => {
    fetchGroupJourneyProgress.mockResolvedValue(
      PROGRESS({
        members: [{ member_group_id: 'mb', display_name: 'Bo', sharing: false }],
        members_meta: { total: 1, sharing: 0 },
        aggregate: {
          per_step: [{ step_id: 's1', completed_count: 0 }, { step_id: 's2', completed_count: 0 }, { step_id: 's3', completed_count: 0 }],
          basis: 'sharing-members',
        },
      }),
    );
    renderSection();
    fireEvent.click(screen.getByTestId('progress-expand-en1'));
    await waitFor(() => expect(screen.getByTestId('progress-panel-en1')).toBeTruthy());
    expect(screen.getByTestId('progress-empty')).toBeTruthy();
    expect(screen.queryByTestId('progress-aggregate')).toBeNull();
    expect(screen.getByTestId('progress-empty').textContent).toMatch(/1 member/);
  });
});
