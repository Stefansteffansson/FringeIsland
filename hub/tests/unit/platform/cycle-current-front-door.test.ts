import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseFrontDoor,
  planStatus,
  isClosedStatus,
  frontDoorViolations,
  frontDoorShapeViolations,
  FRONT_DOOR_SECTIONS,
  FRONT_DOOR_LIMITS,
} from '@/tests/helpers/front-door';

/**
 * COR-E W8 — the front-door gate (Audit V R-14, Stefan's ruling 2026-09-05).
 *
 * WRITTEN RED-FIRST. At authoring this file fails to resolve
 * `@/tests/helpers/front-door`.
 *
 * `docs/planning/cycles/cycle-current.md` is the one fixed place to see what is
 * being built. It went stale for months because nothing wrote it and nothing
 * checked it. The two process rules (kickoff writes it; close repoints it) get
 * their mechanical half here: the five fields are present, the plan and bridge
 * links resolve to tracked files, the linked plan's Status is not closed, and
 * "Next" is non-empty. The day a cycle closes, this test goes red until the
 * front door is repointed — a stale door cannot survive a CI run.
 */

const HUB_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(HUB_ROOT, '..');
const FRONT_DOOR = path.join(REPO_ROOT, 'docs', 'planning', 'cycles', 'cycle-current.md');

const DOOR_FIXTURE = [
  '# Now building — the front door',
  '',
  '**Cycle:** COR-X — fix the things.',
  '**Plan:** [`../hub-v2/plan-x.md`](../hub-v2/plan-x.md)',
  '**Latest bridge:** [`../sessions/2026-09-05_01.md`](../sessions/2026-09-05_01.md)',
  '**Board:** settled 2026-09-05.',
  '**Next:** the Ferd close.',
].join('\n');

const resolver = (files: Record<string, string>) => (rel: string): string | null =>
  rel in files ? files[rel] : null;

describe('Front door — cycle-current.md (COR-E W8, R-14)', () => {
  it('fixture: the five fields parse, and the links yield their targets', () => {
    const door = parseFrontDoor(DOOR_FIXTURE);
    expect(door.cycle).toMatch(/^COR-X/);
    expect(door.plan).toBe('../hub-v2/plan-x.md');
    expect(door.bridge).toBe('../sessions/2026-09-05_01.md');
    expect(door.board).toMatch(/settled/);
    expect(door.next).toMatch(/Ferd close/);
  });

  it('fixture: plan status is read from the plan document and closed statuses are recognised', () => {
    expect(planStatus('**Date:** x · **Status:** **CLOSED 2026-08-11.** Board approved.')).toBe('CLOSED 2026-08-11');
    expect(planStatus('**Status:** **IN EXECUTION** — board settled 2026-09-05; nothing closed yet.')).toBe('IN EXECUTION');
    expect(planStatus('no status here')).toBeNull();
    expect(isClosedStatus('CLOSED 2026-08-11')).toBe(true);
    expect(isClosedStatus('Done')).toBe(true);
    expect(isClosedStatus('COMPLETE — all nine rows')).toBe(true);
    expect(isClosedStatus('IN EXECUTION')).toBe(false);
    expect(isClosedStatus('DRAFTED — decision board OPEN')).toBe(false);
  });

  it('fixture: a closed plan IS caught; so is an unresolvable link, a missing field and an empty Next', () => {
    const files = {
      '../hub-v2/plan-x.md': '# Plan X\n**Status:** **CLOSED 2026-09-10.**',
      '../sessions/2026-09-05_01.md': '# bridge',
    };
    expect(frontDoorViolations(DOOR_FIXTURE, resolver(files))).toEqual([
      'plan ../hub-v2/plan-x.md is closed ("CLOSED 2026-09-10") — repoint the front door to what is next',
    ]);

    const open = { ...files, '../hub-v2/plan-x.md': '# Plan X\n**Status:** **IN EXECUTION**.' };
    expect(frontDoorViolations(DOOR_FIXTURE, resolver(open))).toEqual([]);

    expect(frontDoorViolations(DOOR_FIXTURE, resolver({ '../hub-v2/plan-x.md': open['../hub-v2/plan-x.md'] }))).toEqual([
      'latest bridge link ../sessions/2026-09-05_01.md does not resolve',
    ]);

    const noNext = DOOR_FIXTURE.replace('**Next:** the Ferd close.', '**Next:**');
    expect(frontDoorViolations(noNext, resolver(open))).toEqual(['Next is empty']);

    const noBoard = DOOR_FIXTURE.replace(/\*\*Board:\*\*.*\n/, '');
    expect(frontDoorViolations(noBoard, resolver(open))).toEqual(['missing field: Board']);
  });

  // --- The shape (2026-09-06, Stefan: "formatted in a nice way so that when I
  // open it in our dev dashboard it's easy to overview … land every time we
  // cycle"). The dashboard renders the file as Markdown, so the layout IS the
  // file. The shape is the template `docs/templates/cycle-current.md`, written
  // by `npm run cycle:kickoff`; this half of the gate keeps a hand edit from
  // drifting away from it: the five fields as a header table, three sections
  // in a fixed order, a size budget so the door never becomes the plan.
  // WRITTEN RED-FIRST: the shape functions do not exist at authoring.
  const DOOR_V2_FIXTURE = [
    '# Now building — COR-X',
    '',
    '| | |',
    '|---|---|',
    '| **Cycle** | COR-X — fix the things. |',
    '| **Plan** | [`../hub-v2/plan-x.md`](../hub-v2/plan-x.md) |',
    '| **Latest bridge** | [`../sessions/2026-09-05_01.md`](../sessions/2026-09-05_01.md) |',
    '| **Board** | settled 2026-09-05 |',
    '| **Next** | the Ferd close. |',
    '',
    '## In motion',
    '- W1 — the docs (#618)',
    '',
    '## Waiting on Stefan',
    '- the W2 nod',
    '',
    '## Landed this cycle',
    '- nothing yet',
    '',
    '_Read this first._',
  ].join('\n');

  it('fixture: the table shape parses the same five fields as the bold-line shape', () => {
    const door = parseFrontDoor(DOOR_V2_FIXTURE);
    expect(door.cycle).toBe('COR-X — fix the things.');
    expect(door.plan).toBe('../hub-v2/plan-x.md');
    expect(door.bridge).toBe('../sessions/2026-09-05_01.md');
    expect(door.board).toBe('settled 2026-09-05');
    expect(door.next).toBe('the Ferd close.');
    // The content rule still applies to the new shape unchanged.
    const open = {
      '../hub-v2/plan-x.md': '# Plan X\n**Status:** **IN EXECUTION**.',
      '../sessions/2026-09-05_01.md': '# bridge',
    };
    expect(frontDoorViolations(DOOR_V2_FIXTURE, resolver(open))).toEqual([]);
  });

  it('fixture: the shape rule — the three sections in order, the bullet budgets, the Board value, the size', () => {
    expect(FRONT_DOOR_SECTIONS).toEqual(['## In motion', '## Waiting on Stefan', '## Landed this cycle']);
    expect(frontDoorShapeViolations(DOOR_V2_FIXTURE)).toEqual([]);

    const noWaiting = DOOR_V2_FIXTURE.replace('## Waiting on Stefan\n- the W2 nod\n\n', '');
    expect(frontDoorShapeViolations(noWaiting)).toEqual(['missing section: ## Waiting on Stefan']);

    const swapped = DOOR_V2_FIXTURE.replace('## In motion', '## TMP')
      .replace('## Landed this cycle', '## In motion')
      .replace('## TMP', '## Landed this cycle');
    expect(frontDoorShapeViolations(swapped)).toEqual([
      'sections out of order: ## Landed this cycle, ## Waiting on Stefan, ## In motion',
    ]);

    const stray = DOOR_V2_FIXTURE.replace('## Landed this cycle', '## Notes\n- a plan sneaking in\n\n## Landed this cycle');
    expect(frontDoorShapeViolations(stray)).toEqual(['unexpected section: ## Notes']);

    const seven = DOOR_V2_FIXTURE.replace('- W1 — the docs (#618)', Array.from({ length: 7 }, (_, i) => `- W${i + 1}`).join('\n'));
    expect(frontDoorShapeViolations(seven)).toEqual([
      `## In motion has 7 bullets (max ${FRONT_DOOR_LIMITS.maxBulletsPerSection})`,
    ]);

    const long = DOOR_V2_FIXTURE.replace('- nothing yet', `- ${'x'.repeat(FRONT_DOOR_LIMITS.maxBulletChars + 1)}`);
    expect(frontDoorShapeViolations(long)).toEqual([
      `## Landed this cycle has a bullet over ${FRONT_DOOR_LIMITS.maxBulletChars} chars — link the record, do not restate it`,
    ]);

    const board = DOOR_V2_FIXTURE.replace('| **Board** | settled 2026-09-05 |', '| **Board** | the close ran |');
    expect(frontDoorShapeViolations(board)).toEqual([
      'Board must start with "settled" or "open" and carry a date (got "the close ran")',
    ]);

    const title = DOOR_V2_FIXTURE.replace('# Now building — COR-X', '# COR-X');
    expect(frontDoorShapeViolations(title)).toEqual(['title must start with "# Now building"']);

    const fat = DOOR_V2_FIXTURE.replace('_Read this first._', Array.from({ length: 50 }, () => '').join('\n') + '_Read this first._');
    expect(frontDoorShapeViolations(fat)).toEqual([
      `${FRONT_DOOR_LIMITS.maxLines}-line budget exceeded (${fat.split('\n').length} lines) — the front door is not the plan`,
    ]);
  });

  it('live sweep: the front door reads true', () => {
    const md = fs.readFileSync(FRONT_DOOR, 'utf8');
    const violations = frontDoorViolations(md, (rel) => {
      const abs = path.resolve(path.dirname(FRONT_DOOR), rel);
      return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    });
    expect(violations).toEqual([]);
  });

  it('live sweep: the front door has the shape the template and the kickoff script give it', () => {
    const md = fs.readFileSync(FRONT_DOOR, 'utf8');
    expect(frontDoorShapeViolations(md)).toEqual([]);
  });
});
