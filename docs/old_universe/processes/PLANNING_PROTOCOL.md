# Planning Protocol

**Version:** 1.0
**Last Updated:** April 5, 2026
**Purpose:** Defines the planning sequence for new products/waves. Research before roadmap. Lessons learned from Ferd.

---

## Principle

For Ferd, we created the roadmap before doing proper research and feasibility validation. This led to architectural assumptions that weren't validated and scope decisions made without sufficient investigation. For Hamn and beyond, we follow a research-first sequence.

---

## Planning Sequence

```
1. RESEARCH.md     — Investigate unknowns, validate feasibility, answer open questions
2. PRODUCT_SPEC.md — Define what we're building based on research findings
3. REQUIREMENTS.md — Detail the requirements based on the spec
4. ROADMAP.md      — Sequence the work based on requirements and dependencies
```

Each step informs the next. Do not skip ahead.

---

## Research Phase

Before specifying a product or major feature:

1. **Identify unknowns** — What don't we know? What assumptions are we making?
2. **Run validation spikes** — Can the technology do what we need? (e.g., AI feasibility)
3. **Resolve open questions** — Triage items from OPEN_QUESTIONS.md and deferred items
4. **Document findings** — Each investigation gets an entry in RESEARCH.md with clear resolution

### RESEARCH.md Format

```markdown
### RQ-X-001: [Question Title]
**Status:** Open | In Progress | Resolved | Parked
**Raised:** [date]
**Blocks:** [what can't proceed without this]
**Context:** [1-3 sentences]
**Deep dive:** [link to dedicated doc if investigation has started]
```

ID conventions:
- `RQ-F-001` — Ferd research
- `RQ-H-001` — Hamn research

---

## Experimentation Principle

Experimentation is a permanent discipline, not a phase. At every scale:

- **Ferd (small user base):** Ship to beta users, iterate based on direct feedback
- **Hamn (growing user base):** Feature flags, A/B testing, staged rollouts
- **Later waves (large user base):** Formal experimentation framework, data-driven decisions

The principle is constant: validate before you commit. The tooling evolves with the user base.

---

## File Locations

```
docs/old_products/ferd/planning/RESEARCH.md     — Ferd-specific investigations
docs/old_products/hamn/planning/RESEARCH.md     — Hamn-specific investigations
docs/old_universe/strategy/OPEN_QUESTIONS.md    — Cross-wave strategic questions
docs/old_universe/community/OPEN_QUESTIONS.md   — Community/organizational questions
```

---

## Related

- [Deferral Protocol](./DEFERRAL_PROTOCOL.md)
- [Ferd Research](../../old_products/ferd/planning/RESEARCH.md)
- [Hamn Research](../../old_products/hamn/planning/RESEARCH.md)
- [Cross-wave Open Questions](../strategy/OPEN_QUESTIONS.md)
- [Community Open Questions](../community/OPEN_QUESTIONS.md)
