#!/usr/bin/env node
/**
 * SessionStart hook — injects the session opener into the session context.
 *
 * Wired in .claude/settings.json (hooks.SessionStart). The opener *text* lives in
 * docs/planning/SESSION-OPENER.md — edit that file to change what's injected; you
 * don't need to touch this script or settings.json.
 *
 * Fails quiet: a missing/unreadable opener must never block a session from starting.
 */
const fs = require('fs');
const path = require('path');
try {
  const file = path.join(__dirname, '..', 'docs', 'planning', 'SESSION-OPENER.md');
  const text = fs.readFileSync(file, 'utf8');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text }
  }));
} catch {
  process.exit(0);
}
