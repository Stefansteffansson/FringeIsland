# FEAT-H047: Wielded conversation affordances — the group takes its seat on the Hub

---
id: FEAT-H047
title: Wielded conversation affordances — the hat opens the conversations list and the thread, and the group speaks with a labelled composer
owner: hub
consumers: []
wave: unassigned
maturity: 5-in-cycle
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
As any reader, I want group senders and participants visibly badged, so representation stays visible in conversations exactly as in the forum (ADR-U041 §5).

**Acceptance criteria:**
- Given a sender or participant whose display object carries `kind: 'group'`, then the "Group" badge renders beside the name in the thread and its participant list — in personal AND wielded views (payload-driven; absent/`person` kinds render as today).
- Given the wielded view, then A's own participant row is highlighted client-side by `participant_group_id` (`is_me` stays the personal identity — the T2 payload note), and the Report affordance hides (the ruled wielded surface: read/send/join/leave only).

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

## Decomposition walks (recorded 2026-08-20)

- **Payload walk:** every rendered field traces to served keys — list rows are byte-shaped with `am_i_participant` re-referented (T2); the thread renders `senders[].kind`, `participants[].name/kind` (widened ladder, T1), `my_last_read_at` (A's clock, T2); A's banner name comes from the payload's own participants row (no extra fetch). Quote-bearing copy is new to this spec ("Sending as {A}", "You are joining/leaving as {A}") — checked against H046's confirm register, no collisions.
- **Mechanism walk:** BFF routes `/api/groups/[id]/conversations` + `/api/messages/[id]` (+ `/join`, `/leave`, `/read`, `/group`) gain param/body passthrough (plumbing only, ADR-U038); `useSearchParams` on the thread page sits behind Suspense (the W-1 CSR-bailout precedent, `app/groups/[id]/page.tsx:60`); the pending-bubble machinery stays personal-only; `leave` requires the T2R rider (`20260820120000` — the walk-miss lesson recorded in PD019). Conformance: no new routes, identity split unchanged (route-policy test is the gate).
