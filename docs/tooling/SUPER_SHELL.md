# Super Shell MCP — Operational Contract

**Scope:** How Claude runs shell commands during FringeIsland development.
**Audience:** Future-you, and any Claude session working in this repo.
**Last verified:** 2026-04-24 on Windows / cmd.exe, super-shell MCP server.

---

## Why this doc exists

The super-shell MCP server gives Claude the ability to run shell commands on your machine. That power needs a guardrail, and the guardrail is a **whitelist with three tiers**. This document captures:

1. What's in each tier and why
2. Two non-obvious gotchas that will bite you if you don't know about them
3. What to do when things don't work

If you're reading this in a fresh session and something below contradicts what Claude is telling you — trust the doc, re-verify the whitelist with `get_whitelist`, and update this file if the ground has shifted.

---

## The three tiers

| Tier | Behavior | Contents |
|---|---|---|
| 🟢 `safe` | Runs without prompting | Read-only inspection only |
| 🟡 `requires_approval` | Queues a prompt; you approve before it runs | Anything that mutates filesystem, network, or repo state |
| 🔴 `forbidden` | Rejected outright, no approval possible | Destructive or privilege-escalating |

### Current positive list

**🟢 safe** — `echo`, `dir`, `type`, `cd`, `findstr`, `where`, `whoami`, `hostname`, `ver`, `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `file`

**🟡 requires_approval** — `copy`, `move`, `mkdir`, `rmdir`, `rename`, `attrib`, `git`, `mmdc`, `npm`, `node`

**🔴 forbidden** — `del`, `erase`, `format`, `runas`

### Deliberately NOT on the whitelist

These are absent on purpose. If you or a future session are tempted to add them, reread this paragraph first:

- **`powershell`, `pwsh`, `cmd`** — would let any session spawn a nested shell and bypass the entire tier system. Never add these.
- **`curl`, `wget`, `Invoke-WebRequest`** — arbitrary network egress. If Claude needs to fetch something, it should use its built-in web tools, not shell out.
- **`rm`, `rmdir -r` variants** — `del`/`erase` are already `forbidden`; don't let the Unix cousins sneak in via `usr\bin`.

The list is tight on purpose. Every addition is a future attack-surface decision. **Add on demand, not speculatively.**

---

## Gotcha 1: `shellExecutionEnabled: false`

`get_platform_info` reports shell execution is off. This means super-shell spawns commands directly via Node's `spawn()` — no cmd.exe wrapper, no shell parsing. Consequences:

### Shell builtins don't work

`dir`, `type`, `echo`, `findstr`, `cd` are **cmd.exe builtins**, not real executables. They're on the whitelist at `safe` (from the default config) but they fail with `spawn <cmd> ENOENT` because there's no `dir.exe` on disk.

**Workaround:** use the Unix equivalents from Git's `usr\bin` instead.

| Don't use | Use instead |
|---|---|
| `dir <path>` | `ls <path>` |
| `type <file>` | `cat <file>` |
| `findstr <pattern> <file>` | `grep <pattern> <file>` |
| `echo` | (don't — there's no value in Claude echoing) |

This requires `C:\Program Files\Git\usr\bin` to be on the user PATH. If `ls` fails with `ENOENT`, the PATH isn't set or Claude Desktop wasn't restarted after setting it.

### No persistent `cd`

Each `execute_command` spawns a fresh process. You can't `cd` into a folder and then run commands there. For `git` specifically, use the `-C` flag:

```
git -C "D:\WebDev\GitHub Repositories\FringeIsland" status --short
```

For other commands, pass the absolute path as an argument.

### Why not just flip `shellExecutionEnabled` to `true`?

Because it would route commands through cmd.exe, which means shell metacharacters (`&`, `|`, `>`, `&&`) in arguments become injection vectors. A whitelisted `safe` command like `ls` could be turned into `ls & del /s /q C:\*` by anything that feeds a crafted arg string. The whitelist checks the command name, not the arg contents. The current posture — no shell parsing, tight positive list — is safer. Live with the `-C` inconvenience.

---

## Gotcha 2: Whitelist state may be per-session

**Observed 2026-04-24:** whitelist modifications made in one Claude Desktop session did not appear in a subsequent session. Specifically, seven `safe`-tier additions (`ls`, `cat`, `head`, `tail`, `wc`, `grep`, `file`) and four `requires_approval` additions (`git`, `mmdc`, `npm`, `node`) reverted to the 19-command default between sessions.

**Implication:** Don't assume the whitelist is durable. At the start of any session where Claude needs non-default commands, verify with `get_whitelist` and re-add anything missing.

**Potential fix:** If super-shell supports a config file or CLI flag for a persistent whitelist, use that instead of runtime adds. Check `npx super-shell-mcp --help` or the README. If such a config exists, point to it from here and move the current whitelist into it.

**Until then:** treat `add_to_whitelist` calls as session-scoped setup, not permanent configuration.

---

## Pairing with other MCP servers

Super-shell is not the only way to touch the filesystem. In this repo you also have:

- **`fringeisland` filesystem MCP** — path-scoped, safer for routine file reads and writes. Prefer this for straightforward read/write of repo files.
- **`fringeisland-git` MCP** — dedicated git operations with structured inputs. Prefer this over `git` via super-shell when the operation is available, since it's less error-prone than string-based CLI invocations.

**Decision rule:** reach for super-shell when you need something the dedicated MCP servers don't expose — pipelines, `grep -r`, unusual flags, running `mmdc` or `npm` scripts. For everything else, use the purpose-built server.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Command not whitelisted: <cmd>` | Fresh session, whitelist reverted | Re-add with `add_to_whitelist` |
| `spawn <cmd> ENOENT` | Command is a cmd.exe builtin OR PATH missing Git's `usr\bin` | Use Unix equivalent; verify `where.exe ls` from a real terminal |
| `spawn git ENOENT` | Git not on PATH | Unlikely on your setup — Git is at `C:\Program Files\Git\cmd\git.exe` and should be on PATH |
| Approval prompt never appears in UI | MCP server thinks it queued, client didn't render it | Check `get_pending_commands`; restart Claude Desktop if prompts are lost |
| Command runs from wrong directory | No persistent `cd` | Pass absolute paths; use `git -C <path>` |

---

## Maintenance

**When to update this doc:**

- You add or remove a command from the whitelist (and it sticks across sessions)
- A new super-shell version changes behavior (shell parsing, persistence, new flags)
- You discover a gotcha that cost you more than 10 minutes to diagnose
- Ericsson security policy changes anything relevant

**When NOT to update this doc:**

- Routine session-scoped re-adds (those are expected until persistence is solved)
- Temporary experiments

---

## Appendix: PATH setup

`C:\Program Files\Git\usr\bin` must be on the **user** PATH (not system — user scope is the right blast radius for dev tools).

**GUI:** Win → "environment variables" → "Edit environment variables for your account" → User `Path` → Edit → New → paste the path → OK through all dialogs → **fully quit and relaunch Claude Desktop** (tray icon, not just the window).

**PowerShell equivalent:**

```powershell
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\Git\usr\bin",
    "User"
)
```

**Verify from a fresh PowerShell:** `where.exe ls` should return `C:\Program Files\Git\usr\bin\ls.exe`.

**Note:** Git's `usr\bin` also contains `sh.exe`, `bash.exe`, and `perl.exe`. Putting the directory on PATH doesn't whitelist those in super-shell (they're still rejected by the tier system), but it does mean any Node tooling that shells out to `sh` or `bash` can now find them. That's almost always desired, but naming it for completeness.
