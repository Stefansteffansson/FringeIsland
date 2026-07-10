import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import BecomeAFimPage from '@/app/become-a-fim/page';

/**
 * FEAT-H004 STORY-1/2/4 (unit) — the in-place become-a-FIM flow. Mist-gated by
 * status (no role strings): a FIM is already there (-> /groups), a sessionless
 * visitor must first arrive (-> /). The consent control is a required step
 * (STORY-2). On success the FIM lands on /groups; on failure the error is
 * surfaced and the flow does NOT navigate (no half-FIM UI — STORY-1).
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

// FEAT-H023 STORY-4 (J-E): the success landing reads the carried onboarding
// status — mid-flight resumes into the player, everything else lands /groups.
const fetchOnboardingStatus = jest.fn<
  () => Promise<{
    onboarding_journey_id: string | null;
    has_enrollment: boolean;
    has_completed: boolean;
  }>
>();
jest.mock('@/lib/onboarding/client', () => ({
  fetchOnboardingStatus: () => fetchOnboardingStatus(),
}));

const push = jest.fn();
const replace = jest.fn();
const transcend = jest.fn(async () => ({ error: null as string | null }));

function mockAuth(identity: 'sessionless' | 'mist' | 'fim') {
  jest.mocked(useAuth).mockReturnValue({
    user: identity === 'sessionless' ? null : ({ is_anonymous: identity === 'mist' } as never),
    session: null,
    loading: false,
    identity,
    signIn: jest.fn(),
    signUp: jest.fn(),
    beginMist: jest.fn(),
    transcend,
    sayGoodbye: jest.fn(),
    signOut: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  transcend.mockClear();
  transcend.mockResolvedValue({ error: null });
  fetchOnboardingStatus.mockReset().mockResolvedValue({
    onboarding_journey_id: 'jz-1',
    has_enrollment: false,
    has_completed: false,
  });
  jest.mocked(useRouter).mockReturnValue({ push, replace } as unknown as ReturnType<typeof useRouter>);
});

describe('FEAT-H004 STORY-2 (unit) — consent gate', () => {
  it('blocks submit and shows an inline error when consent is unchecked (no transcend call)', async () => {
    mockAuth('mist');
    render(<BecomeAFimPage />);

    await userEvent.type(screen.getByLabelText('Full name'), 'No Consent');
    await userEvent.type(screen.getByLabelText('Email'), 'x@y.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Transcend123!@#');
    await userEvent.click(screen.getByRole('button', { name: /become a fim/i }));

    expect(screen.getByTestId('inline-error')).toBeInTheDocument();
    expect(transcend).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('calls transcend with the form values once consent is checked', async () => {
    mockAuth('mist');
    render(<BecomeAFimPage />);

    await userEvent.type(screen.getByLabelText('Full name'), 'Yes Consent');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Transcend123!@#');
    await userEvent.click(screen.getByTestId('consent-checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /become a fim/i }));

    expect(transcend).toHaveBeenCalledWith('a@b.test', 'Transcend123!@#', 'Yes Consent', true);
  });
});

describe('FEAT-H004 STORY-1 (unit) — outcome navigation', () => {
  it('lands the new FIM on /groups on success', async () => {
    mockAuth('mist');
    render(<BecomeAFimPage />);

    await userEvent.type(screen.getByLabelText('Full name'), 'Mae Jemison');
    await userEvent.type(screen.getByLabelText('Email'), 'mae@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Transcend123!@#');
    await userEvent.click(screen.getByTestId('consent-checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /become a fim/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/groups'));
  });

  it('resumes a mid-flight onboarding walk at the carried position (H023 STORY-4, JRN-5)', async () => {
    // The Mist began onboarding; transcendence preserved the enrolment — the
    // landing RESUMES (never re-enrols, never restarts): into the player, the
    // resume pointer positions the canvas.
    fetchOnboardingStatus.mockResolvedValue({
      onboarding_journey_id: 'jz-1',
      has_enrollment: true,
      has_completed: false,
    });
    mockAuth('mist');
    render(<BecomeAFimPage />);

    await userEvent.type(screen.getByLabelText('Full name'), 'Mid Flight');
    await userEvent.type(screen.getByLabelText('Email'), 'mid@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Transcend123!@#');
    await userEvent.click(screen.getByTestId('consent-checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /become a fim/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/journeys/jz-1/play'));
  });

  it('a completed walk lands on /groups (nothing to resume)', async () => {
    fetchOnboardingStatus.mockResolvedValue({
      onboarding_journey_id: 'jz-1',
      has_enrollment: true,
      has_completed: true,
    });
    mockAuth('mist');
    render(<BecomeAFimPage />);

    await userEvent.type(screen.getByLabelText('Full name'), 'All Done');
    await userEvent.type(screen.getByLabelText('Email'), 'done@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Transcend123!@#');
    await userEvent.click(screen.getByTestId('consent-checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /become a fim/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/groups'));
  });

  it('surfaces a failure and does NOT navigate (no half-FIM UI)', async () => {
    transcend.mockResolvedValueOnce({ error: 'finalisation failed' });
    mockAuth('mist');
    render(<BecomeAFimPage />);

    await userEvent.type(screen.getByLabelText('Full name'), 'Mae Jemison');
    await userEvent.type(screen.getByLabelText('Email'), 'mae@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Transcend123!@#');
    await userEvent.click(screen.getByTestId('consent-checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /become a fim/i }));

    expect(await screen.findByTestId('inline-error')).toHaveTextContent('finalisation failed');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('FEAT-H004 STORY-4 (unit) — status gating (no role strings)', () => {
  it('sends a FIM to /groups (already transcended — no flow)', async () => {
    mockAuth('fim');
    render(<BecomeAFimPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/groups'));
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('sends a sessionless visitor back to the entry', async () => {
    mockAuth('sessionless');
    render(<BecomeAFimPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
