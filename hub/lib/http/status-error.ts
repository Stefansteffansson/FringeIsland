/**
 * Post-6-done fix (2026-08-14, live walk): a transport error that carries the
 * BFF's HTTP status, so a section can branch honestly — a 403 on a
 * member-gated read renders "for members" copy instead of the generic
 * failure fallback that reads like a malfunction.
 *
 * Adopted at the group page's three member-gated section READS (forum,
 * announcements, group conversations). Write paths keep plain Errors: their
 * messages render in place and no caller branches on status.
 */
export class HttpStatusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

/** The members-only branch test: a substrate/BFF refusal, not a failure. */
export function isForbidden(err: unknown): boolean {
  return err instanceof HttpStatusError && err.status === 403;
}
