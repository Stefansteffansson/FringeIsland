# FEAT-H010: Download my data — let a FIM request and receive a copy of all their FringeIsland data

---
id: FEAT-H010
title: Download my data — the Hub surface that lets a FIM request and download a complete, machine-readable copy of their own FringeIsland data
owner: hub
consumers: [hub]
wave: ferd
requires-equipment: none
maturity: 4-ready
---

## Problem

A FIM's data lives across the platform — their profile, account state, consent history, group memberships, journey enrolments — but the Hub gives them **no way to get a copy of it**. A member who wants to keep their own record, move it elsewhere, or simply see everything the platform holds about them has nowhere to do so. That is a GDPR expectation (the right of access / data portability) and a basic transparency affordance: a member should be able to take their data with them.

IDN-8 ("request and receive complete data export") is the Hub surface that closes the gap: a self-service control that calls the paired platform contract (FEAT-PC008), receives the assembled document, and hands it to the member as a downloadable file. It renders a request affordance and delivers the result; it does not assemble the data itself (that is platform-side) and it changes nothing (export is read-only — self-service exit/deletion is the later IDN-10 seam). This is Cycle C of the Phase-3 Identity-completion plan, standalone (it neither blocks nor is blocked by the consent or account-lifecycle cycles).

## Solution sketch

- A **data-export** affordance in the member's account/privacy area — naturally alongside the Consent surface (FEAT-H008) and profile (FEAT-H005), reached from the `AccountMenu`. Mounted for **FIMs only** — a Mist is ephemeral and has no durable record to export, so the affordance is not shown to it (gate by identity, matching FEAT-H005/H006/H008).
- The member sees a short, honest explanation of what the download contains (their profile, account state, consent history, and group memberships — and that more is added over time as the platform grows) and a **"Download my data"** action.
- On request, the surface calls **`GET /api/account/export`** (FEAT-PC008) via the Hub's API-first fetch — never a direct Supabase read (ADR-U009). While the request is in flight a **loading / preparing state** is shown (Hub convention: never a frozen UI; the assembly is synchronous but not instant).
- On success, the returned JSON document is delivered to the member as a **file download** (a sensibly-named `.json` file). The member ends up with a copy on their device — "receive" in IDN-8's "request and receive."
- **Error** is explicit: a failed request shows a clear error with retry — never a silent no-op and never a half-download.
- The surface renders the document **as data** — it does not need to understand every section. It is a faithful courier of whatever the versioned contract returns, so a future section (the Journal, later areas) flows through with no Hub change.

## Appetite

Small. One FIM-only affordance consuming one existing platform contract, with the request → loading → download / error path. No mutation, no new platform capability (FEAT-PC008 provides the document). The only real care is the browser file-download mechanics and honest in-flight / error states.

## Rabbit holes

- **Don't parse or transform the document.** The Hub delivers what the contract returns. Re-shaping it client-side duplicates platform logic and breaks the moment the versioned document grows a section.
- **Don't read Supabase directly.** All export data comes through `GET /api/account/export` (ADR-U009); the Hub's two realtime channels and auth are its only direct Supabase contacts, and this is none of them.
- **Don't build a preview/visualiser.** v1 is "get your data as a file," not an in-app data browser. A rendered view of the export is a possible later affordance, not this slice.
- **Don't promise async/email delivery.** The model is synchronous download (FEAT-PC008). No "we'll email you when it's ready" copy — that would describe a flow that does not exist.
- **Mind the download UX.** Trigger a real file download (correct filename + content type); don't open raw JSON in a tab and call it done.
- **Keep it FIM-only.** A Mist must not see the affordance (it has nothing to export); match the existing identity gate.

## No-gos

- No deletion or account-exit (that is IDN-10, the Cycle F forward-seam) — this surface only exports.
- No export of any other member's data — own data only (the contract is own-subject).
- No in-app data browser / visualiser (file download only in v1).
- No async "request now, collect later" flow or email delivery (synchronous model).
- No direct database access.
- No client-side re-assembly or re-formatting of the document.

## Stories

### STORY-1: Request and download my data
As a FIM, I want to download a copy of all my FringeIsland data, so I can keep my own record and take it with me.

**Acceptance criteria:**
- Given an authenticated FIM on the data-export surface, when they choose "Download my data," then the Hub calls `GET /api/account/export` (FEAT-PC008) — never a direct table read (ADR-U009) — and, on success, delivers the returned document to them as a downloadable file.
- Given the download completes, when the member opens the file, then it contains every section the contract returns (in v1: profile, account state, consent history, and group memberships) — the Hub does not add, drop, or reshape sections.

### STORY-2: Honest loading and error states
As a FIM, I want clear feedback while my export is being prepared and if it fails, so I am never shown a frozen screen or a broken download.

**Acceptance criteria:**
- Given the export request is in flight, when the surface is waiting, then a loading / preparing state is shown (never a frozen or blank UI) and the action cannot be double-fired into overlapping requests.
- Given the request fails, when it returns, then a clear error state with a retry is shown — not a silent no-op, and not a partial/empty file.

### STORY-3: The export affordance is FIM-only
As a Mist, I want not to be offered a data export that doesn't apply to me, so the Hub stays honest about my pre-transcendence state.

**Acceptance criteria:**
- Given a Mist (pre-transcendence) session, when the account/privacy area renders, then the data-export affordance is not mounted (gated by identity, matching FEAT-H005/H006/H008).
- Given a FIM session, when the account/privacy area renders, then the data-export affordance is available.

### STORY-4: The member understands what they are getting
As a FIM, I want a short explanation of what the download contains, so I know what I am exporting before I do it.

**Acceptance criteria:**
- Given the data-export surface, when it renders, then it states in plain language what the download includes (profile, account state, consent history, and group memberships) and that it is a copy of their own data.
- Given a future section is added to the contract (e.g. the Journal), when it appears in the returned document, then it is included in the downloaded file with no Hub code change (the surface is a faithful courier).

## Platform dependencies

- **[FEAT-PC008](../../../platform/core/features/FEAT-PC008-member-data-export.md) (Platform Core Governance) — the contract this consumes.** Provides `GET /api/account/export` returning the caller's own data as one versioned `jsonb` document (v1 Core-owned sections: `subject` / `profile` / `account_state` / `consent` / `memberships`; Domain-owned data and the Journal are forward-seam sections added by their areas), and records the durable export event. **Paired-spec reciprocation — the assembly is owned platform-side; the Hub cannot touch the substrate tables directly (ADR-U009).** The Hub carries no migration of its own.
- **Identity gating (existing).** The same FIM-vs-Mist identity gate FEAT-H005/H006/H008 use to mount FIM-only surfaces.

## Cross-product impact

The **Gimbal** will consume the **same** `GET /api/account/export` contract for its own export affordance; only the platform-side semantics are shared. Within the Hub, this surface sits alongside the Consent surface (FEAT-H008) in the account/privacy area — both are members reading/taking their own data. There is no internal dependency on the consent surfaces (IDN-8 depends only on IDN-3, per §L3); it can be reached independently.

## Vertical impact

- **Privacy/GDPR:** the heart of this feature — it gives the member a copy of their own data (the right of access / data portability). Own-data only; it surfaces no other member's data and reads only through the own-subject platform contract. Read-only — it exports, it never deletes (erasure is IDN-10).
- **Notifications:** None — a synchronous own-data download triggers nothing and addresses no other party (consistent with §L3 IDN-8 = V2, V4; not V3).
- **Administration:** None — no admin affordance; the member exports their own data. No DeusEx oversight needed.
- **Observability:** the Hub emits telemetry for the export request and its outcome (requested / succeeded / failed); error states are events, not silent failures (products-tier discipline).
- **Transactions:** None.
- **Extensibility:** the surface delivers whatever the versioned contract returns — a new section (the Journal, later areas) appears in the downloaded file with no Hub change. The Hub treats the document as opaque data it couriers, not a hardcoded client-side shape.
