/**
 * FEAT-PC003 profile validation policy — PURE constants, split from
 * `queries.ts` at COR-C W7 (Audit III GC-7/AC3-12): the edit form
 * value-imports these, and a value import ships its module to the browser, so
 * they must not share a file with the SupabaseClient rpc wrappers. One source
 * for both sides: the form's live counter and the server validation read the
 * same numbers.
 */
export const PROFILE_BIO_MAX_LENGTH = 500;

export const PROFILE_FULL_NAME_MIN_LENGTH = 2;
