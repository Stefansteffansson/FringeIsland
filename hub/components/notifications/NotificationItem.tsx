import { Bell, Users, Flag, UserCog, Compass, Megaphone, KeyRound, Gavel } from 'lucide-react';
import type { NotificationRow } from '@/lib/notifications/queries';
import { notificationStatusChip, isActionable } from '@/lib/notifications/format';

/**
 * FEAT-H030 — the kind-agnostic notification row body, shared by the bell
 * dropdown and the `/notifications` inbox. Copy is server-authored (title +
 * body) and never re-worded by the surface (V3 surfaces law). The category
 * drives at most an icon; an unrecognised category falls back to the bell —
 * new kinds/categories appear (open registry) without a surface release and
 * must never crash or blank a row.
 */
const CATEGORY_ICON: Record<string, typeof Bell> = {
  membership: Users,
  'group-lifecycle': Flag,
  stewardship: UserCog,
  account: Bell,
  journeys: Compass,
  platform: Megaphone,
  // RD-B FEAT-H044 STORY-4: the `roles` category (FEAT-PC028 STORY-6). A
  // missing key here renders the bell fallback rather than failing, which is
  // exactly how it would have shipped unnoticed — found during the platform
  // half's sweep and filed into this feature.
  roles: KeyRound,
  // DB-4 FEAT-H049 STORY-4: the `sanctions` category (FEAT-PD021) — the six
  // hold kinds render as plain notices (title = the kind's label, body = the
  // reason); the icon is the only surface-authored part.
  sanctions: Gavel,
};

function readableTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

function readableDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export function NotificationItem({
  row,
  now,
}: {
  row: NotificationRow;
  now?: Date;
}) {
  const Icon = CATEGORY_ICON[row.category] ?? Bell;
  const chip = notificationStatusChip(row, now);
  // STORY-2: an actionable row still awaiting an answer carries its deadline —
  // the window the retired PendingNominations section used to show. Once the
  // row is answered or past `expires_at`, the chip states where it stands and
  // the deadline stops mattering.
  const respondBy =
    row.expires_at != null && isActionable(row, now) ? readableDate(row.expires_at) : '';
  // W-03 #3 — "green is a claim". Green on a decline congratulates the member
  // for a thing they refused; a decline is a legitimate answer, not a lesser
  // one, so it renders neutral rather than either green or the grey that means
  // "you ran out of time".
  const chipTone =
    chip?.tone === 'done'
      ? 'bg-green-50 text-green-700'
      : chip?.tone === 'declined'
        ? 'bg-slate-100 text-slate-700'
        : chip?.tone === 'expired'
          ? 'bg-gray-100 text-gray-500'
          : 'bg-amber-50 text-amber-700';

  return (
    <div className="flex items-start gap-3">
      {!row.is_read && (
        <span
          data-testid="notification-unread-dot"
          aria-label="Unread"
          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600"
        />
      )}
      <Icon
        aria-hidden="true"
        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${row.is_read ? 'text-gray-400' : 'text-indigo-600'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${row.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
          {row.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{row.body}</p>
        <div className="mt-1 flex items-center gap-2">
          <time className="text-xs text-gray-400" dateTime={row.created_at}>
            {readableTime(row.created_at)}
          </time>
          {chip && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipTone}`}>
              {chip.label}
            </span>
          )}
          {respondBy && (
            <span data-testid="notification-respond-by" className="text-xs text-gray-400">
              Respond by {respondBy}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
