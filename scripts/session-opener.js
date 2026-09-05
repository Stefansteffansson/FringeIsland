#!/usr/bin/env node
/**
 * SessionStart hook — injects the session opener AND the front door into the
 * session context.
 *
 * Wired in .claude/settings.json (hooks.SessionStart). Two texts, in order:
 *   1. docs/planning/SESSION-OPENER.md — the opener (way of working, close ritual).
 *   2. docs/planning/cycles/cycle-current.md — the front door: which cycle is
 *      running, its dated plan, the latest bridge, what is next (PROCESS.md §3;
 *      Audit V R-14, adopted 2026-09-05 — so every session, and Stefan, start
 *      from the same door).
 * Edit those files to change what's injected; you don't need to touch this
 * script or settings.json.
 *
 * Fails quiet: a missing/unreadable file must never block a session from
 * starting — the opener alone, or nothing, is injected instead.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', ...rel), 'utf8');
  } catch {
    return null;
  }
};

try {
  const opener = read(['docs', 'planning', 'SESSION-OPENER.md']);
  const door = read(['docs', 'planning', 'cycles', 'cycle-current.md']);
  const parts = [];
  if (opener) parts.push(opener);
  if (door) {
    parts.push(
      '---\n\n# The front door — `docs/planning/cycles/cycle-current.md` (what is being built now)\n\n' +
        door,
    );
  }
  if (!parts.length) process.exit(0);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') },
    }),
  );
} catch {
  process.exit(0);
}
