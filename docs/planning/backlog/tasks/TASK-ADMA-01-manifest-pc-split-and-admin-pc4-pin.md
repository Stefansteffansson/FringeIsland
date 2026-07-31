# Manifest PC-1..PC-4 split at function granularity + the admin_*-is-PC-4 pin

---
id: TASK-ADMA-01
title: Execute board AB-3 — four-way split of the CORE function declaration in the ownership manifest, unclassified-fails-red, plus the pinned mechanical rule admin_* → PC-4
status: todo
assigned_to: claude
priority: high
feature: none  # gate/manifest work (GC-13/AC3-O5 closure), not a FEAT build
owner: platform
wave: ferd
cycle: ADM-A
depends_on: []
estimated_hours: 3
---

## Description
The ownership manifest's ~100-function CORE declaration (GC-1 seed) is deliberately flat; the anatomy's admin-holds-are-PC-4 sentence is carried by prose alone (AC3-O5). Board AB-3 (settled 2026-07-31): full four-way split — every CORE function labelled PC-1/PC-2/PC-3/PC-4 in `supabase/ownership.manifest.json`; the conformance suite gains (red-first) an unclassified-fails-red rule and a pinned mechanical rule that every `admin_*`-prefixed function resolves to PC-4. **Runs before ADM-A's first new function lands** so FEAT-PC018/PC019's functions are born classified (PC-1 / PC-4 respectively).

## Acceptance criteria
- [ ] Red demonstrated first: the new gate rule fails against the flat manifest, then greens on the split.
- [ ] Every function in the CORE declaration carries a PC-1..PC-4 label; classification judgment calls carry a `note`.
- [ ] `admin_* → PC-4` pinned as a mechanical assertion; a counter-labelled admin function fails with a stated reason path.
- [ ] Full platform conformance suite green; no schema touch (manifest + tests only — not a schema-gate PR).

## Verification
`ownership-manifest-conformance` + `function-classification-completeness` suites green; GC-13/AC3-O5 annotated CLOSED in the Audit III register (same-day, per the AC-7 lesson).
