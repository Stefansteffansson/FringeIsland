import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H013 STORY-1 (unit) — the create-group flow on /groups.
 * Affordance → form (name required; the two visibility toggles independent,
 * with distinct copy); submit goes through the BFF client; success hands the
 * new id to the page (which navigates); failure is non-destructive. The
 * client module is mocked — behaviour over transport. Red-first for
 * TASK-H013-02.
 */

const createGroup = jest.fn<(input: Record<string, unknown>) => Promise<string>>();

jest.mock('@/lib/groups/client', () => ({
  createGroup: (input: Record<string, unknown>) => createGroup(input),
}));

import { CreateGroupPanel } from '@/components/groups/CreateGroupPanel';

describe('FEAT-H013 — CreateGroupPanel (STORY-1)', () => {
  const onCreated = jest.fn();

  beforeEach(() => {
    createGroup.mockReset().mockResolvedValue('grp-new');
    onCreated.mockReset();
  });

  it('opens the form from the affordance; the form is closed by default', async () => {
    render(<CreateGroupPanel onCreated={onCreated} />);
    expect(screen.queryByLabelText(/group name/i)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
  });

  it('blocks an empty name client-side (defense-in-depth) — nothing is sent', async () => {
    render(<CreateGroupPanel onCreated={onCreated} />);
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(createGroup).not.toHaveBeenCalled();
    expect(screen.getByText(/needs a name/i)).toBeInTheDocument();
  });

  it('submits the payload — name + the two independent visibility toggles — and reports the new id', async () => {
    render(<CreateGroupPanel onCreated={onCreated} />);
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await userEvent.type(screen.getByLabelText(/group name/i), 'Book Circle');
    await userEvent.click(screen.getByLabelText(/group visibility/i));
    // member-list visibility left at its default — the two toggles are independent
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('grp-new'));
    expect(createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Book Circle', is_public: true, show_member_list: true }),
    );
  });

  it('surfaces a failure non-destructively — the typed values survive', async () => {
    createGroup.mockRejectedValue(new Error('Group creation is for active members'));
    render(<CreateGroupPanel onCreated={onCreated} />);
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await userEvent.type(screen.getByLabelText(/group name/i), 'Book Circle');
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() =>
      expect(screen.getByText(/group creation is for active members/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/group name/i)).toHaveValue('Book Circle');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('names each visibility toggle for what it governs — never one combined switch', async () => {
    render(<CreateGroupPanel onCreated={onCreated} />);
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    expect(screen.getByLabelText(/group visibility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/member-list visibility/i)).toBeInTheDocument();
  });
});
