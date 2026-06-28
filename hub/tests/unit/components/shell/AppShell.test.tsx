import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/**
 * FEAT-H005 STORY-1 (unit) — the account menu lives in the shell chrome.
 * AppShell mounts the FIM-only AccountMenu beside the notification bell; the
 * menu does its own identity gating (covered in AccountMenu.test).
 */
jest.mock('@/components/ui/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="bell" />,
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
});
