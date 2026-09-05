import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseFrontDoor,
  planStatus,
  isClosedStatus,
  frontDoorViolations,
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

  it('live sweep: the front door reads true', () => {
    const md = fs.readFileSync(FRONT_DOOR, 'utf8');
    const violations = frontDoorViolations(md, (rel) => {
      const abs = path.resolve(path.dirname(FRONT_DOOR), rel);
      return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    });
    expect(violations).toEqual([]);
  });
});
