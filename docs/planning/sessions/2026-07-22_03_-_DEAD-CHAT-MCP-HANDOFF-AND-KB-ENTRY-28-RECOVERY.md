# Session bridge — 2026-07-22 (03): dead-chat MCP hand-off protocol, and the whisp KB entry-28 recovery

**Session span:** Stefan's question (why are the `fringeisland` MCP servers failing to read and write files in the Claude.ai project "FringeIsland - Discovery"?) → root cause isolated → work recovered out of the dead thread → entry 28 + four cross-references landed on `main` via #246.

**Previous bridge:** `2026-07-22_02_-_DISCOVERY-WORKTREE-PROTOCOL-LANDED.md` (the protocol this session exercised for the first time under failure conditions).

## What was actually wrong

A long-lived Claude.ai conversation **permanently loses its MCP tool binding across Claude Desktop restarts**. Every tool call in that thread fails (`Failed to call tool "edit_file"`), while a brand-new chat *in the same project, on the same connector, against the same server processes* works normally — verified within two minutes of each other (old thread failed `list_directory` 16:49:21; new thread succeeded on the identical tool 16:51:42).

Nothing local repairs the old thread: not killing every desktop process, not toggling the connector, not waiting out the retry. The binding was established under a process that no longer exists and does not re-establish.

**The diagnostic is conversation-scoped.** Test with a fresh chat *before* touching config, servers, or network.

## Ops notes worth keeping

- **`mcp-server-<name>.log` proves nothing.** Claude Desktop spawns **two** instances of each configured MCP server; only one writes that log. Successful calls routinely leave no trace in it. This cost most of the diagnosis — an empty log was read as "the call never arrived", twice, wrongly.
- **`claude.ai-web.log`** `[MCP] tool_approval_gate` lines *do* record what the frontend dispatched, with tool name and timestamp. That's the reliable client-side signal.
- **The `remote-tools-device` bridge is not the MCP path.** `main.log` at connect time lists exactly what it serves — `get_device_info`, `device_list_dir`, `device_stage_files`, `device_commit_files`, `list_artifacts`, … It never proxies local MCP servers, so its ~28-minute websocket rotation is not a cause of MCP tool failures.
- **Hand-off prompt pair** (extract as text-only from the dying thread → re-open against verified on-disk state) worked cleanly first try. The dying thread can still reason and write; only tool calls are dead — instruct it explicitly not to attempt tools or it burns the turn narrating the outage.
- **The sweep never needs the dev checkout.** `gh pr create --base main --head discovery` + `gh pr merge <n> --merge` (never `--delete-branch`) runs the merge entirely on GitHub; only the merge-back into `discovery` is local, and it happens in the worktree. This matters because the dev checkout was mid-work in a **live sibling session** (branch `fix/walk-wording-items`, four dirty hub files) at the moment the sweep was due.

## Work landed

`docs/ecosystem/thinking/2026-06-15_knowledge-base_whisp-and-universe-foundations.md`, +47 lines, merged to `main` via **#246**:

1. **Entry 28** — John Flavell, metacognition as the named substrate — plus its index row (`4181482`).
2. **Four reciprocal "Metacognition link (entry 28)" back-pointers** (`d091a7e`), in entries **3** (Korzybski), **12** (Kegan / vertical learning), **16** (ACT), **26** (Kross) — each as the entry's closing line above its `---` separator.

All text was supplied verbatim by the originating thread. **No wording was introduced during recovery**, and no edits were invented into ratified entries — the receiving chat correctly refused to guess the cross-references when the first hand-off omitted them, and they were re-extracted instead.

The failed `edit_file` that started this had written nothing (atomic failure), so the file was intact at 27 entries throughout. No repair was needed.

## Open at close

- **Entries 20 (Eurich) and 25 (Loewenstein) have no back-pointer** to entry 28, though entry 28's keystone table references them. The originating thread was explicit that four was the plan and that symmetry would be a **new decision**. Open: is reciprocal linking a rule or a judgement call?
- **Entry 16 ends with two consecutive `---` separators** — pre-existing, every other entry has one. Left untouched (ratified text).

## Close-ritual state

- **Sweep:** run. #246 merged `discovery` → `main`; `main` merged back into `discovery`; both pushed. `origin/discovery` preserved. `discovery` and `main` identical at close.
- **Dashboard:** refreshed (723 files indexed, 7 tabs).
- **doc-health-check:** skipped — no cross-cutting changes (one additive content file; no renames, deletions, schema, or restructures).
