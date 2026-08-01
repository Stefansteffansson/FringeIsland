# FEAT-H037: Moderation and audit view — the console learns to answer reports and show its own trail

---
id: FEAT-H037
title: Moderation and audit view — /admin/moderation queue + report detail with the resolve ceremony and live escalation links, /admin/audit keyset browser over the open action namespace, and the two dashboard cards
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Members have been able to report content since C-D — and no one has ever been able to see, let alone answer, a report: the store's admin read seam has sat consumer-less since `20260720200000`, and every report ever filed is still `open`. The audit log has recorded every admin mutation and auth moment with no read surface anywhere in v2. ADM-10/11/16 (Hub §L3) are cycle ADM-D's surface rows — the last A-ADM cycle; this is the surface half, consuming FEAT-PC022 API-first on the H034 shell under the AB-7 shape (every admin task in the one `/admin` home).

## Solution sketch

- **`/admin/moderation`** (queue) + **`/admin/moderation/[id]`** (report detail) + **`/admin/audit`** (trail browser) under the H034 admin section; the `/admin` dashboard gains a "Moderation" card (with the open-report count from the queue read) and an "Audit log" card (plain link). The H035 gate shape throughout: the platform's refusal → 404, no admin chrome for non-admins.
- **Queue:** filter toggles rendering the contract's open filter namespace (`open` default / `resolved` / `all`), rows grouped client-side by target (`target_kind` + `target_id` — N reports on one post read as one cluster; per-report resolution stays the law), each row carrying the kind chip, snapshot excerpt, reporter name, reason, and age; empty state ("no open reports") as a first-class render.
- **Report detail:** the full `content_snapshot` framed as "what the content said when reported"; when `live_target_exists` is false, the drift-honesty line ("this content is no longer present — the snapshot is the record"); reporter identity, reason, details; **escalation links** — author → `/admin/members/[author_user_id]` (rendered only when the author resolves), group → `/admin/groups/[target_group_id]` — composition into the ADM-B/C consoles, never re-implemented sanctions.
- **The resolve ceremony:** a bespoke inline panel (the `ConfirmModal`-carries-no-children precedent; no type-to-confirm weight — resolution is one-shot but not destructive): outcome choice (`actioned` / `dismissed`), optional internal note, and consequence copy naming the communication honestly — *"the reporter will be told the outcome — not your name, and not this note."* Success repaints queue + detail from the fresh read (the H035 rule); a stale second resolve renders the platform's 409 message verbatim.
- **Audit browser:** newest-first rows (actor display name null-safe for erased actors, action, target, expandable metadata, timestamp), **Load more** keyset paging on the `created_at` cursor, and prefix filtering over the **open** dotted namespace — chips for the known families (`member.`, `platform_admin.`, `moderation.`, `data_export`, the auth moments) plus a free prefix input; an unmatched prefix renders the honest empty state, never an error.
- **BFF routes** (presentation-only per ADR-U038): `GET /api/admin/reports?filter=`, `GET /api/admin/reports/[id]`, `POST /api/admin/reports/[id]/resolve`, `GET /api/admin/audit?before=&prefix=`. SQLSTATE→HTTP per the H035 admin shape — `42501`/`P0002`→404, `P0001`→409 verbatim, `22023`→400, unknown→500. Reads on the ADR-U037 claims path; the resolve on `getUser`; durable telemetry throughout.
- Born under the COR-C lattice: tokens, jest-axe, outer-ring (`lib/admin/reports.ts` + `lib/admin/audit.ts` wrappers, `import type` only), red-first unit, route-policy gate, fresh-per-mount reads (stale admin state is a correctness bug).

## Appetite

Lean for a surface cycle — three pages, one ceremony, four routes, no optimistic state anywhere. Every pattern is proven (H034 gate shape, H035 repaint discipline, H036 escalation idiom); the design-care points are the resolve panel's honest consequence copy and the audit browser's paging.

## Rabbit holes

- **Don't recompute moderation state client-side.** Resolvability derives from `status` in the payload; a refusal reaching the surface renders honestly (the 409 verbatim), never pre-empted.
- **Don't build sanction affordances into the queue.** Escalation is a *link* to the member/group consoles; suspend/exit/delete live there and only there.
- **Don't render the resolution note to anyone but admins.** The note is admin-internal; it appears on the resolved report detail and nowhere else — the consequence copy states this and the platform enforces it (the notification payload never carries it).
- **Don't get clever with audit metadata.** Render the jsonb as formatted detail; no per-action bespoke renderers (the namespace is open — a new action must degrade to honest generic render, never a crash).
- **Don't cache, don't get optimistic.** Fresh-per-mount; every mutation repaints from the fresh read.

## No-gos

No bulk resolve, no select-all (ADM-7 territory). No content takedown affordance (no substrate — the PC022 boundary). No reporter-facing surface changes (the closure notification renders in the existing bell via the generic kind render — zero new member-facing code). No new realtime channel; refresh-based like every admin surface this wave. No audit export/download (the read surface is the scope; ADM-13's filtered view is deferred with its own record).

## Stories

### STORY-1: The queue, honestly rendered
- Given open and resolved reports, when a platform admin opens `/admin/moderation`, then the default view renders open reports newest-first, grouped by target, with kind chip, snapshot excerpt, reporter, reason, and age; the filter toggles switch to resolved/all; the empty state renders when the queue is clear; skeleton per B6; a failed load is a visible error with Retry.
- Given a non-admin navigating to any of the three routes, then the 404 shape.

### STORY-2: Report detail with drift honesty
- Given a report on live content, then the snapshot renders as the record, and the author escalation link navigates to that member's admin detail; given the content has since been deleted, then the drift-honesty line renders, the author link is absent, and the snapshot still stands.

### STORY-3: The resolve ceremony
- Given an open report resolved through the panel (either outcome, with or without a note), then the consequence copy named what the reporter will and will not learn, success repaints queue + detail from the fresh read (status badge flips, provenance line appears), and the audit trail carries the `moderation.report_resolved` row.
- Given a second resolve from a stale tab, then the platform's 409 message renders verbatim.

### STORY-4: The reporter's closure (asserted platform-side, rendered free)
- Given a resolve, then the reporter's bell shows the `report_resolved` notification through the existing generic render — no new Hub component; the E2E journey asserts the closure lands (and the paired PC022 suite owns suppression/erasure branches).

### STORY-5: The audit browser
- Given more rows than one page, then Load more pages without gap or overlap on the cursor; given the `member.` chip (or a free prefix), then only matching rows render; given an unmatched prefix, the honest empty state; given a row with an erased actor, the row renders null-safe; metadata expands to formatted detail.

### STORY-6: Dashboard entry
- Given the `/admin` dashboard, then the Moderation card shows the open-report count (from the queue read via the BFF) and the Audit log card links plainly; both gated by the same admin shape.

### STORY-7: Wired, gated, observable
- E2E journey: member fixture submits a report → admin finds it in the queue → detail → resolve `actioned` with note → reporter's bell shows closure → audit browser shows the `moderation.report_resolved` row under the `moderation.` chip → demoted operator gets the 404 shape on all three routes. Unit: axe-clean queue + detail + audit loaded states; route-policy + outer-ring gates green with zero exception entries.

## Platform dependencies

FEAT-PC022 (the whole family: queue/detail reads, resolve, audit read, the registered kind) API-first — **no migration of its own**; every rendered field traces to a walked payload key (the PC022 walk table); gating derives from the platform's refusal, never computed Hub-side. The escalation links compose FEAT-H035/H036 routes as-is.

## Cross-product impact

Gimbal inherits the contracts, not the shell. Member-facing surfaces: zero code change — the closure notification rides the existing generic bell render (the kind registry's whole point).

## Vertical impact

- **Privacy/GDPR:** renders reporter and author display identity, snapshots of reported content, and the audit trail behind the platform's admin wall; only walked payload keys reach the client; the resolution note renders to admins only; nothing new collected.
- **Notifications:** none authored here — the `report_resolved` kind is PC022's; this surface renders it through the existing generic bell path with zero new code (STORY-4 asserts the composition).
- **Administration:** ADM-10/11/16 realized at the surface — the last A-ADM console rows; escalation composes the ADM-B/C consoles; every resolve audited platform-side.
- **Observability:** durable telemetry on reads and the resolve (the H034 leg); refusals render the platform's words visibly; the audit browser itself is V4's read leg landing in the UI.
- **Transactions:** none.
- **Extensibility:** filter toggles map 1:1 to the contract's open namespace; the audit prefix chips are conveniences over a free prefix input (the namespace stays open); an unknown `resolution_kind` or action renders generically, never a crash; target-kind chips render the open set with a neutral fallback.

## Performance budget

- **First-paint class:** B2/B3 for all three routes; **justified standalone reads** (admin-only, outside the overview bundle — ADR-U042 guardrail 3).
- **Interaction class:** filter/chip toggles and Load more feed back within 100 ms (B5); the resolve disables-with-progress during the round trip.
- **Loading states:** skeleton rows/blocks (B6); >3 s is a platform-side defect.
