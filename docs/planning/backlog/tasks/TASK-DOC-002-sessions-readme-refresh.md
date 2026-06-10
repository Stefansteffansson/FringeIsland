---
title: Refresh docs/planning/sessions/README.md index (5 of 91 files listed)
status: todo
assigned_to: unassigned
priority: low
feature: none (doc hygiene — raised by doc-health-check 2026-06-10)
owner: planning
wave: ferd
---

# TASK: Refresh the sessions README index

## Why

The 2026-06-10 doc-health-check count-lag check (skill known-gap #4) found
`docs/planning/sessions/README.md` mentions 5 of 91 files in its directory — the same failure
pattern recorded on 2026-04-17 (then 4 of 43), now roughly doubled.

## What to do

Either (a) regenerate the index listing every session file with a one-line purpose each, or
(b) restructure the README as a curated guide ("the bridges that matter") with an explicit note
that the directory listing is authoritative and the index is deliberately partial. Option (b) is
cheaper and probably right for a directory of historical records — but make the curation explicit
so the count-lag check can be taught to accept it.

## Done when

The README either matches the directory or declares its curation policy explicitly; the
doc-health-check skill's known-gap #4 note is updated if (b) is chosen.
