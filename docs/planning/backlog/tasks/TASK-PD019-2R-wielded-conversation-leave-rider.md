---
id: TASK-PD019-2R
title: Tranche-2 rider — wielded conversation leave (key-only, the exit-family precedent)
status: review — built and verified 2026-08-20 (red-first 3 red -> 15/15 in the T2 suite; slices at gate); HELD at the schema gate — merge only on an explicitly named approval, and BEFORE the FEAT-H047 PR
assigned_to: claude
priority: high
feature: FEAT-PD019
owner: platform/domain/communication (DS-5)
wave: unassigned
cycle: 2026-08-20 session (found at the H047 consumer build)
depends_on: [TASK-PD019-2]
estimated_hours: small (one function)
---

# TASK-PD019-2R — the leave rider

**Found at the H047 consumer build:** `leave_group_conversation` existed and tranche 2 missed it — the T2 mechanism walk enumerated a hand-picked function list instead of sweeping the whole family (decomposition fault, recorded in the spec's tranche-2 walks with the lesson). Consequence without the rider: a group that joined a thread could never leave it; the Hub's Leave door would be a dead end under a hat.

**Design (precedent-following, flagged for the gate):** wielded leave is **KEY-ONLY** — limb 1 (the caller's `act_as_group` in A) + A's own active participant row; deliberately **no limb 2a**. Leaving is an act on A's own participation — the analogue of `leave_group_as_group` (PC015 exit family, key-gated, never context-blessed). Standing-per-act governs acts through A's standing in B; requiring standing to *stop* participating would make a removed group uncleanable by its own key-holders. The suite's standing cell now proves leave still works after A's removal.

Migration `20260820120000`: DROP + CREATE with trailing `p_acting`; personal path byte-identical; suspended hard-hold unchanged (subject-independent); ACLs re-stated; DO-block verification. Applied to the one DB and recorded in the migration log.
