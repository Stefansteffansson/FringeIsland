#!/usr/bin/env node
/**
 * cycle-kickoff.js — writes the front door, `docs/planning/cycles/cycle-current.md`,
 * from the template `docs/templates/cycle-current.md`.
 *
 * PROCESS.md §3: at cycle kickoff, write the front door BEFORE decomposing anything;
 * at close, repoint it. This script is the mechanism behind the first rule — nobody
 * hand-writes the file, so its shape (the five fields as a header table, the three
 * sections, the size budget) lands the same way every cycle. The unit gate
 * `hub/tests/unit/platform/cycle-current-front-door.test.ts` holds the shape and
 * the content rule (links resolve, the plan is not closed, Next is non-empty).
 *
 * Usage (from the repo root):
 *   npm run cycle:kickoff -- "<cycle name>" <plan path> [options]
 *
 *   <cycle name>        e.g. "The Eid kickoff"
 *   <plan path>         the dated plan document, repo-relative
 *                       (e.g. docs/planning/hub-v2/2026-09-10-eid-kickoff-plan.md)
 *   --goal "<text>"     the goal in one sentence (default: "goal to be written")
 *   --bridge <path>     the latest bridge (default: the newest file in docs/planning/sessions/)
 *   --next "<text>"     what follows this cycle (default: "to be named at close")
 *   --board "<text>"    the Board value; must start with "open" or "settled" and carry a date
 *                       (default: "open <today> — decomposition")
 *   --force             overwrite even when the current front door's plan is still open
 *   --dry-run           print the result, write nothing
 *
 * Refuses: a plan path that does not exist or carries a closed **Status:**; leaving a
 * `{placeholder}` unfilled; overwriting a front door whose plan is still open unless
 * --force names the intent (a kickoff while the previous cycle is not closed is a
 * process smell, not a typo).
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(REPO_ROOT, 'docs', 'templates', 'cycle-current.md');
const FRONT_DOOR = path.join(REPO_ROOT, 'docs', 'planning', 'cycles', 'cycle-current.md');
const SESSIONS_DIR = path.join(REPO_ROOT, 'docs', 'planning', 'sessions');

function parseArgs(argv) {
  const positional = [];
  const opts = { force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) throw new Error(`--${key} needs a value`);
      opts[key] = val;
      i++;
    } else positional.push(a);
  }
  return { positional, opts };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDoorLink(repoRelOrAbs) {
  const abs = path.isAbsolute(repoRelOrAbs) ? repoRelOrAbs : path.resolve(REPO_ROOT, repoRelOrAbs);
  if (!fs.existsSync(abs)) throw new Error(`not found: ${repoRelOrAbs}`);
  return path.relative(path.dirname(FRONT_DOOR), abs).split(path.sep).join('/');
}

function statusOf(md) {
  const m = /\*\*Status:\*\*\s*(.*)$/m.exec(md);
  if (!m) return null;
  return m[1].replace(/\*/g, '').trim().split(/\s+—\s+|\.\s|\.$/)[0].trim();
}
const isClosed = (s) => /^\W*(?:closed|done|completed?)\b/i.test(s);

function newestBridge() {
  const files = fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f))
    .sort();
  if (!files.length) throw new Error(`no bridge found under ${SESSIONS_DIR}`);
  return path.join(SESSIONS_DIR, files[files.length - 1]);
}

function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));
  const [name, planArg] = positional;
  if (!name || !planArg) {
    console.error('usage: npm run cycle:kickoff -- "<cycle name>" <plan path> [--goal ..] [--bridge ..] [--next ..] [--board ..] [--force] [--dry-run]');
    process.exit(2);
  }

  // The plan must exist and be open — the gate would go red otherwise.
  const planAbs = path.resolve(REPO_ROOT, planArg);
  if (!fs.existsSync(planAbs)) throw new Error(`plan not found: ${planArg}`);
  const planStatus = statusOf(fs.readFileSync(planAbs, 'utf8'));
  if (planStatus === null) throw new Error(`plan ${planArg} has no **Status:** line (write it from docs/templates/cycle-plan.md)`);
  if (isClosed(planStatus)) throw new Error(`plan ${planArg} is closed ("${planStatus}") — a kickoff points at an open plan`);

  // A kickoff over a still-open cycle is a smell; --force names the intent.
  if (fs.existsSync(FRONT_DOOR) && !opts.force) {
    const current = fs.readFileSync(FRONT_DOOR, 'utf8');
    const m = /\*\*Plan(?::)?\*\*[^[]*\[[^\]]*\]\(([^)\s]+)\)/.exec(current);
    if (m) {
      const prevAbs = path.resolve(path.dirname(FRONT_DOOR), m[1]);
      if (prevAbs !== planAbs && fs.existsSync(prevAbs)) {
        const prevStatus = statusOf(fs.readFileSync(prevAbs, 'utf8'));
        if (prevStatus !== null && !isClosed(prevStatus)) {
          throw new Error(
            `the current front door points at ${m[1]} whose Status is "${prevStatus}" (not closed). Close that plan first, or pass --force.`,
          );
        }
      }
    }
  }

  const date = today();
  const fills = {
    '{cycle name}': name,
    '{the goal in one sentence}': opts.goal || 'goal to be written',
    '{plan path}': toDoorLink(planAbs),
    '{bridge path}': toDoorLink(opts.bridge ? path.resolve(REPO_ROOT, opts.bridge) : newestBridge()),
    '{what follows this cycle}': opts.next || 'to be named at close',
  };
  const board = opts.board || `open ${date} — decomposition`;
  if (!/^(settled|open)\b/i.test(board) || !/\d{4}-\d{2}-\d{2}/.test(board)) {
    throw new Error(`--board must start with "open" or "settled" and carry a date (got "${board}")`);
  }

  let out = fs.readFileSync(TEMPLATE, 'utf8');
  for (const [k, v] of Object.entries(fills)) out = out.split(k).join(v);
  out = out.replace(/\| \*\*Board\*\* \|[^\n]*\|/, `| **Board** | ${board} |`);
  out = out
    .replace(/^- \{one line per thing being built[^\n]*$/m, '- the decomposition — nothing built yet')
    .replace(/^- \{one line per decision[^\n]*$/m, '- nothing yet')
    .replace(/^- \{one line per thing merged[^\n]*$/m, '- nothing yet');

  const left = out.match(/\{[^}\n]+\}/g);
  if (left) throw new Error(`unfilled placeholders: ${[...new Set(left)].join(', ')}`);

  if (opts.dryRun) {
    process.stdout.write(out);
    return;
  }
  fs.writeFileSync(FRONT_DOOR, out);
  console.log(`front door written: ${path.relative(REPO_ROOT, FRONT_DOOR)}`);
  console.log(`  cycle:  ${name}`);
  console.log(`  plan:   ${fills['{plan path}']}`);
  console.log(`  bridge: ${fills['{bridge path}']}`);
  console.log(`  board:  ${board}`);
  console.log('Now fill "In motion" as the decomposition lands; the gate: npm run test:unit -- cycle-current-front-door');
}

try {
  main();
} catch (err) {
  console.error(`cycle-kickoff: ${err.message}`);
  process.exit(1);
}
