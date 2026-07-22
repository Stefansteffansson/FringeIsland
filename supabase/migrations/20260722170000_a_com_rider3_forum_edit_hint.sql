-- ---------------------------------------------------------------------------
-- RIDER-3 (A-COM area-gate live walk, Stefan 2026-07-22, scenario 6): a forum
-- content edit emits no realtime hint — other members' open group pages keep
-- the pre-edit text until a manual reload.
--
-- Why the gap exists (sequencing, not decision): C-C shipped the hint layer
-- (20260720153000) with two forum events — INSERT -> forum_post_created,
-- is_deleted false->true -> forum_post_moderated. The own-edit window arrived
-- ONE CYCLE LATER at C-D under an explicit "no socket work" carry rule; C-D's
-- spec verified its self-DELETE rides the existing moderation trigger ("the
-- platform's existing trigger fires on the transition", FEAT-H028:47) but
-- never asked the same question of the edit write. No spec claims edits
-- propagate; no spec decided they don't.
--
-- The repair mirrors the C-C shape byte-for-byte (same emitter posture, same
-- topic, same {post_id} content-free payload): AFTER UPDATE on a genuine
-- content change, never on moderation/self-delete rows (NOT NEW.is_deleted —
-- those already emit forum_post_moderated), never on a no-op save (the WHEN
-- clause is the idempotency guarantee, the C-C Q3 pattern). Client half:
-- forum-tenant subscribes to the new event (FEAT-H027; hint-not-authority,
-- the section re-reads through get_group_forum).
-- Guarded tests (red pre-apply): realtime-hint-emission.test.ts RIDER-3.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ds5_emit_forum_edit_hint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.ds5_emit_hint(
    jsonb_build_object('post_id', NEW.id),
    'forum_post_edited',
    'group:' || NEW.group_id::text || ':forum'
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_emit_forum_edit_hint() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ds5_emit_forum_edit_hint ON public.forum_posts;
CREATE TRIGGER trg_ds5_emit_forum_edit_hint
  AFTER UPDATE ON public.forum_posts
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content AND NOT NEW.is_deleted)
  EXECUTE FUNCTION public.ds5_emit_forum_edit_hint();
