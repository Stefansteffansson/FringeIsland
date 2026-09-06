/**
 * The front-door rule (Cycle COR-E W8 — Audit V R-14, Stefan's ruling 2026-09-05).
 *
 * `docs/planning/cycles/cycle-current.md` is the one fixed place to see what is
 * being built: five fields — Cycle, Plan (a link to the dated plan document),
 * Latest bridge (a link), Board, Next — and never the plan itself. PROCESS.md §3
 * says kickoff writes it and close repoints it; this module is the mechanical
 * half, consumed by `tests/unit/platform/cycle-current-front-door.test.ts`.
 *
 * A front door whose linked plan carries a closed Status is stale by
 * definition — the cycle ended and nobody repointed the door — so that is the
 * headline violation. Links that do not resolve, missing fields and an empty
 * Next are the others.
 */

export type FrontDoor = {
  cycle: string | null;
  plan: string | null;
  bridge: string | null;
  board: string | null;
  next: string | null;
};

const FIELDS: ReadonlyArray<[keyof FrontDoor, string]> = [
  ['cycle', 'Cycle'],
  ['plan', 'Plan'],
  ['bridge', 'Latest bridge'],
  ['board', 'Board'],
  ['next', 'Next'],
];

/**
 * The raw text of a field — null when absent, '' when present but empty.
 * Two shapes: the original bold line `**Label:** text`, and (since 2026-09-06,
 * the template `docs/templates/cycle-current.md`) the header-table row
 * `| **Label** | text |`, which the dashboard renders as a compact card.
 */
function fieldText(md: string, label: string): string | null {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = new RegExp(`^\\*\\*${esc}:\\*\\*[ \\t]*(.*)$`, 'm').exec(md);
  if (line) return line[1].trim();
  const row = new RegExp(`^\\|\\s*\\*\\*${esc}:?\\*\\*\\s*\\|\\s*(.*?)\\s*\\|\\s*$`, 'm').exec(md);
  return row ? row[1].trim() : null;
}

/**
 * The shape (2026-09-06): the dashboard renders the front door as Markdown,
 * so the layout IS the file. The template gives it a title, the five fields
 * as a header table, then three sections in a fixed order; the kickoff script
 * writes it. This half of the gate keeps a hand edit from drifting: sections
 * present, in order and no others; one line per item, six at most; a Board
 * value that says open/settled with a date; a size budget so the door never
 * becomes the plan.
 */
export const FRONT_DOOR_SECTIONS: readonly string[] = [
  '## In motion',
  '## Waiting on Stefan',
  '## Landed this cycle',
];

export const FRONT_DOOR_LIMITS = {
  maxLines: 60,
  maxBulletsPerSection: 6,
  maxBulletChars: 300,
} as const;

export function frontDoorShapeViolations(md: string): string[] {
  const violations: string[] = [];
  const lines = md.split('\n');

  const title = lines.find((l) => l.trim() !== '') ?? '';
  if (!/^# Now building\b/.test(title)) violations.push('title must start with "# Now building"');

  // Sections: every `## ` heading and the bullets under it.
  const found: Array<{ heading: string; bullets: string[] }> = [];
  for (const raw of lines) {
    const l = raw.replace(/\r$/, '');
    if (/^## /.test(l)) found.push({ heading: l.trim(), bullets: [] });
    else if (found.length && /^- /.test(l)) found[found.length - 1].bullets.push(l);
  }
  const headings = found.map((s) => s.heading);
  for (const expected of FRONT_DOOR_SECTIONS) {
    if (!headings.includes(expected)) violations.push(`missing section: ${expected}`);
  }
  for (const h of headings) {
    if (!FRONT_DOOR_SECTIONS.includes(h)) violations.push(`unexpected section: ${h}`);
  }
  const known = headings.filter((h) => FRONT_DOOR_SECTIONS.includes(h));
  const expectedOrder = FRONT_DOOR_SECTIONS.filter((h) => known.includes(h));
  if (known.join('|') !== expectedOrder.join('|')) {
    violations.push(`sections out of order: ${known.join(', ')}`);
  }
  for (const s of found) {
    if (!FRONT_DOOR_SECTIONS.includes(s.heading)) continue;
    if (s.bullets.length > FRONT_DOOR_LIMITS.maxBulletsPerSection) {
      violations.push(`${s.heading} has ${s.bullets.length} bullets (max ${FRONT_DOOR_LIMITS.maxBulletsPerSection})`);
    }
    if (s.bullets.some((b) => b.length > FRONT_DOOR_LIMITS.maxBulletChars)) {
      violations.push(
        `${s.heading} has a bullet over ${FRONT_DOOR_LIMITS.maxBulletChars} chars — link the record, do not restate it`,
      );
    }
  }

  const board = fieldText(md, 'Board');
  if (board !== null && (!/^(settled|open)\b/i.test(board) || !/\d{4}-\d{2}-\d{2}/.test(board))) {
    violations.push(`Board must start with "settled" or "open" and carry a date (got "${board}")`);
  }

  if (lines.length > FRONT_DOOR_LIMITS.maxLines) {
    violations.push(
      `${FRONT_DOOR_LIMITS.maxLines}-line budget exceeded (${lines.length} lines) — the front door is not the plan`,
    );
  }

  return violations;
}

function linkTarget(text: string | null): string | null {
  if (!text) return null;
  const m = /\]\(([^)\s]+)\)/.exec(text);
  return m ? m[1] : null;
}

export function parseFrontDoor(md: string): FrontDoor {
  return {
    cycle: fieldText(md, 'Cycle'),
    plan: linkTarget(fieldText(md, 'Plan')),
    bridge: linkTarget(fieldText(md, 'Latest bridge')),
    board: fieldText(md, 'Board'),
    next: fieldText(md, 'Next'),
  };
}

/** The plan document's `**Status:**` value, asterisks stripped, cut at the first sentence or " — " clause. */
export function planStatus(planMd: string): string | null {
  const m = /\*\*Status:\*\*\s*(.*)$/m.exec(planMd);
  if (!m) return null;
  const cleaned = m[1].replace(/\*/g, '').trim();
  return cleaned.split(/\s+—\s+|\.\s|\.$/)[0].trim();
}

export function isClosedStatus(status: string): boolean {
  return /^\W*(?:closed|done|completed?)\b/i.test(status);
}

/**
 * @param resolve — returns the linked file's content, or null when the link
 *                  does not resolve (relative to the front door's directory).
 */
export function frontDoorViolations(md: string, resolve: (rel: string) => string | null): string[] {
  const violations: string[] = [];
  for (const [, label] of FIELDS) {
    if (fieldText(md, label) === null) violations.push(`missing field: ${label}`);
  }
  if (violations.length) return violations;

  const door = parseFrontDoor(md);

  if (!door.plan) violations.push('Plan has no link');
  else {
    const plan = resolve(door.plan);
    if (plan === null) violations.push(`plan link ${door.plan} does not resolve`);
    else {
      const status = planStatus(plan);
      if (status === null) violations.push(`plan ${door.plan} has no **Status:** line`);
      else if (isClosedStatus(status)) {
        violations.push(
          `plan ${door.plan} is closed ("${status}") — repoint the front door to what is next`,
        );
      }
    }
  }

  if (!door.bridge) violations.push('Latest bridge has no link');
  else if (resolve(door.bridge) === null) {
    violations.push(`latest bridge link ${door.bridge} does not resolve`);
  }

  if (!door.next) violations.push('Next is empty');

  return violations;
}
