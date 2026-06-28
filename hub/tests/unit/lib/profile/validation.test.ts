import { describe, it, expect } from '@jest/globals';
import {
  validateProfilePatch,
  ProfileValidationError,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_FULL_NAME_MIN_LENGTH,
} from '@/lib/profile/queries';

/**
 * FEAT-PC003 STORY-2 (unit) — identity-scope column gating + field validation.
 * The route-level column gating is the security boundary (RLS authorises the
 * row, not the column set), so the contract must reject any non-identity-scope
 * key and enforce field bounds before any DB write. Pure-function tier.
 */
describe('FEAT-PC003 STORY-2 — validateProfilePatch (identity-scope gating)', () => {
  it.each([
    'is_temporary',
    'email',
    'auth_user_id',
    'personal_group_id',
    'is_active',
    'is_decommissioned',
    'id',
  ])('rejects the non-identity-scope column %s', (col) => {
    expect(() => validateProfilePatch({ [col]: 'x' } as never)).toThrow(ProfileValidationError);
  });

  it('rejects a patch with no identity-scope fields', () => {
    expect(() => validateProfilePatch({} as never)).toThrow(ProfileValidationError);
  });

  it('rejects an empty full_name', () => {
    expect(() => validateProfilePatch({ full_name: '' })).toThrow(ProfileValidationError);
  });

  it(`rejects a full_name shorter than ${PROFILE_FULL_NAME_MIN_LENGTH} chars`, () => {
    expect(() => validateProfilePatch({ full_name: 'a' })).toThrow(ProfileValidationError);
  });

  it('rejects a whitespace-only nickname', () => {
    expect(() => validateProfilePatch({ nickname: '   ' })).toThrow(ProfileValidationError);
  });

  it('rejects a display_preference outside {real_name, nickname}', () => {
    expect(() => validateProfilePatch({ display_preference: 'fancy' as never })).toThrow(
      ProfileValidationError,
    );
  });

  it('rejects a non-boolean show_real_name', () => {
    expect(() => validateProfilePatch({ show_real_name: 'yes' as never })).toThrow(
      ProfileValidationError,
    );
  });

  it(`rejects a bio longer than ${PROFILE_BIO_MAX_LENGTH} chars`, () => {
    expect(() => validateProfilePatch({ bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH + 1) })).toThrow(
      ProfileValidationError,
    );
  });

  it(`accepts a bio of exactly ${PROFILE_BIO_MAX_LENGTH} chars and a null bio`, () => {
    expect(validateProfilePatch({ bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH) })).toEqual({
      bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH),
    });
    expect(validateProfilePatch({ bio: null })).toEqual({ bio: null });
  });

  it('accepts a valid subset and returns only trimmed identity-scope fields', () => {
    expect(
      validateProfilePatch({
        full_name: '  Ada Lovelace  ',
        nickname: '  Ada  ',
        display_preference: 'real_name',
        show_real_name: true,
        bio: 'Mathematician.',
      }),
    ).toEqual({
      full_name: 'Ada Lovelace',
      nickname: 'Ada',
      display_preference: 'real_name',
      show_real_name: true,
      bio: 'Mathematician.',
    });
  });
});
