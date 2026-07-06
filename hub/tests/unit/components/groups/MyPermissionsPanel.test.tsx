import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H014 STORY-4 (unit) — "What I can do here" (GRP-8).
 * Effective permission names as readable chips.
 *
 * Amended 2026-07-06 (FEAT-H018 STORY-1): the act-as selector's honest-v1
 * single-context posture is superseded — the shell now offers "Myself" plus
 * every group from the acting-contexts read (ADR-U041 §1); selecting a group
 * re-scopes the panel to that group's powers (substitution, §2a), with copy
 * naming the substitution. The v1 "arrives when group-of-groups lands" copy
 * retires. Red-first for TASK-H018-02.
 */

import { MyPermissionsPanel } from '@/components/groups/MyPermissionsPanel';

describe('FEAT-H014/H018 — MyPermissionsPanel', () => {
  const onReload = jest.fn();
  const onActAsChange = jest.fn();

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

  it('with no acting contexts: exactly "Myself", and the retired v1 copy is gone', () => {
    render(
      <MyPermissionsPanel
        permissions={['invite_members']}
        error={null}
        onReload={onReload}
        actingContexts={[]}
      />,
    );
    const select = screen.getByTestId('act-as-select') as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    expect(select.options[0].text).toBe('Myself');
    expect(screen.queryByText(/arrives when group-of-groups lands/i)).not.toBeInTheDocument();
  });

  it('offers the wieldable groups as real contexts and reports a change (FEAT-H018 STORY-1)', async () => {
    const user = userEvent.setup();
    render(
      <MyPermissionsPanel
        permissions={['invite_members']}
        error={null}
        onReload={onReload}
        actingContexts={[{ group_id: 'a1', name: 'Familjen' }]}
        actingAs="myself"
        onActAsChange={onActAsChange}
      />,
    );
    const select = screen.getByTestId('act-as-select') as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    await user.selectOptions(select, 'a1');
    expect(onActAsChange).toHaveBeenCalledWith('a1');
  });

  it('names the substitution while acting as a group (ADR-U041 §2a)', () => {
    render(
      <MyPermissionsPanel
        permissions={['post_forum_messages']}
        error={null}
        onReload={onReload}
        actingContexts={[{ group_id: 'a1', name: 'Familjen' }]}
        actingAs="a1"
        onActAsChange={onActAsChange}
      />,
    );
    expect(screen.getByText(/acting as Familjen/i)).toBeInTheDocument();
    expect(screen.getByText(/Familjen's powers here/i)).toBeInTheDocument();
  });

  it('shows a panel-local error without taking the page down', () => {
    render(
      <MyPermissionsPanel permissions={null} error="Failed to load your permissions" onReload={onReload} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load your permissions/i);
  });
});
