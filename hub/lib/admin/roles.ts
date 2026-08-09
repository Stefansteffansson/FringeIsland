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
  /**
   * RD-A FEAT-PC027 STORY-3: when the catalogue stopped OFFERING this
   * template. Null = still offered. The admin plane lists retired templates
   * explicitly rather than hiding them — retirement is a state to see and
   * reverse, not a disappearance.
   */
  retired_at: string | null;
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

/**
 * RD-B FEAT-PC028 (corrective) — one row of a template's reach.
 *
 * `group_id` NULL is the platform-wide row (RD-8), and `group_name` is NULL
 * with it by construction: the platform states reach as data and leaves the
 * words ("all groups") to the surface.
 */
export type RoleTemplatePublication = {
  group_id: string | null;
  group_name: string | null;
  published_at: string;
};

export type AdminRoleTemplateDetailPayload = {
  template: {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    /**
     * RD-B FEAT-PC028 (corrective): retirement state on the DETAIL read.
     * RD-A put it on the list read only, so the detail page could not tell
     * whether publishing was available. Present whether retired or not.
     */
    retired_at: string | null;
    // Composed into the detail response by the BFF from the list read — the
    // blast-radius facts the Apply ceremony renders (payload facts, never
    // client-computed platform state).
    instantiated_role_count: number;
    group_template_refs: string[];
  };
  versions: AdminRoleTemplateVersion[];
  /**
   * RD-B FEAT-PC028 (corrective): the reach FEAT-H044 STORY-3 renders. The
   * widening PC028's payload walk committed to and its migration omitted —
   * added rather than introducing a fourth read, which was the walk's whole
   * point (the `get_journey_detail` lesson: a surface reading from a sibling
   * feature's payload is where the walk earns its keep).
   */
  publications: RoleTemplatePublication[];
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

/**
 * RD-A FEAT-PC027 STORY-3 — stop offering a template, or offer it again.
 *
 * Offerability only: the platform guarantees no group, copy, holder or version
 * row is touched (RD-2/RD-4), and refuses system templates outright. These
 * wrappers police nothing — they shape the call and rethrow the
 * SQLSTATE-carrying error for the route to map.
 */
export async function retireRoleTemplate(
  client: SupabaseClient,
  templateId: string,
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_retire_role_template', {
    p_role_template_id: templateId,
  });
  return { refused };
}

export async function unretireRoleTemplate(
  client: SupabaseClient,
  templateId: string,
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_unretire_role_template', {
    p_role_template_id: templateId,
  });
  return { refused };
}

/** RD-B walk fix W-6 — how far a publish would reach, before it is made. */
export type PublicationReachPreview = {
  group_count: number;
  recipient_count: number;
  notice_count: number;
};

/**
 * RD-B walk fix W-6 — preview a publish's blast radius.
 *
 * Read-only and admin-gated. `groupIds === null` previews platform-wide,
 * matching `publishRoleTemplate`'s own semantics, so the surface can preview
 * exactly the act it is about to offer.
 */
export async function previewPublicationReach(
  client: SupabaseClient,
  templateId: string,
  groupIds: string[] | null,
): Promise<{ preview: PublicationReachPreview | null; refused: boolean }> {
  const { data, refused } = await call(client, 'admin_preview_publication_reach', {
    p_role_template_id: templateId,
    p_group_ids: groupIds,
  });
  return { preview: (data as PublicationReachPreview) ?? null, refused };
}

/**
 * RD-B FEAT-H044 STORY-3 / FEAT-PC028 STORY-1 — publish OFFERS a template.
 *
 * `groupIds === null` is platform-wide; a list targets those groups. Publish
 * never reaches into a group (RD-2) — adoption stays the Steward's act in the
 * roles panel, so this is purely a change to who is offered what.
 */
export async function publishRoleTemplate(
  client: SupabaseClient,
  templateId: string,
  groupIds: string[] | null,
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_publish_role_template', {
    p_role_template_id: templateId,
    p_group_ids: groupIds,
  });
  return { refused };
}

/**
 * RD-B FEAT-H044 STORY-3 / FEAT-PC028 STORY-1 — withdraw an offer.
 *
 * Copies already adopted are untouched and keep working (RD-2). Unpublish
 * removes the offer, never the role — the surface states this where the
 * action is taken.
 */
export async function unpublishRoleTemplate(
  client: SupabaseClient,
  templateId: string,
  groupIds: string[] | null,
): Promise<{ refused: boolean }> {
  const { refused } = await call(client, 'admin_unpublish_role_template', {
    p_role_template_id: templateId,
    p_group_ids: groupIds,
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
