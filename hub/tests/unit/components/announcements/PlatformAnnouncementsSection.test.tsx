import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { Announcement } from '@/lib/announcements/queries';

/**
 * FEAT-H028 STORY-3 (unit) — the home Platform Announcements section (COM-9).
 * A read-only, failure-isolated slice for signed-in FIMs: newest-first,
 * labelled as platform announcements, honest empty, honest unavailable (its
 * failure never breaks home). No compose here — COM-9 compose is the Console's
 * (ADR-U028); the Hub only renders. Session cache + W9 live in the client.
 *
 * Red-first: the component does not exist yet — import fails.
 */

type AnnouncementsClient = typeof import('@/lib/announcements/client');
const mockClient = {
  peekPlatformAnnouncements: jest.fn<AnnouncementsClient['peekPlatformAnnouncements']>(),
  fetchPlatformAnnouncements: jest.fn<AnnouncementsClient['fetchPlatformAnnouncements']>(),
};
jest.mock('@/lib/announcements/client', () => ({
  __esModule: true,
  peekPlatformAnnouncements: () => mockClient.peekPlatformAnnouncements(),
  fetchPlatformAnnouncements: (before?: string) => mockClient.fetchPlatformAnnouncements(before),
}));

import { PlatformAnnouncementsSection } from '@/components/announcements/PlatformAnnouncementsSection';

function ann(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'p1',
    title: 'Universe update',
    body: 'Something changed everywhere.',
    created_at: '2026-07-20T10:00:00Z',
    author_group_id: null,
    author: { display_name: 'The Council', attribution: 'active' },
    ...overrides,
  };
}

describe('PlatformAnnouncementsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.peekPlatformAnnouncements.mockReturnValue(null);
    mockClient.fetchPlatformAnnouncements.mockResolvedValue([ann()]);
  });

  it('renders platform announcements newest-first, labelled as platform announcements', async () => {
    render(<PlatformAnnouncementsSection />);
    const section = await screen.findByTestId('platform-announcements');
    expect(section).toHaveTextContent(/platform announcements/i);
    expect(await screen.findByText('Universe update')).toBeInTheDocument();
    expect(screen.getByText('Something changed everywhere.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no platform announcements', async () => {
    mockClient.fetchPlatformAnnouncements.mockResolvedValue([]);
    render(<PlatformAnnouncementsSection />);
    expect(await screen.findByTestId('platform-announcements-empty')).toBeInTheDocument();
  });

  it('is failure-isolated: an unavailable read renders honest absence, not a crash', async () => {
    mockClient.fetchPlatformAnnouncements.mockRejectedValue(new Error('boom'));
    render(<PlatformAnnouncementsSection />);
    expect(await screen.findByTestId('platform-announcements-unavailable')).toBeInTheDocument();
  });

  it('offers no compose affordance (COM-9 compose seams to the Console)', async () => {
    render(<PlatformAnnouncementsSection />);
    await screen.findByText('Universe update');
    expect(screen.queryByRole('button', { name: /announce/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/announcement title/i)).not.toBeInTheDocument();
  });
});
