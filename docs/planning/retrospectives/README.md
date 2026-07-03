# Retrospectives

Weekly, cycle, wave, and quarterly retrospectives. **The permanent learning artifacts** — ephemeral task files get deleted after the cycle retro is committed, but the retro itself stays forever.

All four scales use the same template: [`../../templates/retrospective.md`](../../templates/retrospective.md). Scope determines depth, not structure — a weekly retro is lighter than a quarterly audit, but the sections are the same.

## The four scales

| Scale | When it's written | Filename | Scope |
|-------|-------------------|----------|-------|
| **Weekly Three Ls** | ~30 min Friday | `weekly-YYYY-MM-DD.md` | Liked / Learned / Lacked for the past week. The smallest retrospective that still produces signal. Not optional even when "nothing happened." |
| **Cycle retrospective** | ~2 hrs, end of each cycle | `retro-YYYY-MM-DD.md` | What worked, what didn't, what to change for the next cycle. Feeds into the next cycle's betting table. |
| **Wave retrospective** | End of each wave (when last Build item is Done) | `retro-wave-{name}.md` | Wider lens: what the wave taught about the ecosystem and the way of working. Triggers the ecosystem roadmap update. |
| **Quarterly process audit** | Once per quarter | `audit-YYYY-Q#.md` | The "is the process still serving us?" pass. Asks: what did I skip? what's missing? what can be automated? Same template as a retro, wider scope. |

## Why one template for all four

The shape of useful reflection doesn't change with the time scale. Three Ls, metrics, decisions, process changes, and action items are equally relevant whether you're looking back at a week, a cycle, a wave, or a quarter. Keeping everything in one template and one directory means the learning trail is a single searchable chronological record — grep patterns work across scales, and writing a quarterly audit becomes "read the last 12 weekly retros, the last 3–4 cycle retros, and synthesise."

## Naming patterns at a glance

```
weekly-2026-04-17.md             ← weekly Three Ls
retro-2026-04-30.md              ← cycle retro (dated by cycle-end)
retro-wave-ferd.md               ← wave retro (named by wave)
audit-2026-Q2.md                 ← quarterly process audit
```

## Index

- [retro-2026-07-03.md](retro-2026-07-03.md) — cycle retro, Phase-3 Identity completion (Cycles A–E + interludes); first committed cycle retro; triggered the Identity-era task sweep.
- [2026-07-02-api-boundary-compliance-retro.md](2026-07-02-api-boundary-compliance-retro.md) — special-topic root-cause retro: why v2 code drifted from the API-boundary canon (companion to the api-conformance-register).
