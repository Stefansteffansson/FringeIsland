import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/**
 * FEAT-H005 STORY-1 (unit) — the account menu lives in the shell chrome.
 * AppShell mounts the FIM-only AccountMenu beside the notification bell; the
 * menu does its own identity gating (covered in AccountMenu.test).
 */
jest.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="bell" />,
}));
// FEAT-H025 adaptation (labelled): AppShell now mounts the Messages chrome;
// stubbed here like the bell/menu — its behaviour has its own unit suite.
jest.mock('@/components/messages/MessagesLink', () => ({
  MessagesLink: () => <div data-testid="messages-link-stub" />,
}));
jest.mock('@/components/shell/AccountMenu', () => ({
  AccountMenu: () => <div data-testid="account-menu" />,
}));

import { AppShell } from '@/components/shell/AppShell';

describe('FEAT-H005 STORY-1 (unit) — AppShell mounts the account menu', () => {
  it('renders the AccountMenu in the header alongside the bell', () => {
    render(<AppShell title="My Groups">content</AppShell>);
    expect(screen.getByTestId('account-menu')).toBeInTheDocument();
    expect(screen.getByTestId('bell')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('carries the brand mark top-left as a home link on every shell page', () => {
    render(<AppShell title="My Groups">content</AppShell>);
    // Stefan's request (2026-07-04): a FringeIsland mark, top-left, on all
    // pages, leading back to the FringeIsland home (the entry greets a
    // signed-in FIM with "Continue to your groups").
    const brand = screen.getByRole('link', { name: /fringeisland — home/i });
    expect(brand).toHaveAttribute('href', '/');
    expect(screen.getByText('My Groups')).toBeInTheDocument();
  });
});
