'use client';

import { useEffect, useState } from 'react';
import {
  peekPlatformAnnouncements,
  fetchPlatformAnnouncements,
  type Announcement,
} from '@/lib/announcements/client';
import { authorClassName } from '@/lib/forum/attribution';

/**
 * FEAT-H028 STORY-3 — the home Platform Announcements section (COM-9, Cycle
 * C-D). A read-only, failure-isolated slice for signed-in FIMs: universe-scoped
 * word reaches everyone where everyone passes, without a bell existing yet. The
 * mount is FIM-gated (a Mist never sees it, CB-1); the platform read is
 * FIM-gated substrate-side too, so a stray Mist read resolves to honest
 * absence. A justified standalone read (ADR-U042) on the client's session cache
 * + W9 registration. No compose here — COM-9 compose is the Console's
 * (ADR-U028). No sockets (C-D carry rule).
 */
export function PlatformAnnouncementsSection() {
  const [items, setItems] = useState<Announcement[] | null>(() => peekPlatformAnnouncements());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPlatformAnnouncements()
      .then((rows) => {
        if (active) {
          setItems(rows);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      data-testid="platform-announcements"
      className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-800">Platform announcements</h2>

      {failed ? (
        <p data-testid="platform-announcements-unavailable" className="mt-3 text-sm text-gray-500">
          Platform announcements can&apos;t be shown right now.
        </p>
      ) : items === null ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
      ) : items.length === 0 ? (
        <p data-testid="platform-announcements-empty" className="mt-3 text-sm text-gray-500">
          No platform announcements right now.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              data-testid={`platform-announcement-${a.id}`}
              className="rounded-lg border border-gray-100 px-4 py-3"
            >
              <h3 className="text-sm font-semibold text-gray-800">{a.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{a.body}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span data-testid={`platform-announcement-author-${a.id}`} className={authorClassName(a.author)}>
                  {a.author.display_name}
                </span>
                <span className="text-gray-400">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
