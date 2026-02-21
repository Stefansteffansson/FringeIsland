-- Tier 2B: Batch member count RPC to fix N+1 on My Groups page
-- Replaces N individual count queries with a single RPC call

CREATE OR REPLACE FUNCTION get_group_member_counts(p_group_ids UUID[])
RETURNS TABLE(group_id UUID, member_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT gm.group_id, COUNT(*) AS member_count
  FROM public.group_memberships gm
  WHERE gm.group_id = ANY(p_group_ids)
    AND gm.status = 'active'
  GROUP BY gm.group_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_group_member_counts(UUID[]) TO authenticated;
