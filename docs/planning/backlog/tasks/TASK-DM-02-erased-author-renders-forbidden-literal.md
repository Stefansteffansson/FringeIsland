---
id: TASK-DM-02
title: An erased author renders the forbidden literal "[Deleted User]" — the C-B display law says "Unknown"
status: registered (2026-08-15) — small corrective; mechanism choice rides TASK-IDN-01's board
assigned_to: unassigned
priority: medium
feature: FEAT-PD012/DS-5 display (COM-14 attribution ladder) + PC-2 scrub mechanics
owner: platform/domain (DS-5 reads) + platform/core (delete_own_account scrub)
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 2-3 once the mechanism is chosen
---

# TASK-DM-02 — the display law vs the scrub-in-place

**Found:** 2026-08-15, live walk (the DM-01 tombstone proof). After Beppe's self-deletion, Fredrik's DM view shows **"[Deleted User]"** as the thread title and on the tombstoned bylines. The recorded C-B display decision (`20260720120000` header) says the opposite, verbatim: *"erased authors render 'Unknown', **never the sentinel's literal '[Deleted User]'** (lifecycle leak)"* — the literal tells the survivor what the other member did with their account.

## Root cause, verified

`delete_own_account` does not reassign authorship to the sentinel — it **scrubs in place**: Beppe's `users` row and personal group persist, renamed to `[Deleted User]`. The attribution ladder then fires **rung 1** (backing users row exists → show the privacy-shaped name) and faithfully renders the scrubbed literal. Two individually-coherent mechanisms (C-B's ladder, the IDN scrub) colliding on exactly the string the law forbade. The DM read's thread *title* resolves the participant name through the same scrubbed row.

## Fix directions (pick with TASK-IDN-01's mechanism)

- **A. Display-side:** the ladder (and the DM participant-name resolution) treats `is_decommissioned = true` as rung 3 → 'Unknown'. Works regardless of scrub mechanics; smallest diff.
- **B. Scrub-side:** `delete_own_account` reassigns content to the sentinel (no backing row → rung 3 fires naturally) instead of renaming in place. Heavier; aligns with what `admin_hard_delete_user` produces, and IDN-01's final wipe converges the states anyway.
- Either way, red-first: a cell that self-deletes a fixture and asserts the survivor's read returns `Unknown`/`unknown` attribution — never the literal.

## Related

- [TASK-IDN-01](TASK-IDN-01-self-deletion-grace-period-completion.md) — the grace-period completion; its final-wipe path already produces the correct display.
- C-B display law: `supabase/migrations/20260720120000_c_b_forum_and_attribution_contracts.sql:36-42`.
