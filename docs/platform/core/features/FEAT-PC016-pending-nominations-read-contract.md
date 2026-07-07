# FEAT-PC016: Pending-nominations read contract — the nominee's window, substrate-homed

---
id: FEAT-PC016
title: get_my_pending_nominations() — the stewardship nominee's own pending-nomination read, mirroring get_my_invitations(); leadership.ts becomes a thin consumer (closes the 2026-07-06 audit LOW finding)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The 2026-07-06 compliance audit's one LOW finding (bridge `_15`; Groups retro §5): `hub/lib/groups/leadership.ts` `fetchPendingNominations()` derives "which nominations are pending" in **client TypeScript** — reading the `notifications` table shape directly through the BFF and doing **client-clock date math** on `expires_at`. RLS scopes the rows and `respond_to_stewardship_nomination` gates expiry authoritatively, so it is not a hole — but the derivation is sole-homed in Hub code: a sibling surface (the Gimbal) would have to re-implement it, and the client clock is not the platform clock. Every other Groups read went through a contract; this is the one that didn't.

### Why Platform Core (Organisation)

Stewardship nominations are PC-3 succession machinery (FEAT-PC014); the read mirrors `get_my_invitations()` (FEAT-PC012), PC-3's established own-window pattern. Not modellable in a Domain Service — succession is Core's, and the read must share the substrate clock and the FIM-only posture of its sibling.

## Solution sketch

One `SECURITY DEFINER` read mirroring `get_my_invitations()` exactly (FIM-only guard, `search_path = ''`, stable, jsonb array, granted to `authenticated`):

- **`get_my_pending_nominations() → jsonb`** — the caller's own pending stewardship nominations from `notifications`: `type = 'stewardship_nomination'`, `action_taken IS NULL`, `expires_at > now()` (**server clock**), recipient = the caller's personal group. Each row: `notification_id, group_id, group_name, created_at, expires_at` (the `PendingNomination` shape `leadership.ts` already exposes — payload-compatible by design). Empty array when none.
- **Hub side (rides the FEAT-H019 cycle, no separate surface work):** `fetchPendingNominations()` becomes a thin RPC consumer; `GET /api/me/nominations` and the `PendingNominations` UI are externally unchanged.

Rides the FEAT-PD002 schema-gate migration as a sibling rider (Journeys kickoff batch, per the Groups retro §5 action item).

## Appetite

Small — one function + grant, a handful of integration tests, one lib swap. Half a session inside Cycle J-A.

## Rabbit holes

- **Don't touch the respond path.** `respond_to_stewardship_nomination` stays the only authority on acting/expiry; this is a read.
- **Don't generalise to "all my actionable notifications".** That read is A-NTF's (NTF-4), designed under its own area; this contract is deliberately nomination-scoped, like its invitation sibling.
- **Don't reshape the payload.** `PendingNomination`'s existing field set is the contract; additive later if A-NTF wants more.

## No-gos

- No write path, no expiry mutation, no nomination lifecycle changes.
- No notification read-state handling (NTF-7 territory).
- No change to `/api/me/nominations`'s external shape.

## Stories

### STORY-1: My pending nominations, from the substrate clock
As a nominated FIM, I want my pending nominations resolved by the platform, so what I see never depends on my device's clock or a surface's re-implementation.

**Acceptance criteria:**
- Given a FIM with two pending nominations and one expired one, when they call `get_my_pending_nominations()`, then exactly the two pending rows return (`notification_id, group_id, group_name, created_at, expires_at`), newest first — the expired one excluded by the **server** clock.
- Given a nomination already acted on (`action_taken` set), when they call it, then it does not appear.
- Given a FIM with none, then `[]`; given a Mist, then `42501` (the `get_my_invitations` FIM-only mirror).
- Given another member's nominations, when the caller reads, then only the caller's own recipient rows ever appear (own-window scope).

### STORY-2: The Hub thins to a consumer (closes the LOW finding)
As the platform, I want `leadership.ts` to relay the contract, so the pending-derivation has exactly one home.

**Acceptance criteria:**
- Given the contract exists, when `fetchPendingNominations()` runs, then it calls the RPC and performs **no** filtering, date math, or table-shape knowledge of its own; the `PendingNomination` payload and `GET /api/me/nominations` behave identically to before (asserted by the existing tests).
- Given the audit finding's terms, when this ships, then the finding is recorded closed in the perf/compliance trail.

## Platform dependencies

**Existing, Conformant:** the `notifications` substrate (recipient-group-keyed, smart-notification fields), `get_current_personal_group_id()` (P-O1), the FEAT-PC014 nomination writer, the FEAT-PC012 `get_my_invitations()` pattern. **Schema gate:** one new SECURITY DEFINER function + grant → `review`, explicit nod (rides the FEAT-PD002 migration).

## Cross-product impact

The **Gimbal** inherits the nominee window by calling the same contract — the finding's exact risk (sibling re-implementation) is what this closes. Consumed by the Hub via the existing `/api/me/nominations` BFF route (FEAT-H017's surface, unchanged).

## Vertical impact

- **Privacy/GDPR:** own-recipient rows only; group names resolve via the display-identity substrate already embedded in the notification rows; no new data collected.
- **Notifications:** reads the V3 substrate; changes no delivery semantics; the smart-notification action path is untouched.
- **Administration:** none — succession authority (PC014) untouched; the read is audit-neutral.
- **Observability:** refusals are SQLSTATEs; the consuming route's existing telemetry is unchanged; the contract makes pending-state derivation traceable to one home.
- **Transactions:** None.
- **Extensibility:** payload jsonb-additive; no vocabulary introduced (`stewardship_nomination` is the existing type value, read not extended).

## Performance budget

N/A (no surface) — the read replaces a client-side derivation with one RPC of equal weight on an already-Edge route; no budget class changes for the consuming surface.

## Open spec questions

1. **Ordering guarantee.** Default newest-first (`created_at DESC`, the invitations mirror); confirmed against the existing UI expectation at build.

## Implementation notes

Built Cycle J-A, 2026-07-07, riding the FEAT-PD002 schema-gate migration `20260707130821` (nodded by Stefan). `get_my_pending_nominations()` mirrors `get_my_invitations()` exactly (FIM-only guard, `search_path=''`, STABLE, `coalesce('[]')`, revoke-from-anon-explicitly grants); `group_name` resolves from the payload the PC014 nomination writer embedded (the display-identity-in-row posture); ordering `created_at DESC, id DESC`. **Red-first:** 6 integration tests demonstrated red (PGRST202, fixtures via the real `nominate_steward` writer) → green post-apply. **STORY-2:** `fetchPendingNominations()` thinned to a pure RPC relay (no table read, no filtering, no client-clock math); the two unit tests that pinned the old table-read mechanics were re-pointed at the thin-relay behaviour (labelled — the spec prescribes exactly this change); `GET /api/me/nominations` and the `PendingNomination` payload unchanged, remaining leadership tests green unchanged. The 2026-07-06 audit LOW finding is closed (recorded in `docs/planning/hub-v2/api-conformance-register.md` at the J-A close).
