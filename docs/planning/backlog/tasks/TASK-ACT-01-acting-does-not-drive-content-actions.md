---
id: TASK-ACT-01
title: Acting-as stops at the permissions panel — a wielded group's content powers have no doors
status: registered — forward item, needs a decomposition board before any build (Stefan, 2026-08-14); REAFFIRMED same day ("what is the meaning of having a representative if they cannot act or view?") — the walk judged current representation near-hollow; priority raised. BOARD SETTLED (Stefan, 2026-08-15): see "The board, settled" — decomposition may proceed
priority_note: raised medium -> high on Stefan's reaffirmation
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
- ~~Design questions for the board~~ **The board, settled (Stefan, 2026-08-15):**
  1. **Wielded scope: read + write.** The reaffirmation named viewing explicitly ("act **or view**") — `view_forum` is honoured as a wielded power, not just the write family.
  2. **Family order: forum → group conversations → announcements** (the walk's exact frustration first).
  3. **Dead-letter delivery: fan-out expansion to the nested group's `act_as_group` holders ∪ its Stewards, one level, no recursion.** The people who can answer for the group hear what is addressed to it; Stewards as the floor so a group with no wielder still cannot accumulate dead letters.
  4. **Hat-lifecycle staleness rides the delivery mechanism** — the pause notice reaching a person is the signal that refreshes open pages (house notification → `refreshNavigation` path). No separate build.
  - Still open for the decomposition itself: per-surface copy for "acting as" states; notification routing when a group authors (V3).

## Second verified finding (2026-08-14, same walk): group-addressed notifications are dead letters

`send_community_announcement`'s fan-out addresses **each direct member** (`gm.member_group_id`, one level, no recursion — `20260720200000:237-248`). For a nested member-GROUP that row's `recipient_group_id` is the engagement group itself, and **nothing ever delivers it to a person**: `get_own_notifications` reads the caller's personal-group rows only, `notify_notification_hint` explicitly resolves an engagement-group recipient to no-topic/no-hint (its own comment names this), and no surface shows a wielded group its notifications. **Live evidence: 6 rows addressed to "Albin group 1" sit unseeable in `public.notifications`** (2026-08-15 walk): 1 `role_assigned` + 5 `participation_paused`/`participation_activated` from the host Steward pausing/reactivating the group-member. The class is the whole notification family, not just announcements. The board owns the delivery-semantics question: expand to the nested group's people at fan-out (one level? recursive with loop guard? act_as_group holders only?), or surface a group inbox to wielders — either way, dead letters stop being written silently.

**Rider (2026-08-15 walk): hat-lifecycle staleness.** When the host pauses the member-group, wielders' open pages keep offering the hat until the next read (the option list is mount-time state; the substitution read, `is_member_of_context` (`gmc.status='active'`, verified), and every wielded action are all already honest/refusing — degradation is safe, just uninformed). Verified NOT a hole; but the fix is the same as the dead letters: the pause notice reaching a person is exactly the signal that would refresh those pages (the house notification→refreshNavigation path). One mechanism closes both.

## Related

- ADR-U041 §1-2 (substitution semantics), FEAT-H018 Implementation notes (walk finding pointer), FEAT-PC015.
- Sibling walk finding, fixed separately: the forum section's generic-failure copy for a permission-refused non-member (honest members-only copy — shipped as a post-6-done fix, 2026-08-14).
