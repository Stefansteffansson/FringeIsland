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

/** The raw text after `**Label:**` on its line — null when the line is absent, '' when present but empty. */
function fieldText(md: string, label: string): string | null {
  const re = new RegExp(`^\\*\\*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\*\\*[ \\t]*(.*)$`, 'm');
  const m = re.exec(md);
  return m ? m[1].trim() : null;
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
