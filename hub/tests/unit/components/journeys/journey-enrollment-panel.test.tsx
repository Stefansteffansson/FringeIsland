import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { JourneyDetail } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-3/4/5 (unit) — the viewer-shaped enrolment block.
 *
 * Everything renders from the payload's viewer block — the Hub never computes
 * eligibility (ADR-U041 posture): *Start this journey* appears only when not
 * individually enrolled; *Enrol a group* offers exactly `enrollable_groups`
 * (absence, not a disabled tease); Withdraw appears only where the payload
 * says it may (own active enrolment via `individual_enrollment`; a group
 * enrolment only when its `can_withdraw` is true) — the J-A build finding:
 * the viewer block carries `individual_enrollment` + per-`enrolled_via`
 * `enrollment_id`/`status`/`can_withdraw` additively, else the surface would
 * have to client-guess withdrawability (spec forbids). Frozen renders no
 * affordance (per the payload's status). Mutations show busy within the
 * pressed affordance, cannot double-submit (B5), re-read via onRefresh, and
 * refusals surface honestly. Confirms name the group (the H018
 * wielding-confirm pattern) and Withdraw rides a destructive ConfirmModal.
 * Red-first for TASK-JA-07.
 */

const enrollSelf = jest.fn<(j: string) => Promise<unknown>>();
const enrollGroup = jest.fn<(j: string, g: string) => Promise<unknown>>();
const withdrawEnrollment = jest.fn<(j: string, e: string) => Promise<unknown>>();

const pauseEnrollment = jest.fn<(j: string, e: string) => Promise<unknown>>();
const resumeEnrollment = jest.fn<(j: string, e: string) => Promise<unknown>>();
jest.mock('@/lib/journeys/client', () => ({
  enrollSelf: (j: string) => enrollSelf(j),
  enrollGroup: (j: string, g: string) => enrollGroup(j, g),
  withdrawEnrollment: (j: string, e: string) => withdrawEnrollment(j, e),
  pauseEnrollment: (j: string, e: string) => pauseEnrollment(j, e),
  resumeEnrollment: (j: string, e: string) => resumeEnrollment(j, e),
  JourneysApiError: class JourneysApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { JourneyEnrollmentPanel } from '@/components/journeys/JourneyEnrollmentPanel';
import { JourneysApiError } from '@/lib/journeys/client';

const BASE: JourneyDetail = {
  id: 'j1',
  title: 'Leadership Fundamentals',
  description: null,
  difficulty_level: 'beginner',
  estimated_duration_minutes: 120,
  tags: [],
  step_count: 0,
  steps: [],
  is_enrolled_individually: false,
  individual_enrollment: null,
  enrolled_via: [],
  enrollable_groups: [],
};

const onRefresh = jest.fn();

const renderPanel = (over: Partial<JourneyDetail> = {}) =>
  render(<JourneyEnrollmentPanel journey={{ ...BASE, ...over }} onRefresh={onRefresh} />);

beforeEach(() => {
  jest.clearAllMocks();
  enrollSelf.mockResolvedValue({ enrollment_id: 'e1' });
  enrollGroup.mockResolvedValue({ enrollment_id: 'e2' });
  withdrawEnrollment.mockResolvedValue({ withdrawn: true });
});

describe('STORY-3 — start a journey myself', () => {
  it('offers Start when not individually enrolled; success re-reads (no optimistic flip)', async () => {
    renderPanel();
    const btn = screen.getByTestId('enroll-self');
    fireEvent.click(btn);
    // B5: busy feedback on the pressed affordance, no double-submit.
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(enrollSelf).toHaveBeenCalledTimes(1);
    expect(enrollSelf).toHaveBeenCalledWith('j1');
  });

  it('surfaces a refusal honestly and keeps last-read truth', async () => {
    enrollSelf.mockRejectedValue(Object.assign(new Error('already enrolled in this journey'), { status: 409 }));
    renderPanel();
    fireEvent.click(screen.getByTestId('enroll-self'));
    await waitFor(() => expect(screen.getByTestId('inline-error').textContent).toContain('already enrolled'));
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('enroll-self')).toBeTruthy(); // affordance unchanged
  });

  it('offers no Start when individually enrolled — the enrolled state renders instead', () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'active' },
    });
    expect(screen.queryByTestId('enroll-self')).toBeNull();
    expect(screen.getByTestId('enrolled-individually')).toBeTruthy();
  });
});

describe('STORY-4 — the wielding walk', () => {
  const twoGroups = [
    { group_id: 'g1', group_name: 'Alpha Party' },
    { group_id: 'g2', group_name: 'Beta Party' },
  ];

  it('offers exactly the payload groups in the picker — never a client-computed list', () => {
    renderPanel({ enrollable_groups: twoGroups });
    fireEvent.click(screen.getByTestId('enroll-group-open'));
    const options = screen.getAllByTestId('enroll-group-option');
    expect(options.map((o) => o.textContent)).toEqual(['Alpha Party', 'Beta Party']);
  });

  it('renders NO group affordance when enrollable_groups is empty (absence, not a disabled tease)', () => {
    renderPanel();
    expect(screen.queryByTestId('enroll-group-open')).toBeNull();
  });

  it('confirm names the group; confirming calls the contract and re-reads', async () => {
    renderPanel({ enrollable_groups: twoGroups });
    fireEvent.click(screen.getByTestId('enroll-group-open'));
    fireEvent.click(screen.getAllByTestId('enroll-group-option')[0]);
    const modal = screen.getByTestId('confirm-modal');
    expect(modal.textContent).toContain('Alpha Party');
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(enrollGroup).toHaveBeenCalledWith('j1', 'g1');
  });

  it('surfaces a group-enrol refusal honestly; no partial UI pretends success', async () => {
    enrollGroup.mockRejectedValue(Object.assign(new Error('group already enrolled in this journey'), { status: 409 }));
    renderPanel({ enrollable_groups: twoGroups });
    fireEvent.click(screen.getByTestId('enroll-group-open'));
    fireEvent.click(screen.getAllByTestId('enroll-group-option')[1]);
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(screen.getByTestId('inline-error').textContent).toContain('already enrolled'));
    expect(onRefresh).not.toHaveBeenCalled();
  });
});

describe('STORY-5 — withdraw deliberately', () => {
  it('withdraws an own enrolment behind the destructive ConfirmModal', async () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'active' },
    });
    fireEvent.click(screen.getByTestId('withdraw-self'));
    expect(screen.getByTestId('confirm-modal')).toBeTruthy();
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(withdrawEnrollment).toHaveBeenCalledWith('j1', 'e9');
  });

  it('offers group Withdraw only where the payload grants it; confirm names the group', async () => {
    renderPanel({
      enrolled_via: [
        { group_id: 'g1', group_name: 'Alpha Party', enrollment_id: 'ge1', status: 'active', can_withdraw: true },
        { group_id: 'g2', group_name: 'Beta Party', enrollment_id: 'ge2', status: 'active', can_withdraw: false },
      ],
    });
    const withdraws = screen.getAllByTestId('withdraw-group');
    expect(withdraws).toHaveLength(1);
    fireEvent.click(withdraws[0]);
    expect(screen.getByTestId('confirm-modal').textContent).toContain('Alpha Party');
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(withdrawEnrollment).toHaveBeenCalledWith('j1', 'ge1'));
  });

  it('renders NO withdraw affordance on a frozen enrolment (per the payload, never client-guessed)', () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'frozen' },
      enrolled_via: [
        { group_id: 'g1', group_name: 'Alpha Party', enrollment_id: 'ge1', status: 'frozen', can_withdraw: true },
      ],
    });
    expect(screen.queryByTestId('withdraw-self')).toBeNull();
    expect(screen.queryByTestId('withdraw-group')).toBeNull();
    expect(screen.getAllByTestId('frozen-state').length).toBeGreaterThan(0);
  });
});

describe('FEAT-H020 — Continue deep-links into the player (additive touch)', () => {
  it('offers Continue on an active own enrolment, deep-linking the player with ?enrollment', () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'active' },
    });
    const link = screen.getByTestId('continue-individual');
    expect(link.getAttribute('href')).toBe('/journeys/j1/play?enrollment=e9');
  });

  it('offers Continue on each active via-group enrolment, deep-linking each', () => {
    renderPanel({
      enrolled_via: [
        { group_id: 'g1', group_name: 'Alpha Party', enrollment_id: 'ge1', status: 'active', can_withdraw: true },
        { group_id: 'g2', group_name: 'Beta Party', enrollment_id: 'ge2', status: 'active', can_withdraw: false },
      ],
    });
    const links = screen.getAllByTestId('continue-via');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/journeys/j1/play?enrollment=ge1',
      '/journeys/j1/play?enrollment=ge2',
    ]);
  });

  it('offers NO Continue on a frozen enrolment (no active affordance to resume)', () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'frozen' },
      enrolled_via: [
        { group_id: 'g1', group_name: 'Alpha Party', enrollment_id: 'ge1', status: 'frozen', can_withdraw: true },
      ],
    });
    expect(screen.queryByTestId('continue-individual')).toBeNull();
    expect(screen.queryByTestId('continue-via')).toBeNull();
  });
});

describe('FEAT-H021 STORY-4 — Review where active offers Continue (detail panel)', () => {
  it('offers Review on a completed own enrolment, deep-linking the player (?enrollment preserved), swapping out Continue', () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'completed' },
    });
    const link = screen.getByTestId('review-individual');
    expect(link.getAttribute('href')).toBe('/journeys/j1/play?enrollment=e9');
    // Swap on status — never both.
    expect(screen.queryByTestId('continue-individual')).toBeNull();
  });

  it('offers no Review affordance for a withdrawn journey (re-enrolment is the only door — Start renders)', () => {
    // A withdrawn journey reads as not-individually-enrolled: the Start door, no Review.
    renderPanel({ is_enrolled_individually: false, individual_enrollment: null });
    expect(screen.queryByTestId('review-individual')).toBeNull();
    expect(screen.getByTestId('enroll-self')).toBeTruthy();
  });
});

describe('FEAT-H022 STORY-1 — View opens the read-only frozen walk (detail panel)', () => {
  it('offers View on a frozen own enrolment, deep-linked — never Continue or Review', () => {
    renderPanel({
      is_enrolled_individually: true,
      individual_enrollment: { enrollment_id: 'e9', status: 'frozen' },
    });
    const link = screen.getByTestId('view-individual');
    expect(link.getAttribute('href')).toBe('/journeys/j1/play?enrollment=e9');
    expect(screen.queryByTestId('continue-individual')).toBeNull();
    expect(screen.queryByTestId('review-individual')).toBeNull();
    // The held-state note stays (no withdraw here) — View is the read-only door.
    expect(screen.getAllByTestId('frozen-state').length).toBeGreaterThan(0);
  });

  it('offers View on each frozen via-group enrolment, deep-linked', () => {
    renderPanel({
      enrolled_via: [
        { group_id: 'g1', group_name: 'Alpha Party', enrollment_id: 'ge1', status: 'frozen', can_withdraw: false },
      ],
    });
    const links = screen.getAllByTestId('view-via');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/journeys/j1/play?enrollment=ge1');
    expect(links[0].textContent).toContain('Alpha Party');
  });
});

describe('STORY-8 — pause / resume my walk (TASK-JRN-PAUSE-01)', () => {
  const OWN_ACTIVE: Partial<JourneyDetail> = {
    is_enrolled_individually: true,
    individual_enrollment: { enrollment_id: 'e1', status: 'active' },
  };
  const OWN_PAUSED: Partial<JourneyDetail> = {
    is_enrolled_individually: true,
    individual_enrollment: { enrollment_id: 'e1', status: 'paused' },
  };

  beforeEach(() => {
    pauseEnrollment.mockResolvedValue({ enrollment_id: 'e1', journey_id: 'j1', status: 'paused' });
    resumeEnrollment.mockResolvedValue({ enrollment_id: 'e1', journey_id: 'j1', status: 'active' });
  });

  it('offers Pause on an active own enrolment — pressing it calls the transport at once (no ConfirmModal) and re-reads', async () => {
    renderPanel(OWN_ACTIVE);
    expect(screen.queryByTestId('resume-self')).toBeNull();
    expect(screen.queryByTestId('paused-state')).toBeNull();
    fireEvent.click(screen.getByTestId('pause-self'));
    expect(pauseEnrollment).toHaveBeenCalledWith('j1', 'e1');
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it('reads "(paused)" with Resume in place of Continue on a paused own enrolment — no Pause, no Continue', () => {
    renderPanel(OWN_PAUSED);
    expect(screen.getByTestId('paused-state').textContent?.toLowerCase()).toContain('paused');
    expect(screen.getByTestId('resume-self')).toBeTruthy();
    expect(screen.queryByTestId('pause-self')).toBeNull();
    expect(screen.queryByTestId('continue-individual')).toBeNull();
  });

  it('Resume calls the transport at once and re-reads; Continue returns from the payload, never a client flip', async () => {
    renderPanel(OWN_PAUSED);
    fireEvent.click(screen.getByTestId('resume-self'));
    expect(resumeEnrollment).toHaveBeenCalledWith('j1', 'e1');
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    // Still the last-read (paused) truth until the parent re-reads — no optimistic flip.
    expect(screen.queryByTestId('continue-individual')).toBeNull();
  });

  it('surfaces a refusal honestly and keeps last-read truth', async () => {
    pauseEnrollment.mockRejectedValue(new JourneysApiError('enrollment is frozen', 409));
    renderPanel(OWN_ACTIVE);
    fireEvent.click(screen.getByTestId('pause-self'));
    await waitFor(() => expect(screen.getByText('enrollment is frozen')).toBeTruthy());
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('pause-self')).toBeTruthy();
  });

  it('offers no Pause on a via-group enrolment — own rows only (the contract refuses the rest)', () => {
    renderPanel({
      enrolled_via: [
        { group_id: 'g1', group_name: 'Alpha Party', enrollment_id: 'ge1', status: 'active', can_withdraw: true },
      ],
    });
    expect(screen.queryByTestId('pause-self')).toBeNull();
    expect(screen.queryByTestId('resume-self')).toBeNull();
  });
});
