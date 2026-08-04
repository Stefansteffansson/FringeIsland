import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H040 — outer-ring wrappers for the FEAT-PC025 role-template editing
 * contracts (ADM-17 within RB-4). Server-side only; client injected
 * ('import type' discipline). The platform owns every rule — the admin wall
 * (is_platform_admin inside each RPC), seed immutability (P0001), name
 * validation (22023), the protected-set guard — these wrappers police
 * nothing; the BFF routes map SQLSTATEs to HTTP and the surface renders
 * refusals verbatim.
 */

export type AdminRoleTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  default_version_number: number | null;
  version_count: number;
  group_template_refs: string[];
  instantiated_role_count: number;
};

export type AdminCatalogEntry = {
  name: string;
  category: string;
  description: string | null;
  is_protected: boolean;
};

export type AdminRolesPayload = {
  templates: AdminRoleTemplateRow[];
  catalog: AdminCatalogEntry[];
  generated_at: string;
};

export type AdminRoleTemplateVersion = {
  id: string;
  version_number: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by_display_name: string | null;
  permission_names: string[];
  is_default: boolean;
};

export type AdminRoleTemplateDetailPayload = {
  template: {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    // Composed into the detail response by the BFF from the list read — the
    // blast-radius facts the Apply ceremony renders (payload facts, never
    // client-computed platform state).
    instantiated_role_count: number;
    group_template_refs: string[];
  };
  versions: AdminRoleTemplateVersion[];
  catalog: AdminCatalogEntry[];
  generated_at: string;
};

export class AdminRolesError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const call = async (
  client: SupabaseClient,
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: unknown; refused: boolean }> => {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    if (error.code === '42501') return { data: null, refused: true };
    throw new AdminRolesError(error.code ?? 'unknown', error.message ?? 'unknown error');
  }
  return { data, refused: false };
};

export async function fetchRoleTemplates(
  client: SupabaseClient,
): Promise<{ payload: AdminRolesPayload | null; refused: boolean }> {
  const { data, refused } = await call(client, 'admin_get_role_templates');
  return { payload: (data as AdminRolesPayload) ?? null, refused };
}

export async function fetchRoleTemplateDetail(
  client: SupabaseClient,
  templateId: string,
): Promise<{
  payload: Omit<AdminRoleTemplateDetailPayload, 'template'> & {
    template: Omit<
      AdminRoleTemplateDetailPayload['template'],
      'instantiated_role_count' | 'group_template_refs'
    >;
  } | null;
  refused: boolean;
}> {
  const { data, refused } = await call(client, 'admin_get_role_template_detail', {
    p_template_id: templateId,
  });
  return {
    payload: (data as Awaited<ReturnType<typeof fetchRoleTemplateDetail>>['payload']) ?? null,
    refused,
  };
}

export async function cloneRoleTemplate(
  client: SupabaseClient,
  sourceId: string,
  name: string,
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_clone_role_template', {
    p_source_id: sourceId,
    p_name: name,
  });
  return { refused };
}

export async function createRoleTemplateVersion(
  client: SupabaseClient,
  templateId: string,
  input: { name: string; description: string | null; permission_names: string[] },
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_create_role_template_version', {
    p_template_id: templateId,
    p_name: input.name,
    p_description: input.description,
    p_permission_names: input.permission_names,
  });
  return { refused };
}

export async function setRoleTemplateDefaultVersion(
  client: SupabaseClient,
  templateId: string,
  versionId: string,
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_set_role_template_default_version', {
    p_template_id: templateId,
    p_version_id: versionId,
  });
  return { refused };
}
