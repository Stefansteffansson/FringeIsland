/**
 * FEAT-H033 — the PURE presentation half of the preference surface, split from
 * `preferences.ts` at COR-C W7 (Audit III GC-7/AC3-12): the panel value-imports
 * these helpers, and a value import ships its module to the browser — so the
 * pure half must not share a file with the SupabaseClient rpc wrappers. The
 * widened outer-ring gate (transitive value-import closure) enforces the split.
 * No I/O here; everything derives from the payload.
 */

/**
 * What the member is told when a preference write fails.
 *
 * Gate walk 2026-07-30: going offline and flipping a switch showed the member
 * the raw string **"Failed to fetch"** — a browser internal, in a red banner,
 * where an explanation belongs. The rollback itself was right and stays exactly
 * as it was; only what it says changes.
 *
 * The rule is a seam, not a blanket rewrite: a server that ANSWERED with a
 * reason is quoted verbatim, because that reason is member-facing copy the
 * platform authored on purpose (the H030 never-re-word-server-copy law). It is
 * only failures that never reached a server — a dropped connection, or a bare
 * status with no body — that get words here, because there is no server
 * sentence to preserve.
 */
export function preferenceSaveFailureMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // The request never landed: fetch rejects with these before any response.
  if (/failed to fetch|networkerror|network error|load failed|fetch failed/i.test(raw)) {
    return 'We could not reach the server, so this change was not saved and has been put back. Check your connection and try again.';
  }
  // A status with no body to quote — `HTTP 500` is not something to show anyone.
  if (/^HTTP \d{3}$/.test(raw.trim())) {
    return 'We could not save this change, so it has been put back. Please try again.';
  }
  // The server said why. That sentence was written for the member; keep it.
  return raw;
}

/**
 * One cell of the categories x channels matrix, with the effective value already
 * resolved server-side — the surface never has to know that absence means
 * allowed.
 */
export interface NotificationPreferenceCell {
  category_key: string;
  /** Server-authored; rendered verbatim (the H030 law — never re-word copy). */
  category_label: string;
  /** Open text ('badge' throughout Ferd) — treated as data, never switched on. */
  interruption_grade: string;
  /** False => the member may not mute it; render locked-on with a reason. */
  member_suppressible: boolean;
  channel: string;
  channel_label: string;
  /**
   * Whether this channel actually reaches anyone today. `email` is false in
   * Ferd (abstraction-only, zero vendor dependency), and this flag is the only
   * thing that decides whether the surface renders a column for it — a toggle
   * that cannot change anything would be a promise the Hub can't keep.
   */
  channel_delivers: boolean;
  allowed: boolean;
}

/**
 * Group the flat matrix into one row per category, channels nested — the shape
 * the surface renders. Deliberately derives its category and channel lists FROM
 * THE DATA: a new registry row appears with no Hub change (the kind-agnostic
 * discipline FEAT-H030 proved for the inbox renderer).
 */
export interface PreferenceRow {
  category_key: string;
  category_label: string;
  interruption_grade: string;
  member_suppressible: boolean;
  cells: NotificationPreferenceCell[];
}

export function groupPreferencesByCategory(
  cells: NotificationPreferenceCell[],
): PreferenceRow[] {
  const rows = new Map<string, PreferenceRow>();
  for (const cell of cells) {
    let row = rows.get(cell.category_key);
    if (!row) {
      row = {
        category_key: cell.category_key,
        category_label: cell.category_label,
        interruption_grade: cell.interruption_grade,
        member_suppressible: cell.member_suppressible,
        cells: [],
      };
      rows.set(cell.category_key, row);
    }
    row.cells.push(cell);
  }
  return [...rows.values()];
}

/**
 * The channels the surface renders — delivering ones only. Derived from the
 * payload, so the day email starts delivering the column appears with no code
 * change here.
 */
export function renderableChannels(cells: NotificationPreferenceCell[]): string[] {
  const seen = new Map<string, boolean>();
  for (const cell of cells) {
    if (!seen.has(cell.channel)) seen.set(cell.channel, cell.channel_delivers);
  }
  return [...seen.entries()].filter(([, delivers]) => delivers).map(([channel]) => channel);
}

/** Channels stored but not yet delivering — named honestly in the UI. */
export function storedOnlyChannels(cells: NotificationPreferenceCell[]): string[] {
  const seen = new Map<string, { delivers: boolean; label: string }>();
  for (const cell of cells) {
    if (!seen.has(cell.channel)) {
      seen.set(cell.channel, { delivers: cell.channel_delivers, label: cell.channel_label });
    }
  }
  return [...seen.values()].filter((c) => !c.delivers).map((c) => c.label);
}
