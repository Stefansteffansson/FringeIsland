# Forum replies — addressing and collapse (and the open depth question)

---
id: TASK-FORUM-01
title: Give forum replies an address and a collapse, and decide whether the depth cap stays at two
status: todo
assigned_to: claude
priority: medium
feature: FEAT-H026
owner: hub
wave: ferd
cycle: none
depends_on: []
estimated_hours: 5
---

## Description

A-COM area-gate finding (2026-07-22, Stefan's live walk, scenario 5). Walking the forum, Stefan asked why replies stop at two levels and whether that is normal practice. Two things came out of it, and **Stefan's disposition was explicit: note it for future development, leave the build as is today.** Nothing here is a defect; the forum behaves exactly as specified.

**The invariant has no recorded rationale.** `enforce_flat_threading` pins the depth in the substrate with an oracle-pinned refusal ("Cannot reply to a reply. Maximum thread depth is 2 levels."), carried in from the v1 build as a strong oracle invariant (B-COMM-004..007) and preserved without ever being re-argued. `FEAT-PD009` §68 records the consequence ("flat threading bounds depth, not width" — hence unpaged replies) but nowhere the reason. A walker asked a question the docs could not answer; whatever this task decides, the *why* should end up on paper.

**The affordances that make a shallow cap livable are missing.** Stefan's Facebook screenshots plus the documented structure he supplied are the reference.

> **Mind the vocabulary collision — "2 levels" means different things in the two systems.** Facebook's own framing is "a maximum depth of 2 levels *under any single top-level comment*": top-level comment → **Level 1** direct reply → **Level 2** reply-to-a-reply, with a reply to a Level 2 flattened back into Level 2. That is **two reply tiers under the comment, three rendered tiers in total**. FringeIsland's `enforce_flat_threading` says "Maximum thread depth is 2 levels" and means something narrower: a top-level post → **one** reply tier, full stop. So the two products' identically-worded rules differ by a whole tier, and FringeIsland is the shallower of the two. Any discussion of "matching Facebook" must name tiers explicitly rather than reuse the phrase "2 levels", or it will decide the wrong thing. (An earlier revision of the gate record wrongly claimed Facebook was structurally identical to ours; corrected there.)

What makes Facebook's cap livable is not the extra tier but two surface affordances FringeIsland lacks:

1. **Collapse** — replies hidden behind a `View N replies` disclosure until asked for. This is the real answer to the width bound PD009 §68 accepted: depth is capped, width is not, and nothing currently keeps a long thread scannable.
2. **Address** — the composer reads `Reply to <name>` and the reply body opens with that person's name as a link. Facebook uses this *even at tiers where the indent already shows who is being answered* — structure and address are belt-and-braces, not alternatives.

The cost split matters and should survive into whoever picks this up: collapse and addressing are **surface-only** — no schema change and no weakening of the depth trigger, because an address is *content*, not structure. Changing the cap from two tiers to three is **substrate work** and a real design decision (see the open question below).

## Acceptance criteria

- [ ] Replies collapse behind a `View N replies` disclosure, expanding in place; a thread with many replies stays scannable without scrolling past every reply
- [ ] Replying carries an explicit address: the composer names who is being answered, and the posted reply renders that person's name at its head (mention as content — the depth trigger stays untouched and its refusal keeps firing for a genuine reply-to-a-reply)
- [ ] The two-vs-three-tier depth question is **decided and written down** — either way, the rationale lands in `FEAT-PD009` so the next walker gets an answer (this criterion is satisfied by a recorded decision, not by a code change)
- [ ] Red-first units for both affordances; the existing flat-threading integration probes (P0001, oracle message text) stay green untouched

## Technical notes

- Surface: `hub/components/groups/GroupForumSection.tsx` (the `Start a thread...` composer and the reply list). Collapse is pure rendering over the payload already fetched — `get_group_forum` returns each top-level post carrying its replies chronologically and unpaged, so no contract change is needed.
- Addressing as content needs no migration. Prefill the reply composer with the parent author's display name, resolved through the COM-14 attribution ladder so a former member renders "Former member" rather than a stale name.
- **Open question — do not resolve by default.** Moving from one reply tier to two (i.e. matching Facebook's actual shape) touches `enforce_flat_threading`, the oracle-pinned refusal message, and the invariant B-COMM-004..007 pins; it is ADR-shaped, not an afterthought of this task. Note that Facebook's flattening rule is the interesting half of its design: depth is capped, and an over-deep reply is *absorbed* into the last allowed tier rather than refused. FringeIsland refuses instead (P0001). Absorbing is friendlier at the surface but needs the address affordance above to stay comprehensible — which is why these two halves belong in one task. Decide it on what a guided group of roughly 5-15 people needs — a public comment section with hundreds of reactions is not the comparable case, and deep nesting fragments one conversation into many half-private ones, which cuts against a group all walking the same journey.
- Related walk observation in the same gate record: threads have no titles by design (`FEAT-PD009`:78), which compounds the scanning problem this task's collapse addresses.

## Verification

Unit tier for collapse and addressing; the forum E2E extended to expand a collapsed reply set and post an addressed reply; the flat-threading integration probes re-run unchanged. Manual: a thread with 5+ replies reads as one scannable item, and two replies to the same thread make it obvious who is answering whom.
