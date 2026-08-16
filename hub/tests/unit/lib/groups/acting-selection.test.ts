import { describe, it, expect } from '@jest/globals';
import { revalidateHat } from '@/lib/groups/acting';
import type { ActingContext } from '@/lib/groups/acting';

/**
 * FEAT-H046 STORY-4 (unit, RED-FIRST) — hat revalidation after an
 * acting-contexts re-read. A selected hat survives only if the fresh read
 * still lists it WITH standing in the context (`is_member_of_context` true);
 * anything else falls back to "Myself", carrying the dropped hat's name so
 * the surface can say so honestly. "Myself" always survives.
 */
describe('revalidateHat (FEAT-H046 STORY-4)', () => {
  const ctx = (id: string, name: string, standing: boolean | null): ActingContext => ({
    group_id: id,
    name,
    is_member_of_context: standing,
  });

  it('keeps Myself regardless of contexts', () => {
    expect(revalidateHat(null, [])).toEqual({ keep: true, droppedName: null });
    expect(revalidateHat(null, [ctx('ga', 'Alpha', true)])).toEqual({
      keep: true,
      droppedName: null,
    });
  });

  it('keeps a hat the fresh read still lists with standing', () => {
    expect(revalidateHat({ id: 'ga', name: 'Alpha' }, [ctx('ga', 'Alpha', true)])).toEqual({
      keep: true,
      droppedName: null,
    });
  });

  it('drops a hat that vanished from the read (paused/removed membership)', () => {
    expect(revalidateHat({ id: 'ga', name: 'Alpha' }, [ctx('gb', 'Beta', true)])).toEqual({
      keep: false,
      droppedName: 'Alpha',
    });
  });

  it('drops a hat that lost standing in the context (flag false or null)', () => {
    expect(revalidateHat({ id: 'ga', name: 'Alpha' }, [ctx('ga', 'Alpha', false)])).toEqual({
      keep: false,
      droppedName: 'Alpha',
    });
    expect(revalidateHat({ id: 'ga', name: 'Alpha' }, [ctx('ga', 'Alpha', null)])).toEqual({
      keep: false,
      droppedName: 'Alpha',
    });
  });
});
