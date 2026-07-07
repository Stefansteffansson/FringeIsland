import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/**
 * FEAT-H019 STORY-6 (unit) — the group page's journeys section renders the
 * slice envelope honestly: the list (title, status, link into the journey
 * detail), an honest empty state, and an honest unavailable state when the
 * slice failed — never a broken page. Red-first for TASK-JA-08.
 */
import { GroupJourneysSection } from '@/components/groups/GroupJourneysSection';

describe('FEAT-H019 STORY-6 — GroupJourneysSection', () => {
  it('lists the enrolments with status, linking to each journey detail', () => {
    render(
      <GroupJourneysSection
        enrollments={{
          data: {
            count: 2,
            enrollments: [
              { journey_id: 'j1', title: 'Leadership Fundamentals', status: 'active' },
              { journey_id: 'j2', title: 'Resilience', status: 'frozen' },
            ],
          },
        }}
      />,
    );
    const section = screen.getByTestId('group-journeys');
    expect(section.textContent).toContain('Leadership Fundamentals');
    expect(section.textContent).toContain('frozen');
    const link = screen.getByRole('link', { name: 'Leadership Fundamentals' });
    expect(link.getAttribute('href')).toBe('/journeys/j1');
  });

  it('shows an honest empty state for a group travelling nothing', () => {
    render(<GroupJourneysSection enrollments={{ data: { count: 0, enrollments: [] } }} />);
    expect(screen.getByTestId('group-journeys-empty')).toBeTruthy();
  });

  it('shows an honest unavailable state when the slice failed — the page renders whole', () => {
    render(<GroupJourneysSection enrollments={{ error: 'unavailable' }} />);
    expect(screen.getByTestId('group-journeys-unavailable')).toBeTruthy();
  });

  it('renders nothing at all while the envelope has not arrived (no flash)', () => {
    const { container } = render(<GroupJourneysSection enrollments={null} />);
    expect(container.firstChild).toBeNull();
  });
});
