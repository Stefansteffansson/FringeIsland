# TASK-H004-02: The farewell — explicit-erase / "say goodbye" (STORY-3)

---
id: TASK-H004-02
title: The farewell — Mist explicit-erase via ConfirmModal, returning to the sessionless entry
status: done
feature: FEAT-H004
owner: hub
wave: ferd
depends_on: [TASK-PC002-01, TASK-H003-04]
estimated_hours: 4
---

## Description

Give a Mist who decides to leave a **"say goodbye / leave"** affordance — the honest counterpart to leaving silently (the reaper handles the silent case server-side, FEAT-PC002). On confirm (via **`ConfirmModal`**, the Hub's confirmation primitive — never `confirm()`), the Hub calls the paired **FEAT-PC002 `explicit_erase_mist` RPC** (immediate erasure cascade), then **signs out**, returning to the **sessionless entry**. Offered **only** to a Mist (a FIM leaves via account-state/exit, IDN-9/10/12 — not this farewell).

## Acceptance criteria

- [ ] A Mist session shows a **"say goodbye / leave"** affordance; confirming via **`ConfirmModal`** calls **`explicit_erase_mist`**, erases the session data immediately, and returns to the **sessionless entry** (`/`) (STORY-3).
- [ ] The farewell is **not offered** when the identity is a **FIM** — no farewell/erase Mist chrome appears for a FIM (STORY-3 / STORY-4).
- [ ] After explicit-erase the user is **sessionless** (`signOut` clears the session); a later return is a new Mist (continuity unchanged from FEAT-H003) (STORY-3).
- [ ] The destructive confirm flows through **`ConfirmModal`**, never browser `confirm()` (Hub CLAUDE.md); the erase RPC goes through the **Platform API route**, not a browser RPC call (ADR-U009).
- [ ] Erase failure is **surfaced**, never silently swallowed (V4 discipline); no sign-out on failure (the Mist remains).

## Technical notes

- **New `hub/components/ui/ConfirmModal.tsx`** — copy-with-correction from the `hub-legacy` oracle (`hub-legacy/components/ui/ConfirmModal.tsx`), adapted to house style: **named export** (like `Button`/`InlineError`), `data-testid` hooks, `variant='danger'` for the destructive farewell, an in-flight/`busy` state, Escape/backdrop cancel. This is the design-system confirmation primitive the Hub v2 tree was missing.
- **New lib `hub/lib/auth/farewell.ts`** — `explicitEraseMist(supabase)` wrapping `supabase.rpc('explicit_erase_mist')` (lib-behind-route).
- **New route `hub/app/api/auth/farewell/route.ts`** — server client, authenticated guard, calls `explicitEraseMist`, records audit + telemetry (`farewell.requested/succeeded/failed`). The farewell fires **no** notification (a leaving Mist holds no durable address — Notifications vertical = none).
- **`AuthContext.sayGoodbye()`** — POST `/api/auth/farewell` → on success `supabase.auth.signOut()` (→ sessionless) → return `{ error }`; on route error return the error and do **not** sign out.
- **`hub/app/mist/page.tsx`** — add the Mist-only "say goodbye" affordance opening `ConfirmModal`; on confirm call `sayGoodbye()` then `router.replace('/')`. Gated by **status**, never a role string.
- **Red-first:** unit (`ConfirmModal` render/confirm/cancel; the farewell affordance opens the modal + confirm calls `sayGoodbye` + navigates; FIM gating hides it; AuthContext `sayGoodbye` glue) + integration (`explicitEraseMist` erases a real Mist; a FIM caller is rejected `42501`).

## Verification

- `npm run test:unit -w hub` green (ConfirmModal + farewell + AuthContext specs); `npm run test:integration:auth -w hub` green (new `farewell.test.ts`); existing suites green; `npm run lint -w hub` clean.
