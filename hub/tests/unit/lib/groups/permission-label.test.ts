import { describe, it, expect } from '@jest/globals';
import { permissionLabel, permissionLabels } from '@/lib/groups/permission-label';

/**
 * RD-B FEAT-H044 STORY-2 (unit) — permission display names.
 *
 * The substrate has no display-name column: `public.permissions` is
 * `(id, name, description, category, created_at)` and `get_role_copy_diff`
 * returns `p.name`, the internal key. STORY-2's acceptance criterion demands
 * display names, so the mapping is presentation and lives Surface-side
 * (ADR-U038 permits presentation mapping in the Surface; it is not a rule).
 *
 * This is deliberately a pure formatter with no table of hand-written labels:
 * a hardcoded map would silently render the raw key for every permission
 * added after it was written — the open-registry failure NotificationItem's
 * icon map already taught. Humanising the key is total by construction.
 *
 * Red-first for TASK-RDB-03.
 */
describe('FEAT-H044 — permissionLabel', () => {
  it('humanises a snake_case key into sentence case', () => {
    expect(permissionLabel('manage_roles')).toBe('Manage roles');
    expect(permissionLabel('assign_roles')).toBe('Assign roles');
    expect(permissionLabel('view_member_list')).toBe('View member list');
  });

  it('handles a single-word key', () => {
    expect(permissionLabel('moderate')).toBe('Moderate');
  });

  it('is total — an unknown key added after this code shipped still reads as words', () => {
    // The open-registry guarantee: no lookup table, so a permission seeded
    // tomorrow renders as a label today rather than falling back to the key.
    expect(permissionLabel('some_future_permission_key')).toBe('Some future permission key');
  });

  it('leaves an already-humanised value alone rather than mangling it', () => {
    expect(permissionLabel('Manage roles')).toBe('Manage roles');
  });

  it('returns an empty string unchanged instead of throwing', () => {
    expect(permissionLabel('')).toBe('');
  });

  it('maps a list in order, preserving the contract’s sort', () => {
    expect(permissionLabels(['assign_roles', 'manage_roles'])).toEqual([
      'Assign roles',
      'Manage roles',
    ]);
  });

  it('tolerates a null or undefined list as an empty list', () => {
    expect(permissionLabels(null)).toEqual([]);
    expect(permissionLabels(undefined)).toEqual([]);
  });
});
