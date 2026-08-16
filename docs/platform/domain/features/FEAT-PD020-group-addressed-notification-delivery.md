# FEAT-PD020: Group-addressed notification delivery — dead letters stop being written

---
id: FEAT-PD020
title: Group-addressed notification delivery — engagement-group recipients expand to the people who answer for the group, at write time, by construction
owner: platform/domain/communication
consumers: [hub]
wave: unassigned
maturity: 6-done
requires-equipment: none
---

## Problem

A notification addressed to an engagement group is a letter no one can ever read: `get_own_notifications` serves the caller's personal-group rows only (N-A, `20260723120000`; the RLS law `20260726120000:129-137`), the hint resolver explicitly resolves a non-personal recipient to no-topic/no-hint (`20260726120000:272-276` — its own comment names this), and no surface shows a wielded group its notifications. Yet writers write them: `send_community_announcement` fans out to **direct members** one level (`20260720200000:237-248` — `gm.member_group_id`, no personal-only filter), and the role/participation family (`20260801190000`) addresses whatever group the event concerns. **Live evidence: 6 rows addressed to "Albin group 1" sit unseeable in `public.notifications`** (walk, 2026-08-15) — 1 `role_assigned` + 5 `participation_paused`/`participation_activated`. The class is the whole notification family and it grows silently.

Board settled (Stefan, 2026-08-15): **fan-out expansion to the nested group's `act_as_group` holders ∪ its Stewards, one level, no recursion** — the people who can answer for the group hear what is addressed to it, with Stewards as the floor so a group with no wielder still cannot accumulate dead letters.

## Solution sketch

**Expand at the table, not at each writer.** A DS-5-owned `BEFORE INSERT` trigger on `public.notifications`: when `recipient_group_id` is an engagement group, suppress the original row (`RETURN NULL`) and insert one row per expansion recipient — the personal groups of the group's `act_as_group` holders and its Stewards (deduplicated, one level, the event's triggering actor excluded). Expanded rows are ordinary personal rows: they re-enter the trigger chain, so the N-D preference dispatcher and the hint resolver apply per-recipient exactly as if each person had been addressed directly (asks ring through, news respects muting — the category law untouched).

Why the trigger and not per-writer fixes: the group-addressing writers span **owners** — announcements are DS-5, the role/participation family is Core (PC021) — and a DS-5 expansion helper called from Core functions would invert the one-way dependency (Core never depends on Domain). Writers writing INTO `public.notifications` is the sanctioned every-layer emission pattern (ADR-U002); the table is DS-5's, so a trigger on it is a same-owner mount (no GC-8 cross-owner license needed), and **every future writer inherits the expansion by construction** — the "stop being written silently" guarantee cannot regress per-writer.

Precedent: FEAT-PD014 already fans `acting_invitation` out to the invited group's `act_as_group` holders at send time (ADR-U049/U051) — this generalises that recipient set (∪ Stewards, per the board) from one kind to the class.

## Appetite

One platform session: the trigger, the writer sweep (verify no writer *depends* on group-addressed rows surviving), the 6-row disposition, the sibling-assertion sweep. The hat-staleness rider is verification, not construction.

## Rabbit holes

- **Trigger ordering.** The N-D dispatcher suppresses at write (`20260726120000:239` — `RETURN NULL`, "no row, and so no hint"). BEFORE triggers fire alphabetically: the expansion trigger must be named to fire **before** the dispatcher so the group row is expanded rather than fed to a preference read that has no user behind it. Name it accordingly and pin the ordering with a test.
- **Recursion guard by shape, not by flag:** expanded rows target personal groups, which the trigger passes through untouched — no marker column needed. Assert it (a personal-addressed insert is byte-identical before/after).
- **Do not build a group inbox.** The board chose expansion; a wielder-visible group inbox is the rejected alternative — don't half-build both.
- **`acting_invitation` double-fan-out:** PD014's writer already expands at send. The trigger must not re-expand an already-personal row (it won't — see shape guard), and the PD014 writer stays as-is (its rows are personal by construction).

## No-gos

- No recursion into nested-nested groups (one level, the board's ruling). No outward channels (email is V3/§8 Q1). No notification authored *by* a group (that's PD019 STORY-5's interplay note, deferred with it).

## Stories

### STORY-1: An engagement-group recipient becomes its answerers, at write time
As a person who answers for group A (act_as_group holder or Steward), I want any notification addressed to A delivered to me personally, so that what is addressed to the group reaches the people who can act for it.

**Acceptance criteria:**
- Given A (engagement) is a member of B, an act_as_group holder H and a Steward S in A (H ≠ S), when a writer inserts a notification addressed to A, then no row lands with `recipient_group_id = A`, and one row each lands for H's and S's personal groups — same kind/title/payload, deduplicated (a Steward who is also a holder gets one row).
- Given the event's triggering actor is also in the expansion set, then that person is excluded (you don't hear about your own act twice).
- Given A has no act_as_group holder, then its Stewards still receive (the floor).
- Given a personal-group-addressed insert, then it is byte-identical before/after (shape guard; no re-expansion, PD014's rows included).

### STORY-2: Expanded rows obey the category law per person
As a recipient, I want expanded rows to behave exactly like directly-addressed ones, so that preferences, hints, and reads are undistinguishable by delivery path.

**Acceptance criteria:**
- Given a recipient muting the news category, when a `participation_paused` (news) reaches them via expansion, then the dispatcher suppresses their row and theirs alone; an ask-family kind rings through the same mute.
- Given a hint-eligible expanded row, then `notify_notification_hint` emits on the recipient's personal topic (the no-topic branch never fires for expanded rows).
- Given `get_own_notifications`, then expanded rows serve normally (no new keys — the payload walk found zero surface changes needed).

### STORY-3: The six existing dead letters are dispositioned
As the platform, I want the stranded rows resolved in the same migration, so the class is closed retroactively, not just prospectively.

**Acceptance criteria:**
- Given the migration runs, when it completes, then zero rows in `public.notifications` have an engagement-group `recipient_group_id` — the existing 6 re-addressed to the expansion set as of migration time (recommended and ruled by this spec: they are recent, real events; late is honest, unseeable is not), with `created_at` preserved.
- An instrument counts the right noun (the PD018 STORY-7 pattern): a residue query proving zero group-addressed rows, asserted in the suite so regressions are red, not silent.

### STORY-4 (rider): Hat-lifecycle staleness closes through delivery
As a wielder whose hat was paused by the host, I want the pause notice to reach me personally, so that my open pages learn the hat is gone (the notification → `refreshNavigation` house path).

**Acceptance criteria:**
- Given the host pauses member-group A, when the `participation_paused` row expands to me (holder/Steward in A), then my bell hint fires; the surface half (FEAT-H046 STORY-4) asserts the refresh. Substrate-side this is STORY-1+2 composed — the AC here is the end-to-end pairing, verified once the Hub story lands.

## Platform dependencies

N-A read/RLS law (`20260723120000`, `20260726120000:129-137`); N-D dispatcher + hint resolver (`20260726120000`); the announcements fan-out (`20260720200000:237-248`) and role/participation writers (`20260801190000`) as the known writer census; PD014's acting fan-out precedent (ADR-U049/U051). Permission reads: `has_permission(person, A, 'act_as_group')` and the Steward resolution the leadership contracts already use.

## Cross-product impact

Hub: no payload changes; FEAT-H046 STORY-4 verifies the refresh pairing. Gimbal inherits by construction.

## Vertical impact

- **Administration:** the disposition migration is auditable (counts logged); no admin primitives change.
- **Privacy/GDPR:** expansion delivers to people entitled to act for the group — no wider (one level, named roles); notification content unchanged; the 6 re-addressed rows carry only what was already addressed to the group those people answer for.
- **Notifications:** this IS the vertical's routing law made total — no recipient class can silently drop mail.
- **Observability:** the residue instrument (STORY-3) + expansion counts in migration output; suppressed-vs-delivered stays traceable per N-D.
- **Transactions:** none.
- **Extensibility:** expansion keys on `group_type`/permission facts, no kind enum — future kinds inherit; the trigger is data-driven (no hardcoded role names — Steward resolution via role machinery, ADR-U007).

## Implementation notes (6-done — built 2026-08-15, same session as the board; shipped through the schema gate on named approval)

**Plain-English walkthrough:** a group that belongs to another group used to get mail no human could ever open — announcements from its host, notices that its membership was paused, roles it was given. Now that mail goes straight to the people who answer for the group (anyone holding its act-as key, and its Stewards as the floor), each copy obeying that person's own notification preferences, ringing their own bell. Nobody can write the unreadable kind of letter anymore — not today's code, not next year's.

- **Migration `20260815223000`** (applied to dev + history repaired): `ds5_expand_group_addressed_notification()` mounted as `trg_ds5_aa_expand_group_addressed` — BEFORE INSERT, named to fire before the N-D dispatcher (alphabetical ordering), SECURITY DEFINER, REVOKEd from clients. Engagement-group recipients expand (STORY-1: active personal members with `has_permission(pg, group, 'act_as_group')` ∪ Steward-role holders via the template-id/name house pattern; DISTINCT dedupe; `get_current_personal_group_id()` excluded NULL-safely); personal/system recipients pass through byte-identical — recursion bounded by shape, PD014's personal fan-out untouched. Expanded rows re-enter the chain: per-recipient N-D suppression, per-row N-C hints (STORY-2). The disposition (STORY-3) re-addresses stranded rows created_at-preserved and deletes the originals, RAISE-NOTICEing its counts — dev carried 0 (probed); the 6 live prod rows are verified by that NOTICE at prod apply. STORY-4's substrate leg is STORY-1+2 composed; the surface pairing lands with FEAT-H046 STORY-4.
- **Red → green:** 4 behavioural reds (announcement fan-out leaving the group-addressed row and no answerer rows; two direct group-addressed writes landing unseeable; the residue instrument counting the strays) + 1 labelled green-both-sides guard (personal-addressed byte-identity) → 5/5. Full notifications slice (9 suites) green post-apply: 7 in one run, the two rate-limited suites green on targeted re-verify.
- **Conformance:** function registered under DS-5; the mount carries its GC-8 license in `exceptions.triggerMounts` (cross-owner: DS-5 on `vertical:notifications` — the N-D suppression precedent, ADR-U048 A1). trigger-mount / function-classification / ownership-manifest gates 15/15. The 4-ready spec's "same-owner, GC-8 n/a" claim was wrong and is corrected in the walks section below.
- **Sibling adaptations (labelled, found by the post-apply slice run — the grep sweep missed both):** the N-C "unresolvable recipient" cell used the exact dead-letter shape this feature retires — adapted to a system-group recipient; the N-D suite ran on jest's 30s default, which the #543 rate-limit backoff can legitimately exceed — timeout aligned to the 180s sibling standard.
- **Vertical/API DoD:** no new endpoint, no route — the contract is a substrate trigger (nothing app-layer to adversarially bypass; the direct PostgREST INSERT path IS the tested path). Performance: write-side only, no first-paint impact.

## Decomposition walks (recorded 2026-08-15)

- **Mechanism walk:** dead-letter proof `20260726120000:272-276` (hint no-topic comment) + `:129-137` (personal-only RLS); fan-out `20260720200000:237-248`; writer census via `role_assigned` grep (`20260801190000`, remapped `20260815143000`); PD014 precedent (communication.md §L4 row, ADR-U049 ruling 3).
- **Payload walk:** zero surface payload changes; expanded rows are ordinary rows (verified against `get_own_notifications`' served keys).
- **Conformance gates named (CORRECTED at build, 2026-08-15):** new trigger function registers in `supabase/ownership.manifest.json` under DS-5 (functionOwner defaults to CORE — label mandatory); the trigger mount is **cross-owner** — `notifications` is `vertical:notifications`, NOT DS-5 (the 4-ready text said "same-owner, GC-8 n/a"; the manifest says otherwise, and the mechanism walk should have read it) — so a cited `exceptions.triggerMounts` license is REQUIRED, on the N-D suppression mount's exact precedent (ADR-U048 Amendment 1); the migration names sibling assertions it invalidates (dispatcher cells pinning group-addressed no-delivery, if any — sweep at build).
