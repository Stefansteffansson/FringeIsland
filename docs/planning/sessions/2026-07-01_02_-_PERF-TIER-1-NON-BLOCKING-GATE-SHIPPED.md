# Session bridge — Perf Tier 1 shipped: the account-state gate is non-blocking

**Date:** 2026-07-01 (continues `2026-07-01_01`)
**Session type:** Build (perf Tier 1) via `feature-development` — spec amendment + red-first.
**Status:** **Tier 1 shipped + merged** (PR #36, `e25e8d5`). The serial account-state gate that blocked every page render is gone.
**Participants:** Stefan + Claude

---

## What shipped

**Tier 1 — non-blocking account-state gate (FEAT-H006 / IDN-9), `TASK-H006-02`.**

The root-layout `AccountStateGate` blocked **every** page on a serial `/api/account/state` round-trip before the page rendered + started its own fetches (the client-render waterfall isolated in `2026-07-01_01`, post ADR-U035 co-location). Removed.

`AccountStateView` is now **optimistic, intercept-on-confirmed**:
- In flight → render the page immediately (member treated as active); the page's own `/api/groups` + `/api/profile/me` fetches now fire **in parallel** with the account-state read instead of behind it. (They were already sibling components — `GroupsPage` / `AccountMenu` — so **de-blocking the gate was the only change needed** to parallelize them; nothing was chained.)
- Intercept **only** on a confirmed off-state (`suspended` / `decommissioned` / unknown) or a read **error** (error interception preserved — never silently leave a member on the active experience).
- Implementation: dropped `if (loading) return <LoadingState/>`; added `if (loading && !error) return children` (`loading` still suppresses a stale-surface flash during `reload()`).

**Deliberate trade-off (in the spec):** a switched-off member may briefly see the chrome before the surface intercepts — acceptable because the data is RLS-protected (`users_select_active` hides their own rows).

**Architecture integrity:** Hub shell rendering only. API-first (ADR-U009) holds, Platform Core still owns the data + FEAT-PC004, the L1–L5 decomposition is untouched. FEAT-H006 stays `6-done` (documented amendment + revised STORY-4).

## Evidence

- **Red→green (demonstrated red):** STORY-4 unit test rewritten (in-flight → optimistic children, no blocking gate) — confirmed **red** against old code (rendered "Checking your account…"), green after. Second unit test pins no-stale-surface-flash during `reload()`.
- Full Hub unit suite **160/160**, `next build`, `lint` all clean.
- **E2E run live (dev server + real substrate): 31/31 green** — active path asserts no "Checking your account" gate; suspended/decommissioned interception unchanged.

## Open / carry-forward

1. **Live before/after measurement — NOT done** (needs Network tab / `x-vercel-id` on the deployed Hub). The change removes one serial ~80 ms round-trip from every page load; confirm the felt improvement.
2. ~~E2E not re-run live~~ **Done** — full E2E suite run live, 31/31 green (incl. the four FEAT-H006 specs).
3. **Tier 2 (the genuine "European-fast" lever) — next:** draft an **ADR** for server-rendering the initial page with its data (Next.js RSC via the Platform API server-side — API-first preserved) + update `hub/CLAUDE.md`'s CSR lean. Collapses the client waterfall to one round-trip. (Carve-out: ADR + steering-file edit → pauses for the merge nod.)
4. **ADR-U035 verification-note correction** (from `2026-07-01_01`, still pending): the Vercel Functions dashboard shows its saved default (`iad1`), not the `vercel.json` override — verify region via the `x-vercel-id` header. Add as an ADR addendum.
5. **Cycle D (IDN-5 Journal)** remains the next *feature* cycle once responsiveness work is where Stefan wants it.
