# Research spike — {topic}

**Status:** Open · In progress · Closed
**Owner:** {name}
**Time-box:** {hours or days — must be set up front, no open-ended spikes}
**Started:** YYYY-MM-DD
**Closed:** YYYY-MM-DD
**Tags:** type:spike · maturity:2-explored · {product/wave/domain-service if applicable}

> A spike is time-boxed research, not implementation. Output is a decision, a recommendation, or a list of follow-up work items — never production code.

---

## Question

The single question this spike is trying to answer. If you can't write it as one sentence, the spike is too broad — split it.

## Why it matters

What downstream decision is blocked on the answer? Which feature spec, ADR, or work item is waiting?

## Hypotheses

What you currently believe the answer might be, before doing the work. Recording this matters: at the end you'll know whether the research confirmed or surprised you.

- H1: ...
- H2: ...

## Method

How you're going to answer the question. Code experiments, doc reading, prototyping, talking to a person, building a throwaway. Be specific enough that someone else could reproduce it.

## Findings

What you actually learned. Include surprises, dead ends, and things you ruled out — those are as valuable as what you confirmed.

## Recommendation

Given the findings, what should happen next? One of:
- **Proceed** with {approach} — and create work items X, Y, Z
- **Don't proceed** — because {reason}
- **More research needed** — open a follow-up spike with a narrower question

## Follow-up work items

Anything this spike spawns goes here, ready to be filed as feature specs or tasks:

- [ ] {item} — type:{...} · maturity:1-concept
- [ ] {item} — type:{...} · maturity:1-concept

## Artifacts

Throwaway code, screenshots, links, notes — anything supporting the findings. Don't merge spike code into production.
