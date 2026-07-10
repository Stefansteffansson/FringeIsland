import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';

/**
 * FEAT-H023 STORY-1/2 (unit) — the arrival auto-launch decision.
 *
 * One uniform component for BOTH entry paths (a Mist at anonymous arrival, a
 * brand-new FIM at first sign-in): if the designated onboarding journey exists
 * and the caller has never enrolled, enrol at the moment of launch and route
 * into the player at the welcome — after first paint, never blocking it. If
 * an enrolment exists (arrived once), do nothing automatic — ever. There is
 * NO first-sign-in state and NO opt-out check (ADR-U045 Amendment 1).
 *
 * Red-first: fails until `components/shell/OnboardingArrival.tsx` lands.
 */

type AuthShape = {
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
let pathname = '/groups';
const push = jest.fn();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const fetchOnboardingStatus = jest.fn<() => Promise<unknown>>();
const markOnboardingArrived = jest.fn();
jest.mock('@/lib/onboarding/client', () => ({
  fetchOnboardingStatus: () => fetchOnboardingStatus(),
  markOnboardingArrived: () => markOnboardingArrived(),
}));

const enrollSelf = jest.fn<(id: string) => Promise<unknown>>();
jest.mock('@/lib/journeys/client', () => ({
  enrollSelf: (id: string) => enrollSelf(id),
}));

import {
  OnboardingArrival,
  resetOnboardingArrivalLatch,
} from '@/components/shell/OnboardingArrival';

const NEVER_ARRIVED = {
  onboarding_journey_id: 'jz-1',
  has_enrollment: false,
  has_completed: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  resetOnboardingArrivalLatch();
  authState = { identity: 'fim', loading: false };
  pathname = '/groups';
  fetchOnboardingStatus.mockResolvedValue(NEVER_ARRIVED);
  enrollSelf.mockResolvedValue({ enrollment_id: 'e-9' });
});

describe('FEAT-H023 — OnboardingArrival (the uniform auto-launch decision)', () => {
  it('first arrival: enrols and routes into the player at the welcome (post-paint)', async () => {
    render(<OnboardingArrival />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/journeys/jz-1/play?enrollment=e-9'));
    expect(enrollSelf).toHaveBeenCalledWith('jz-1');
    expect(markOnboardingArrived).toHaveBeenCalled();
  });

  it('a Mist takes the identical path (uniform — no separate first-sign-in state)', async () => {
    authState = { identity: 'mist', loading: false };
    pathname = '/mist';
    render(<OnboardingArrival />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/journeys/jz-1/play?enrollment=e-9'));
  });

  it('arrived once: nothing automatic, ever', async () => {
    fetchOnboardingStatus.mockResolvedValue({ ...NEVER_ARRIVED, has_enrollment: true });
    render(<OnboardingArrival />);
    await waitFor(() => expect(fetchOnboardingStatus).toHaveBeenCalled());
    expect(enrollSelf).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('nothing designated: nothing launches (defensive null)', async () => {
    fetchOnboardingStatus.mockResolvedValue({ ...NEVER_ARRIVED, onboarding_journey_id: null });
    render(<OnboardingArrival />);
    await waitFor(() => expect(fetchOnboardingStatus).toHaveBeenCalled());
    expect(enrollSelf).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('never fires on a non-landing path (a deep link is a destination, not an arrival)', () => {
    pathname = '/journal';
    render(<OnboardingArrival />);
    expect(fetchOnboardingStatus).not.toHaveBeenCalled();
  });

  it('never fires on a group DETAIL page — the boot-scope lesson (PR #166) applied here', () => {
    // Same latent shape as the fixed BOOT_PATHS: 'groups(?:\/|$)' matched
    // '/groups/<id>' too — a deep-linked never-arrived FIM opening a shared
    // group link would have been yanked into the welcome mid-visit.
    pathname = '/groups/9f45bf0e-926e-4df1-886e-577261c449ce';
    render(<OnboardingArrival />);
    expect(fetchOnboardingStatus).not.toHaveBeenCalled();
  });

  it('never fires for a sessionless visitor (no actorless call) or while auth resolves', () => {
    authState = { identity: 'sessionless', loading: false };
    render(<OnboardingArrival />);
    authState = { identity: 'fim', loading: true };
    render(<OnboardingArrival />);
    expect(fetchOnboardingStatus).not.toHaveBeenCalled();
  });

  it('fires once per session — auth-event churn adds zero duplicate reads or launches', async () => {
    const first = render(<OnboardingArrival />);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    first.rerender(<OnboardingArrival />);
    first.unmount();
    render(<OnboardingArrival />); // a remount in the same session
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchOnboardingStatus).toHaveBeenCalledTimes(1);
    expect(enrollSelf).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('a failed arrival never breaks the landing — no navigation, retry stays possible', async () => {
    fetchOnboardingStatus.mockRejectedValueOnce(new Error('offline'));
    render(<OnboardingArrival />);
    await waitFor(() => expect(fetchOnboardingStatus).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    // The latch re-arms on failure so a later landing can retry.
    render(<OnboardingArrival />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/journeys/jz-1/play?enrollment=e-9'));
  });
});
