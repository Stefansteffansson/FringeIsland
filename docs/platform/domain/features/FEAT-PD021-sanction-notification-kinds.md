# FEAT-PD021: Sanction notification kinds — the locked-on `sanctions` category and the six hold-transition kinds

---
id: FEAT-PD021
title: Sanction notification kinds — a `sanctions` category that no member can mute, four group-hold kinds under it, two account-hold kinds under the already locked-on `account`; the registry half of DB-4 (sanction communication), consumed by the FEAT-PC030 transition contracts and rendered by FEAT-H049
owner: platform/domain/communication
consumers: [hub, platform/core]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

When a group is rested, woken, suspended or reactivated, or a member's account is suspended or reinstated, nobody is told. Both [FEAT-PC023](../../core/features/FEAT-PC023-group-suspension-enforcement-contracts.md) and [FEAT-H038](../../../products/hub/features/FEAT-H038-suspension-integrity-and-state-honesty.md) record that as an explicit No-go deferred to Eid ("no member notification on any hold or suspension transition"). The Ferd leftovers sweep put it in front of Stefan because the wave is "the first usable version" and this is member-facing; he ruled it in (2026-09-03, [TASK-DB4-01](../../../planning/backlog/tasks/TASK-DB4-01-sanction-communication-pulled-into-ferd.md)). The eight rulings on the decision board (bridge `2026-09-03_04`) are adopted as this spec's defaults.

The notification substrate is ready for it: [FEAT-PD013](./FEAT-PD013-notification-routing-contracts-and-category-registry.md) made kinds and categories data (`notification_kinds` → `notification_categories`, the `notifications.type` FK — migration `20260723120000:106-108`), and [FEAT-PD016](./FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md) made suppressibility a category axis (`notification_categories.member_suppressible`, `20260726120000:89`, applied at insert by `ds5_apply_notification_preference` via `ds5_may_deliver`, `:164-231`). What is missing is the vocabulary: no kind names a hold transition, and no category says a sanction notice cannot be muted.

### Why DS-5

The kinds registry is DS-5's (Audit III ruling R-4 relabelled `notification_kinds` / `notification_categories` from the vertical to DS-5 — `supabase/ownership.manifest.json`, the `notification_kinds` note). Rows in it are DS-5's to author; the Core transition contracts that emit against them are [FEAT-PC030](../../core/features/FEAT-PC030-sanction-communication-contracts.md)'s, and they write `public.notifications` as obligation-fulfilment (the vertical delivery substrate, written by every tier — ADR-U047 rule 5, manifest note on `notifications`), never a crossing.

## Solution sketch

Registry rows only — no table, no function, no policy:

- **One category, locked on.** `sanctions` — label *Holds & sanctions*, `lawful_basis = 'transactional'` (a hold is an operational fact about the member's own standing, not marketing), `interruption_grade = 'badge'` (the house default for every Ferd category — `20260723120000:64`), `member_suppressible = false`. The FEAT-H033 premise: a non-suppressible category renders locked-on with a stated reason and no control at all.
- **Four group-hold kinds under `sanctions`:** `group_rested` ("Your group is resting"), `group_woken` ("Your group is awake again"), `group_suspended` ("Your group has been suspended"), `group_reactivated` ("Your group has been reactivated").
- **Two account-hold kinds under `account`** — the category N-D already locked on (`20260726120000:93-96`; the only non-suppressible category until now): `account_suspended` ("Your account has been suspended"), `account_reinstated` ("Your account has been reinstated"). They ride `account` because that is where a member's own participation state already lives (its label: *Account & participation state*), and because it is already locked on — no second lock needed.
- **Labels are the registry's** (the `label` column); the notification *body* carries the actor's reason verbatim (FEAT-PC030's write), and the *title* is the kind's label. Surfaces render title/body as delivered and never re-word them (V3 surfaces law, `NotificationItem.tsx:8`).

Nothing else changes: the dispatcher already refuses to suppress a row whose category is locked on (`ds5_may_deliver`, `20260726120000:181-193`); `get_own_notifications` already carries `kind` and the category (`20260723120000:275-291`); the FEAT-H033 console already renders every non-suppressible category locked-on from the registry (`NotificationPreferencesPanel.tsx:167`).

**A mechanism read that changed the design (recorded for FEAT-PC030):** [FEAT-PD020](./FEAT-PD020-group-addressed-notification-delivery.md)'s expansion trigger does **not** deliver a group-addressed row to every member — it expands to the group's `act_as_group` holders ∪ Stewards, one level (`20260815223000`, `ds5_expand_group_addressed_notification`: the `has_permission(..., 'act_as_group') OR <Steward role>` predicate; the board settled that rule on 2026-08-15 for nested groups). A hold notice must reach *every* active member, so the transition contracts fan out per member themselves (the FEAT-PD011 announcements precedent, `20260720200000:237-248`) and never write a group-addressed row for a hold.

## Appetite

Small — one migration hunk (a category row, six kind rows), one integration suite, no surface of its own. Rides the FEAT-PC030 schema gate (one gate for DB-4).

## Rabbit holes

- **Don't add a channel, a grade, or a dispatch rule.** Six rows; the pipeline is PD013/PD016's as built.
- **Don't reshape `get_own_notifications`.** Kind + category already travel; the surface renders what arrives.
- **Don't decide the reason's wording here.** The body is FEAT-PC030's write; this spec only promises the kind exists and cannot be muted.

## No-gos

- No new lawful basis, no new interruption grade, no push/email (the in-app row is the delivery in Ferd).
- No per-transition category (one `sanctions` category; `account` reused) — a taxonomy of sanctions is Eid's if ever.
- No notice for closure, deletion, exit or member removal — those already have their own kinds and paths (`member_removed`, the close/delete notices); DB-4 is the *hold* family only.

## Stories

### STORY-1: The vocabulary exists and cannot be muted
As the platform, I want every hold transition to have a registered kind under a locked-on category, so a sanction notice is deliverable and never suppressible.

**Acceptance criteria:**
- Given the migration, when the registry is read, then `notification_categories` holds `sanctions` with `member_suppressible = false`, `lawful_basis = 'transactional'`, `interruption_grade = 'badge'`, and `notification_kinds` holds the four `group_*` kinds under `sanctions` and the two `account_*` kinds under `account`, each with its label.
- Given a member who has muted every category they can (`set_own_notification_preference`), when a `sanctions` or `account` row is written for them, then it lands unsuppressed — `ds5_may_deliver` returns true for a locked-on category regardless of preference.
- Given a member calls `set_own_notification_preference('sanctions', 'in_app', false)`, then the write is refused exactly as `account` is refused today (the FEAT-PD016 non-suppressible refusal).
- Given `get_own_notifications`, when a sanction row is among the caller's rows, then it carries `kind` = the transition's kind and the category's label, unchanged.

### STORY-2: The console tells the member the category is always on
As a member, I want the preferences console to show *Holds & sanctions* as locked on with a reason, so I know I will always hear about a hold.

**Acceptance criteria:**
- Given the FEAT-H033 console, when categories load, then `sanctions` renders locked-on with the stated reason and no toggle — the existing behaviour for every `member_suppressible = false` category, pinned here as a labelled green (no Hub change).

## Platform dependencies

**Existing, Conformant:** the two registries and the `notifications.type` FK (PD013), the suppression dispatcher (PD016), the category read the console uses. **Schema gate:** registry rows only — rides FEAT-PC030's migration; task at `review` until the named approval.

## Cross-product impact

The **Gimbal** inherits the kinds by reading the same registry; the **Hub** renders them through the bell as plain notices ([FEAT-H049](../../../products/hub/features/FEAT-H049-sanction-communication-surfaces.md) STORY-4). [FEAT-PC030](../../core/features/FEAT-PC030-sanction-communication-contracts.md) is the only writer.

## Vertical impact

- **Privacy/GDPR:** no new personal data in this feature — the kinds are vocabulary; the reason text is FEAT-PC030's concern and travels only to the affected members' own rows.
- **Notifications:** is the feature — the vocabulary the Notifications vertical needs for the hold family; locked on by the FEAT-H033 premise (a sanction notice is not optional).
- **Administration:** none here — the transitions and their audit stay in FEAT-PC030.
- **Observability:** registry rows are traceable data; the dispatcher's existing refusal path is exercised by STORY-1.
- **Transactions:** None.
- **Extensibility:** rows in open registries — no enum, no sealed set; a later hold kind is one more row.

## Performance budget

N/A (no surface) — six registry rows; the bell's existing reads are unchanged.

## Open spec questions

None open. The DB-4 board rulings 1 and 6 (bridge `2026-09-03_04`) are adopted as this spec's defaults; reversing either reopens STORY-1.
