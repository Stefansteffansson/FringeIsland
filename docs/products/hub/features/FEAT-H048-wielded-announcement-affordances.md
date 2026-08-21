# FEAT-H048: Wielded announcement affordances — the group speaks from the board

---
id: FEAT-H048
title: Wielded announcement affordances — the hat opens the group's board, announces on it, and retracts from it
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

FEAT-PD019 tranche 3 (merged #567, applied) opened all three community-announcement contracts to wielding — and no surface renders any of it. A wielder on the host group's page sees the Announcements section refuse as members-only with the hat on, and the compose/retract affordances still gate on the wielder's **personal** `send_announcements` grant, so a hat that carries the grant opens nothing and a person who carries it personally would announce as themselves while wearing another group's hat. This is the last surface of the acting family: the forum half (FEAT-H046) set the affordance pattern, the conversations half (FEAT-H047) extended it across a route boundary; the board is the smallest and the weightiest — one section, no second route, and every act is a one-time act addressed to everyone.

## Solution sketch

API-first over the PD019 T3 contracts; **no migration of its own** (house pattern). The section gains the `acting` prop its two siblings already carry — the group page computes `actingContext` once and passes it to Forum and Conversations, so the third consumer is one prop, not new plumbing.

One ruling shapes the ceremony (Stefan, carried into this session's brief):

- **Announcements are weighty one-time acts, so they confirm — they do not wear a label.** The chat composer's permanent "Sending as {A}" label is right for a cadence surface; a board is not one. Both wielded acts name the wielding in a modal before firing: "You are announcing as {A}" / "Announce as {A}", and the retract confirm gains the same naming. Nothing is announced or retracted as a group without the wielder having read the group's name in the sentence that fires it.

Mechanics carried from H046/H047: affordances gate on the **hat's** substitution permissions, never the member's own; the read carries `p_acting` and the two-limb gate (limbs 1+2a — membership is the bar) decides; a refused read names the hat, never the malfunction fallback; the session cache keys by **view**, so a personal board and a wielded board never share an entry and a write through either stales them all; `kind` badges render wherever authors render — in **both** views, payload-driven.

Two facts the surface does **not** own, and must not re-implement: the dual actor exclusion on the fan-out and `sent_by_group_id = A` are platform facts (T3), and the platform-announcement plane refuses structurally (a platform row's scope group is NULL, so limb 2a refuses by construction — there is no wieldable DeusEx plane to hide a button for).

## Appetite

One focused Hub session on the merged platform tranche. No schema, so no gate. First cut if it swells: the wielded read + banner + hat-gated compose ship first; the wielded retract fast-follows.

## Rabbit holes

- **H046's hold, unchanged:** no session-wide acting mode; no forked section; no optimistic wielded state.
- **The confirmed row is not optimism.** `send_community_announcement` returns a self-contained row-doc whose `author` the platform already resolved (name, attribution, and `kind`), so the existing prepend-the-confirmed-row render is the platform's own answer and stays — this family has no per-page senders map to go stale, which is exactly what forced H047's wielded send to re-read. The distinction is stated so the next reader doesn't "fix" it into a re-read.
- **The board has no second route.** Nothing to carry a `?acting=` param to; the H047 param pattern is deliberately not reached for here.
- **Retract is a role power, wielded verbatim.** Under the hat, `send_announcements` opens Retract on **every** community row in scope — not only rows A authored. That is the personal semantics substituted, not a widening; the surface renders the affordance and lets the RPC be the gate.

## No-gos

No wielded **platform** announcements (the DeusEx plane is never wieldable — platform-side, structurally). No group-scoped announcement inbox or bell rendering authored here (the fan-out is the platform's; the bell is A-NTF's tenant). No per-wielder read-state on the board (there is none — a board has no clock).

## Stories

### STORY-1: The hat opens the board
As an `act_as_group` holder in A on B's page, I want the Announcements section to render through A's standing when the hat is selected, so the group can read the board it is a member of.

**Acceptance criteria:**
- Given the hat selected, when the section loads, then the read carries the acting group and a "Viewing as {A}" banner names the substitution.
- Given the hat lacks standing (or the read refuses), then honest copy naming the hat — "The {A} hat doesn't open these announcements." — never the malfunction fallback and never the members-only copy.
- Given "Myself", then the section is byte-identical to today — same copy, same affordances, same read.
- Given a switch between "Myself" and a hat, then each view repaints from its **own** cached head (the two never share a cache entry), and "Load earlier" continues within the view it was clicked in.

### STORY-2: The group announces, and corrects itself
As a wielder whose hat carries `send_announcements`, I want to announce and retract as A, so the group can speak once to everyone and take it back.

**Acceptance criteria:**
- Given the hat's permissions include `send_announcements`, then the composer renders; given they do not, it does not — regardless of the wielder's own personal grant.
- Given Announce clicked under the hat, then a confirm names the wielding ("You are announcing as {A} — the board will carry the group's name, not yours." / "Announce as {A}") before anything fires; on cancel nothing is sent and the composed draft survives.
- Given the confirmed send, then the announcement carries the acting group, the confirmed row renders on the board attributed to A, and the composer clears; given a refusal, honest copy and the draft is preserved (today's posture, unchanged).
- Given Retract clicked under the hat, then the confirm names the wielding as well as the consequence ("You are retracting as {A}"); on confirm the row leaves the board.

### STORY-3: Group authors render honestly on the board
As any reader, I want announcement authors that are groups visibly badged, so representation stays visible on the board exactly as in the forum (ADR-U041 §5).

**Acceptance criteria:**
- Given an announcement whose `author` carries `kind: 'group'`, then the "Group" badge renders beside the byline — in personal AND wielded views (payload-driven; `person` and absent kinds render as today).
- Given the attribution ladder's styling ('former'/'unknown' muted, never linked), then the badge never overrides it — the two are independent.

## Platform dependencies

FEAT-PD019 tranche 3 (merged #567, applied): `get_group_announcements(p_group_id, p_before, p_limit, p_acting)` · `send_community_announcement(p_group_id, p_title, p_body, p_acting)` · `retract_announcement(p_announcement_id, p_acting)`. The widened attribution ladder (`ds5_resolve_author_display`, T1) serves `kind` on every announcement author. H018's acting reads for the hat state; FEAT-H046's group-page acting plumbing (reused, not duplicated).

## Cross-product impact

None. The section-scoped acting prop is the pattern H046 established and this is its third and last consumer in the acting family.

## Vertical impact

- **Administration:** none new — the admin announcement view (`/api/admin/groups/[id]/announcements`) is a separate plane and untouched; wielded acts audit platform-side (PC015 Open Q4).
- **Privacy/GDPR:** the board shows the group as author, never the wielding person (the PD019 posture rendered); no new identifier reaches the surface.
- **Notifications:** none authored here — the fan-out, the dual actor exclusion, and `sent_by_group_id = A` are platform facts (T3); the bell renders them already.
- **Observability:** the two wielded writes and the wielded read ride the existing id-only BFF telemetry with the `wielded` flag (the H046 route pattern); refusals stay events via `mapAnnouncementError`.
- **Transactions:** none.
- **Extensibility:** the badge keys on the open-set `kind` (unknown kinds render raw, never crash); affordances key on permissions; the `acting` query/body key matches the BFF's existing vocabulary — no new terms.

## Performance budget

Interaction-follow-up reads on an existing page; **no new first paint**. The wielded board is the same request with a param; hat-switching repaints from the section's own view cache; no page joins or leaves the overview bundle; no deep-cold measurement owed (ADR-U043).

## Implementation notes (2026-08-21, TASK-H048-1 — all three stories)

Built same-session as the pull, on the merged T3 contracts. No migration. Beyond the ceremony ruling:

- **The section was the third consumer of plumbing that already existed.** `app/groups/[id]/page.tsx` computes `actingContext` once for Forum and Conversations; Announcements needed one prop. No new page state, no second fetch — the appetite held.
- **The wielded send keeps its confirmed-row prepend, deliberately.** `send_community_announcement` returns a self-contained row-doc whose `author` the platform has already resolved (name, attribution, `kind`), so the prepend renders the platform's own answer. H047's wielded send had to re-read only because its senders map is per-page and a first-time sender resolved to 'Unknown'; this family has no such map. Stated in the spec's rabbit holes so it is not "fixed" into a re-read later.
- **Retract under the hat is a role power substituted verbatim**: `send_announcements` opens Retract on every community row in scope, not only rows A authored. The affordance renders; the RPC is the gate.
- **Mechanics:** `acting` through `lib/announcements` queries + client and the two BFF routes (plumbing, `wielded` telemetry flag); the client's group cache gained the H046 `viewKey` split with a prefix-scoped drop (a write through either view stales both); `AuthorDisplay` gained the additive `kind?: string` the forum/messages types already carry; the section renders the H046 posture (banner, hat-gated affordances, hat-insufficiency branch, view-keyed peek reset) plus two confirms — "You are announcing as {A}" / "Announce as {A}" and "You are retracting as {A}" / "Retract as {A}".
- **Red -> green:** 10 red / 2 pure guards across 12 new cells (11 in `GroupAnnouncementsSection.acting.test.tsx`, 1 page passthrough) -> 12/12; full unit tier **179 suites 1516/1516**; lint 0 errors; `next build` green; **the wielded announcements E2E journey green beside the wielded-forum and wielded-conversation journeys** (3/3 in one run).
- **Labelled sibling adaptation:** three cells in the pre-existing `GroupAnnouncementsSection.test.tsx` pinned exact call arity and now assert the trailing `undefined` acting id. Behaviour on the personal path is byte-identical; the assertions keep their force (they still pin that no acting group is carried).
- **A browser-tier bug the whole pyramid below missed — recorded because the lesson generalises.** The client's query-string builder used `URLSearchParams.size`; the bundled Chromium does not implement it, so `undefined > 0` was false, the entire query string was dropped, the wielded read arrived as a *personal* read, and the board refused members-only — while the send (a JSON body) succeeded, producing the confusing signature of a working write over a refusing read. Fixed to the forum client's proven `toString()` idiom. **Honest limit: jsdom and Node DO implement `.size`, so no unit cell can discriminate the two spellings** — the transport cells added to `tests/unit/lib/announcements/client.test.ts` cover the layer the section suites mock away (the param reaches the URL/body at all, view-keying, the both-views drop) but are explicitly NOT a guard against this bug. The generalisable lesson: query-string construction is only truly proven in a browser, and copying the sibling's idiom beats inventing a tidier one.
- **Environment note:** the run's :3000 dev server was a wounded survivor — its Next compiler worker pool was dead ("Jest worker encountered 2 child process exceptions"), so every on-demand compile 500'd and mimicked feature bugs. The E2E ran against `next start -p 3001` via the config's own `E2E_BASE_URL` escape hatch rather than killing a server that might belong to a live manual session.

## Decomposition walks (recorded 2026-08-21, at the pull)

- **Payload walk:** every rendered field traces to a served key. `get_group_announcements` serves `{id, title, body, created_at, author_group_id, author}` per row — byte-shaped against today's personal read, with `p_acting` only re-referencing *who* the membership test runs for (`supabase/migrations/20260820150000_feat_pd019_t3_wielded_announcement_contracts.sql:80-92`). `author` comes from `ds5_resolve_author_display(a.author_group_id, p_group_id)`, which since T1 returns `kind` on every resolvable identity and omits it on rung-3 'Unknown' (`20260816120000_feat_pd019_t1_wielded_forum_contracts.sql:132-185`) — so the badge is payload-driven in both views, and `AuthorDisplay` in `hub/lib/announcements/queries.ts` needs the same additive `kind?: string` the forum/messages types already carry. `send_community_announcement` returns the same row shape with `author_group_id = v_actor` and the author resolved (`…t3…sql:170-174`) — self-contained, which is why the prepend stays. `retract_announcement` returns `{id, retracted_at}` only; the surface filters by id, as today. A's banner name comes from the page's existing acting context — no extra fetch. New quote-bearing copy ("You are announcing as {A}", "Announce as {A}", "You are retracting as {A}", "The {A} hat doesn't open these announcements.") checked against H046's and H047's confirm registers — no collisions.
- **Mechanism walk:** `hub/lib/announcements/queries.ts` gains a trailing `acting` on all three couriers (RPC param passthrough); `hub/lib/announcements/client.ts` gains the H046 `viewKey(groupId, acting)` cache split and prefix-scoped `dropGroupAnnouncements` (a write through either view stales them all); the two BFF routes (`/api/groups/[id]/announcements` GET+POST, `/api/announcements/[id]/retract` POST) gain param/body passthrough plus the `wielded` telemetry flag — plumbing only, no new routes, identity split unchanged (ADR-U038; the route-policy conformance test is the gate). The section renders the H046 posture: `acting` prop, `gate()` over the hat's permissions, banner, hat-insufficiency branch on `isForbidden`, view-keyed peek reset on hat switch, and two wielded confirms. `app/groups/[id]/page.tsx` passes `acting={actingContext}` — the value already exists on the line above.

