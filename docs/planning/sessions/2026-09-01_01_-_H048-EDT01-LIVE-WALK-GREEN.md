# Session bridge — 2026-09-01: the H048 + EDT-01 live walk is green — every leg, plus four unscripted sights

**Continuation of `2026-08-21_02`** (H048 shipped) and the same session's EDT-01 close (#575/#576). Stefan walked both builds live against the one database with the standing walk cast (Wanda / Bert / Mona; Harbour / Riverside; passwords rotated in-session 2026-08-21, never committed — re-rotate via an admin-API reset script when needed).

## Verdict

**All eight legs green.** FEAT-H048 (wielded announcements) and TASK-EDT-01 (unlimited own edit/delete + "(edited)" with the 3-minute grace) are now live-verified on top of their test pyramids. No product defects found. No maturity changes (both were already 6-done).

## The walk, compressed

1. **Hat reads, can't announce** — Wanda + Riverside hat on Harbour: banner + honest empty board (DB-verified: Harbour's board had never been written to — the empty state IS the proof the read passed; a refused read would have named the hat); no composer/Retract (the hat lacked the grant).
2. **The grant through the real door** — Bert created + assigned the **Herald** role (send_announcements) to member-group Riverside via the role UI; `has_permission(Riverside, Harbour, send_announcements)` flipped true; Wanda's hatted composer appeared without ceremony.
3. **Announce as the group** — confirm named the wielding; the row landed as **Riverside · Group**; fan-out DB-proven: Bert + Mona rows, `sent_by = Riverside`; **both silences held** (no Wanda — dual actor exclusion; no Riverside — author-group exclusion).
4. **Myself byte-identical** — Mona: badge visible, no doors. Bert: personal announce fired with **no modal**; fan-out: Mona direct + **Wanda/Astrid via the PD020 expansion of Riverside's row (Kalle correctly nothing — a plain member is not an answerer)**; zero group-addressed residue.
5. **Retract as the group** — confirm named it; `retracted_by = Riverside`; the person never surfaced anywhere in the record.
6. **EDT-01: the old post opens** — Edit/Delete on a weeks-old own post; the edit rendered "(edited)" for every reader.
7. **The silent grace** — a fresh post edited immediately carried no note, beside the leg-6 post wearing its note: both truth-states in one frame.
8. **Late withdrawal + guards** — old own posts deleted → neutral tombstone "This post was removed"; **the reply-under-tombstone sight witnessed** (Riverside's badged reply held its nested place); under the hat: Reply only — no Edit/Delete/Remove/Report on anything (the ruled wielded posture), and **Retract rendered on Bert's row under the hat** (the role-power-wielded-verbatim rabbit hole, exactly as specced).

## Unscripted sights (all correct behaviour)

- **PD020 live**: the Herald assignment belled Wanda personally (group-addressed role notice → answerers' rows).
- **The stale board until remount, witnessed** — announcements have no live channel (the C-D no-sockets carry); a send in one tab leaves sibling tabs/windows stale until reload. Not a defect; now seen, not just known.
- **Wanda's Myself-view** on a public group: honest members-only copy on all three sections + the public roles list.

## Walk friction (non-product, lessons recorded)

- **Incognito windows share one cookie jar** — a "Bert" window silently became Mona's session after a same-jar login; the header chrome stayed stale while every fetch ran as Mona. Three identities need three jars (profile / incognito / second profile or browser). Known coexistence friction, re-confirmed.
- **A diagnostic probe bounced Bert to /login** — the probe's default `signOut()` is GLOBAL and revoked the human's browser session. New memory: `probe-signout-global-bounce` — probes end with `scope: 'local'` or no sign-out.

## Residue (deliberate)

Herald role + assignment kept (enriches the cast). Bert's live announcement, one retracted Riverside announcement, two forum tombstones, walk notifications — ordinary fixture history in the one DB; the launch-checklist fixture sweep owns the eventual cleanup.

## The board

TASK-DBT-03 (suite teardown + audit checklist) · the ADR-U039 topic-channel rider (recorded, unscheduled) · DM/conversation message editing (open, deliberately unpulled) · beppe.hopper reaps ~2026-09-14 by design.
