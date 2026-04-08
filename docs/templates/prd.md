# PRD — {Feature name}

**Status:** Draft · In review · Approved · Shipped · Archived
**Owner:** {name}
**Last updated:** YYYY-MM-DD
**Tags:** product:{...} · type:feature · maturity:3-specified · domain-service:{...} · wave:{...}
**Related:** {ADRs, prior PRDs, parent epic, research spikes}

> A Product Requirements Document. One PRD = one shippable slice of value. If it doesn't fit on three pages, it's an epic — split it.

---

## 1. Problem
What is broken, missing, or painful today? Who feels it? How often? Evidence (quotes, metrics, support tickets) over assertion.

## 2. Outcome
The single sentence that, if true after shipping, means this PRD succeeded. Phrase as a measurable change, not a feature description. ("X% of new groups complete onboarding in under 5 minutes" — not "we add an onboarding wizard.")

## 3. Users & jobs-to-be-done
Who is this for? What job are they hiring this feature to do? What were they doing before, and why was it not enough?

## 4. User stories
List the user stories this PRD covers. Each story uses `../templates/user-story.md` shape inline:

- As a **{role}**, I want **{capability}**, so that **{benefit}**.
  - Acceptance: Given/When/Then scenarios.

## 5. Out of scope
Things a reader might assume are included but aren't. Be specific — vague exclusions don't survive scope creep.

## 6. UX shape
Wireframe, flow diagram, or written walkthrough. For purely backend features, the API shape goes here instead.

## 7. Data & API impact
- New tables / columns / RLS implications
- New API routes (path, method, request, response, auth)
- Migration notes
- Cross-product or shared API surface changes (update `../platform/core/SPECIFICATION.md` if applicable)

## 8. Edge cases
Empty state. Failure state. Concurrent state. Unauthorized state. Cancelled state. Anything race-y or destructive.

## 9. Dependencies
What must exist (or be decided) before this can be built? If anything is unresolved, this PRD is not Ready (Level 4).

## 10. Open questions
Questions that, if answered wrong, would change the design. Each open question is a blocker until closed (or split into a research spike).

## 11. Success metrics
How will we know it worked after shipping? Name the metric, the baseline, the target, and the measurement window.

---

**Definition of Ready:** see `../planning/PROCESS.md` §4.
**Definition of Done:** see `../planning/PROCESS.md` §5.
