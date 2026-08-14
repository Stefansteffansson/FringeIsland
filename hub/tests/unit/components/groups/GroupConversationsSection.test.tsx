import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { GroupConversationsSection } from '@/components/groups/GroupConversationsSection';
import { HttpStatusError } from '@/lib/http/status-error';

/**
 * Post-6-done coverage (2026-08-14, live walk): the section's refused-vs-failed
 * split. The members-only cell was written RED-FIRST with the fix; the
 * generic-failure cell is test-after backfill of behaviour that predates this
 * file (labelled honestly — the section had no unit harness until now).
 */

const mockClient = {
  createGroupConversation: jest.fn(),
  fetchGroupConversations: jest.fn(),
  joinConversation: jest.fn(),
  leaveConversation: jest.fn(),
};
jest.mock('@/lib/messages/client', () => ({
  createGroupConversation: (...a: unknown[]) => mockClient.createGroupConversation(...a),
  fetchGroupConversations: (...a: unknown[]) => mockClient.fetchGroupConversations(...a),
  joinConversation: (...a: unknown[]) => mockClient.joinConversation(...a),
  leaveConversation: (...a: unknown[]) => mockClient.leaveConversation(...a),
}));

const mockPerms = jest.fn();
jest.mock('@/lib/groups/client', () => ({
  fetchMyPermissions: (...a: unknown[]) => mockPerms(...a),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPerms.mockResolvedValue({ permissions: [], member_group_id: 'me' } as never);
});

describe('GroupConversationsSection — refused vs failed reads', () => {
  it('renders members-only copy when the read is refused (403), never the failure fallback', async () => {
    mockClient.fetchGroupConversations.mockRejectedValue(
      new HttpStatusError('Not allowed', 403) as never,
    );
    render(<GroupConversationsSection groupId="g1" />);
    expect(await screen.findByTestId('group-conversations-members-only')).toBeInTheDocument();
    expect(screen.getByTestId('group-conversations-members-only')).toHaveTextContent(
      'Group conversations are for members of this group.',
    );
    expect(screen.queryByTestId('group-conversations-unavailable')).toBeNull();
  });

  it('renders the honest failure fallback on a generic error (test-after backfill, labelled)', async () => {
    mockClient.fetchGroupConversations.mockRejectedValue(new Error('boom') as never);
    render(<GroupConversationsSection groupId="g1" />);
    expect(await screen.findByTestId('group-conversations-unavailable')).toBeInTheDocument();
  });
});
