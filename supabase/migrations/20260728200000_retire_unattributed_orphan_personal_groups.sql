-- ============================================================================
-- Retire the orphaned personal groups that attribute nothing surviving.
--
-- Closes the decision parked at the A-NTF gate (2026-07-28): 11 150 personal
-- groups with no `users` row, left in place because "deleting them would cascade
-- into live member lists and destroy message attribution (against ADR-U021's
-- spirit)". That characterisation was right to stop the delete and wrong about
-- its size. Measured rather than assumed:
--
--   * "8 690 are members of real groups" — 8 808 of those memberships are of ONE
--     group, the `FringeIsland Members` system group that every account joins.
--     Removing a departed test account from the everyone-group is not damage to
--     a member list; it is the correct state. Exactly TWO engagement groups hold
--     an orphan, one each, and only THREE groups in total also hold a live
--     member.
--   * "401 authored messages" — exactly ONE sits in a conversation any live user
--     participates in.
--
-- BUT the first strict pass said ZERO orphans were safe, because every personal
-- group is `created_by_group_id` / `added_by_group_id` / `assigned_by_group_id`
-- of its own bootstrap rows. That is SELF-REFERENTIAL attribution — the same
-- shape NB-8 found in the bootstrap notification, where a Mist held a durable
-- row addressed to itself. Attribution to rows that cascade away with you is not
-- attribution; the strict definition was wrong, not the data.
--
-- So the discriminator is: does this orphan attribute anything that SURVIVES the
-- delete? That is computable, and it splits the population cleanly:
--
--   11 272 orphaned   =   674 keep   +   10 598 delete
--
-- The 674 kept: 195 sent a message that outlives them, 413 are the actor on an
-- `admin_audit_log` row (audit rows never cascade — every one would be a real
-- loss), and a handful attribute a group, membership, role, enrolment or
-- notification-context that survives. THEY ARE NOT TOUCHED HERE. An audit trail
-- that forgets who acted is worth more than the rows it would reclaim.
--
-- Deleting the other 10 598 nulls nothing and blocks nothing: 0 RESTRICT
-- referrers (no consent records, no authored journeys), and the control below
-- proves not one message changes sender.
--
-- Idempotent and self-limiting: on a database with no orphans it deletes 0.
-- ============================================================================

DO $cleanup$
DECLARE
  v_orphans        int;
  v_keep           int;
  v_deletable      int;
  v_deleted        int;
  -- controls, captured before
  v_msgs_before    int;
  v_msgs_after     int;
  v_msg_attr_before int;
  v_msg_attr_after  int;
  v_audit_before   int;
  v_audit_after    int;
  v_live_before    int;
  v_live_after     int;
  v_posts_before   int;
  v_posts_after    int;
BEGIN
  CREATE TEMP TABLE _orphan ON COMMIT DROP AS
    SELECT g.id FROM public.groups g
    WHERE g.group_type = 'personal'
      AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id);

  CREATE TEMP TABLE _keep ON COMMIT DROP AS
    SELECT DISTINCT m.sender_group_id AS id FROM public.messages m
      WHERE m.sender_group_id IN (SELECT id FROM _orphan)
        AND NOT EXISTS (SELECT 1 FROM public.conversations c
                        WHERE c.id = m.conversation_id AND c.group_id IN (SELECT id FROM _orphan))
    UNION
    SELECT DISTINCT a.actor_group_id FROM public.admin_audit_log a
      WHERE a.actor_group_id IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT g.created_by_group_id FROM public.groups g
      WHERE g.created_by_group_id IN (SELECT id FROM _orphan)
        AND g.id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT m.added_by_group_id FROM public.group_memberships m
      WHERE m.added_by_group_id IN (SELECT id FROM _orphan)
        AND m.group_id NOT IN (SELECT id FROM _orphan)
        AND m.member_group_id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT m.status_changed_by_group_id FROM public.group_memberships m
      WHERE m.status_changed_by_group_id IN (SELECT id FROM _orphan)
        AND m.group_id NOT IN (SELECT id FROM _orphan)
        AND m.member_group_id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT r.assigned_by_group_id FROM public.user_group_roles r
      WHERE r.assigned_by_group_id IN (SELECT id FROM _orphan)
        AND r.group_id NOT IN (SELECT id FROM _orphan)
        AND r.member_group_id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT e.enrolled_by_group_id FROM public.journey_enrollments e
      WHERE e.enrolled_by_group_id IN (SELECT id FROM _orphan)
        AND e.group_id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT n.group_id FROM public.notifications n
      WHERE n.group_id IN (SELECT id FROM _orphan)
        AND n.recipient_group_id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT f.author_group_id FROM public.forum_posts f
      WHERE f.author_group_id IN (SELECT id FROM _orphan)
        AND f.group_id NOT IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT an.author_group_id FROM public.announcements an
      WHERE an.author_group_id IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT an.retracted_by_group_id FROM public.announcements an
      WHERE an.retracted_by_group_id IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT cr.target_group_id FROM public.content_reports cr
      WHERE cr.target_group_id IN (SELECT id FROM _orphan)
    UNION
    SELECT DISTINCT pei.invited_by_group_id FROM public.pending_email_invitations pei
      WHERE pei.invited_by_group_id IN (SELECT id FROM _orphan);

  CREATE TEMP TABLE _delete ON COMMIT DROP AS
    SELECT o.id FROM _orphan o WHERE o.id NOT IN (SELECT id FROM _keep);

  SELECT count(*) INTO v_orphans   FROM _orphan;
  SELECT count(*) INTO v_keep      FROM _keep;
  SELECT count(*) INTO v_deletable FROM _delete;

  -- ---- controls, before ----------------------------------------------------
  SELECT count(*) INTO v_msgs_before  FROM public.messages;
  SELECT count(*) INTO v_msg_attr_before FROM public.messages WHERE sender_group_id IS NOT NULL;
  SELECT count(*) INTO v_audit_before FROM public.admin_audit_log WHERE actor_group_id IS NOT NULL;
  SELECT count(*) INTO v_posts_before FROM public.forum_posts;
  SELECT count(*) INTO v_live_before  FROM public.groups g
    WHERE g.group_type = 'personal'
      AND EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id);

  RAISE NOTICE 'orphans=% keep=% deletable=%', v_orphans, v_keep, v_deletable;

  DELETE FROM public.groups g WHERE g.id IN (SELECT id FROM _delete);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- ---- controls, after -----------------------------------------------------
  SELECT count(*) INTO v_msgs_after  FROM public.messages;
  SELECT count(*) INTO v_msg_attr_after FROM public.messages WHERE sender_group_id IS NOT NULL;
  SELECT count(*) INTO v_audit_after FROM public.admin_audit_log WHERE actor_group_id IS NOT NULL;
  SELECT count(*) INTO v_posts_after FROM public.forum_posts;
  SELECT count(*) INTO v_live_after  FROM public.groups g
    WHERE g.group_type = 'personal'
      AND EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id);

  IF v_deleted <> v_deletable THEN
    RAISE EXCEPTION 'deleted % but expected %', v_deleted, v_deletable;
  END IF;

  -- THE CONTROL THAT MATTERS: a message must not lose its sender. This is the
  -- entire reason the decision was parked, so it is asserted, not hoped for.
  IF v_msg_attr_after <> v_msg_attr_before THEN
    RAISE EXCEPTION 'message attribution changed: % -> %', v_msg_attr_before, v_msg_attr_after;
  END IF;
  IF v_msgs_after <> v_msgs_before THEN
    RAISE EXCEPTION 'messages deleted: % -> %', v_msgs_before, v_msgs_after;
  END IF;
  IF v_audit_after <> v_audit_before THEN
    RAISE EXCEPTION 'audit actor attribution changed: % -> %', v_audit_before, v_audit_after;
  END IF;
  IF v_posts_after <> v_posts_before THEN
    RAISE EXCEPTION 'forum posts changed: % -> %', v_posts_before, v_posts_after;
  END IF;
  -- No live account may lose its personal group. Nothing here should touch one,
  -- and an equality check is cheaper than finding out later that it did.
  IF v_live_after <> v_live_before THEN
    RAISE EXCEPTION 'live personal groups changed: % -> %', v_live_before, v_live_after;
  END IF;
  -- Everything kept is still here.
  IF EXISTS (SELECT 1 FROM _keep k WHERE NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = k.id)) THEN
    RAISE EXCEPTION 'a group kept for attribution was deleted anyway';
  END IF;

  RAISE NOTICE 'retired % orphaned personal groups; % kept for surviving attribution; messages %/% unchanged, audit actors % unchanged, live personal groups % unchanged',
    v_deleted, v_keep, v_msgs_after, v_msg_attr_after, v_audit_after, v_live_after;
END $cleanup$;
