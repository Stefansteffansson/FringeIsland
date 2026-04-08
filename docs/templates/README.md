# Templates

Reusable starting points for every document type in the ecosystem. **Use a template instead of freestyling a structure** — consistency lets future-you (and future contributors) scan a doc and know exactly where to find what.

The trigger → template map lives in `../planning/PROCESS.md` §6. This file is the index of what each template is for.

## Index

| Template | Use when | Output goes in |
|----------|---------|----------------|
| [`prd.md`](./prd.md) | Major feature reaches maturity 3 (Specified) | `../planning/prds/prd-{slug}.md` |
| [`user-story.md`](./user-story.md) | Breaking a PRD into individually shippable stories | Inline in PRD, or `../planning/prds/stories/us-{NNN}.md` |
| [`adr.md`](./adr.md) | A significant architectural decision is taken | `../architecture/decisions/NNNN-{title}.md` |
| [`research-spike.md`](./research-spike.md) | Time-boxed research before specifying | `../research/{topic}.md` |
| [`product-description.md`](./product-description.md) | New product surface identified | `../products/{name}/DESCRIPTION.md` |
| [`product-specification.md`](./product-specification.md) | Product enters active development | `../products/{name}/SPECIFICATION.md` |
| [`product-roadmap.md`](./product-roadmap.md) | Product needs a NOW/NEXT/LATER view | `../products/{name}/ROADMAP.md` |
| [`domain-service-spec.md`](./domain-service-spec.md) | New domain service scoped (DS-1 … DS-7 + Extension System) | `../platform/domain/{name}.md` |
| [`studio-description.md`](./studio-description.md) | New Studio scoped (authoring tool for creators) | `../studios/{name}/DESCRIPTION.md` |
| [`session-bridge.md`](./session-bridge.md) | Planning / design session with Claude | `../planning/sessions/YYYY-MM-DD-{topic}.md` |
| [`cycle-plan.md`](./cycle-plan.md) | A new build cycle starts | `../planning/cycles/cycle-current.md` |
| [`retrospective.md`](./retrospective.md) | Weekly, cycle, or wave retro | `../planning/cycles/retro-{scope}-{date}.md` |
| [`vertical-spec.md`](./vertical-spec.md) | Cross-cutting vertical (V1–V5) needs specifying | `../verticals/{name}.md` |

## Conventions

- Every template starts with a frontmatter-style header (status, owner, dates, tags) followed by a one-line description in a blockquote.
- Section numbering is part of the template — don't rip it out. It makes "see §3" cross-references possible.
- Placeholder text uses `{curly braces}`. Fill them in or delete them — never ship a doc with `{curly braces}` still in it.
- Tags follow the four-category system in `../planning/PROCESS.md` §7 (product, type, maturity, domain service — plus optional wave).
- Templates are meant to be *adapted*, not slavishly followed. If a section doesn't apply to your case, delete it. If you keep wanting to add the same new section, propose a template change (`type:process` work item).

## Changing a template

Templates are versioned alongside everything else. Open a `type:process` work item, edit the template, and note the change in the next retrospective. Don't fork templates — improve the canonical one.
