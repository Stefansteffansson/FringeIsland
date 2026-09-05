# FEAT-H047: Wielded conversation affordances — the group takes its seat on the Hub

---
id: FEAT-H047
title: Wielded conversation affordances — the hat opens the conversations list and the thread, and the group speaks with a labelled composer
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

FEAT-PD019 tranche 2 (+ the T2R leave rider) opened all seven group-conversation contracts to wielding — and no surface renders any of it. A wielder on the host group's page sees the conversations section refuse as members-only even with the hat on, and the thread page has no notion of acting at all. The forum half (FEAT-H046) set the affordance pattern; this is the same pattern over the second family, with two new problems the forum never had: threads live on their own route (`/messages/[id]`), and chat cadence makes per-act confirm modals hostile.

## Solution sketch

API-first over the PD019 T2 contracts; **no migration of its own** (house pattern). Two rulings shape the design (Stefan, 2026-08-19):

- **The link carries the hat.** The wielded conversations list links to `/messages/[id]?acting=A`. The thread page reads the param (behind a Suspense boundary — the `useSearchParams` CSR-bailout rule, the W-1 precedent), fetches through the wielded contract, and renders the banner; the server gate is the authority (a hand-edited param opens nothing). Reload keeps the hat; the same thread opened from the personal inbox renders personally. No session-wide acting state, ever.
- **The composer wears a label, not a modal.** Wielded sends show a permanent "Sending as {A}" label at the composer — no per-message dialogs. The weighty one-time acts keep their confirms: joining, leaving, and creating as the group each name the wielding before firing.

Mechanics carried from H046: the section gains an `acting` prop from the group page's existing hat state; affordances gate on the hat's substitution permissions; wielded writes re-read (no optimistic bubbles — the pending-bubble machinery is personal-path-only); refused states name the hat; `kind` badges render wherever senders/participants render (both views — `authorKindBadge` reuse).

## Appetite

One focused Hub session on the merged platform tranche (+ the T2R rider at its gate — **this feature's PR merges after the rider's**). First cut if it swells: the list door + thread read/send ship first; join/leave/create confirms fast-follow.

## Rabbit holes

- **H046's hold:** no session-wide acting mode; no forked thread components (the wielded thread is the same page with a param); no optimistic wielded state.
- **The param is not trust.** `?acting=` is a rendering instruction; every fetch carries it to the substrate and the two-limb gate decides. The page never pre-computes eligibility beyond what the payloads already say.
- **No wielded DM anywhere**: DM rows never link with the param; a hand-carried param on a DM gets the substrate's 42501 and the honest fallback.

## No-gos

No group inbox (`/messages` lists personal threads only — the PD020-rejected alternative stays rejected). No per-wielder read-state rendering (the clock is the group's — ruled). No hint plumbing (the v1 silence ruling; the reconcile poll and refocus cover the open thread).

## Stories

### STORY-1: The hat opens the conversations list
As an `act_as_group` holder in A on B's page, I want the Conversations section to render through A's standing when the hat is selected, so the group's threads are reachable.

**Acceptance criteria:**
- Given the hat selected, when the section loads, then the list serves via the acting read with a "Viewing as {A}" banner, and each row's Join/Open/Leave reflects **A's** participation (`am_i_participant`).
- Given the hat lacks standing (or the read refuses), then honest copy naming the hat — never the malfunction fallback; given "Myself", byte-identical to today.
- Given the hat's permissions include `create_group_conversations`, then "New conversation" renders and confirms with copy naming the wielding before creating; A lands as the thread's first participant (platform fact) and the page navigates to the wielded thread.
- Given Join (or Leave) clicked under the hat, then a one-time confirm names the wielding ("You are joining as {A}" / "You are leaving as {A}"); on confirm the act fires and the list re-reads; Open navigates to `/messages/[id]?acting=A`.

### STORY-2: The thread carries the hat in the address
As a wielder, I want `/messages/[id]?acting=A` to render the thread as the group, so that the seat A took is usable.

**Acceptance criteria:**
- Given the param and a valid hat, then the detail read carries `p_acting`, a banner names the substitution, `my_last_read` is A's clock, and opening marks the **group's** clock read (the ruled shared semantics; same auto-mark the personal path has).
- Given the composer, then a permanent "Sending as {A}" label renders at it; a send carries the acting group, shows **no optimistic bubble** (the confirmed row appends on return), and the message renders attributed to A.
- Given the substrate refuses (stale hat, DM, bad param), then honest copy naming the refusal with a "View as myself" fallback that drops the param and renders the personal view (which may itself refuse honestly).
- Given the same thread without the param, then behaviour is byte-identical to today — including from the personal inbox.

### STORY-3: Group identities render honestly, everywhere
As any reader, I want group senders visibly badged, so representation stays visible in conversations exactly as in the forum (ADR-U041 §5).

**Acceptance criteria:**
- Given a message whose sender's display object (the senders map) carries `kind: 'group'`, then the "Group" badge renders beside the byline — in personal AND wielded views (payload-driven; absent/`person` kinds render as today). *(Payload-walk correction, 2026-08-20: `participants[]` serve `name` only — `kind` lives on the senders map, and the thread page renders no participant roster; the byline is the badge's one home.)*
- Given the wielded view, then the banner and composer label are A's presence rendering (no separate roster highlight exists to draw), and the Report affordance hides (the ruled wielded surface: read/send/join/leave only).

## Platform dependencies

FEAT-PD019 tranche 2 (merged, #556) + the T2R leave rider (`20260820120000`, **at the schema gate — this PR merges after it**). H018's acting reads for the hat state; FEAT-H046's group-page acting plumbing (reused, not duplicated).

## Cross-product impact

The param-carried per-page acting pattern is the reference for any future surface whose wielded content lives off the owning page. No sibling changes.

## Vertical impact

- **Administration:** none new — moderation/admin sight unchanged; wielded acts audit platform-side (PC015 Open Q4).
- **Privacy/GDPR:** the surface shows the group as sender, never the wielding person (the PD019 posture rendered); the param exposes only a group id the caller already wields.
- **Notifications:** none — the v1 hint-silence ruling holds; no dispatch authored here.
- **Observability:** wielded acts ride the existing id-only BFF telemetry (`wielded` flag pattern from H046's routes); refusals are events.
- **Transactions:** none.
- **Extensibility:** badges key on the open-set `kind`; affordances on permissions; the param name (`acting`) matches the BFF's existing query key — no new vocabulary.

## Performance budget

Interaction-follow-up reads on existing pages; **no new first paint**. The wielded list/thread are the same requests with a param; hat-switching repaints from the section's own state; the thread page adds zero requests (the acting read the banner needs rides the already-fetched payload's participants). No page joins or leaves the overview bundle; no deep-cold measurement owed (ADR-U043).

## Implementation notes (2026-08-20, TASK-H047-1 — all three stories)

Built same-session as the pull, on the merged T2 contracts + the T2R rider (whose PR this one merges after). No migration. Beyond the two rulings:

- **The consumer build caught a platform gap first**: the Leave door had no wielded contract — tranche 2 had missed `leave_group_conversation` (the T2R rider, its own gate-held PR; the walk lesson recorded in PD019). The section's Leave-as-group affordance calls it.
- **The wielded send re-reads, and the re-read is load-bearing**: an appended confirmed row would render 'Unknown' for a first-time sender — the senders map is per-page, and A's entry only exists after a re-read serves it. (The personal path's optimistic append has the same latent first-message quirk — pre-existing, found not caused, left untouched.)
- **Mechanics:** `acting` params through `lib/messages` client + queries and six BFF routes (plumbing, `wielded` telemetry flag); the section and thread page render the H046 posture (banner, hat-gated affordances, honest hat-insufficiency copy); the thread page's `useSearchParams` sits behind Suspense (W-1); confirm copies — "You are joining/leaving as {A}", "You are opening this conversation as {A}"; the composer label "Sending as {A}"; Report hidden under the hat; sender `kind` badges in both views (`authorKindBadge` reuse; `AuthorDisplay.kind` added to the messages types, additive).
- **Red → green:** 11 red / 1 pure guard at the unit tier (the S3 "guard" cell deliberately half-new — badges are new in both views) → **12/12**; full unit tier **178 suites 1497/1497** (labelled sibling adaptation: the three thread-page suites' navigation mocks gained `useSearchParams`); lint 0 errors; `next build` green; **E2E: the wielded conversation journey green** (hat → banner → confirmed join → param-carried thread → labelled send → Group-badged message) beside the wielded-forum and forum journeys — labelled honestly: the E2E was authored with the implementation (it caught the senders-map re-read fact); red-first proof lives at the unit tier. The wielded Leave affordance is unit-covered; no E2E leg (labelled).
- **Test-harness note:** `use(params)` + Suspense requires rendering inside an async `act` under RTL (React 19) — the pattern is in `conversation-page.acting.test.tsx` for the next page harness.

**Post-6-done fix (2026-09-05, the Ferd close — [TASK-RACE-01](../../../planning/backlog/tasks/TASK-RACE-01-superseded-read-overwrites-current-view.md)):** the E2E journey failed on the test project because a personal (members-only) read still in flight when the hat went on resolved *after* the wielded read and flipped the section to "the hat doesn't open this group's conversations" — a stale-response race in `GroupConversationsSection.load`, not a door defect (the trace showed the wielded read served 200). `load` now takes a read sequence number before its `await` and a superseded read never writes; the same guard landed in the forum (H046) and announcements (H048) sections, which shared the shape. Red-first unit cells in the acting test files; the E2E journey re-run green.

## Decomposition walks (recorded 2026-08-20)

- **Payload walk:** every rendered field traces to served keys — list rows are byte-shaped with `am_i_participant` re-referented (T2); the thread renders `senders[].kind` (widened ladder, T1) and `my_last_read_at` (A's clock, T2); **`participants[]` serve `name` only — no `kind`** (walk correction 2026-08-20, caught before red: the earlier draft claimed a participants kind that is not served; the byline is the badge's home). A's banner name comes from the payload's own participants row (no extra fetch). Quote-bearing copy is new to this spec ("Sending as {A}", "You are joining/leaving as {A}") — checked against H046's confirm register, no collisions.
- **Mechanism walk:** BFF routes `/api/groups/[id]/conversations` + `/api/messages/[id]` (+ `/join`, `/leave`, `/read`, `/group`) gain param/body passthrough (plumbing only, ADR-U038); `useSearchParams` on the thread page sits behind Suspense (the W-1 CSR-bailout precedent, `app/groups/[id]/page.tsx:60`); the pending-bubble machinery stays personal-only; `leave` requires the T2R rider (`20260820120000` — the walk-miss lesson recorded in PD019). Conformance: no new routes, identity split unchanged (route-policy test is the gate).
