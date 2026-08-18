---
id: TASK-PD019-2
title: Tranche 2 platform build — the two-limb gate reaches the six group-conversation contracts; the group sits, reads, and speaks as itself
status: in-progress
assigned_to: claude
priority: high
feature: FEAT-PD019
owner: platform/domain/communication (DS-5)
wave: unassigned
cycle: 2026-08-18 session
depends_on: [TASK-PD019-1]
estimated_hours: one focused session (the spec's appetite; tranche 3 is a separate pull)
---

# TASK-PD019-2 — wielded group conversations, platform half

One task for STORY-4 (board ruled 2026-08-18, four rulings recorded in the spec). The Hub affordances are specified at their own pull (the H046 pattern); tranche 3 (announcements) stays unpulled.

## Build map (mechanism facts pinned in the spec's tranche-2 walks; the load-bearing ones)

- **Six DROP + CREATE re-issues** — `get_group_conversations`, `create_group_conversation`, `join_group_conversation`, `get_conversation_detail`, `send_message`, `mark_conversation_read` gain trailing `p_acting uuid DEFAULT NULL` (the `20260706150000` overload lesson; ACLs `{authenticated, service_role}` re-stated from the applied objects, probed 2026-08-18). Bodies copied from the applied definitions.
- **The shared helper widens**: `ds5_assert_wielded_content_gate` — `p_permission_name` gains `DEFAULT NULL`; NULL skips limb 2b (this family's bar is membership, which limb 2a checks). Same signature, CREATE OR REPLACE, comment updated. Only `create_group_conversation` passes a permission (`create_group_conversations`).
- **Wielded semantics**: A participates as itself (participant row = A; creator row = A on wielded create; rejoin via the family's own `ON CONFLICT`); wielded sends stamp `sender_group_id = A`; `mark_conversation_read` advances A's single clock (RULED: shared); **every wielded act re-runs both limbs first** (RULED: standing per act — a paused/removed A refuses despite its surviving participant row); availability-guard subject = A; wielded acts against `kind='dm'` refuse via limb 2a's NULL context (no special-case code); the PC026 admin arm stays personal-path-only; hint emitter untouched (RULED: v1 silence — group participants skipped by construction; future rider = topic-scoped channel per ADR-U039 §4, never emitter fan-out).
- **Order discipline (S5)**: limb 1 before anything — a keyless caller learns nothing, not even 'Not a participant'.
- Sibling-assertion sweep at migration time; header names what it invalidates.

## Acceptance check

STORY-4's ACs red-first in a new `wielded-conversation-contracts.test.ts`: wielded list (byte-shape + A's `am_i_participant`), wielded create (limb 2b + A as first participant), wielded join/send/read (A's row, A's clock, ladder display with `kind: 'group'`), the standing-per-act cell (membership removed → 42501 despite the surviving row), the shared-clock cell, the DM refusal cell, keyless/no-standing 42501s naming the limb, Mist refused, additive-default guards green-as-labelled. Communication slice + platform conformance green; migration holds at the schema gate (status `review`, merge only on named approval).
