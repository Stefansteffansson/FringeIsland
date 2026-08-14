---
id: TASK-ACT-01
title: Acting-as stops at the permissions panel — a wielded group's content powers have no doors
status: registered — forward item, needs a decomposition board before any build (Stefan, 2026-08-14)
assigned_to: unassigned
priority: medium
feature: FEAT-H018 (finding) — the build itself would span platform Communication contracts + Hub surfaces
owner: cross-area — platform/domain (DS-5 content contracts) + products/hub (acting affordances)
wave: unassigned
cycle: unscheduled
depends_on: []
estimated_hours: unestimated — decomposition first
---

# TASK-ACT-01 — acting does not drive content actions

**Found:** 2026-08-14, live walk (the Hopper cohort). Albin — Steward of "Albin group 1", which is a group-member of "Gunnar group 1" — flipped the act-as selector on Gunnar group 1's page. The "What I can do here" panel honestly showed the hat's powers (`post_forum_messages`, `view_forum`, …), but **no other surface responded**: Albin could not open the forum, post a thread, or use any content power as the group.

## Verified boundary (not a defect)

- FEAT-H018's shipped scope is, per its own spec, **"pure substitution rendered honestly"**: the selector drives only the permissions panel. The only wielded WRITES anywhere are the membership doors (respond/leave as the group, invite-group).
- **No content contract in the substrate accepts an acting group** — `p_acting` appears only in the role-fabric contracts; forum / conversations / announcements resolve the actor from `auth.uid()` alone.
- The spec's STORY-1 intent line — *"so that I can see **and use** its powers where it belongs (ADR-U041 §1-2)"* — outruns what landed. The "use" half is this task.

## Shape of the eventual build (recorded so the board starts warm)

- **Platform half:** the DS-5 content contracts (forum read/post/reply, group conversations, group announcements at minimum) gain the acting parameter with the ADR-U041 wielding gate (`act_as_group` held by the caller IN the acting group; the acting group's own powers checked in the context group — the pattern the role contracts already use). Authorship fits the substrate as-is: posts/messages already carry `author_group_id`/`sender_group_id`, so a wielded write stamps the acting group.
- **Hub half:** content affordances key on the substitution permissions while a hat is selected (composer render, refused-state copy naming the hat); attribution renders the group as author.
- **Design questions for the board:** which contract families are in scope first; whether a wielded READ (forum as the group) is wanted or only writes; per-surface copy for "acting as" states; notification routing when a group authors (V3).

## Related

- ADR-U041 §1-2 (substitution semantics), FEAT-H018 Implementation notes (walk finding pointer), FEAT-PC015.
- Sibling walk finding, fixed separately: the forum section's generic-failure copy for a permission-refused non-member (honest members-only copy — shipped as a post-6-done fix, 2026-08-14).
