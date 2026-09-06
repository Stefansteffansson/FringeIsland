# Templates

**Purpose:** Reusable starting points for every document type in the ecosystem. Use a template instead of freestyling a structure — consistency lets future-you (and future contributors) scan a doc and know exactly where to find what.

**This is for:** Canonical templates only. One template per document type.

**This is NOT for:** Actual documents — those live in their respective directories (ecosystem, products, platform, planning, etc.).

The trigger → template map lives in `../planning/PROCESS.md` §6. This file is the index of what each template is for.

---

## Structure

```
docs/templates/
├── README.md                              ← you are here
│
│   ── Ecosystem + Architecture ──
├── adr.md                                 ← architecture decision record
├── product-description.md                 ← FIM-facing product identity
├── product-specification.md               ← inward-facing build spec
├── product-roadmap.md                     ← NOW/NEXT/LATER view
├── domain-service-spec.md                 ← domain service specification
├── platform-core-spec.md                  ← Platform Core area specification
├── studio-description.md                  ← studio identity + lifecycle
├── studio-specification.md                ← inward-facing studio build spec
├── design-system-specification.md         ← design-system tier specification
├── vertical-spec.md                       ← cross-cutting vertical specification
│
│   ── Features + Work ──
├── feature-spec.md                        ← Shape Up pitch + BDD stories (stories embedded inline)
├── task.md                                ← ephemeral implementation task
│
│   ── Planning ──
├── wave-spec.md                           ← wave thematic focus + scope
├── cycle-plan.md                          ← Shape Up betting cycle plan (a dated document)
├── cycle-current.md                       ← the front door: what is being built now (written by `npm run cycle:kickoff`)
├── retrospective.md                       ← cycle or wave retrospective
├── session-bridge.md                      ← session artifact for continuity
│
│   ── Session openers ──
├── autonomous-l1-l3-session-opener.md     ← autonomous L1→L3 entity-derivation run
├── spec-amendment-session.md              ← scope-locked fold-back into an existing spec
│
│   ── Research ──
└── research-spike.md                      ← time-boxed investigation
```

---

## Index

| Template | Use when | Output goes in |
|----------|----------|----------------|
| [`feature-spec.md`](./feature-spec.md) | A capability is ready to spec (Shape Up pitch + BDD). Stories are embedded inline. | `../{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md` |
| [`task.md`](./task.md) | Feature reaches maturity 4-ready, pulled into cycle | `../planning/backlog/tasks/TASK-{NNN}.md` |
| [`adr.md`](./adr.md) | Significant architectural decision taken | `../architecture/decisions/NNNN-{title}.md` |
| [`research-spike.md`](./research-spike.md) | Time-boxed research before specifying | `../research/{topic}.md` |
| [`product-description.md`](./product-description.md) | New product surface identified | `../products/{name}/DESCRIPTION.md` |
| [`product-specification.md`](./product-specification.md) | Product enters active development | `../products/{name}/SPECIFICATION.md` |
| [`product-roadmap.md`](./product-roadmap.md) | Product needs a NOW/NEXT/LATER view | `../products/{name}/ROADMAP.md` |
| [`domain-service-spec.md`](./domain-service-spec.md) | New domain service scoped | `../platform/domain/{name}.md` |
| [`platform-core-spec.md`](./platform-core-spec.md) | Platform Core area enters active development | `../platform/core/{area}-specification.md` |
| [`studio-description.md`](./studio-description.md) | New Studio scoped | `../studios/{name}/DESCRIPTION.md` |
| [`studio-specification.md`](./studio-specification.md) | Studio enters active development | `../studios/{name}/SPECIFICATION.md` |
| [`design-system-specification.md`](./design-system-specification.md) | Design system enters active development | `../design-system/SPECIFICATION.md` |
| [`vertical-spec.md`](./vertical-spec.md) | Cross-cutting vertical needs specifying | `../verticals/{name}.md` |
| [`wave-spec.md`](./wave-spec.md) | Defining or updating a wave | `../planning/waves/{wave}.md` |
| [`cycle-plan.md`](./cycle-plan.md) | New build cycle starts — the dated plan document | `../planning/hub-v2/YYYY-MM-DD-{slug}-plan.md` today (that directory's successor after Ferd) |
| [`cycle-current.md`](./cycle-current.md) | The same moment, before decomposing anything — the front door, written by `npm run cycle:kickoff -- "<name>" <plan path>`; repointed at close | `../planning/cycles/cycle-current.md` (overwritten every cycle) |
| [`retrospective.md`](./retrospective.md) | Cycle or wave retro | `../planning/retrospectives/retro-{scope}-{date}.md` |
| [`session-bridge.md`](./session-bridge.md) | Planning/design session with Claude | `../planning/sessions/YYYY-MM-DD_-_{TOPIC}.md` |
| [`autonomous-l1-l3-session-opener.md`](./autonomous-l1-l3-session-opener.md) | Authoring a per-instance opener for an autonomous CC run of L1→L3 derivation on a single entity | `../planning/sessions/openers/cc-{entity-short-name}-autonomous.md` |
| [`spec-amendment-session.md`](./spec-amendment-session.md) | Authoring a per-instance opener for a scope-locked fold-back of pre-enumerated findings into an already-derived canonical spec | `../planning/sessions/openers/cc-{spec-short-name}-amendment.md` |

---

## Feature spec — owner + consumers

The `feature-spec.md` template uses **`owner`** + **`consumers`** in its YAML frontmatter (NOT `product`/`service`/`studio`). Exactly one owner per spec; zero-or-more consumers.

## Two modes: forward-looking vs retroactive

- **Forward-looking** (maturity 0–4): Shape Up pitch — Problem → Appetite → Solution sketch → Rabbit holes → No-gos → Stories → Platform dependencies → Cross-product impact → Vertical impact.
- **Retroactive `6-done`**: Captures already-shipped work — Problem → Implementation notes → No-gos → Stories → Platform dependencies → Cross-product impact → Vertical impact. Omit Appetite, Solution sketch, and Rabbit holes.

## Conventions

- Every template starts with a frontmatter-style header followed by a one-line description in a blockquote.
- Section numbering is part of the template — don't remove it. It enables "see §3" cross-references.
- Placeholder text uses `{curly braces}`. Fill them in or delete them — never ship with placeholders.
- Templates are meant to be adapted. Delete sections that don't apply. If you keep adding the same new section, propose a template change.
- Every feature spec must complete the Vertical Impact section — no vertical left blank.

## Changing a template

Templates are versioned alongside everything else. Open a `type:process` work item, edit the template, and note the change in the next retrospective. Don't fork templates — improve the canonical one.
