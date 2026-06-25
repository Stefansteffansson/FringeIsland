import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import SignUpPage from '@/app/signup/page';

/**
 * FEAT-H002 STORY-3 (unit) — the consent gate, at the component level.
 *
 * BACKFILLED TEST-AFTER (see lib/auth/signup unit test header) — faster and more
 * granular than the E2E consent check. From FEAT-H003 such specs are red-first.
 */
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const push = jest.fn();
const signUp = jest.fn(async () => ({ error: null as string | null }));

beforeEach(() => {
  push.mockClear();
  signUp.mockClear();
  jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  jest.mocked(useSearchParams).mockReturnValue(
    { get: () => null } as unknown as ReturnType<typeof useSearchParams>,
  );
  jest.mocked(useAuth).mockReturnValue({
    user: null,
    session: null,
    loading: false,
    signIn: jest.fn(),
    signUp,
    signOut: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
});

describe('FEAT-H002 STORY-3 (unit) — consent gate', () => {
  it('blocks submit and shows an inline error when consent is unchecked', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText('Full name'), 'No Consent');
    await user.type(screen.getByLabelText('Email'), 'x@y.test');
    await user.type(screen.getByLabelText('Password'), 'Test123!@#$');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByTestId('inline-error')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('calls signUp with the form values once consent is checked', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText('Full name'), 'Yes Consent');
    await user.type(screen.getByLabelText('Email'), 'a@b.test');
    await user.type(screen.getByLabelText('Password'), 'Test123!@#$');
    await user.click(screen.getByTestId('consent-checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(signUp).toHaveBeenCalledWith('a@b.test', 'Test123!@#$', 'Yes Consent', true);
  });
});
