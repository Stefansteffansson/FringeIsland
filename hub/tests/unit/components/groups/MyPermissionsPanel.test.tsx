import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H014 STORY-4 (unit) — "What I can do here" (GRP-8).
 * Effective permission names as readable chips; the act-as selector is a REAL
 * control with exactly one context ("Myself") and honest copy about when
 * further contexts arrive (G-F) — never a mocked dropdown; selecting it is a
 * no-op re-read. Red-first for TASK-H014-02.
 */

import { MyPermissionsPanel } from '@/components/groups/MyPermissionsPanel';

describe('FEAT-H014 — MyPermissionsPanel (STORY-4)', () => {
  const onReload = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders the effective permission names as chips', () => {
    render(
      <MyPermissionsPanel
        permissions={['invite_members', 'view_member_list']}
        error={null}
        onReload={onReload}
      />,
    );
    expect(screen.getByText('invite_members')).toBeInTheDocument();
    expect(screen.getByText('view_member_list')).toBeInTheDocument();
  });

  it('renders the honest empty state', () => {
    render(<MyPermissionsPanel permissions={[]} error={null} onReload={onReload} />);
    expect(screen.getByText(/you can view this group/i)).toBeInTheDocument();
  });

  it('offers exactly one acting context — "Myself" — with honest copy, and selecting is a no-op re-read', async () => {
    const user = userEvent.setup();
    render(
      <MyPermissionsPanel permissions={['invite_members']} error={null} onReload={onReload} />,
    );
    const select = screen.getByTestId('act-as-select') as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    expect(select.options[0].text).toBe('Myself');
    expect(screen.getByText(/acting as a group arrives/i)).toBeInTheDocument();

    await user.selectOptions(select, select.options[0].value);
    expect(onReload).toHaveBeenCalled();
  });

  it('shows a panel-local error without taking the page down', () => {
    render(
      <MyPermissionsPanel permissions={null} error="Failed to load your permissions" onReload={onReload} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load your permissions/i);
  });
});
