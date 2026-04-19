# Invoking doc-health-check

This is the invocation cheat sheet for the `doc-health-check` skill. Read this first when someone asks for a doc-health run; it routes you into the skill with the right framing and focus.

The skill itself lives at [`SKILL.md`](./SKILL.md) in this same directory. This file is a thin wrapper — it tells you *how to invoke* the skill; `SKILL.md` tells you *what to do once invoked*.

---

## Standard invocation

Load [`.claude/skills/doc-health-check/SKILL.md`](./SKILL.md). Read the most recent session bridge under `docs/planning/sessions/` (directory listing is the canonical index; pick the most recent file whose name doesn't look like a topic-specific summary) to understand what changed since the last sweep. Run the sections the skill's When-to-run table routes those changes to. Produce the standard output summary. Apply in-place fixes where safe; flag anything bigger than a five-minute fix as a backlog item.

That's the default. If the invoker has given no other guidance, do exactly this.

---

## Focused invocation patterns

When the invoker names a specific trigger, emphasise the matching section(s) from the skill's When-to-run table. The skill defines nine sections; you usually don't run all nine at equal depth. Weight effort toward what just happened.

| If the invoker says… | Emphasise |
|----------------------|-----------|
| "after we deleted files / archived a tree / retired a concept" | Sections 1.5, 3.5, 3.6 |
| "after a cross-cutting rename" | Section 1 |
| "after a schema migration" | Section 2 |
| "after a folder rename or restructure" | Section 3 |
| "after scoping a new product/studio/service" or "after adding a structural placeholder" | Section 6 + Section 7 (registry) |
| "wave transition" / "significant scope shift" | Sections 4 + 5 |
| "a feature just shipped" | Section 5, scoped to that feature |
| "cycle boundary" | All nine, normal depth — part of the cooldown-week ritual |
| (no specific guidance given) | Standard invocation above |

If the invoker gives a free-form request ("check the docs after today's work"), use the most recent session bridge to infer the right section(s). If the bridge is unclear or absent, ask the invoker what changed before starting — don't guess.

---

## Limitation to flag every time

The MCP `search_files` tool in Claude.ai-bound fringeisland does NOT recurse reliably into nested subdirectories. It will silently under-report. If you are running this skill from Claude.ai (as opposed to CC) and the check requires full-tree coverage, either:

- Use `list_directory` per subdirectory and aggregate, OR
- Ask the invoker to run the recursive grep in CC (`grep -r`, `find`, PowerShell `Get-ChildItem -Recurse`) and paste the results back.

Never treat a "no matches" result from `search_files` as canonical for tree-wide questions. This is captured in the skill's Known gaps section and is the dominant reason to prefer CC for doc-health runs.

---

## Reporting back to the invoker

Whatever you found, report:

1. **Which sections you ran**, with skip reasons for any you skipped (the skill's output format has a line per section).
2. **What you fixed in-place**, with file paths + line numbers + a one-line description each.
3. **What you flagged as backlog items**, with why each didn't fit the five-minute rule.
4. **Placeholders confirmed scaffolding** per Section 7 (if the registry caught any would-be false positives — this is a positive signal, worth reporting).
5. **Any blind spots you noticed** that the skill didn't catch but probably should. Log these in the skill's "Known gaps" section if confidence is high; otherwise raise them to the invoker.

The goal is honesty about coverage. An under-reported "clean" sweep is worse than a noisy one.

---

## When to update this file

Update `INVOKE.md` when:
- The skill gains or loses sections (the cheat sheet's focused-invocation table needs to stay in sync).
- A new common invocation pattern stabilises (add a row to the table).
- A new environmental limitation is discovered (add to the Limitation section).
- The standard invocation pattern itself changes (rare).

Don't update `INVOKE.md` for every skill body change — the cheat sheet is invocation-level, not content-level. If you find yourself copy-editing this file because the skill was refined, you're probably duplicating content that should live only in `SKILL.md`.

---

## Related

- [`SKILL.md`](./SKILL.md) — the skill body (what to do once invoked)
- [`docs/planning/PROCESS.md` §3](../../../docs/planning/PROCESS.md) — cycle-boundary cadence, where this skill fires as part of the cooldown ritual
- [`docs/planning/sessions/`](../../../docs/planning/sessions/) — session bridges; the most recent one is the default context for a focused sweep
