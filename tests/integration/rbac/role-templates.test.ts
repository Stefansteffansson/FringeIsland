/**
 * Integration Tests: RBAC - Role Template Permissions
 *
 * Tests: B-RBAC-004: Role Template Permission Mapping
 *        B-RBAC-007: Role Renaming (Steward/Guide Terminology)
 *
 * Verifies that role templates are renamed (Steward, Guide) and connected
 * to their default permission sets via role_template_permissions.
 *
 * These tests MUST FAIL initially (RED) — templates aren't renamed and
 * role_template_permissions is empty.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createAdminClient } from '@/tests/helpers/supabase';

describe('B-RBAC-004 + B-RBAC-007: Role Template Permissions & Renaming', () => {
  const admin = createAdminClient();

  // --- B-RBAC-007: Role Renaming ---

  describe('B-RBAC-007: Role Template Renaming', () => {
    it('should have exactly 4 role templates', async () => {
      const { data, error } = await admin
        .from('role_templates')
        .select('id');

      expect(error).toBeNull();
      expect(data).toHaveLength(4);
    });

    it('should have renamed "Group Leader Role Template" to "Steward Role Template"', async () => {
      const { data: oldName } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Group Leader Role Template');

      const { data: newName } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Steward Role Template');

      expect(oldName).toHaveLength(0); // Old name gone
      expect(newName).toHaveLength(1); // New name exists
    });

    it('should have renamed "Travel Guide Role Template" to "Guide Role Template"', async () => {
      const { data: oldName } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Travel Guide Role Template');

      const { data: newName } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Guide Role Template');

      expect(oldName).toHaveLength(0); // Old name gone
      expect(newName).toHaveLength(1); // New name exists
    });

    it('should have removed "Platform Admin Role Template"', async () => {
      const { data } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Platform Admin Role Template');

      expect(data).toHaveLength(0);
    });

    it('should still have Member and Observer templates', async () => {
      const { data: member } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Member Role Template');

      const { data: observer } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Observer Role Template');

      expect(member).toHaveLength(1);
      expect(observer).toHaveLength(1);
    });
  });

  // --- B-RBAC-004: Template Permission Mapping ---

  describe('B-RBAC-004: Template Permission Mapping', () => {
    it('should have role_template_permissions populated (not empty)', async () => {
      const { data, error } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id');

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('should have 58 total role_template_permissions rows', async () => {
      const { data, error } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id');

      expect(error).toBeNull();
      // Steward: 25 + Guide: 14 + Member: 12 + Observer: 7 = 58
      expect(data).toHaveLength(58);
    });

    it('should map 25 permissions to the Steward template', async () => {
      const { data: template } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Steward Role Template')
        .single();

      if (!template) {
        // Template doesn't exist yet (expected in RED phase)
        expect(template).not.toBeNull();
        return;
      }

      const { data, error } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', template.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(25);
    });

    it('should map 14 permissions to the Guide template', async () => {
      const { data: template } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Guide Role Template')
        .single();

      if (!template) {
        expect(template).not.toBeNull();
        return;
      }

      const { data, error } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', template.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(14);
    });

    it('should map 12 permissions to the Member template', async () => {
      const { data: template } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Member Role Template')
        .single();

      if (!template) {
        expect(template).not.toBeNull();
        return;
      }

      const { data, error } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', template.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(12);
    });

    it('should map 7 permissions to the Observer template', async () => {
      const { data: template } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Observer Role Template')
        .single();

      if (!template) {
        expect(template).not.toBeNull();
        return;
      }

      const { data, error } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', template.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(7);
    });

    it('should give Steward invite_members but not Guide', async () => {
      const { data: steward } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Steward Role Template')
        .single();

      const { data: guide } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Guide Role Template')
        .single();

      if (!steward || !guide) {
        expect(steward).not.toBeNull();
        return;
      }

      const { data: invitePerm } = await admin
        .from('permissions')
        .select('id')
        .eq('name', 'invite_members')
        .single();

      if (!invitePerm) {
        expect(invitePerm).not.toBeNull();
        return;
      }

      // Steward should have invite_members
      const { data: stewardHas } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', steward.id)
        .eq('permission_id', invitePerm.id);

      expect(stewardHas).toHaveLength(1);

      // Guide should NOT have invite_members
      const { data: guideHas } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', guide.id)
        .eq('permission_id', invitePerm.id);

      expect(guideHas).toHaveLength(0);
    });

    it('should give Member post_forum_messages but not Observer', async () => {
      const { data: memberTemplate } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Member Role Template')
        .single();

      const { data: observerTemplate } = await admin
        .from('role_templates')
        .select('id')
        .eq('name', 'Observer Role Template')
        .single();

      if (!memberTemplate || !observerTemplate) {
        expect(memberTemplate).not.toBeNull();
        return;
      }

      const { data: postPerm } = await admin
        .from('permissions')
        .select('id')
        .eq('name', 'post_forum_messages')
        .single();

      if (!postPerm) {
        expect(postPerm).not.toBeNull();
        return;
      }

      // Member should have post_forum_messages
      const { data: memberHas } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', memberTemplate.id)
        .eq('permission_id', postPerm.id);

      expect(memberHas).toHaveLength(1);

      // Observer should NOT
      const { data: observerHas } = await admin
        .from('role_template_permissions')
        .select('role_template_id, permission_id')
        .eq('role_template_id', observerTemplate.id)
        .eq('permission_id', postPerm.id);

      expect(observerHas).toHaveLength(0);
    });
  });
});
