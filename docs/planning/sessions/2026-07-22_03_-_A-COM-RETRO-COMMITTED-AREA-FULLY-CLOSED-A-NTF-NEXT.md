# Session bridge — 2026-07-22 (3): A-COM retro committed, area fully closed, A-NTF is next

**Read this one, not `_02`.** Bridge `2026-07-22_02` was written at the gate verdict, *before* the closing ceremonies ran; its "Open at close" list still shows the retro as pending. It is a correct historical record of that moment and is left intact — this bridge supersedes its open-items section.

## What closed since `_02`

- **Area retrospective committed** — [`retro-2026-07-22-communication-area.md`](../retrospectives/retro-2026-07-22-communication-area.md). Six cycles, nine carried lessons. Headline: **all four live-walk riders were seams, not defects** (between a seed and its rows · a contract tier and an unrendered surface · a cycle's carry rule and the next cycle's write · two account states) — cells get tested, seams get assumed, and the walk is currently our only seam-level instrument.
- **doc-health-check run** (11 sections, **zero critical findings**). Fixed in-place: FEAT-PD008 now carries the RIDER-1 amendment **and the generalised rule** (a catalog row + template grant is half a seed — instantiated roles need the backfill in the same migration, or the permission is dead on arrival for every existing group); the backlog tasks README had advertised a long-swept cycle as "Active tasks". Raised: **TASK-DOC-005** (anatomy stamp reads ADR-U048; U049 + U050 outstanding and both anatomy-relevant).
- **Ephemeral task sweep: 39 files** — the six A-COM cycles plus `TASK-JF-01..05`, which the Journeys retro should have swept and missed. The tasks README now separates **standing** tasks (sweep-exempt) from cycle-scoped ones; that missing distinction is what let the drift accumulate.
- **Retrospectives README indexed both area retros** — A-JRN's and A-COM's were both missing from the curated index.
- **RIDER-2's E2E leg executed green** post-walk (`messages.spec.ts` 2/2, fresh dev server) — the last queued verification from the gate. Nothing in the A-COM ledger is now unverified.
- Dashboard refreshed. `main` clean.

## True starting state for A-NTF

**Nothing from A-COM is owed.** All 4 riders fixed+merged, 3 migrations applied and in history, 2 wording fixes shipped, verdict recorded, retro committed, tasks swept.

**A-NTF's opening work is already named by A-COM's own deferrals** — this is unusually well-prepared ground:

| What | Where it was named |
|---|---|
| The bell's realtime tenant — topic `account:<auth_uid>:notifications` | Reserved in FEAT-PD010's channel taxonomy; a synthetic-tenant registration test already proves the realtime manager needs **no edits** for the bell to join |
| Announcement live-delivery (the walk saw it needing a reload) | FEAT-H028 §99's named forward home — shipped deliberately under "no socket work, no bell" |
| `notifications` table's `supabase_realtime` publication membership | Justified-deferred to A-NTF (DS-5 §8 Q7 + ADR-U048) — it is the **only** table left in that publication |
| **D4** — MEM-2 email dispatch | Comes due this area |
| **NTF-6** — smart-notification response dispatch | Closes against COM-13's report store, built at C-D |
| Notification preferences (NTF-10) | Full-forward; zero substrate exists (verified at the DS-5 reconciliation) |

**Capability inventory:** `NTF-1..10` in `docs/products/hub/SPECIFICATION.md` §L3. **Governing decisions:** ADR-U048 (notifications = the V3 delivery substrate, not DS-5), ADR-U049 (announcements' durable home + routed delivery), ADR-U039 (the socket doctrine the bell inherits unchanged).

## Carried into A-NTF (not owed by it)

- **Live work, explicitly NOT exception-covered:** the group page's 12–14-read fan-out (warm 941–993 ms against the 1.0 s B3 ceiling). The standing ADR-U043 rider is binding — **every future area gate runs the full measurement pass**, cold exception notwithstanding.
- **Standing tasks:** TASK-MIST-01 · TASK-DOC-003 · TASK-DOC-004 · TASK-DOC-005 · TASK-OBS-01 · TASK-E2E-01 · TASK-FORUM-01. Plus logo, launch checklist, and the Vercel Pro scale-to-one decision (now carrying two gates' data).
- **Rotate before launch:** the DeusEx walk credential `Walk-2026-DeusEx!` — a temporary password on a public URL.

## Hazards a successor should not rediscover

- **One shared dev/prod Supabase DB** (`jveybknjawtvosnahebd`): never two integration suites concurrently — a parallel run produced 14 failures that a serial re-run cleared with zero code change.
- **Suspect the environment before the product.** A stale dev server produced 37 spurious E2E failures in one session and 2 more at this gate's close; both times production was healthy. Candidate rule, now thrice-evidenced: E2E fleets against `next start`, never a shared dev server.
- **The E2E shared-storageState trap has three faces** — a fixture's `signOut()` is *global* scope and revokes the shared session server-side.
- **Fixtures:** surfaces render the **nickname = first token of display_name**, so multi-word fixture names never appear verbatim; and a bare `'active'` membership insert bypasses the invited→active auto-role trigger.
- **The consume-once adoption cache has bitten three times.** A cached *promise* captured under one account/identity state and consumed under another is the recurring shape. Meet the fourth instance with a structural answer (state-keyed adoption, or invalidation on every transition), not another point fix.
