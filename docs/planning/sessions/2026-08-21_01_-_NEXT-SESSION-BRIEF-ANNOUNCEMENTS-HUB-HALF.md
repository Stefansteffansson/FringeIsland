# Session bridge — 2026-08-21: next-session brief — the announcements Hub half (FEAT-H048)

**Continuation of `2026-08-20_04`** (family closed, waves Ferd, doc health clean). Stefan directed: prepare the next board item for a fresh session. This bridge IS the preparation — the fresh session starts here and should need almost no re-derivation.

## The task

Author **FEAT-H048 — wielded announcement affordances** (a new Hub spec, L4 → 4-ready → build in one session, the H047 rhythm), then build it. It is the last surface of the acting family: the group's announcement board rendered, written, and corrected through the hat.

## Everything the build consumes (verified in the closing sessions — cite, don't re-derive)

- **Platform contracts (merged #567, applied + logged):** `get_group_announcements(p_group_id, p_before, p_limit, p_acting)` · `send_community_announcement(p_group_id, p_title, p_body, p_acting)` · `retract_announcement(p_announcement_id, p_acting)`. Gates substrate-side (limbs 1+2a for the read; +`send_announcements` for send and retract); refusal copy is the tranche-1 helper's limb-naming strings; the platform-announcement plane refuses structurally. Dual actor exclusion and `sent_by_group_id = A` are platform facts — **no surface work owed** for either.
- **The section to extend:** `hub/components/groups/GroupAnnouncementsSection.tsx` (compose/retract currently gate on the personal `send_announcements` grant; read is members-only). It gains the same `acting` prop its two siblings carry — **the group page already computes `actingContext` once and passes it to Forum and Conversations; adding the third consumer is one prop** (`app/groups/[id]/page.tsx`).
- **Ceremony ruling to apply (no new board needed):** announcements are weighty one-time acts — **confirm modals naming the wielding** (the forum pattern: "You are announcing as {A}" / "Announce as {A}"; retract likewise), NOT the chat composer label. The wielded surface is read/announce/retract only (the ruled read-post-reply posture, family-adapted); hat-insufficiency copy names the hat; "Myself" byte-identical.
- **Badges:** announcement author objects already ride the widened ladder with `kind` — reuse `authorKindBadge` if the section renders authors (check at build; the platform payload serves `author` objects).
- **Test pattern:** `GroupAnnouncementsSection.acting.test.tsx` red-first (banner, acting read arg, hat-gated compose, confirms, hat-insufficiency, Myself guard) + a page passthrough cell if not already covered by the existing acting page suite + extend the wielded E2E family (the `e2e-h04x` fixture pattern; or reuse `wielded-forum.spec.ts`'s cast shape). No schema → **fuller-auto merge**.
- **Close-out:** FEAT-H048 `6-done` + L4 rows (hub SPECIFICATION §L4 + features/README — wave `ferd` from birth) + root/hub changelogs + bridge. When the family's surface story closes, say so plainly.

## Environment notes for the fresh session

- **One database** (memory: `one-database-prod-equals-dev`) — every write is production; the walk cast (Wanda/Bert/…, password on the 2026-08-19 walk card in-session — recreate via the idempotent scratchpad script if needed) and Harbour/Riverside stand ready for walks.
- **Start a fresh dev server** if walking/E2E — do not adopt a survivor (memory: `taskstop-dev-server-epipe`).
- Check for sibling sessions before suites (AGENTS.md one-consumer rule).

## The rest of the board (after H048)

TASK-EDT-01 (unlimited edit + label + 3-min grace; the own-delete window question is Stefan's at pull; ships a §1.5 doc-health row with it) · TASK-DBT-03 (suite teardown + audit checklist) · the ADR-U039 topic-channel rider (recorded, unscheduled) · beppe.hopper reaps ~2026-09-14 by design.
