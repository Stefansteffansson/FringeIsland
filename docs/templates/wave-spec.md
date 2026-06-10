# Wave {N}: {Name} — {Meaning}

<!-- Valid wave names: ferd | eid | hamn | heim | brim | urd -->

---
name: {ferd | eid | hamn | heim | brim | urd}
status: {planned | active | cooldown | completed}
started: {date or TBD}
target_completion: {date or TBD}
---

## Theme
What is this wave about? One paragraph.

## Features in scope

<!--
Feature ID prefixes:
- PC = Platform Core           (FEAT-PC###)
- PD = Platform Domain Service (FEAT-PD###)
- H  = Hub                     (FEAT-H###)
- G  = Gimbal                  (FEAT-G###)
- WS = World Studio            (FEAT-WS###)
- AS = Arc Studio              (FEAT-AS###)
- JS = Journey Studio          (FEAT-JS###)
- US = Universe Studio         (FEAT-US### — umbrella level only)
(GM is retired — the Game is depth, not a product; ADR-U025. H/G cover shell features only.)
-->

### Products
- [ ] [FEAT-H{NNN}: {title}](link-to-feature-spec) — Hub
- [ ] [FEAT-G{NNN}: {title}](link-to-feature-spec) — Gimbal

### Platform
- [ ] [FEAT-PC{NNN}: {title}](link-to-feature-spec) — Platform Core ({identity | organisation | governance | infrastructure})
- [ ] [FEAT-PD{NNN}: {title}](link-to-feature-spec) — Platform Domain ({world-model | narrative-engine | experience-engine | content | communication | discovery | intelligence})

### Studios (World, Arc, Journey under Universe Studio — ADR-U026)
- [ ] [FEAT-WS{NNN}: {title}](link-to-feature-spec) — World Studio
- [ ] [FEAT-AS{NNN}: {title}](link-to-feature-spec) — Arc Studio
- [ ] [FEAT-JS{NNN}: {title}](link-to-feature-spec) — Journey Studio
- [ ] [FEAT-US{NNN}: {title}](link-to-feature-spec) — Universe Studio (umbrella level)

## Wave completion criteria (Definition of Done)

### Feature completeness
- [ ] All listed features have maturity = 6-done
- [ ] End-to-end user journey verified: {describe the critical path}

### Quality gates
- [ ] All tests pass (unit, integration, e2e)
- [ ] No critical/high security vulnerabilities
- [ ] RLS policies applied to all new tables

### Documentation
- [ ] All ADRs written for decisions made during this wave
- [ ] Platform API contracts documented for all shipped endpoints
- [ ] Product specifications updated to reflect shipped features

### Retrospective
- [ ] Wave retrospective completed (`../retrospectives/retro-wave-{name}.md`)
- [ ] Ecosystem roadmap updated
