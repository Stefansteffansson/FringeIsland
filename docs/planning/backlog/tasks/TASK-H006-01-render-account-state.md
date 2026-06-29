---
id: TASK-H006-01
title: Render account state — AccountStateProvider/Gate/View + suspended/closed surfaces
status: done
assigned_to: Claude
priority: high
feature: FEAT-H006
owner: hub
wave: ferd
cycle: IDN-9
depends_on: [TASK-PC004-01]
estimated_hours: 5
---

# TASK-H006-01: Render account state (Hub surfaces)

## Description

FEAT-H006 (IDN-9 Hub half). The Hub reads the FIM's own account state via the
paired **FEAT-PC004** contract (`GET /api/account/state`, never a direct table
read — ADR-U009) and renders it honestly instead of dropping a switched-off
member into a broken empty experience.

- **`AccountStateProvider`** — resolves account state once per session in the root
  layout (loading + error handled; never a frozen/blank shell).
- **`AccountStateGate`** — for a **suspended / decommissioned / unknown-state** FIM,
  renders the honest standalone surface **instead of** the chrome (so a switched-off
  member never reaches the profile-dependent account menu). **Active / Mist /
  sessionless pass through** (Mist identity-gated exactly as FEAT-H005 gates the
  account menu).
- **`AccountStateView`** surfaces:
  - **suspended** → "Your account has been suspended by an administrator. Please
    contact support." **No self-reactivation affordance this cycle** (the FEAT-H007
    affordance is deferred/parked with IDN-12); offers **sign-out** so the member is
    not stranded.
  - **decommissioned** → terminal closed-account message, no affordance.
  - **unknown/future state** → safe generic default (open-label switch, no hardcoded
    closed set).
- A quiet **"Account: active"** legibility line shows in profile settings.

Vocabulary: the off-but-not-closed state renders as **suspended** (an admin hold);
"deactivated" was retired as ambiguous — see
`../../hub-v2/account-lifecycle-states-decision.md`.

## Acceptance criteria

- [ ] Active FIM is not interrupted; "Account: active" line legible in profile
      settings (fetched via the Platform API, never a direct table read).
- [ ] Suspended FIM sees the suspended surface (contact-an-admin) with sign-out and
      **no** reactivation affordance.
- [ ] Decommissioned FIM sees the terminal closed-account surface (distinct from
      suspended; no affordance).
- [ ] Mist / sessionless render no account-state surface (pass through).
- [ ] Loading state while the read is in flight; clear error/retry on read failure
      (never silently render the active experience).

## Technical notes

- Hub `ConfirmModal`/UI conventions; client telemetry for which state rendered +
  read failures (no silent fallbacks).
- Switches on the open `state` label from FEAT-PC004; unknown → safe default.

## Verification

- Unit `hub/tests/unit/components/account/AccountStateView.test.tsx` +
  `hub/tests/unit/lib/account/AccountStateProvider.test.tsx` — 11/11.
- E2E `hub/tests/e2e/account-state.spec.ts` — active not interrupted, profile
  legibility, suspended surface, closed surface.
- Red-first throughout; `next build` + lint clean.
