import { describe, it, expect } from '@jest/globals';
import {
  availableRoleState,
  versionMovement,
  adoptedVersionLabel,
} from '@/lib/groups/available-roles';
import type { RoleTemplateOption } from '@/lib/groups/queries';

/**
 * RD-B FEAT-H044 STORY-1 (unit) — the three-state render logic.
 *
 * `get_available_role_templates` carries adoption state on every entry
 * precisely so the surface renders not-adopted / current / behind from ONE
 * read (the payload walk's first finding). This is that decision, isolated
 * from JSX so it can be pinned exhaustively — the pyramid-upright obligation
 * the task names.
 *
 * Red-first for TASK-RDB-03.
 */
const entry = (over: Partial<RoleTemplateOption> = {}): RoleTemplateOption => ({
  id: 'tmpl-1',
  name: 'Guide Role Template',
  description: null,
  adopted_group_role_id: null,
  adopted_version_number: null,
  current_version_number: 3,
  ...over,
});

describe('FEAT-H044 STORY-1 — availableRoleState', () => {
  it('is not-adopted when the group holds no copy', () => {
    expect(availableRoleState(entry())).toBe('not-adopted');
  });

  it('is current when the copy sits on the version the catalogue serves', () => {
    expect(
      availableRoleState(
        entry({ adopted_group_role_id: 'role-1', adopted_version_number: 3, current_version_number: 3 }),
      ),
    ).toBe('current');
  });

  it('is behind when the catalogue has moved on', () => {
    expect(
      availableRoleState(
        entry({ adopted_group_role_id: 'role-1', adopted_version_number: 1, current_version_number: 3 }),
      ),
    ).toBe('behind');
  });

  it('is behind — not current — when the provenance is honestly unknown (RD-10)', () => {
    // The whole point of RD-10: a null version blocks the LABEL, never the
    // comparison. The diff is computed from grants, so the update is still
    // offerable and withholding it would strand the copy forever.
    expect(
      availableRoleState(
        entry({
          adopted_group_role_id: 'role-1',
          adopted_version_number: null,
          current_version_number: 3,
        }),
      ),
    ).toBe('behind');
  });

  it('is behind when the copy is AHEAD of the catalogue default', () => {
    // A rolled-back default. The sets still differ, so applying is a real act
    // with a real diff; calling this "current" would hide a divergence the
    // provenance line is already showing.
    expect(
      availableRoleState(
        entry({ adopted_group_role_id: 'role-1', adopted_version_number: 5, current_version_number: 2 }),
      ),
    ).toBe('behind');
  });

  it('is current when the catalogue itself has no default version to move to', () => {
    // Nothing to offer: a diff against no version is not computable, so the
    // honest render is "no action" rather than a Review update that refuses.
    expect(
      availableRoleState(
        entry({
          adopted_group_role_id: 'role-1',
          adopted_version_number: 2,
          current_version_number: null,
        }),
      ),
    ).toBe('current');
  });
});

describe('FEAT-H044 STORY-1 — the version labels', () => {
  it('names the movement for a behind copy', () => {
    expect(
      versionMovement(
        entry({ adopted_group_role_id: 'role-1', adopted_version_number: 1, current_version_number: 3 }),
      ),
    ).toBe('v1 → v3');
  });

  it('names the movement from an unknown version without inventing one', () => {
    expect(
      versionMovement(
        entry({
          adopted_group_role_id: 'role-1',
          adopted_version_number: null,
          current_version_number: 3,
        }),
      ),
    ).toBe('version unknown → v3');
  });

  it('reads "version unknown" as the adopted label where provenance is null', () => {
    expect(adoptedVersionLabel(null)).toBe('version unknown');
    expect(adoptedVersionLabel(4)).toBe('v4');
  });

  it('has no movement to name when nothing is adopted', () => {
    expect(versionMovement(entry())).toBe('');
  });
});
