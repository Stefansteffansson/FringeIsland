import { describe, it, expect } from '@jest/globals';
import { isResolvedAuthor, authorClassName, authorKindBadge } from '@/lib/forum/attribution';
import type { AuthorDisplay } from '@/lib/forum/queries';

/**
 * FEAT-H026 COM-14 (unit) — presentation of the platform-resolved attribution.
 *
 * Honest labelling (feature-development skill): TEST-AFTER. The helper is a
 * pure presentation rule built alongside the surface; the red-first proof of
 * the ladder itself is the platform contract suite
 * (communication/forum-contracts.test.ts, demonstrated 18-red). These pin the
 * client-side styling rule so a future edit can't silently link a former/
 * unknown author or crash on an unrecognised attribution value.
 */
describe('forum attribution presentation', () => {
  const active: AuthorDisplay = { display_name: 'Ada', attribution: 'active' };
  const former: AuthorDisplay = { display_name: 'Former member', attribution: 'former' };
  const unknown: AuthorDisplay = { display_name: 'Unknown', attribution: 'unknown' };

  it('only an active author is a resolved (linkable) identity', () => {
    expect(isResolvedAuthor(active)).toBe(true);
    expect(isResolvedAuthor(former)).toBe(false);
    expect(isResolvedAuthor(unknown)).toBe(false);
  });

  it('former and unknown render muted + italic; active renders solid', () => {
    expect(authorClassName(active)).toContain('font-medium');
    expect(authorClassName(active)).not.toContain('italic');
    expect(authorClassName(former)).toContain('italic');
    expect(authorClassName(unknown)).toContain('italic');
  });

  it('an unrecognised attribution value is treated as unknown-shaped (safe default)', () => {
    const weird = { display_name: 'x', attribution: 'future-kind' } as unknown as AuthorDisplay;
    expect(isResolvedAuthor(weird)).toBe(false);
    expect(authorClassName(weird)).toContain('italic');
  });
});

/**
 * FEAT-H046 STORY-3 (unit, RED-FIRST) — the `kind` badge rule (ADR-U041 §5).
 * `kind: 'group'` badges "Group"; person/absent badge nothing (tolerant
 * reader — pre-PD019 payloads carry no kind); an unknown kind renders its raw
 * value (open set, extensibility rule — never a crash, never hidden).
 */
describe('author kind badge (FEAT-H046 STORY-3)', () => {
  it("kind 'group' badges as Group", () => {
    expect(
      authorKindBadge({ display_name: 'Alpha', attribution: 'active', kind: 'group' }),
    ).toBe('Group');
  });

  it("kind 'person' and an absent kind badge nothing (tolerant reader)", () => {
    expect(
      authorKindBadge({ display_name: 'Ada', attribution: 'active', kind: 'person' }),
    ).toBeNull();
    expect(authorKindBadge({ display_name: 'Ada', attribution: 'active' })).toBeNull();
  });

  it('an unknown kind renders its raw value (open set — never a crash)', () => {
    expect(
      authorKindBadge({
        display_name: 'x',
        attribution: 'active',
        kind: 'collective',
      } as unknown as AuthorDisplay),
    ).toBe('collective');
  });

  it('the badge never overrides the ladder: a former group author still badges', () => {
    expect(
      authorKindBadge({ display_name: 'Former member', attribution: 'former', kind: 'group' }),
    ).toBe('Group');
  });
});
