# Templates

Reusable starting points for every document type in the ecosystem. **Use a template instead of freestyling a structure** — consistency lets future-you (and future contributors) scan a doc and know exactly where to find what.

The trigger → template map lives in `../planning/PROCESS.md` §6. This file is the index of what each template is for.

## Index

| Template | Use when | Output goes in |
|----------|----------|----------------|
| [`feature-spec.md`](./feature-spec.md) | A capability has been identified and is ready to spec (Shape Up pitch + embedded BDD stories) | `../{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md` |
| [`user-story.md`](./user-story.md) | A story is large enough to warrant its own file (otherwise embed in the feature spec) | Inline in feature, or as standalone story file |
| [`task.md`](./task.md) | A feature reaches maturity 4-ready and is pulled into a cycle | `../planning/backlog/tasks/TASK-{NNN}.md` |
| [`adr.md`](./adr.md) | A significant architectural decision is taken | `../architecture/decisions/NNNN-{title}.md` |
| [`research-spike.md`](./research-spike.md) | Time-boxed research before specifying | `../research/{topic}.md` |
| [`product-description.md`](./product-description.md) | New product surface identified | `../products/{name}/DESCRIPTION.md` |
| [`product-specification.md`](./product-specification.md) | Product enters active development | `../products/{name}/SPECIFICATION.md` |
| [`product-roadmap.md`](./product-roadmap.md) | Product needs a NOW/NEXT/LATER view | `../products/{name}/ROADMAP.md` |
| [`domain-service-spec.md`](./domain-service-spec.md) | New domain service scoped (DS-1 … DS-7 + Extension System) | `../platform/domain/{name}.md` |
| [`studio-description.md`](./studio-description.md) | New Studio scoped (authoring tool for creators) | `../studios/{name}/DESCRIPTION.md` |
| [`vertical-spec.md`](./vertical-spec.md) | Cross-cutting vertical (V1–V5) needs specifying | `../verticals/{name}.md` |
| [`wave-spec.md`](./wave-spec.md) | Defining or updating a wave's thematic focus + scope | `../planning/waves/{wave}.md` |
| [`cycle-plan.md`](./cycle-plan.md) | A new build cycle starts | `../planning/cycles/cycle-current.md` |
| [`retrospective.md`](./retrospective.md) | Cycle or wave retro | `../planning/retrospectives/retro-{scope}-{date}.md` |
| [`session-bridge.md`](./session-bridge.md) | Planning / design session with Claude | `../planning/sessions/YYYY-MM-DD-{topic}.md` |

## Feature spec — owner + consumers

The `feature-spec.md` template uses **`owner`** + **`consumers`** in its YAML frontmatter (NOT `product`/`service`/`studio`). Exactly one owner per spec; zero-or-more consumers.

## Two modes: forward-looking vs retroactive

The feature spec template supports two modes:

- **Forward-looking** (maturity 0–4): Shape Up pitch — Problem → Appetite → Solution sketch → Rabbit holes → No-gos → Stories → Platform dependencies → Cross-product impact → Vertical impact.
- **Retroactive `6-done`**: Used to capture already-shipped work — Problem → Implementation notes → No-gos → Stories → Platform dependencies → Cross-product impact → Vertical impact. Omit Appetite, Solution sketch, and Rabbit holes — they have no meaning for already-built work.

## Conventions

- Every template starts with a frontmatter-style header (status, owner, dates, tags) followed by a one-line description in a blockquote.
- Section numbering is part of the template — don't rip it out. It makes "see §3" cross-references possible.
- Placeholder text uses `{curly braces}`. Fill them in or delete them — never ship a doc with `{curly braces}` still in it.
- Tags follow the four-category system in `../planning/PROCESS.md` §7 (product, type, maturity, domain service — plus optional wave).
- Templates are meant to be *adapted*, not slavishly followed. If a section doesn't apply to your case, delete it. If you keep wanting to add the same new section, propose a template change (`type:process` work item).
- Every feature spec must complete the Vertical Impact section — no vertical left blank.

## Changing a template

Templates are versioned alongside everything else. Open a `type:process` work item, edit the template, and note the change in the next retrospective. Don't fork templates — improve the canonical one.
