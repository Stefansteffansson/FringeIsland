# entry.spec's become-a-FIM CTA failed once in fleet — one observation, not yet a verdict

---
id: TASK-E2E-04
title: entry.spec.ts:46 (become-a-FIM CTA) failed in fleet and passes in isolation — one observation recorded
status: todo
assigned_to: unassigned
priority: medium
owner: hub
wave: ferd
depends_on: []
estimated_hours: 2
---

## What happened

During the RD-B close (2026-08-07), the full E2E fleet came back **134 passed / 1 failed**.
The failure was:

```
[chromium] › tests/e2e/entry.spec.ts:46:5
  › the become-a-FIM CTA opens the in-place transcendence flow (FEAT-H004)
```

## Found, not caused — and this was established, not assumed

- **The failing path touches none of the RD-B diff.** The test drives `/` → *Look around*
  → a Mist materialises → the onboarding journey auto-launches → `/mist` → *Become a FIM*
  → `/become-a-fim`. RD-B changed the roles panel, the admin role-template surface, the
  notification icon map, three BFF routes, and `ConfirmModal`.
- **`ConfirmModal` is the only shared component in the diff, and it is not on this path** —
  grepped across `app/page.tsx`, `app/become-a-fim/`, `components/onboarding/` and
  `components/auth/`: no usage. The change was also additive (`hideConfirm` defaults
  `false`, and the focus-trap expression is byte-equivalent when it is).
- **It passed in the full fleet earlier the same day on the same branch** (133/133, before
  the corrective migration was applied), and **passes 3/3 in isolation** after the failure.

## Why this is NOT filed as "flake"

The standing-tasks README records exactly this trap: `TASK-INT-04` was filed *"after an
earlier 'flake' call was retracted by a second failure."* One fleet-only failure is one
observation. It is recorded here so a second observation has somewhere to land, rather
than being absorbed into a green sweep and losing its age signal.

## The mechanism worth checking first

Line 50 waits up to 30s for the onboarding auto-launch:

```ts
await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });
```

Under a full single-worker fleet this is the timing-sensitive step: it depends on an
anonymous user being minted, `handle_new_user` materialising the personal group, and the
arrival auto-launch resolving — three round-trips against a dev DB that the rest of the
fleet is also hammering. That is a plausible mechanism *and* a plausible red herring;
neither should be asserted without a second observation.

Note the spec is **not** in `TASK-E2E-03`'s shared-identity class — it runs sessionless
(`test.use({ storageState: { cookies: [], origins: [] } })`), so the revocation-target
audit does not cover it.

## Acceptance criteria

- [ ] A **second observation** captured (fleet run reproducing the failure) before any
      mechanism is claimed — or three consecutive clean fleets recorded, after which this
      task closes as unreproduced with the runs named
- [ ] If reproduced: the failing step identified from the trace/screenshot artefact, not
      inferred from the line number
- [ ] Closure states the **mechanism removed**, never a count of green fleets (the
      `TASK-E2E-01` discipline)
