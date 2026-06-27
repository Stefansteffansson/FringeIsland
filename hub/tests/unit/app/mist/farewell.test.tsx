import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import MistPresencePage from '@/app/mist/page';

/**
 * FEAT-H004 STORY-3/4 (unit) — the farewell ("say goodbye") on the Mist surface.
 * Offered to a Mist only (status, not a role string); confirms through
 * `ConfirmModal` (never confirm()); on confirm calls `sayGoodbye` and returns to
 * the sessionless entry. A FIM is redirected away and never sees the chrome.
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const push = jest.fn();
const replace = jest.fn();
const sayGoodbye = jest.fn(async () => ({ error: null as string | null }));

function mockAuth(identity: 'sessionless' | 'mist' | 'fim') {
  jest.mocked(useAuth).mockReturnValue({
    user: identity === 'sessionless' ? null : ({ is_anonymous: identity === 'mist' } as never),
    session: null,
    loading: false,
    identity,
    signIn: jest.fn(),
    signUp: jest.fn(),
    beginMist: jest.fn(),
    transcend: jest.fn(),
    sayGoodbye,
    signOut: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  sayGoodbye.mockClear();
  sayGoodbye.mockResolvedValue({ error: null });
  jest.mocked(useRouter).mockReturnValue({ push, replace } as unknown as ReturnType<typeof useRouter>);
});

describe('FEAT-H004 STORY-3 (unit) — the farewell', () => {
  it('offers a say-goodbye affordance to a Mist, erases on confirm, and returns to the entry', async () => {
    mockAuth('mist');
    render(<MistPresencePage />);

    await userEvent.click(screen.getByRole('button', { name: /say goodbye/i }));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(sayGoodbye).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('cancel closes the modal without erasing', async () => {
    mockAuth('mist');
    render(<MistPresencePage />);

    await userEvent.click(screen.getByRole('button', { name: /say goodbye/i }));
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));

    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(sayGoodbye).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('surfaces a farewell failure and does not navigate', async () => {
    sayGoodbye.mockResolvedValueOnce({ error: 'Could not erase your visit. Please try again.' });
    mockAuth('mist');
    render(<MistPresencePage />);

    await userEvent.click(screen.getByRole('button', { name: /say goodbye/i }));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    expect(await screen.findByTestId('inline-error')).toHaveTextContent('Could not erase your visit');
    expect(replace).not.toHaveBeenCalledWith('/');
  });
});

describe('FEAT-H004 STORY-4 (unit) — the farewell is not offered to a FIM', () => {
  it('redirects a FIM away with no say-goodbye chrome', async () => {
    mockAuth('fim');
    render(<MistPresencePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/groups'));
    expect(screen.queryByRole('button', { name: /say goodbye/i })).not.toBeInTheDocument();
  });
});
