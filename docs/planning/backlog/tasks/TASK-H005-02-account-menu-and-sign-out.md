---
id: TASK-H005-02
title: FIM-only account menu + sign-out tail (shell chrome)
status: done
assigned_to: Claude
priority: high
feature: FEAT-H005
owner: hub
wave: ferd
cycle: IDN-4
depends_on: [TASK-H005-01]
estimated_hours: 3
---

# TASK-H005-02: FIM-only account menu + sign-out (IDN-3 tail)

# Description

FEAT-H005 STORY-1 (account menu is a FIM affordance) + STORY-4 (sign out). Add a
user/account menu to the shell (`hub/components/shell/AppShell.tsx`): the FIM's
name/avatar opens a menu with **Profile** (link to `/profile`) and **Sign out**.
The menu is offered to **FIMs only** — a Mist has no durable profile and leaves
via the FEAT-H004 farewell, not sign-out. Sign-out wires the existing
`AuthContext.signOut()` (the auth-SDK narrow exception) and returns the member to
the sessionless entry (`/`).

# Acceptance criteria

- [ ] The account menu renders **only for a FIM** (`identity === 'fim'`); a Mist
      and a sessionless visitor get **no account menu and no sign-out** (branch on
      identity status, never a role string).
- [ ] The menu label shows the member's current display name and **updates on
      `refreshNavigation`** after a profile edit (STORY-2 coupling) — sourced from
      the PC003 read contract, not a direct table read.
- [ ] Choosing **Sign out** calls `AuthContext.signOut()` and returns the FIM to
      the sessionless entry (`/`).
- [ ] After sign-out, protected surfaces (`/groups`, `/profile`) gate as for any
      sessionless visitor (no leaked authenticated state).
- [ ] **Profile** navigates to `/profile`.

# Technical notes

- New: `hub/components/shell/AccountMenu.tsx` (`'use client'`, `useAuth()` →
  `identity` + `signOut` + `user`). Reuse the `displayLabel` helper and
  `fetchProfile` from `hub/lib/profile/client.ts`; listen for `refreshNavigation`
  to refresh the label. Mount `<AccountMenu />` in the `AppShell` header beside
  `NotificationBell`.
- Use a simple toggle + click-away backdrop (simplified from the oracle
  `hub-legacy/components/Navigation.tsx`); no browser `confirm()` (Hub rule — use
  `ConfirmModal` if a confirm is ever needed; sign-out needs none).

# Verification

- Unit (jsdom): renders for FIM, renders nothing for Mist/sessionless; sign-out
  calls `signOut` + emits `session.ended` + navigates `/`; label refreshes on
  `refreshNavigation`. Red-first, tagged `FEAT-H005 STORY-1/4 (unit)`.
- Sign-out + gating journey lands in TASK-H005-03 (E2E).
