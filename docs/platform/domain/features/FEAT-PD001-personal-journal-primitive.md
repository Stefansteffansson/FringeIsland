# FEAT-PD001: Personal Journal primitive — the platform store for a FIM's private journal entries

---
id: FEAT-PD001
title: Personal Journal primitive — a private, own-subject entry store with platform-side contracts for writing, reading, erasure, and export
owner: platform/domain/intelligence
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

> **Routing provenance (ratified 2026-07-03).** PC-2 adjudicated the Journal out of Core at its Step 3 Q1 (`docs/platform/core/identity-specification.md`), carrying it to "whichever Domain Service receives Journal (TBD)"; no DS descent picked up the routing. The routing adjudication at the Cycle D decomposition (Stefan, 2026-07-03) resolved it to **DS-7 Intelligence** — the consent-gated private personal store already owns member-authored self-defined intentions (ADR-U005). DS-7's §L3 carries the `Personal Journal store` row; the adjudication rationale (incl. DS-4 / new-service rejection) lives in `intelligence.md`'s Sources-status amendment.

## Problem

The Hub's IDN-5 capability ("Provide private personal Journal surface", `docs/products/hub/SPECIFICATION.md:190`) names an external dependency on a platform **Journal primitive** — and no such primitive exists anywhere in the substrate. The only trace is the FORWARD-SEAM comment in the data-export migration (`supabase/migrations/20260630161155_feat_pc008_data_export.sql:14`), which explicitly defers the Journal section of the export document until the primitive exists. PC-2's own stress-test recorded the same absence (finding C1-1).

The ecosystem is unambiguous about what the Journal is: private-by-default member writing (`docs/ecosystem/universe/personal-growth/privacy-model.md` — "Journal entries" under private-by-default data; sharing model S43: "you can share your garden without sharing your journal"); a complete Homebody engagement mode (`engagement-spectrum.md`); the individual-perspective instrument for "Who am I? What do I want?" (`three-questions.md`). A journal that is not enforceably private at the substrate — against other members, against admins, against direct PostgREST callers with the anon key — is not the thing the ecosystem describes.

This is the platform half of IDN-5, consumed API-first by the Hub ([FEAT-H011](../../../products/hub/features/FEAT-H011-private-journal.md)) and any future surface (the Gimbal). Per ADR-U038, every rule lives platform-side: RLS, grants, and PostgREST RPCs — never a Hub route.

## Solution sketch

**One new table, `public.journal_entries`:** `id` (uuid pk), owner (the caller's **personal group id** — the repo actor primitive, resolved via the four-hop chain), `title` (text, optional), `body` (text, required), `created_at` / `updated_at`. Owner FK declared so that account-erasure teardown (`admin_hard_delete_user` cascade) **hard-deletes** journal rows — private entries are never sentinel-reassigned. Exact FK target (users vs groups) settles at the schema-review gate; the binding requirement is the acceptance criterion in STORY-4.

**No direct table access for client roles.** Base-table grants revoked from `authenticated`/`anon` (tranche-1 discipline); all access flows through SECURITY DEFINER RPCs (`SET search_path = ''`):

- `create_journal_entry(p_title text, p_body text)` — FIM-only: refuses when the caller is a Mist (`is_temporary`), keeping ADR-U031 ephemerality out of scope for v1.
- `update_journal_entry(p_entry_id uuid, p_title text, p_body text)` — own rows only.
- `delete_journal_entry(p_entry_id uuid)` — own rows only.
- `get_own_journal_entries(p_limit int default 50, p_before timestamptz default null)` — own rows only, newest first, keyset-paginated.
- `get_own_journal_export()` — the own-subject export contract: returns a versioned jsonb section of all the caller's entries. Follows FEAT-PC008's precedent: resolves via `auth.uid()` directly (not the `is_active`-gated helper) so a **suspended** member retains the right of access.

**The export seam is closed by composition, not extension.** PC-4 never reads Domain tables (one-way Core→Domain boundary), so `get_own_data_export()` is NOT extended. Instead the surface composes the two platform contracts (PC008's document + this feature's journal section) at download time — BFF composition is legitimate plumbing under ADR-U038. FEAT-H011 carries the surface story; FEAT-H010 gains a short provenance amendment at close.

## Appetite

One focused session for the platform half (migration + RPCs + adversarial direct-caller tests), matching FEAT-PC008's scale. Schema-review gate pauses the merge as usual.

## Rabbit holes

- **Structured/rich body.** Plain text v1. No jsonb body, no block editor format, no media. A future format migration is cheaper than a wrong structure now.
- **Merging journal data into PC008's document server-side.** Tempting, boundary-violating (Core reading Domain). Composition happens at the surface.
- **Mist journaling.** Would drag in TTL sweeps and transcendence carry-over semantics. FIM-only v1; the gate is one check in `create_journal_entry`.
- **Sharing.** The S43 region-sharing model (garden vs journal vs rooms) is a real future feature with its own consent surface. Nothing in v1 may presuppose its shape beyond "entries are rows that could later carry a visibility dimension".

## No-gos

- No sharing or visibility controls — private-only; no other member can ever read an entry in v1.
- No admin or DeusEx content access — there is **no read path to journal bodies for any role but the owner**. Administration gets nothing in v1 (not even counts).
- No Whisp/AI access — any future DS-7 dialogue use of journal content is a separate, consent-gated feature under the guard-railing law (PRINCIPLES-AI).
- No search, tags, attachments, or drafts.
- No Mist journaling.
- No sentinel reassignment of journal rows at erasure — hard delete only.

## Stories

### STORY-1: Write my journal
As a FIM, I want to create journal entries the platform stores privately, so that my reflection has a durable home.

**Acceptance criteria:**
- Given an authenticated FIM, when they call `create_journal_entry`, then a row is created owned by their personal group, and the returned entry round-trips through `get_own_journal_entries`.
- Given an authenticated Mist, when they call `create_journal_entry`, then the call is refused with a stable error and no row is created.

### STORY-2: My entries are mine alone
As a FIM, I want my entries unreadable by anyone else, so that the journal is genuinely private.

**Acceptance criteria:**
- Given member B authenticated via direct PostgREST with the publishable key, when B attempts `SELECT`/`INSERT`/`UPDATE`/`DELETE` on `journal_entries` directly, then the substrate refuses (revoked grants / RLS), independent of any Hub code.
- Given member B, when B calls `get_own_journal_entries` or `update_journal_entry`/`delete_journal_entry` against member A's entry id, then B receives zero rows / a refusal — never A's content.

### STORY-3: Edit and remove entries
As a FIM, I want to update and delete my own entries, so that the journal stays under my control.

**Acceptance criteria:**
- Given a FIM with an entry, when they call `update_journal_entry` on it, then title/body change and `updated_at` advances.
- Given a FIM with an entry, when they call `delete_journal_entry`, then the row is gone from all subsequent reads.

### STORY-4: Erasure leaves nothing behind
As a member erasing my account, I want every journal entry hard-deleted, so that erasure is real (GDPR right to erasure).

**Acceptance criteria:**
- Given a FIM with journal entries, when account erasure runs (`erase_fim_account` → `admin_hard_delete_user` teardown), then zero `journal_entries` rows remain for that member and none were reassigned to the `[Deleted User]` sentinel.

### STORY-5: My export includes my journal
As a FIM (including a suspended one), I want a machine-readable copy of my journal, so that Art. 15/20 access covers it.

**Acceptance criteria:**
- Given a FIM with entries, when they call `get_own_journal_export()`, then they receive a versioned jsonb document containing all and only their entries.
- Given a suspended FIM, when they call `get_own_journal_export()`, then the export still succeeds (auth.uid()-path resolution, PC008 precedent).

## Platform dependencies

PC-1 (schema/RLS substrate, migration discipline); PC-2 (identity: the four-hop actor chain, `is_temporary` Mist flag, suspension semantics); PC-2/PC-4 erasure teardown (`admin_hard_delete_user`) as the cascade trigger. No sibling Domain dependency.

## Cross-product impact

The Gimbal inherits the full contract surface unchanged when it arrives (API-first, ADR-U009/U038). The Hub consumes via FEAT-H011.

## Vertical impact

- **Privacy/GDPR:** The feature IS private personal data. Private-by-default at the substrate; own-subject export contract (Art. 15/20); hard-delete erasure cascade (Art. 17); no consent needed for v1 (no sharing, no AI access, no processing beyond storage).
- **Notifications:** None.
- **Administration:** Deliberately none — no DeusEx read path to content. Lifecycle is fully covered by the erasure cascade.
- **Observability:** No content-bearing logging anywhere (RPC errors must not echo bodies). No v1 analytics events; if ever added, content-free counts only.
- **Transactions:** None.
- **Extensibility:** No enums, no sealed sets. The body is plain text; a future visibility dimension (S43) or format field extends the table without breaking the v1 contract. RPC names follow the established `*_journal_*` own-subject pattern so sibling surfaces extend naturally.
