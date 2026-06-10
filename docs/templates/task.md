# {Task title}

---
id: TASK-{NNN}
title: {Task title}
status: {todo | in_progress | review | done | blocked}
assigned_to: {person or agent name}
priority: {low | medium | high | critical}
feature: {FEAT-{PREFIX}{NNN}}  # e.g. FEAT-PC001, FEAT-PD001, FEAT-H001, FEAT-G001, FEAT-WS001, FEAT-AS001, FEAT-JS001, FEAT-US001 (GM retired - ADR-U025)
owner: {platform/core/infrastructure | platform/core/identity | platform/core/organisation | platform/core/governance | platform/domain/experience-engine | platform/domain/content | platform/domain/communication | platform/domain/world-model | platform/domain/narrative-engine | platform/domain/discovery | platform/domain/intelligence | hub | gimbal | studios/universe-studio/world-studio | studios/universe-studio/arc-studio | studios/universe-studio/journey-studio | studios/universe-studio | design-system}
wave: {ferd | eid | hamn | heim | brim | urd}
cycle: {cycle name or number, if scheduled}
depends_on: [{TASK-IDs}]
estimated_hours: {number}
---

## Description
What needs to be done, concretely.

## Acceptance criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## Technical notes
Implementation hints, relevant files, patterns to follow.

## Verification
How to verify this is done (manual steps or test commands).
