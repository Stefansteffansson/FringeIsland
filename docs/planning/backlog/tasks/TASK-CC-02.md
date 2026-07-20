# Migration: hint triggers + realtime.messages policies (schema gate)

---
id: TASK-CC-02
title: The PD010 migration — emit triggers on messages/forum_posts, emit helper(s), the two receive policies, conformance lockstep; held at the schema gate
status: todo
assigned_to: claude
priority: critical
feature: FEAT-PD010
owner: platform/domain/communication
wave: ferd
cycle: C-C
depends_on: [TASK-CC-01]
estimated_hours: 3
---

## Description
One migration: AFTER INSERT trigger on `public.messages` fanning out `realtime.send` per active participant (auth uid via personal group → `users.auth_user_id`); AFTER INSERT + AFTER UPDATE (is_deleted transition, `WHEN` clause per spec Q3) triggers on `public.forum_posts` emitting to the group topic; every emit ids-only, wrapped non-fatally with `RAISE WARNING` on failure (never silent, never fatal — the PC009 shape upgraded per the tier's no-silent-failures law); the two `realtime.messages` receive policies (own conversations topic — the session-policy shape; forum topic via a PG17-ceiling-safe membership helper per spec Q1); REVOKE on any new helper functions; NO publication changes, NO client-send policies. Conformance lockstep: new DS-5 helper functions join `DS_OWNED_ALLOWLIST`.

## Acceptance criteria
- [ ] TASK-CC-01's suite flips green on apply with zero test edits; conformance gate green pre- and post-apply
- [ ] Spec Q1–Q3 resolved and recorded in the migration comments (helper shape, emit-site shape, moderation-edge shape)
- [ ] Task lands at `review`, never `done` — schema gate; PR carries red evidence + apply/repair commands; merge only on Stefan's NAMED approval
- [ ] W12: direct-call refusal proven for any new callable helper

## Technical notes
`bash supabase-cli.sh migration new c_c_realtime_hint_emission` → author → `node scripts/apply-migration-temp.js` + `repair --status applied` (only after the named nod if apply is permission-gated in this session). SECURITY DEFINER + `search_path=''` discipline; document the elevation per helper.

## Verification
Migration applied + repaired on dev; integration comm sweep green; `migration list` clean.
