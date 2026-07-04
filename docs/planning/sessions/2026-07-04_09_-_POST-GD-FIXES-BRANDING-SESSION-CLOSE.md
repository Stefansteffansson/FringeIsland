# Session bridge — post-G-D live-testing fixes, branding start, session close

**Date:** 2026-07-04
**Session type:** Post-close continuation of the G-D session (bridges `2026-07-04_07`/`_08`) — Stefan manually testing on dev, fixes shipped as they surfaced. Session closed here; next session opens the G-E decompose.
**Status:** All merged (PRs #73–#77), working tree clean, no open PRs.
**Participants:** Stefan (one schema-gate nod: PR #74) + Claude

---

## What shipped after the G-D close

- **PR #73 — "My groups" account-menu entry.** Found live: sign-in landed on `/groups` but no menu item led back. Red-first shell unit.
- **PR #74 — FEAT-PC010 amendment (schema gate, nodded): creator participation binding.** Stefan's decision: *creating a group means stewarding it AND taking part in it.* `create_engagement_group` replaced in place — after the mandatory `assign_roles`-derived Steward binding, the creator is also bound to the participation role (permission-derived via the `enroll_self_in_journey` marker; soft-skipped for facilitation-only templates; removable). Migration `20260704204343`; the crud suite's creator-binding assert re-specified red-first (1 → 2 bindings + the enroll-self round-trip).
- **PR #75 — launch-checklist items** on bridge `_08` (custom SMTP before cohort onboarding; per-IP sign-in headroom for venue events) + record of the dev auth-limit raises.
- **PR #76 — brand mark top-left on every shell page** (indigo "FI" text tile + wordmark, linking `/` — the entry greets a FIM with "Continue to your groups"). Text tile until a real logo asset lands.
- **PR #77 — `scripts/seed-test-members.js` kept as dev tooling** (alice/bob/carol/dave/erin `@fringe.test`, shared password, idempotent; five FIMs live on dev).
- **Dev auth rate limits raised** via the management API (token_refresh 150→600, verify 30→100, anonymous 150→300) after suite traffic locked out manual sign-ins; `email_sent` stays at the built-in-SMTP cap of 2/hour (the launch-checklist item).

## Findings worth carrying

1. **Grant-toggle observability gap (V1/V4, retro item):** `group_role_permissions` changes leave no audit trail. A transient `invite_members permission required` refusal for a full Steward could not be reconstructed after the fact — role-grant toggles need durable events (role-change cascade obligations name role events; grant toggles slipped through). Route to the cycle retrospective / a later PC-3 or A-ADM slice.
2. **Manual testing with multiple accounts needs separate browser profiles** — Supabase auth cookies are per-browser-profile; a sign-in in one tab silently switches whom every open tab acts as (the E2E suite isolates contexts for the same reason).
3. **Playwright's `webServer` kills the dev server it started.** Stefan's manual session was unknowingly riding a test run's server; when the suite finished the app "went down." When Stefan is testing, leave a session-owned `npm run dev` running — and remember it dies with the Claude session.
4. **The dev-DB now differs from migration defaults deliberately** (auth rate limits) — recorded here + on bridge `_08` so a future "why is config non-default" doesn't chase ghosts.

## Branding thread (open — Stefan picks)

Four SVG mark candidates drafted (32-grid, tile-compatible with the AppShell slot), parked at **[`docs/planning/hub-v2/brand-candidates/`](../hub-v2/brand-candidates/)**: A `fi-mark-a-island-in-the-mist` · B `fi-mark-b-the-journey` · C `fi-mark-c-the-warm-light` (night tile + amber) · D `fi-mark-d-rising-peak`. Review gallery (sizes + both themes): https://claude.ai/code/artifact/bad8e3c1-ebf8-4b1f-a08b-5dc13ee8388c — **awaiting Stefan's pick**; wiring the winner into the shell tile + favicon is a small follow-up PR. (AI-generated candidates were offered as an alternative; blocked on an OpenROUTER key — moot if an SVG wins.)

## Next session

1. **G-E decompose** (`decompose Cycle G-E` — leadership transfer MEM-7, last-member closure MEM-8, group deletion GRP-9; the heaviest cycle; DS-4/DS-5 tagged cascade layers per D2; the group-as-actor design session sits at the G-E → G-F boundary). Bridges `_07`/`_08` + this one carry the live state.
2. Logo pick + wiring whenever Stefan chooses.
3. Standing list: bridge `_08` items 3–4 unchanged, plus finding 1 above (grant-toggle audit gap).
