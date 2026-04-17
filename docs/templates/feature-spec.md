# FEAT-{PREFIX}{NNN}: {Title}

---
id: FEAT-{PREFIX}{NNN}
title: {Feature title}
owner: {platform/core/infrastructure | platform/core/identity | platform/core/organisation | platform/core/governance | platform/domain/experience-engine | platform/domain/content | platform/domain/communication | platform/domain/world-model | platform/domain/narrative-engine | platform/domain/discovery | platform/domain/intelligence | hub | gimbal | game | studio/journey-studio | studio/universe-studio | studio/arc-studio | design-system}
consumers: [{hub} | {gimbal} | {game} | {studio/journey-studio} | {studio/universe-studio} | {studio/arc-studio}]
wave: {ferd | eid | hamn | heim | brim | urd}
maturity: {0-raw | 1-concept | 2-explored | 3-specified | 4-ready | 5-in-cycle | 6-done}
# Optional parking fields (the icebox mechanism under Model A).
# Omit both fields when the feature is active. When parked, BOTH must be set.
# Maturity and parked are orthogonal — parking does not regress maturity.
# parked: true
# parked_reason: {Short explanation — e.g., "Priority shifted to Eid wave; revisit when Ferd ships."}
---

## Problem
What pain or gap does this address? Who feels it?

## Solution sketch
*(Forward-looking specs only — omit for maturity 6-done)*
Rough approach — breadboards, fat-marker sketches, not wireframes.

## Implementation notes
*(Maturity 6-done only — omit for forward-looking specs)*
What was actually built, where it lives, and any decisions made during implementation.
Key files, migrations, RPCs, components.

## Appetite
*(Forward-looking specs only — omit for maturity 6-done)*
How much time is this worth? (Fixed time, variable scope.)

## Rabbit holes
*(Forward-looking specs only — omit for maturity 6-done)*
Known complexities to avoid or timebox.

## No-gos
What this feature explicitly does NOT include (v1 boundaries).

## Stories

### STORY-1: {Story title}
As a {role}, I want {capability}, so that {benefit}.

**Acceptance criteria:**
- Given {context}, when {action}, then {outcome}
- Given {context}, when {action}, then {outcome}

### STORY-2: {Story title}
...

## Platform dependencies
Which platform core or domain service capabilities does this require?

## Cross-product impact
Does this affect sibling products (Hub, Gimbal, Game, Studios)? If yes, how?

## Vertical impact

For each vertical, state the impact or write "None" — do not leave blank.

- **Privacy/GDPR:** Does this feature collect, store, or process personal data? Consent requirements? Right to deletion implications?
- **Notifications:** Does this feature trigger notifications? Which channels (in-app, email, push)? User preference controls needed?
- **Administration:** Does this feature require DeusEx oversight or moderation capabilities? Lifecycle management needs?
- **Observability:** Does this feature need audit logging? What events should be tracked? Error monitoring considerations?
- **Transactions:** Does this feature involve payments, subscriptions, or financial data?
- **Extensibility:** Does this feature introduce new types, enums, or permission scopes? If yes, are they designed to be open for extension (no hardcoded lists, no sealed sets)?
