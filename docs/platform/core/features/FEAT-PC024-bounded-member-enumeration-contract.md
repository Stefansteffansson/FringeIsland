# FEAT-PC024: Bounded member enumeration — the members list learns pages, search, and honesty about its own size

---
id: FEAT-PC024
title: Bounded member enumeration — the keyset + server-search re-issue of `admin_get_users` (the RB-3 ruling; the parked paging decision reopened by the W-5 measurement)
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

ADM-E's platform half (RB-3, settled 2026-08-03). The contract walk at decomposition (2026-08-03, cumulative-forward over the 100 live migrations + the Hub surface at HEAD) found:

1. **The parked decision this feature reopens is recorded in the substrate's own header.** `admin_get_users` (latest re-issue `20260801180000:33`) returns one unbounded `jsonb_agg` array ordered by `display_name, id` (`:66`) — no limit, no cursor, no search parameter — and its header (`:3-22`) records the deferral verbatim: keyset paging waits "until a measurement asks about payload size (~300 KB at today's scale)". The W-5 walk finding **is** that measurement (the RB-3 ruling: "the walk was the measurement"); this re-issue discharges the B-PERF pagination trigger.
2. **The surface confirms the premise end-to-end:** one full fetch per filter into component state (`hub/components/admin/AdminMembersList.tsx:52,59-60`), client-side substring search over the fetched set (`:85-94`), a plain table, no selection model — 1,918 non-Mist rows on the dev DB behind every list paint.
3. **The keyset precedent doesn't transplant unmodified.** `admin_get_audit_log` (`20260802120000:365`) is the from-birth keyset precedent — `LEAST(GREATEST(COALESCE(p_limit,50),1),200)` (`:383`), `ORDER BY created_at DESC, id DESC` — but its cursor is a **bare timestamp** (`p_before`, `:403`), which fits an append-only log and does not fit a list ordered by a **non-unique, mutable** display name. The members re-issue needs a composite `(display_name, id)` cursor.
4. **Gate-message drift found at the walk:** `admin_get_audit_log` raises `42501` with `'Unauthorized'` (`:381`) where the whole member family says `'platform administrator required'`. This re-issue keeps the member family's message; the audit read's drift is recorded, not chased.
5. **No search substrate exists anywhere** — no ranking, no trigram index, nothing. DS-6 stays unconsumed (the standing record); at platform scale a plain `ILIKE` predicate is the honest tool.

RB-2's bulk mechanics deliberately need **nothing** from this half: the BFF loops the proven single contracts (`admin_update_user_status` `20260801190000:142`; `admin_force_logout` `:399` called one-id-at-a-time so its per-call audit row becomes a per-member row), so ADM-E's one schema gate is exactly this read re-issue.

### Why Platform Core (PC-4)

Re-issue of an existing PC-4 contract (registered by name in the manifest's `functions."PC-4"` — a signature change needs no manifest edit; verified against the conformance suite's registration-by-name rule). The `admin_*` pin binds it; no Domain modelling question exists for an admin-plane read.

## Solution sketch

One migration, one schema gate (held with red evidence + apply commands for named approval — the standing rule). `DROP FUNCTION public.admin_get_users(text)` + re-issue:

**`admin_get_users(p_filter text DEFAULT 'default', p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_after_name text DEFAULT NULL, p_after_id uuid DEFAULT NULL) → jsonb`** — plpgsql, STABLE, SECURITY DEFINER, `SET search_path = ''`, grants unchanged (REVOKE PUBLIC/anon; EXECUTE to authenticated + service_role).

- **Return shape (breaking, deliberately):** `{users: [...], next_cursor: {name, id} | null, generated_at: <now()>}`. The array becomes a keyed object: `users` carries the unchanged walked row shape (`id`, `display_name`, `email`, `account_state`, `is_platform_admin`, `created_at` — every derivation preserved verbatim, incl. the server-side `account_state` CASE and the Mist exclusion); `next_cursor` is null exactly when no further rows match; `generated_at` is the server clock the surface's "As of" line renders (the H034 dashboard precedent — a client-stamped time would claim a freshness the server never asserted). Staying a scalar `jsonb` **preserves the db-max-rows escape** the 20260801180000 header exists for.
- **Keyset:** ordering stays the shipped `display_name, id` (ascending); page predicate is the row-value comparison `(display_name, id) > (p_after_name, p_after_id)`; cap mirrors the precedent exactly — `LEAST(GREATEST(COALESCE(p_limit,50),1),200)`. Providing exactly one of the two cursor halves refuses `22023` (an incomplete cursor is a malformed argument, not page one). **Mutable-key honesty recorded:** a rename between page fetches can skip or repeat that row — accepted for a refresh-based admin list (the same drift class an offset page has), stated here so nobody later "fixes" it into a stateful cursor.
- **Server search:** `p_search` NULL/empty ⇒ no predicate; otherwise case-insensitive substring (`ILIKE '%…%'`) over `display_name` OR `email`, composed with `p_filter` and the keyset. No ranking, no trigram index until a measurement asks (DS-6 recorded unconsumed — again).
- **Preserved laws (regression-pinned, not re-decided):** the open filter namespace (`default`/`active`/`inactive`/`decommissioned`/`platform_admins`/`all`; unknown → `22023`), `default` hides decommissioned, Mists never appear under any filter, `42501` with `'platform administrator required'`.
- **Sibling-assertion sweep (the three-times-bitten rule, mandatory):** the return shape changes from bare array to keyed object, so every assertion naming `admin_get_users` — the PC021 gate-1 suite's 12 cells (array-shape + row pins), `hub/lib/admin/users.ts:48-60` (`fetchAdminUsers`), the H036 list component and its unit suite — is listed in the migration header, each marked adapted or deliberately left.

## Appetite

Small — one function re-issued, zero new tables, zero mutation work. The care point is the composite-cursor predicate and the sibling sweep, not volume.

## Rabbit holes

- **Don't build a total count.** No story needs "page 3 of 41"; counting is a scan and the selection model is current-page-only by the RB-3 ruling. `next_cursor` presence is the only "more exists" signal.
- **Don't build search ranking or indexes.** Substring `ILIKE` at platform scale; DS-6 and any index wait for a measurement.
- **Don't grow a mutation.** Bulk stays BFF-looped singles (RB-2); a set-based mutation primitive appearing here is scope failure.
- **Don't chase the audit read's `'Unauthorized'` drift** — recorded above; fixing a shipped sibling's message is its own (tiny, separate) decision.

## No-gos

No new tables. No mutation contracts. No cross-page select-all support (no offsets, no total). No Mist administration. No changes to `admin_get_user_detail`. No manifest edits (re-issue by name).

## Stories

### STORY-1: Pages that walk the whole truth
- Given the dev-scale member set, when a platform admin walks pages via `next_cursor` to exhaustion, then the union of pages equals the unpaginated set exactly (no gap, no overlap), ordering is `display_name, id` throughout, `next_cursor` is null only on the last page, and `p_limit` honours default 50 / floor 1 / cap 200.
- Given `p_after_name` without `p_after_id` (or the reverse), then `22023`.

### STORY-2: Search where the data lives
- Given members whose display name or email contains a fragment (any case), when called with `p_search`, then exactly the matching rows return, composed with the active `p_filter` and the keyset; a fragment matching nothing returns `{users: [], next_cursor: null}` honestly.

### STORY-3: The preserved laws
- Given the shipped filter behaviours, then each filter returns exactly what its name promises, `default` hides decommissioned, Mists never appear under any filter or search, `account_state` reads the derived vocabulary, unknown filters refuse `22023`, non-admins refuse `42501` `'platform administrator required'`, and anon EXECUTE stays refused — all pinned against the re-issued body.

### STORY-4: Shape honesty at the direct door
- Given a direct PostgREST caller (the ADR-U038 adversarial path), then the same cap, cursor, and search semantics hold — the scalar-jsonb return still escapes db-max-rows truncation, and `generated_at` rides every page.

### STORY-5: Nothing named survives unexamined
- Given the migration header's sibling-assertion list, then every suite assertion and consumer naming `admin_get_users` is enumerated and marked adapted or deliberately left, and the full integration + unit sweeps are green post-adaptation.

## Decomposition verification walk — payload ↔ consumer (FEAT-H039)

| Key | FEAT-H039 consumer |
|---|---|
| `users[]` (six unchanged keys) | list rows exactly as H036 renders them today; `id` additionally feeds the selection set + bulk request bodies |
| `next_cursor` | the pager — Next enabled iff non-null; passed back verbatim as `p_after_name`/`p_after_id` (Prev replays the client-held cursor stack) |
| `generated_at` | the "As of" line beside Refresh (the RB-8 parity rider) |
| `p_search` ← | the debounced server-search input (replaces the client-side filter) |
| `p_limit` ← | the fixed Hub page size (50) |
| `p_filter` ← | the existing filter tabs, unchanged |

Every key has a consumer; every consumer input traces to a parameter. Nothing else changes hands — the bulk routes consume the **existing** single mutation contracts, walked in FEAT-H039.

## Platform dependencies

PC-2 (`users` substrate incl. `is_temporary`, `deactivation_origin`), PC-3 (personal-group display identity), PC-4 own (`is_platform_admin`, the manifest pin). No Domain dependency.

## Cross-product impact

Hub consumes via FEAT-H039 (BFF-wrapped); the H036 list component adapts in the same cycle. Gimbal inherits the contract. Member-facing surfaces untouched.

## Vertical impact

- **Privacy/GDPR:** the same admin-tier fields behind the same `42501` wall; server-side search adds no new data exposure (it narrows what moves); pages shrink the per-request payload of member personal data from the full census to one page.
- **Notifications:** none.
- **Administration:** ADM-7's selection substrate (RB-3) — the bounded list is what makes explicit, page-scoped bulk selection honest.
- **Observability:** typed refusals preserved; reads stay unaudited (the shipped posture — mutations are the audit surface); surface telemetry rides FEAT-H039.
- **Transactions:** none.
- **Extensibility:** the filter namespace stays open; the cursor is two transparent named parameters (a future opaque-cursor or sort-choice re-issue extends the signature, nothing seals); `account_state` stays an open vocabulary.

## Performance budget

N/A (no surface). The re-issue exists **because of** a measurement: the ~300 KB full-census payload behind every list paint becomes one bounded page; FEAT-H039 carries the page budgets.
