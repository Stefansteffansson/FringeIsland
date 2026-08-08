import { describe, it, expect } from '@jest/globals';
import { notificationTarget } from '@/lib/notifications/client';

/**
 * RD-B walk fix W-1 — the roles notices point at the roles panel.
 *
 * Found live 2026-08-08 (S7): clicking *"a role is now available to copy into
 * your group"* landed the member at the TOP of the group page, with the roles
 * panel seventh section down and its available-roles section collapsed inside
 * it. Told a role was available, they arrived somewhere showing no roles.
 *
 * FEAT-H044 STORY-4's AC says the notice *"links into that group's roles
 * panel"*. It linked to the group. This is the difference.
 *
 * Red-first for the walk-fix batch.
 */
const row = (kind: string, group_id: string | null = 'grp-1') => ({ kind, group_id });

describe('FEAT-H044 W-1 — notificationTarget for the three roles kinds', () => {
  it.each([
    'role_template_published',
    'role_template_updated',
    'role_template_retired',
  ])('%s carries the roles focus hint', (kind) => {
    expect(notificationTarget(row(kind))).toBe('/groups/grp-1?focus=roles');
  });

  it('leaves every other group-addressed kind on the plain group path', () => {
    // The fallback must not become "everything focuses roles" — a membership
    // notice still lands on the group itself.
    expect(notificationTarget(row('member_added'))).toBe('/groups/grp-1');
    expect(notificationTarget(row('group_suspended'))).toBe('/groups/grp-1');
  });

  it('keeps the answerable kinds on their answer path', () => {
    // ANSWER_PATHS wins: an invitation is answered on /groups, not in a group.
    expect(notificationTarget(row('invitation_received'))).toBe('/groups?focus=invitations');
  });

  it('returns null when there is no group to point at', () => {
    // A roles kind without a group_id cannot be focused anywhere — it must not
    // synthesise "/groups/null?focus=roles".
    expect(notificationTarget(row('role_template_published', null))).toBeNull();
  });
});
