import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import type { NotificationRow } from '@/lib/notifications/queries';

/**
 * FEAT-H049 STORY-4 (DB-4, NTF-1) — the bell says it happened. The six
 * FEAT-PD021 hold kinds render through the shared row body as PLAIN notices:
 * title = the kind's label, body = the reason, no action affordance; the
 * `sanctions` category carries its own icon (an unknown category falls back
 * to the bell — the open-registry rule, unchanged).
 * WRITTEN RED-FIRST (2026-09-03): `sanctions` has no CATEGORY_ICON entry at
 * head, so the row renders the bell fallback — the icon cell is red.
 */
const row = (over: Partial<NotificationRow>): NotificationRow =>
  ({
    id: 'n1',
    kind: 'group_suspended',
    category: 'sanctions',
    title: 'Your group has been suspended',
    body: 'Repeated harassment reports',
    group_id: 'g1',
    created_at: '2026-09-03T10:00:00Z',
    is_read: false,
    read_at: null,
    action_type: null,
    action_taken: null,
    expires_at: null,
    action_data: null,
    ...over,
  }) as NotificationRow;

describe('NotificationItem — the hold kinds as plain notices (FEAT-H049 STORY-4)', () => {
  it('renders title and body as delivered, with no action affordance', () => {
    render(<NotificationItem row={row({})} />);
    expect(screen.getByText('Your group has been suspended')).toBeInTheDocument();
    expect(screen.getByText('Repeated harassment reports')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-respond-by')).not.toBeInTheDocument();
  });

  it('the sanctions category shows its own icon, not the bell fallback', () => {
    const { container } = render(<NotificationItem row={row({})} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('class') ?? '').not.toMatch(/lucide-bell\b/);
    expect(svg!.getAttribute('class') ?? '').toMatch(/lucide-gavel\b/);
  });

  it('an unknown category still falls back to the bell (the open-registry rule, labelled pin)', () => {
    const { container } = render(<NotificationItem row={row({ category: 'not-a-category' })} />);
    expect(container.querySelector('svg')!.getAttribute('class') ?? '').toMatch(/lucide-bell\b/);
  });
});
