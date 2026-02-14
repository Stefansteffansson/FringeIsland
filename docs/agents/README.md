# Agent System

**Purpose:** Two-tier agent structure with continuous learning for AI-assisted development
**Last Updated:** February 13, 2026

---

## Architecture

Agents are organized in two tiers:

### Tier 1: Domain Agents (Knowledge + Execution)
These are your "hands" — they know how to build things in their domain.

| Agent | File | Purpose |
|-------|------|---------|
| **Database** | [database-agent.md](./contexts/database-agent.md) | Schema, migrations, RLS, triggers, functions |
| **UI** | [ui-agent.md](./contexts/ui-agent.md) | Components, styling, UX patterns, accessibility |
| **Integration** | [integration-agent.md](./contexts/integration-agent.md) | Data flow, Supabase queries, state management |
| **Test** | [test-agent.md](./contexts/test-agent.md) | Behavior specs, test writing, coverage tracking |

### Tier 2: Process Agents (Thinking + Governance)
These are your "brain" — they think about what to build and whether it's good.

| Agent | File | Purpose |
|-------|------|---------|
| **Architect** | [architect-agent.md](./contexts/architect-agent.md) | System design, schema evolution, technical decisions |
| **QA/Review** | [qa-agent.md](./contexts/qa-agent.md) | Code review, security audit, pattern compliance |
| **Sprint** | [sprint-agent.md](./contexts/sprint-agent.md) | Planning, retrospectives, knowledge curation |

### Legacy (Archived)
| Agent | File | Status |
|-------|------|--------|
| **Feature** | [feature-agent.md](./contexts/archive/feature-agent.md) | Replaced by Integration Agent + workflows. Archived for reference. |

---

## How Agents Work Together

### Feature Development Flow
```
Sprint Agent: "Here's what we're building"
    |
Architect Agent: "Here's the design"
    |
Test Agent: "Here are the behavior specs + failing tests" (RED)
    |
Database Agent + Integration Agent + UI Agent: "Built it" (GREEN)
    |
QA/Review Agent: "Reviewed — looks good" (or "fix these issues")
    |
Test Agent: "All tests pass"
    |
Sprint Agent: "Update status, retrospective"
```

### Bug Fix Flow
```
Test Agent: "Failing test reproduces the bug" (RED)
    |
[Domain Agent]: "Fixed" (GREEN)
    |
QA/Review Agent: "Verified, no regressions"
```

---

## Continuous Learning System

Agents learn through a three-layer system:

### Layer 1: Playbooks (stable, curated)
The agent context files themselves. Contain **proven patterns** confirmed across multiple uses. Updated deliberately during Sprint retrospectives.

**Location:** `docs/agents/contexts/[agent].md`

### Layer 2: Journals (running, append-only)
Each agent has a companion learning log. Discoveries are appended during work. Low friction, fast capture.

**Location:** `docs/agents/learnings/[domain].md`

| Domain | Journal File |
|--------|-------------|
| Database | `learnings/database.md` |
| UI | `learnings/ui.md` |
| Integration | `learnings/integration.md` |
| Testing | `learnings/testing.md` |
| Architecture | `learnings/architecture.md` |
| QA | `learnings/qa.md` |
| Sprints | `learnings/sprints.md` |

### Layer 3: Collective Memory (cross-cutting index)
`MEMORY.md` in the Claude Code memory directory. Holds only cross-cutting rules that affect ALL agents. Hard cap: 150 lines.

### Learning Flow
```
During work:
  Discovery → Agent Journal (append)

Close-down workflow:
  "What did we learn?" → Relevant Agent Journal(s)
  Cross-cutting insight → MEMORY.md

Sprint retrospective:
  Review journals → Promote confirmed patterns to Playbooks
  Review MEMORY.md → Prune outdated entries
  Flag recurring issues → Update relevant agent's Known Pitfalls
```

### Journal Entry Format
```markdown
### YYYY-MM-DD: [Short description]
[What happened, what was learned]
→ Promoted to playbook? [Not yet / Yes (date)]
```

### Promotion Criteria
A journal entry is promoted to a playbook when:
- Confirmed across **2+ separate uses** (not just one occurrence)
- Represents a **stable pattern** (not a one-off workaround)
- Would **prevent a mistake** if known upfront

---

## Agent Context Structure

Every agent playbook follows this structure:

```markdown
# [Agent Name] Context

## Identity          — Who am I? What do I care about?
## Quick Reference   — Key files, commands, numbers
## Boundaries        — What I do / don't do / hand off to
## [Domain Content]  — Patterns, checklists, examples
## Quality Gates     — How I know my work is done
## Known Pitfalls    — Common mistakes to avoid
## Learning Protocol — Journal location and update process
## Related Docs      — Links to detailed documentation
```

**Critical sections** that older agents may lack:
- **Boundaries** — Prevents agents from doing each other's work
- **Quality Gates** — Clear "definition of done"
- **Learning Protocol** — Connection to the journal system

---

## Which Agent to Load

| Work Type | Primary Agent | Also Load |
|-----------|--------------|-----------|
| Database changes | Database | Architect (for design) |
| UI components | UI | Integration (for data) |
| Wiring data to UI | Integration | — |
| Writing tests | Test | Relevant domain agent |
| System design | Architect | Database (for schema) |
| Code review | QA/Review | — |
| Sprint planning | Sprint | — |
| New feature (full) | Start with Architect, then domain agents as needed | Test |
| Bug fix | Test first (reproduce), then domain agent | QA/Review (verify) |

**Rule:** Load 1-2 agents at a time, not all seven. Each agent's Boundaries section tells you when to hand off.

---

## Related Documentation

- **Workflows:** `docs/workflows/` (boot-up, close-down, TDD, feature development)
- **Behavior specs:** `docs/specs/behaviors/`
- **Feature docs:** `docs/features/`
- **Project status:** `PROJECT_STATUS.md`
- **Technical patterns:** `CLAUDE.md`
