'use client';

/**
 * History-replacing navigation, isolated for testability (jsdom's
 * `window.location` is non-configurable and cannot be mocked in place).
 * Replace — not push — so Back cannot return to a stale authenticated page
 * (the legacy-oracle behaviour, FEAT-H012 STORY-3).
 */
export function replaceLocation(url: string): void {
  window.location.replace(url);
}
