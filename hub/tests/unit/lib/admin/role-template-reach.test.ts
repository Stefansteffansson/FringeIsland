import { describe, it, expect } from '@jest/globals';
import {
  reachSummary,
  namedPublications,
  isPlatformWide,
  publishBlockedReason,
} from '@/lib/admin/role-template-reach';
import type { RoleTemplatePublication } from '@/lib/admin/roles';

/**
 * RD-B FEAT-H044 STORY-3 (unit) — the admin reach statement.
 *
 * "Current reach in words" is a rendering decision over publication rows, so
 * it is pinned here rather than only through the component: a NULL group_id is
 * platform-wide (RD-8), and the difference between "all groups" and "3 groups"
 * is the difference between two very different administrative acts.
 *
 * Red-first for TASK-RDB-03.
 */
const pub = (over: Partial<RoleTemplatePublication> = {}): RoleTemplatePublication => ({
  group_id: 'grp-1',
  group_name: 'Willow Circle',
  published_at: '2026-08-01T10:00:00+00:00',
  ...over,
});

describe('FEAT-H044 STORY-3 — reachSummary', () => {
  it('says Not published for empty reach', () => {
    expect(reachSummary([])).toBe('Not published');
  });

  it('says Published to all groups when a platform-wide row exists', () => {
    expect(reachSummary([pub({ group_id: null, group_name: null })])).toBe(
      'Published to all groups',
    );
  });

  it('lets platform-wide win even when named rows also exist', () => {
    // Both can coexist — publishing platform-wide does not delete targeted
    // rows (RDB-6 keeps reach as data). The broadest reach is the true one.
    expect(
      reachSummary([pub({ group_id: null, group_name: null }), pub(), pub({ group_id: 'grp-2' })]),
    ).toBe('Published to all groups');
  });

  it('counts named groups, singular and plural', () => {
    expect(reachSummary([pub()])).toBe('Published to 1 group');
    expect(reachSummary([pub(), pub({ group_id: 'grp-2' }), pub({ group_id: 'grp-3' })])).toBe(
      'Published to 3 groups',
    );
  });

  it('tolerates a missing publications key as empty reach', () => {
    // Defensive: the corrective widening is what supplies this key. A surface
    // that crashed on its absence would take the whole admin page down.
    expect(reachSummary(undefined)).toBe('Not published');
    expect(reachSummary(null)).toBe('Not published');
  });
});

describe('FEAT-H044 STORY-3 — the reach list', () => {
  it('lists only the named groups, never the platform-wide row', () => {
    const rows = namedPublications([
      pub({ group_id: null, group_name: null }),
      pub(),
      pub({ group_id: 'grp-2', group_name: 'Harbour Crew' }),
    ]);
    expect(rows.map((r) => r.group_name)).toEqual(['Willow Circle', 'Harbour Crew']);
  });

  it('detects platform-wide reach', () => {
    expect(isPlatformWide([pub({ group_id: null, group_name: null })])).toBe(true);
    expect(isPlatformWide([pub()])).toBe(false);
    expect(isPlatformWide([])).toBe(false);
  });
});

describe('FEAT-H044 STORY-3 — when publishing is unavailable', () => {
  it('gives no reason for an ordinary template', () => {
    expect(publishBlockedReason({ is_system: false, retired_at: null })).toBeNull();
  });

  it('states why a retired template cannot be published', () => {
    // The surface says WHY rather than silently omitting the button — the
    // catalogue has stopped offering it, and unretiring is the way back.
    const reason = publishBlockedReason({ is_system: false, retired_at: '2026-08-05T00:00:00+00:00' });
    expect(reason).toMatch(/retired/i);
    expect(reason).toMatch(/no longer offered|stopped offering/i);
  });

  it('treats a system template as having no reach at all, not a blocked one', () => {
    // System roles are the floor every group is built on and are not
    // distributed — the section is absent, so there is nothing to explain.
    expect(publishBlockedReason({ is_system: true, retired_at: null })).toBeNull();
  });
});
