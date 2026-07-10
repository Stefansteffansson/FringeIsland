# FEAT-H011: Private journal — the Hub surface where a FIM writes, reads, and tends their own journal

---
id: FEAT-H011
title: Private journal — the Hub surface for writing, reading, editing, and deleting one's own journal entries, private by construction
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

> **Routing provenance (ratified 2026-07-03).** Paired with [FEAT-PD001](../../../platform/domain/features/FEAT-PD001-personal-journal-primitive.md); the Journal primitive is routed to DS-7 Intelligence (adjudicated at the Cycle D decomposition — see that spec's provenance note and `intelligence.md`'s Sources-status amendment).

## Problem

IDN-5 ("Provide private personal Journal surface", `docs/products/hub/SPECIFICATION.md:190`) is the last purely-additive capability in the Phase-3 Identity area: the Hub gives a FIM no place to write. The ecosystem treats journaling as a complete engagement mode, not an accessory — the Homebody "tends their inner garden … reflects quietly" (`engagement-spectrum.md`), and the individual perspective of the three questions runs through "reflection, assessment, journaling" (`three-questions.md`). Today that mode has zero surface.

This is the Hub half of IDN-5: a journal page where a FIM writes, reads, edits, and deletes their own entries — and nothing else. All privacy rules live platform-side in FEAT-PD001 (ADR-U038); the Hub renders the experience and carries no rule the substrate doesn't already enforce. It also closes the export seam at the surface: "Download my data" comes to include the journal by composing the two platform contracts.

## Implementation notes

*(Built 2026-07-03, Cycle D, paired with FEAT-PD001.)*

- **Page:** `hub/app/journal/page.tsx` — the FEAT-H008 gate pattern (sessionless → `/login?redirect=/journal`; Mist → `/`; panel mounts only for a FIM). `hub/components/journal/JournalPanel.tsx` owns compose / edit-in-place (the composer hides while editing — one editor at a time) / ConfirmModal-gated delete / keyset "load older"; **every mutation re-reads the list** (single source of truth, the ConsentPanel discipline); a failed save surfaces an error and preserves the typed text. `AccountMenu` gained the Journal link (the menu is FIM-only by construction, so Mist nav-hiding is inherited).
- **BFF plumbing:** `hub/app/api/journal/route.ts` (GET list / POST create) + `hub/app/api/journal/[id]/route.ts` (PATCH / DELETE) — Edge + `dub1` as-built (ADR-U036; *revision 2026-07-10:* runtime terms superseded by ADR-U036 Amendment 2 — these routes now take the platform-default Node runtime, no per-route exports); SQLSTATE→HTTP mapping only (42501→403, P0002→404, 22023/23514→400); telemetry content-free (bodies/titles never in events or errors). Browser client `hub/lib/journal/client.ts`.
- **Export composition (STORY-5):** `GET /api/account/export` now composes `get_own_journal_export()` into the download as an **additive top-level `journal` key** — the PC008 platform document stays journal-free (one-way Core→Domain boundary); present-and-empty for an entry-less FIM; a journal failure fails the whole download (never a partial document). FEAT-H010 carries the matching provenance amendment.
- **Tests:** 12 unit tests (page gate + panel behaviour) **demonstrated red first** (modules absent), then green; 3 route-composition unit tests red-first against the pre-composition route, then green; the Playwright journey (write → listed → edit → delete → empty) green against the live substrate; full E2E suite 32/32.
- **Found-and-fixed while wiring E2E:** the E2E harness had been unable to start since the ADR-U038 tranche-1 S3 consent gate — `global-setup.ts` created the session FIM without `consent_accepted` metadata (the integration helper was updated at tranche 1; the E2E setup was missed) and `deleteE2EUser` couldn't remove a consented FIM (FK RESTRICT). Both fixed (`hub/tests/e2e/global-setup.ts`, `hub/tests/e2e/helpers/auth.ts` — consent purge under the controlled-erasure bypass); this restored the whole suite, not just the journal spec.
- **Deviations from the task plan:** TASK-H011-01's "route-level integration tests" were replaced by route-unit + E2E coverage — route-level integration tests aren't a house pattern (no existing `/api/*` integration tests; routes are thin plumbing whose rules live in the substrate, already adversarially tested in FEAT-PD001).
- **Revision 2026-07-10 (Cycle J-E rider — the RC-D perf retrofit, ADR-U043 B4/B6, TASK-JE-06):** the journal predated the perf-budget ADR and was never retrofitted (every visit refetched → spinner on every revisit). The client (`hub/lib/journal/client.ts`) gained the groups/journeys session cache — `peekJournalEntries` paints the last first page instantly, `fetchJournalEntries()` always revalidates with one shared in-flight request, a failed read is never cached, keyset pages bypass the cache, mutations drop the peek so a stale list never paints, and AuthContext drops it at session end via `invalidateJournalCache`. The page gate and the panel's load state now render the deferred `SkeletonList` (new `components/ui` primitive, `SkeletonGrid`'s stacked sibling) instead of the `LoadingState` spinner — warm revisit paints instantly (B4), cold load skeletons (B6). Red-first: 12 new unit tests (cache + skeleton/revisit) demonstrated red, then green; the existing `JournalPanel` suite carries one labelled mock adaptation (a null `peek` keeps its scenarios on the cold-load path). Provenance: [`2026-07-09-cold-load-regression-analysis.md`](../../../planning/hub-v2/2026-07-09-cold-load-regression-analysis.md) RC-D / recommendation L4.

## No-gos

- No sharing, no visibility controls, no public anything.
- No Whisp presence, prompts, or AI features on the journal page.
- No search, tags, media, or export formats beyond the composed machine-readable download.
- No Mist journaling (nav hidden; deep-link blocked by the FIM gate).
- No Gimbal surface in this feature (the contract inherits; the surface is future).

## Stories

### STORY-1: A place to write
As a FIM, I want a journal page where I can write a new entry, so that reflection has a home in my Hub.

**Acceptance criteria:**
- Given an authenticated FIM on `/journal`, when they write a body (title optional) and save, then the entry appears at the top of their list and survives reload.
- Given a FIM with no entries, when they open `/journal`, then an empty state invites the first entry.
- Given a save that fails (network/RPC error), when the error returns, then the member sees a non-destructive error and their typed text is not lost.

### STORY-2: Read my journal
As a FIM, I want to see my entries newest-first, so that I can revisit my own thinking.

**Acceptance criteria:**
- Given a FIM with entries, when they open `/journal`, then their entries render newest-first with title (when present), body, and a human-readable date.
- Given more entries than one page, when the member reaches the end of the list, then older entries load (keyset pagination via `p_before`).

### STORY-3: Tend my entries
As a FIM, I want to edit and delete entries, so that the journal stays mine to shape.

**Acceptance criteria:**
- Given an entry, when the FIM edits and saves it, then the updated content renders in place.
- Given an entry, when the FIM chooses delete, then a confirmation is required, and on confirm the entry disappears from the list.

### STORY-4: The journal is FIM-only and signed-in-only
As the platform, I want the journal surface gated, so that the surface matches the substrate's rules.

**Acceptance criteria:**
- Given a signed-out visitor, when they request `/journal`, then they are redirected to sign-in.
- Given an authenticated Mist, when they look at navigation, then no Journal item is shown; when they deep-link to `/journal`, then they are redirected (consistent with the transcendence invitation pattern, FEAT-H004).

### STORY-5: My download includes my journal
As a FIM, I want "Download my data" to include my journal entries, so that my export is actually complete.

**Acceptance criteria:**
- Given a FIM with journal entries, when they use the FEAT-H010 download control, then the delivered file contains both the PC008 document and the journal export section (`get_own_journal_export()`), clearly versioned.
- Given a FIM with no entries, when they download, then the journal section is present and empty (not absent), so the document shape is stable.

## Platform dependencies

FEAT-PD001 (all journal RPCs + export contract); PC-2 (session, FIM/Mist distinction); the existing account-state gate (FEAT-PC004/H006) for suspended members; FEAT-PC008 (the document the journal export composes with).

## Cross-product impact

None beyond the Hub. The Gimbal, when it arrives, builds its own surface on FEAT-PD001's contracts; nothing here constrains it.

## Vertical impact

- **Privacy/GDPR:** Renders private personal data to its owner only; no rule of its own — enforcement is substrate-side (FEAT-PD001). Closes the export completeness gap at the surface (STORY-5).
- **Notifications:** None.
- **Administration:** None — no admin surface touches journal content.
- **Observability:** Standard error monitoring only; no journal content in logs, analytics, or error payloads (explicit test: RPC error paths don't echo bodies).
- **Transactions:** None.
- **Extensibility:** The page composes platform contracts and adds no types or enums; a future sharing surface (S43) or Whisp integration arrives as new features, not edits to this one.
