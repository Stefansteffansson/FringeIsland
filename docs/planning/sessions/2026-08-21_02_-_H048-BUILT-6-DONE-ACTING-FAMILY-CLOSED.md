# Session bridge — 2026-08-21: FEAT-H048 built and 6-done — the acting family's surface story closes

**Continuation of `2026-08-21_01`** (the next-session brief, which prepared this work in full). The brief held: almost nothing needed re-deriving. Spec authored → 4-ready → built → 6-done → **merged (PR #573, squash, `badc1cef`)** in one session, the H047 rhythm.

## What shipped

**FEAT-H048 — wielded announcement affordances.** The hat opens the group's announcement board, announces on it, retracts from it. Third and last consumer of the group page's existing acting context; over the merged FEAT-PD019 T3 contracts. **No migration → no schema gate → fuller-auto merge.**

- Section: `acting` prop, "Viewing as {A}" banner, hat-insufficiency copy, compose/Retract gated on the **hat's** `send_announcements`, two confirms, `kind` badges in both views.
- Client: the H046 `viewKey` split + prefix-scoped drop. Queries + two BFF routes: `p_acting` passthrough, `wielded` telemetry flag. `AuthorDisplay` gains additive `kind?: string`.
- Page: **one prop** — `actingContext` already existed.

**With this the acting family is complete on both sides** — platform (PD019 T1/T2/T2R/T3) and surface (H046 forum, H047 conversations, H048 announcements).

## The ruling applied

Announcements are weighty one-time acts → **both wielded acts confirm by name** ("You are announcing as {A}" / "You are retracting as {A}"). H047's permanent composer label deliberately not reused: a board is not a cadence surface.

## Gates

Red-first **10 red / 2 pure guards across 12 new cells** → 12/12 · unit tier **179 suites 1516/1516** · lint 0 · `next build` green · **all three wielded E2E journeys green together**. Labelled sibling adaptation: three cells in the pre-existing announcements suite now assert the trailing `undefined` acting id (personal path byte-identical).

## Lessons worth carrying (the session's real yield)

1. **The browser tier caught a bug every tier below it passed.** The client's query-string builder used `URLSearchParams.size`; the bundled Chromium does not implement it, so `undefined > 0` was false, the entire query string vanished, the wielded read arrived as a *personal* read and 403'd — while the send (a JSON body) succeeded. Signature to recognise: **a working write over a refusing read**. Fixed to the forum client's `toString()` idiom. **Honest limit recorded in the spec: jsdom/Node DO implement `.size`, so no unit cell discriminates it** — the transport cells added to `tests/unit/lib/announcements/client.test.ts` are coverage for the mocked-away layer, not a guard against this bug. Generalisable: *query-string construction is only truly proven in a browser, and copying the sibling's proven idiom beats inventing a tidier one.*
2. **A wounded dev server mimics feature bugs — again, new symptom.** The session's :3000 survivor had a dead Next **compiler worker pool** ("Jest worker encountered 2 child process exceptions"), so every on-demand compile 500'd while already-compiled routes 401'd correctly. Probing with an unauthenticated request is what separated it from a real defect. The E2E ran against `next start -p 3001` via the config's own `E2E_BASE_URL` escape hatch rather than killing a server that might belong to a live manual session. *(Sibling of the EPIPE lesson; different mechanism, same disguise.)*
3. **`jest` with no path runs BOTH projects.** An unqualified `npx jest` fired the integration tier un-in-banded (the npm scripts all use `--runInBand`) against the shared dev DB: 241 red, one "Too Many", teardown swept real residue. **`npm run test:unit` / `jest tests/unit` is the unit tier**; anything else is a production write on this one-database setup.
4. **Cross-session coordination worked.** A live sibling session (`teamdevelopment-3b`) was confirmed to be on a *different* repo and different Supabase project before the E2E ran. The :3000 server was not theirs.

## The rest of the board

TASK-EDT-01 (unlimited edit + label + 3-min grace; the own-delete window question is Stefan's at pull; ships a §1.5 doc-health row) · TASK-DBT-03 (suite teardown + audit checklist — **the 241-red run's residue sweep is fresh evidence for it**) · the ADR-U039 topic-channel rider (recorded, unscheduled) · beppe.hopper reaps ~2026-09-14 by design.

## Not done, stated plainly

- **`doc-health-check` not run** — no renames, deletions, schema migrations, or restructures this session, and it is not a cycle boundary. Additive spec + two L4 rows + two changelog entries only.
- **The integration tier was not re-run deliberately** after the accidental parallel run. This feature ships no SQL; its BFF routes are covered by the route-policy conformance test (green in the unit tier). If a clean integration baseline is wanted, `npm run test:integration:communication` in-band is the relevant slice.
