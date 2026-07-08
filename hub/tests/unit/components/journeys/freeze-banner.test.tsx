import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { FreezeBanner } from '@/components/journeys/FreezeBanner';

/**
 * FEAT-H022 STORY-1 (unit) — the freeze banner (JRN-14). Canon-voice copy keyed
 * on `freeze.reason` (four known reasons, verbatim fallback for unknown ones),
 * with `frozen_at` rendered. Read-only frame only — it offers no affordance and
 * never sets/clears freeze (cascades own it). Renders nothing without a freeze
 * block. Red-first for TASK-JD-03.
 */
describe('FreezeBanner — reason-keyed canon copy + frozen_at (STORY-1)', () => {
  it('renders nothing without a freeze block', () => {
    const { container } = render(<FreezeBanner freeze={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('keys the four known reasons to distinct canon-voice lines', () => {
    const cases: Array<[string, string]> = [
      ['group_closed', 'has closed'],
      ['group_archived', 'was archived'],
      ['left_group', 'You left'],
      ['removed_from_group', 'no longer in'],
    ];
    for (const [reason, fragment] of cases) {
      const { unmount } = render(
        <FreezeBanner freeze={{ reason, frozen_at: '2026-07-08T10:00:00+00:00' }} />,
      );
      expect(screen.getByTestId('freeze-banner').textContent).toContain(fragment);
      unmount();
    }
  });

  it('falls back to the verbatim reason value for an unknown reason (open vocabulary)', () => {
    render(<FreezeBanner freeze={{ reason: 'quarantined_by_council', frozen_at: '2026-07-08T10:00:00+00:00' }} />);
    expect(screen.getByTestId('freeze-banner').textContent).toContain('quarantined_by_council');
  });

  it('still renders an honest line when the reason is null (never a blank or "null")', () => {
    render(<FreezeBanner freeze={{ reason: null, frozen_at: '2026-07-08T10:00:00+00:00' }} />);
    const text = screen.getByTestId('freeze-banner').textContent ?? '';
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('null');
  });

  it('renders when it froze (frozen_at) alongside the reason', () => {
    render(<FreezeBanner freeze={{ reason: 'group_closed', frozen_at: '2026-07-08T10:00:00+00:00' }} />);
    expect(screen.getByTestId('freeze-banner-when').textContent).toContain('2026');
  });

  it('omits the when line honestly when frozen_at is missing (no "Invalid Date")', () => {
    render(<FreezeBanner freeze={{ reason: 'group_closed', frozen_at: null }} />);
    expect(screen.queryByTestId('freeze-banner-when')).toBeNull();
    expect(screen.getByTestId('freeze-banner').textContent).not.toContain('Invalid');
  });
});
