import { Bell, Users, Flag, UserCog, Compass, Megaphone } from 'lucide-react';
import type { NotificationRow } from '@/lib/notifications/queries';
import { notificationStatusChip } from '@/lib/notifications/format';

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
};

function readableTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
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
  const chipTone =
    chip?.tone === 'done'
      ? 'bg-green-50 text-green-700'
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
        </div>
      </div>
    </div>
  );
}
