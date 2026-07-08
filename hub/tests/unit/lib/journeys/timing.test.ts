import { describe, it, expect } from '@jest/globals';
import type { PlayerTiming } from '@/lib/journeys/player';
import { formatEngagementTime, formatCalendarSpan, stepSeconds } from '@/lib/journeys/timing';

/**
 * FEAT-H021 STORY-3 (JRN-11, unit) — the coarse, own-data time formatting over the
 * FEAT-PD004 `timing` block. Own data only, never re-derived from instances; coarse
 * grade (minutes; h:mm above an hour); an honest em-dash for no accrued time (never
 * "0 min", never a fabricated value); engagement time and the enrolled→completed
 * calendar span are distinct numbers, never conflated (invariant 8 — no comparison).
 *
 * Red-first for TASK-JC-04 (fails until @/lib/journeys/timing exists).
 */

describe('formatEngagementTime — coarse, honest, never zero', () => {
  it('renders an em-dash for no accrued time (null / undefined / zero) — never "0 min"', () => {
    expect(formatEngagementTime(null)).toBe('—');
    expect(formatEngagementTime(undefined)).toBe('—');
    expect(formatEngagementTime(0)).toBe('—');
  });

  it('rounds sub-hour durations to whole minutes (minute-grade), floor of one minute', () => {
    expect(formatEngagementTime(30)).toBe('1 min'); // < 1 min still reads as a minute
    expect(formatEngagementTime(60)).toBe('1 min');
    expect(formatEngagementTime(90)).toBe('2 min'); // rounds
    expect(formatEngagementTime(600)).toBe('10 min');
    expect(formatEngagementTime(1500)).toBe('25 min');
  });

  it('renders h:mm above an hour, minutes zero-padded, never a :60 carry', () => {
    expect(formatEngagementTime(3600)).toBe('1:00 h');
    expect(formatEngagementTime(5400)).toBe('1:30 h');
    expect(formatEngagementTime(7260)).toBe('2:01 h');
    expect(formatEngagementTime(7199)).toBe('2:00 h'); // 119.98 min rounds to 120 -> 2:00, not 1:60
  });
});

describe('formatCalendarSpan — the enrolled→completed span, distinct from engagement time', () => {
  it('is null when either bound is missing (an in-progress via-group walk has no completed_at)', () => {
    expect(formatCalendarSpan(null, '2026-07-08T00:00:00+00:00')).toBeNull();
    expect(formatCalendarSpan('2026-07-08T00:00:00+00:00', null)).toBeNull();
    expect(formatCalendarSpan(undefined, undefined)).toBeNull();
  });

  it('reads whole days at day-grade, one/plural aware', () => {
    expect(formatCalendarSpan('2026-07-06T09:00:00+00:00', '2026-07-08T10:00:00+00:00')).toBe('2 days');
    expect(formatCalendarSpan('2026-07-07T09:00:00+00:00', '2026-07-08T10:00:00+00:00')).toBe('1 day');
  });

  it('falls to the coarse sub-day grade for same-day spans, and is null for a negative span', () => {
    expect(formatCalendarSpan('2026-07-08T09:00:00+00:00', '2026-07-08T10:00:00+00:00')).toBe('1:00 h');
    expect(formatCalendarSpan('2026-07-08T10:00:00+00:00', '2026-07-08T09:00:00+00:00')).toBeNull();
  });
});

describe('stepSeconds — the per-step lookup over the timing block, own data only', () => {
  const timing: PlayerTiming = {
    per_step: [
      { step_id: 's1', seconds: 600 },
      { step_id: 's3', seconds: 0 },
    ],
    total_seconds: 600,
    wall_clock: { enrolled_at: '2026-07-08T09:00:00+00:00', completed_at: null },
  };

  it('returns the platform seconds for a step with an entry', () => {
    expect(stepSeconds(timing, 's1')).toBe(600);
  });

  it('returns null for a step with no entry (only an open engagement, or none)', () => {
    expect(stepSeconds(timing, 's2')).toBeNull();
    expect(stepSeconds(undefined, 's1')).toBeNull();
  });

  it('surfaces a zero-second entry as its own value (the surface formats it to an em-dash)', () => {
    expect(stepSeconds(timing, 's3')).toBe(0);
  });
});
