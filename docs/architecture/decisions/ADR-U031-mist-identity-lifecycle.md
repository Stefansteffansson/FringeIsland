# ADR-U031: Mist identity lifecycle — accretion, ephemerality, transcendence (metamorphosis)

**Status:** Accepted
**Date:** 2026-06-21
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

> Architecture Decision Record (MADR-style). Supersedes [ADR-U027](ADR-U027-shadow-identity-lifecycle.md):
> the anonymous entrant — until now the **Shadow** — is renamed the **Mist**, and "Shadow" is
> **reassigned** to the place-3 / sleep-paralysis menace (the hostile face of the Fringe). U027's
> lifecycle (anonymous auth, ephemerality, atomic transcendence) is **preserved and renamed**, not
> redesigned; this ADR adds the accretion, two-paths/one-gate, presence/assessment-ephemerality, and
> Whisp-carried/cord-kept mechanics. U027 itself renamed [ADR-U004](ADR-U004-visitor-anonymous-sign-in.md)'s
> **Visitor** to Shadow; the chain is U004 → U027 → U031. Source of truth: universe-discovery
> **Statements 47-48** (2026-06-21 resume; outrank all other artifacts), preserving Statements 16, 39, 45, 46.

---

## Context and problem statement

ADR-U027 specified the full lifecycle of the anonymous entrant under the name **Shadow**: anonymous
auth, intrinsic (not fenced) access, ephemeral own-data, and an atomic consent-bearing transition
into FIM. The 2026-06-21 discovery resume (Statements 47-48) reworked the anonymous tier:

- It **renames** the anonymous becoming-figure the **Mist** — a translucent, drifting figure in the
  *hyaline* state — and **re-scopes** "Shadow" to the place-3 menace. "Shadow" is not retired; it now
  names a different thing. A blind find-and-replace would corrupt the new menace sense.
- It adds mechanics U027 did not carry: **accretion** (the figure fills in as the founding questions
  are answered), a **two-entry-paths / one-consent-gate** model, **presence and assessment
  ephemerality** (no trait-profile computed pre-consent; session-ephemeral and unlinkable presence),
  and the **Whisp-carried-from-the-start / cord-kept-not-severed** origin (Statement 48).

*"How should the platform name and specify the anonymous identity now that the discovery has renamed
it the Mist, re-scoped 'Shadow' to the menace, and added the accretion and consent-gate mechanics —
without overturning the U027 lifecycle that is already correct?"*

## Decision drivers

- **Discovery outranks all.** Statements 47-48 are explicit and ratified; specs/ADRs are corrected to
  match, never the reverse.
- **Nothing in U027 is overturned (Statement 48, Option A).** The anon-auth → ephemerality → atomic
  transcendence lifecycle is sound; only the name and the added mechanics change.
- **One word, two clean roles.** Mist (becoming, place-2-adjacent, warm) and Shadow (menace, place-3,
  hostile) must be cleanly separated so neither sense bleeds into the other.
- **Privacy by design, widened.** The unconsented entrant's protection extends from the data layer to
  the **assessment** layer (no pre-consent inference) and the **presence** layer (unlinkable, no
  cross-session identifier).
- The fiction and the platform remain one system (roles core: one system, two faces).

## Considered options

- **Option A** — Blind rename Shadow → Mist everywhere. *Rejected:* corrupts the re-scoped place-3
  "Shadow" sense and silently drops the new mechanics (accretion, presence ephemerality, the cord
  origin) — a token swap where a mechanics update is required.
- **Option B** — Rename the figure to **Mist**, reassign **Shadow** to the place-3 menace, **preserve**
  U027's lifecycle, and **fold in** the new mechanics (chosen).
- **Option C** — Keep "Shadow" for the anonymous entrant and treat S47-48 as flavour. *Rejected:* the
  discovery is the source of truth and outranks the existing artifacts.

## Decision outcome

**Chosen option:** Option B — supersede U027 by renaming the entrant the Mist, reassigning "Shadow" to
the place-3 menace, preserving the lifecycle, and adding the discovery's mechanics.

### The identity (renamed)

The **Mist** is the anonymous becoming-figure: present but not yet anchored, seen but incomplete, in
the **hyaline** state (the lore-word for the translucent, unanchored, not-yet-committed condition).
The Mist is the figure; the hyaline state is the condition. It is first-class — its own Whisp, its own
cord, real presence in the shared near-side world.

### The lifecycle (preserved from U027, renamed; extensions marked)

1. **Entry — anonymous authentication.** A Mist receives a server-issued anonymous identity with no
   PII (the ADR-U004 mechanism, unchanged). Server access is required to perceive the shared near-side
   world at all, so client-only anonymity is not viable; the privacy protection is **ephemerality, not
   refusing to store**.
2. **Access — intrinsic, not a fence.** A Mist has full near-side access (body-anchored); the Beyond
   (the village, deep place 3) is closed intrinsically — no ball, no anchor; FIM-only by status, not by
   a permission fence. Feature gating follows equipment + status (ADR-U025; "one status across
   surfaces, not a product").
3. **Data — ephemeral by rule (extended to assessment + presence).** The Mist's own generated data
   (Whisp dialogue is the most sensitive class) has no durability past session end: a short,
   configurable TTL after **inactivity** plus an **explicit-erase** path on close. **Extensions per
   S47:** while anonymous, a Mist's assessment answers are held **transiently** and **no trait-profile
   is computed** pre-consent (it crystallizes only at the threshold); presence is **session-ephemeral
   and unlinkable** — no client-visible identifier ties a Mist across sessions, and no interaction
   trail is persisted. Device-local-only persistence (progress remembered on the user's own device,
   never server-side) is a permitted kindness; a server-side anonymous token is **explicitly not
   adopted** without a hard retention clock and no pre-consent inference. Shared-world content the Mist
   merely read is out of scope. The exact TTL/inactivity threshold is a Privacy-vertical / PC-2
   configuration (deferred by design).
4. **Transcendence (metamorphosis) — the persistence-and-consent threshold.** Becoming a FIM is the one
   moment data binds durably: consent is captured, the session's experience transfers into the FIM
   account with **continuity** (nothing restarts), and the migration is **atomic** — a last-moment
   joiner must not be erased mid-migration. See the next subsection for the precise one-event semantics.

### Transcendence and metamorphosis are one event, not two

This is the load-bearing mechanics decision of this ADR.

**Metamorphosis = transcendence = one single event** — two faces of the same moment, not two ordered
steps. "Transcendence" is the **platform/spec** term; "metamorphosis" is the **lore** term (the Mist
condensing into the anchored, glowing ball in the Tree, with full function — seeds, the Beyond). This
preserves U027's framing exactly: *in the fiction it grants the ball; on the platform it grants
persistence; same threshold, two faces.*

The event fires **only when both conditions hold: all founding questions answered AND consent given.**
Consent and completion are **two conditions whose timing differs by path — not two events:**

- **Path 2 (enter anonymously as a Mist, choose at the threshold):** both conditions are satisfied in
  the same moment; consent and completion coincide and the event fires once.
- **Path 1 (sign up as a FIM at the door, then mature):** consent is already satisfied at the door, so
  the **completion** condition (all questions answered) is the one that gates the event — metamorphosis
  fires **later, at completion**, **not at signup**. In this interval the person is a **consented,
  persisted FIM whose Mist has not yet condensed** — persistence has begun, but the ball, the Whisp's
  delivery, and the cord's first paying-out still await completion.

**Consent is a precondition of metamorphosis, never a synonym for a separate, earlier event.** If
transcendence fired at signup in Path 1, it would imply the Whisp delivers and the cord first pays out
at signup — which is wrong: Statement 48 ties the cord's **first paying-out** to the **ball**, i.e. to
completion. The ball is the anchor-root that gives the cord purchase to extend; no ball, no
paying-out. So the single event must coincide with completion, in both paths. There is **no second
event** to introduce.

### Mechanics folded in (from Statements 47-48)

- **Accretion tracks progress, never trait.** The figure fills in as the founding questions are
  answered: eyes ("I can be met") → mouth/features ("I can respond") → firmer edges / reduced
  translucence → condensation. A rendered feature signals *how far along*, **never which Big-5
  dimension was answered** — a privacy invariant (stage legible, content private), not just flavour.
- **Interaction gated by accretion; signup buys memory, not voice.** A Mist can perceive and respond
  live, gated by developmental level; every anonymous exchange is **live and unrecorded**. FIM signup
  does **not** unlock the *ability* to interact — it unlocks the ability for interaction to be
  **remembered** (branches, names, DMs, journal, forums — the persistent/reciprocal layer). The
  withheld thing is the world's memory, not the Mist's voice.
- **Dissipation is "not yet," never death.** A Mist that drifts away returns to potential; on return it
  forms anew (a fresh Mist, not a resumed one). Impermanence as openness, not loss.
- **Whisp carried from the start; cord kept, not severed (Statement 48).** A Mist already has its own
  Whisp and cord from the first moment (preserving S39). While a Mist, the cord is **unpaid-out** — at
  rest, near-zero length. Metamorphosis is the **first paying-out** of the cord to length (enabled by
  the ball as anchor-root), not the creation of Whisp or cord. The cord is then **kept, not severed**
  (the umbilical inverted): FIM and Whisp are two-but-bound; cord length (set by the FIM, S40) is
  developmental intimacy.

### The re-scope: "Shadow" is the place-3 menace

"Shadow" is **not retired** — it is reassigned to the **place-3 / sleep-paralysis menace** (the hostile
face of the Fringe, Statement 32). One word that did double duty is split into two cleanly separated
roles: **Mist** (becoming) and **Shadow** (menace). Where canon models place 3 (the cosmology core
especially), the place-3-menace sense of "Shadow" is made explicit so the two never collide.

### Consequences

- **Positive:** vocabulary matches the discovery; the becoming-figure has a name that carries its lore
  (translucent, accreting), and "Shadow" is freed for the menace it now names.
- **Positive:** the privacy posture is strictly stronger — no pre-consent inference; unlinkable,
  session-ephemeral presence — and the consent-gate semantics are unambiguous across both entry paths.
- **Negative:** a repo-wide reconciliation is required (the Mist reconciliation pass — register:
  `docs/planning/reference/mist-reconciliation-register.md`); the place-3-menace "Shadow" sense must be
  introduced where place 3 is modelled, not assumed.
- **Neutral:** U027 is preserved intact as history (status flipped to Superseded; body unchanged). The
  `Visitor`/`Guest` schema identifiers remain in code; the deferred code-correction target's
  destination is now **Mist** (not Shadow).

### Clarification — 2026-06-26 (FEAT-H003, IDN-1 build)

Making the entry/access boundary precise for implementation, consistent with this ADR's existing text:

- A public *FringeIsland entry* (generic content) is reachable **sessionless** — no anonymous identity, no rows. Because "server access is required to perceive the shared near-side world at all" (stage 1, Entry), the Mist is materialised at the **first act that enters/perceives the shared near-side world** — lazily, not at page load — bounding anonymous-token creation to genuine entrants (bot/bounce traffic on the public entry creates nothing).
- Cross-session return reaffirms the existing rule "on return it forms anew (a fresh Mist, not a resumed one)": a return across a true session boundary (expired/reaped session, or a different device) has **no server-side cross-session identifier**. The permitted **device-local-only kindness** (stage 3) is unchanged and is *not* built in IDN-1. The server-side anonymous token's required **hard retention clock** (TTL + reaper) is **FEAT-H004 (IDN-2)**; until it lands, the small set of actual-entrant Mist rows accumulates as a known, logged gap.
- **Durable cross-session memory is the FIM's**, granted at transcendence — the platform-promise / manifesto-aligned conversion incentive.

## Pros and cons of each option

### Option A — Blind rename Shadow → Mist
- Pros: mechanically trivial.
- Cons: corrupts the re-scoped place-3 "Shadow" sense; drops the new mechanics; treats a mechanics
  update as a token swap.

### Option B — Rename + reassign + preserve + fold in (chosen)
- Pros: matches the discovery exactly; nothing correct is overturned (S48 Option A); the two senses are
  cleanly separated; privacy posture widened; consent-gate semantics made precise.
- Cons: a repo-wide reconciliation pass and the place-3 "Shadow" sense to introduce deliberately.

### Option C — Keep "Shadow" for the entrant
- Pros: no reconciliation work.
- Cons: contradicts the source of truth; leaves the rename and the new mechanics unmade.

## Links

- **Supersedes:** [ADR-U027](ADR-U027-shadow-identity-lifecycle.md) (the Shadow identity lifecycle —
  preserved and renamed here).
- **Extends / related:** [ADR-U004](ADR-U004-visitor-anonymous-sign-in.md) (the anonymous sign-in
  mechanism — Visitor → Shadow → Mist) · [ADR-U025](ADR-U025-products-as-equipment-profiles.md) (status
  + equipment gating) · [ADR-U029](ADR-U029-whisp-ownership-split-by-face.md) (Mists carry their own
  Whisp from the start) · [ADR-U010](ADR-U010-privacy-dedicated-vertical.md) · [ADR-U016](ADR-U016-cascade-specification-first.md)
- **Source:** universe-discovery **Statements 47-48** (2026-06-21), preserving Statements 16, 39, 45, 46
  (`docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md`).
- **Reconciliation worklist:** `docs/planning/reference/mist-reconciliation-register.md`.
