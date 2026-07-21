# Phase 3 — Identity (A-IDN) completion plan

**Status:** **COMPLETE (2026-07-21)** — Cycles A–E built and retro'd ([retro-2026-07-03](../retrospectives/retro-2026-07-03.md)); **Cycle F built and closed as A-COM Cycle C-F** (both re-entry triggers discharged — DS-3 at the Journeys gate, DS-5 at C-E; the C-F board's full-slice call): IDN-10 live and gated (FEAT-PC017 ↔ FEAT-H029, `6-done`; ADR-U050 origin split; `admin_exit_user_from_platform` retired) and IDN-12 un-parked and built (FEAT-PC005 ↔ FEAT-H007, `6-done`, origin-gated). All 12 A-IDN capabilities are realised. G-36 deleted. See the [Communication plan](./phase-3-communication-completion-plan.md) CB-5 row for the settle and the C-F bridge for the build record. Successor area plan: [`phase-3-groups-completion-plan.md`](./phase-3-groups-completion-plan.md). (Originally: Living plan v1, 2026-06-28.)
**Parent plan:** [`README.md`](./README.md) (Hub v2 rebuild, Phases 0–4). This plan details Phase 3 / Identity; it does not change the phase structure.
**Wave:** Ferd. **Canonical capability inventory:** [`../../products/hub/SPECIFICATION.md`](../../products/hub/SPECIFICATION.md) §L3 (A-IDN, IDN-1..12). This plan references it; §L3 is the authority.

---

## Where this picks up

Phase 3 builds the Hub **area by area, in dependency order** (Identity → Groups → Journeys → Communication → Notifications → Platform-Ops), gate per area. We are in the **first area, Identity (A-IDN — 12 capabilities)**:

- **Done (`6-done`):** IDN-1 (Mist arrival), IDN-2 (Mist→FIM transcendence + farewell), IDN-3 (authenticated FIM identity — sign in/up/out), IDN-4 (own-profile contract + edit). Hub features FEAT-H001..H005 + platform halves FEAT-PC001/PC002/PC003. **These are the Identity capabilities every other area depends on (the §L3 build-order names IDN-3 as the foundation every area's first row needs) — so the downstream is already unblocked.**
- **Remaining:** IDN-5..12 (8 capabilities) — this plan.

**Decision (2026-06-28):** finish the Identity area before moving to Groups (faithful to area-by-area / gate-per-area), with **IDN-10 (exit/deletion) handled as an explicit forward-seam** (see below). Selected over "pivot to Groups sooner."

**Why the cross-area worry does not block this** (analysis, 2026-06-28): an account-lifecycle cascade (e.g. deletion removing group memberships + freezing journey enrollments) is **platform-tier** — DB triggers / RLS / a SECURITY DEFINER RPC over the carried-forward substrate (ADR-U016; `docs/platform/CLAUDE.md` "triggers do the heavy lifting; products wrap admin primitives"). It does **not** require the Groups/Journeys **Hub UIs** to exist. The v1 cascade already exists in substrate (`admin_exit_user_from_platform()`, migration `20260228144747`; see [`../reference/PLATFORM-EXIT-GAP-ANALYSIS.md`](../reference/PLATFORM-EXIT-GAP-ANALYSIS.md)) and the relevant tables are tagged carry-forward in [`./substrate-audit.md`](./substrate-audit.md) (`group_memberships`, `journey_enrollments` = Conformant). The **only** remaining Identity capability with a genuine forward dependency is IDN-10 → DS-3 / DS-5 (realised in the later Journeys / Communication areas).

---

## The remaining capabilities (IDN-5..12)

Descriptions + dependencies are from `SPECIFICATION.md` §L3:186–197. Platform-half / spec IDs are **assigned at decomposition** (paired-spec rule); do not treat the placeholders here as canon.

| IDN | Capability | Internal dep | Platform half (per §L3 external deps) | Cycle |
|-----|-----------|--------------|----------------------------------------|-------|
| IDN-9 | Render account state (active / suspended / decommissioned) | IDN-3 ✓ | PC-2, PC-4 (state columns exist) | **A** (built `6-done` 2026-06-29) |
| IDN-12 | Self-service account reactivation | IDN-9 | PC-2 (state transition), PC-4 (audit) | **A** (deferred/parked) |
| IDN-6 | Render member-visible consent state + history | IDN-3 ✓ | PC-4 (consent store exists — PC002/ADR-U034) | **B** |
| IDN-7 | Update granular consent decisions + sharing controls | IDN-6 | PC-4, PC-3 | **B** |
| IDN-8 | Request + receive complete data export | IDN-3 ✓ | PC-4 (export RPC) | **C** |
| IDN-5 | Private personal Journal surface | IDN-3 ✓ | PC-2 (Journal primitive) | **D** |
| IDN-11 | Per-device sessions + remote sign-out | IDN-3 ✓ | PC-2 (session inventory + remote-sign-out RPC; §L3 notes "routed to G-29") | **E** |
| IDN-10 | Initiate self-service exit / deletion | IDN-3 ✓, IDN-9 | PC-2, PC-4, PC-3, **DS-3, DS-5** | **F (forward-seam)** |

---

## The cycle sequence (Foundation-first)

Each cycle ≈ one paired slice. **Paired-platform-first:** the platform half (PC-2 / PC-4) is authored to `4-ready` and built through its schema gate *before* the Hub half; then the Hub surface consumes it API-first. Red-first throughout.

| Cycle | Capabilities | Build now? | Notes / risks |
|-------|--------------|-----------|----------------|
| **A — Account lifecycle** | IDN-9 → IDN-12 | ✅ (split) | Lightest: `is_active` / `is_decommissioned` columns exist. IDN-9 is the dep foundation for IDN-12 and IDN-10. **Split (2026-06-29):** IDN-9 built → `6-done` (the off state realised as `suspended`, an admin hold); IDN-12 **deferred/parked** — self-service reactivation pairs with self-pause and needs a deactivation-origin field so a member can only reverse their own `paused` account, never an admin `suspended` hold. See [`./account-lifecycle-states-decision.md`](./account-lifecycle-states-decision.md). |
| **B — Consent & privacy (GDPR)** | IDN-6 → IDN-7 | ✅ now | Consent store already exists (PC002/ADR-U034); needs a PC-4 read/update contract + UI. |
| **C — Data export (GDPR)** | IDN-8 | ✅ now | PC-4 export RPC. Standalone. |
| **D — Journal** | IDN-5 | ✅ now | **Confirm at decomposition:** does the PC-2 Journal substrate exist, or is it net-new (a new table → schema gate)? |
| **E — Sessions** | IDN-11 | ✅ now (gate passed) | **Feasibility-gate PASSED (2026-07-03):** no member-facing supabase-js session-list API exists (`signOut` grains are only `local`/`others`/`global`) — but the contract is realisable below the Platform API per house pattern: `auth.sessions` is the documented session store (the JWT `session_id` claim officially correlates with its PK, so "this device" marking and a row-existence liveness check are both docs-blessed), dev-DB `user_agent`/`ip` populated 56/56, last-active = `updated_at` (`refreshed_at` unreliable, 3/56); `auth.refresh_tokens.session_id` FK is ON DELETE CASCADE (deleting one session row kills its refresh chain), and `admin_force_logout` is the schema-gate-approved precedent for SECURITY DEFINER deletes from `auth.sessions`. Scope caveat: a revoked session's access token stays valid until `exp` (docs: guides/auth/signout) — mitigated by the legacy-MVP instant-logout pattern (verified 2026-07-03 in `hub-legacy/lib/auth/AuthContext.tsx`): Realtime broadcast per user (`force-logout:<id>`) for sub-second client sign-out + periodic/on-focus `getUser()` validation as the guaranteed fallback (GoTrue checks session-row existence server-side, docs-blessed). v2 adaptations settled during the gate: per-session (not per-user) targeting; **verify-on-signal** (client validates with Auth before signing out — a socket message is a hint, never an authority); tune polling (focus/visibility primary, slower interval) since broadcast carries immediacy. **Socket doctrine (first tenant):** one WebSocket per client, private per-user channels with Realtime authorization, server-originated signals carrying at most event-type + id, client acts via the authorized path. Notifications (later area) confirmed as the next tenant — legacy MVP pushed full rows via `postgres_changes` (RLS-checked per subscriber, correct but scale-limited); v2 notifications go ping-then-fetch on the same doctrine. **Decomposed 2026-07-03:** [FEAT-PC009](../../platform/core/features/FEAT-PC009-session-inventory-and-revocation.md) + [FEAT-H012](../../products/hub/features/FEAT-H012-per-device-sessions.md) both `4-ready`; the socket doctrine locked as [ADR-U039](../../architecture/decisions/ADR-U039-realtime-socket-doctrine.md); PC-2 §L3 gained the session capability row (closes the G-29-routed reciprocation gap). Platform-first at build: PC009 through its schema gate (new SECURITY DEFINER functions + `realtime.messages` policies), then H012. |
| **F — Exit / deletion** | IDN-10 | ⛔ **forward-seam** | Depends on DS-3 (enrollment-freeze) + DS-5 (forum-content disposition), realised in the later Journeys / Communication areas. See tracking below. |

Order rationale: dependency-correct (IDN-9 before IDN-12/IDN-10), value-aware (GDPR cluster early), heaviest/most-blocked last. None of B–E unblock or block each other, so they can reorder if a platform half is slow.

---

## IDN-10 forward-seam — tracking (so it is not lost)

IDN-10 is **committed, deferred** — not dropped. It is anchored to the **events that unblock it**, with four reinforcing, file-native hooks:

1. **Parked spec.** Author IDN-10's Hub + platform specs now, marked `parked: true` with a precise `parked_reason`: *"blocked on DS-3 (enrollment-freeze) + DS-5 (forum-content disposition) contracts, realised in the Journeys / Communication areas."* → `doc-health-check` **Section 4** sweeps parked items every cycle/wave boundary and flags any whose reason no longer holds → self-fires when DS-3/DS-5 land.
2. **Cascade spec now (ADR-U016).** Write IDN-10's cascade spec with each layer tagged `done / pending-DS-3 / pending-DS-5` (we have the v1 `admin_exit_user_from_platform` cascade + the gap analysis as inputs). This is the authoritative "what's left" record and its re-entry DoR.
3. **Re-entry triggers planted at the unblocking areas** (below) — so finishing Journeys / Communication surfaces the IDN-10 callback at their per-area gates.
4. **Gap register.** Register a `G-NN` entry in [`../../ecosystem/how-we-work/gaps.md`](../../ecosystem/how-we-work/gaps.md) (the canonical cross-entity-incompleteness register) with the dependency + close-condition.

**Precise unblock timing:**
- After **Journeys** (DS-3 realised) → advance IDN-10's **enrollment-freeze** disposition.
- After **Communication** (DS-5 realised) → close IDN-10's **forum-content** disposition, then **un-park and finish IDN-10**.

### Re-entry triggers to plant on later areas

When the per-area plans for Groups / Journeys / Communication are authored, carry these exit-checklist lines:

- **Groups (A-GRP) gate:** confirm IDN-10's group-membership cascade (PC-3) is exercised by the area's membership work; note no IDN-10 close yet.
- **Journeys (A-JRN) gate:** DS-3 now realised → advance IDN-10 enrollment-freeze; update its cascade spec (`pending-DS-3` → `done`).
- **Communication (A-COM) gate:** DS-5 now realised → close IDN-10 forum-content disposition; **un-park IDN-10, finish + gate it, retire old exit code.**

---

## Session cadence (how to execute)

Two alternating session types, staying one cycle ahead on specs (per the parent plan + `ecosystem-decomposition` / `feature-development` skills):

1. **Decompose session** (`ecosystem-decomposition`): author the cycle's **paired** Hub + platform specs to `4-ready` (DoR: stories w/ Given-When-Then ACs, Vertical Impact, platform deps named, ADR-U016 cascade for lifecycle items, edge cases, no open blockers).
2. **Build session** (`feature-development`): platform half first (through its schema gate), then the Hub half, red-first → `6-done` → merge → bridge.

**Confirm at decomposition (do not assume):**
- Cycle D — whether the PC-2 Journal substrate exists or is net-new.
- Cycle E — Supabase per-device session inventory / remote-sign-out feasibility.
- Cycles B/C/F — author the **PC-4 Governance** forward features (consent / export / exit) that don't yet exist as specs.
- Apply the delegated-fact discipline when researching: name one canonical source (§L3), canonical-wins, cite `file:line`, flag non-authoritative sources.

---

## After Identity

Per the parent plan's dependency order: **Groups (A-GRP, 19) → Journeys (A-JRN, 18) → Communication (A-COM, 15) → Notifications (A-NTF, 10) → Platform-Ops (A-ADM, 18)**; Companion (A-COI, 7) + Discovery (A-DIS, 7) when their Domain Services (DS-1/6/7) come online; then **Phase 4** cutover. IDN-10 closes during the Journeys/Communication stretch as above.

**Re-entry trigger — performance hardening (Identity → Groups boundary).** Before starting the Groups area, consult [`perf-hardening-backlog.md`](./perf-hardening-backlog.md) and pull ≥1 NFR bet from it (PROCESS.md §3). The urgent fix (compute–datastore co-location, [ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md)) shipped 2026-06-30; the parked items P1–P4 are scale-hardening best done here — **P2 (collapse the `/groups` read into one `SECURITY DEFINER` RPC) in particular wants the Groups-area query work fresh in mind.**
