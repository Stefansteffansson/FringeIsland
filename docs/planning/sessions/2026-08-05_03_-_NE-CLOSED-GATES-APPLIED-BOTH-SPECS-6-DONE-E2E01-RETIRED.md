# Session bridge — N-E closed: gates applied on the named approvals, both specs 6-done, TASK-E2E-01 fixed and retired

**Date:** 2026-08-05 (session 10, continued) · **Wave:** Ferd · **Cycle:** N-E (**closed**)
**Follows:** [`2026-08-05_02_-_NE-BUILT-PD017-HELD-AT-GATE-H042-TRANCHE1-MERGED.md`](./2026-08-05_02_-_NE-BUILT-PD017-HELD-AT-GATE-H042-TRANCHE1-MERGED.md)

---

## READ THIS FIRST — the fresh session starts after N-E

1. **N-E is fully closed.** Stefan's named approvals unlocked both holds: "ok merge 426" (migration `20260805120000` applied + repaired, log consistent) and "ok merge 423" (ADR-U051 Amendment 2 — status flipped to Accepted in the close batch, recording that nod). Both specs are **`6-done`** with Implementation notes; L4 + README rows advanced same-batch; CHANGELOG entries in root + hub (platform-core deliberately owes nothing — no Core-owned object changed; the licensed trigger mount is recorded in the manifest + U051A2, checked not assumed).
2. **The numbers:** gate suite 11-red/3-labelled-green at head → **14/14** post-apply (zero test-side changes) · full integration **1041/1041** (the one first-pass red was the GC-8 trigger-mount gate correctly demanding the cross-owner license — DS-5 fn on the PC-3 table; licensed citing U048 + U051A2, gate 2/2) · unit **1291→1297/1297** · lint 0 · `next build` green · the N-E journey (`invitation-bell-answers.spec.ts`) green, 5 legs, leak 0→0 · **full E2E fleet 133/133 — twice consecutively** (7.3m + 7.4m), the first fully-green fleets on record, zero fenced reds.
3. **TASK-E2E-01 is FIXED and the flake-watch entry is RETIRED** (this bridge is the retirement of record). The 4th occurrence at this close had degraded to deterministic (red even solo); control-proven found-not-caused (still red with all four N-E surface files reverted). The scheduled 2 h fix executed per the task's own spec: `profile.spec` moved to a dedicated FIM (fresh context + UI sign-in per story); the AC-2 audit confirmed STORY-4 was the fleet's **only** scope-global sign-out on the shared storageState — with it moved, `entry.spec`'s recorded same-family flake loses its mechanism. Fleet ×2 green is the proof. TASK-E2E-02 (consented-fixture purge decision) still stands, Stefan's call.
4. **Two catches worth the retro:**
   - **The GC-8 trigger-mount license** — the spec-time sweep enumerated assertion-level siblings but not the *structural* conformance gates a new object class trips (a first-of-its-kind cross-owner trigger mount). Retro question: should "which conformance gates does this object class face?" be a named decomposition checklist row (the ownership-manifest memory generalised)?
   - **The chip-copy walk gap** — H042's STORY-1 AC said "shows 'Accepted'" while the shipped render (correctly, per the N-B answerer-row precedent and PD017's own recorded self-name) reads "Accepted by [own nickname]". The payload walk traced *keys*, not *rendered copy*. Recorded as an AC-wording correction in the Implementation notes; the E2E asserts the true copy.
5. **The sequence after N-E (unchanged):** **AB-6** — the FULL anatomy audit, the Platform-Ops exit checklist's last unexecuted pre-cutover row. Its docket: the Tier-1 `has_permission` finding · the `/admin/roles` + admin-plane deep-cold ADR-U043 pass · the sealed-threads admin-sight safety question (from the ADM-G walk).

## The plain-English walkthrough (walked against shipped behaviour)

*Someone invited me to a group. The letter in my bell now carries Accept and Decline — I answered it right there, confirmed it, and the group appeared in my list without so much as a reload; the invitation card above the list let go of it at the same moment, because the two doors tell one truth. Another invitation I declined, and the letter keeps the record — "Declined by me" — even though declining erases the membership row it answered. A third time, I clicked the letter itself instead of the buttons: it took me to my groups page and brought the invitation card into view with a brief glow, so the landing never reads as "nothing happened". And when an invitation was withdrawn while my letter still stood, the letter said "Withdrawn" — no dead buttons, and no name attached, because whoever withdrew it is none of my business if I'm not in the group. An invitation into a suspended group refuses honestly and stays open; my letters survive reloads with their outcomes intact; and the invitations that were already waiting before this shipped got their buttons too.*

Continuity questions asked against the build: a pre-cycle pending invitation answers in the bell (backfill) ✓ · a pre-cycle orphaned letter (its invitation long cancelled) stays passive — no fabricated outcome, no dead buttons ✓ · two doors racing settle first-answer-wins with the loser converging idempotently ✓ · a service-role/cascade deletion converges as withdrawn without naming an actor or erroring the host transaction ✓ · the acting-invitation fan-out is byte-identical (designed-green control + sibling suite) ✓.

## What this session did (gate-to-gate, after the _02 bridge)

- Merged #426 on the named nod; applied + repaired `20260805120000`; gate suite **14/14** post-apply.
- Full integration surfaced the GC-8 unlicensed cross-owner mount (1040/1041) → licensed in `exceptions.triggerMounts` (canon: U048 + U051A2) → gate 2/2 → **1041/1041**.
- Merged #423 on its named nod (Amendment 2 Accepted).
- Authored + ran the N-E E2E journey: green, 5 legs, leak 0→0. One sibling pin adapted labelled, observed red first (`notifications.spec` anchored URL); the predicted first-button flip did not materialise (DOM order held — recorded on TASK-NE-02).
- The full-sweep red (`profile.spec` STORY-4) fenced by control (found-not-caused, pre-N-E code still red) → **TASK-E2E-01 executed** (dedicated FIM; audit; fleet ×2 133/133) → task done, watch retired.
- 6-done batch: Implementation notes both specs · maturity + L4 + README rows · CHANGELOG ×2 · A2 status flip · TASK-NE-01/02 + TASK-E2E-01 → done · this bridge + walkthrough · dashboard refreshed at close.

## Standing items

TASK-E2E-02 (consented-fixture leak; purge decision Stefan's) · AB-6's docket (above) · the deferred Eid piles · the G-3 journeys deferral (2026-08-04). The Platform-Ops exit checklist's N-E row can be ticked at the AB-6 kickoff.

## Close ritual (this session)

- [x] All gates green (point 2); both specs `6-done`; tasks closed (kept for the retro per the kanban rule)
- [x] CHANGELOG ×2 (root · hub) — core checked, owes nothing
- [x] Session bridge (this file) + plain-English walkthrough
- [x] Dashboard refreshed at close
- [x] Discovery synced after every merge; checkout left on main, clean; dev server stopped
- [ ] No doc-health run owed (no cross-cutting change; next boundary carries the cycle-retro doc-health slot)
