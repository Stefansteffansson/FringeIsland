# Extract the first design-system primitives + the vertical-seam libs

---
id: TASK-H001-02
title: Extract the first design-system primitives + the vertical-seam libs
status: done
assigned_to: Claude (CC)
priority: high
feature: FEAT-H001
owner: hub
wave: ferd
depends_on: [TASK-H001-01]
estimated_hours: 3
---

## Description

Extract the **design-system layer as its own location** (`hub/components/ui/`, the Hub's canonical primitive home per Hub `CLAUDE.md`) with only the primitives this slice renders, and stand up the **vertical-seam libs** so the seams are wired from line one (not retrofitted). Minimum primitives only (Appetite: variable scope).

## Acceptance criteria

- [ ] `hub/components/ui/`: `Spinner`/`LoadingState` (V never-frozen-UI), `EmptyState`, `InlineError`, `Button`, `TextField`, `NotificationBell` (V3 mount seam — bell icon, no delivery logic).
- [ ] `hub/lib/observability/telemetry.ts` — `emitTelemetry(name, props)` (V4); client+server safe; exposes a test sink; never silently swallows errors.
- [ ] `hub/lib/audit/audit.ts` — `recordAuditEntry({ actorAuthId, action, props })` (V1); structured seam with an explicit Phase-3 PC-4 binding TODO ("where the substrate supports it").
- [ ] `hub/components/shell/AppShell.tsx` — minimal authed shell header mounting `NotificationBell` (V3 seam present in the shell).
- [ ] Primitives carry no business logic; `npm run lint` + `next build` green.

## Technical notes

- `lucide-react` is already a dep (bell icon).
- Keep primitives presentational; data/logic stays in pages/routes/libs.
- Telemetry + audit are seams: real, wired call paths, honest about being seams (deep Privacy/GDPR + audit-table binding is Phase-3 Identity).

## Verification

- `cd hub && npm run lint && npm run build` green.
- Primitives imported by the login + groups pages in later tasks render loading/empty/error states.
