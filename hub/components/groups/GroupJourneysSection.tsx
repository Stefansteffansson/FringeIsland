'use client';

import Link from 'next/link';
import type { GroupEnrollmentSummary } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-6 — the group page's journeys section (the GRP-4 seam
 * filled). Renders the enrolment-summary slice envelope honestly: the list
 * (title, status, link into the journey detail), an honest empty state, or
 * an honest unavailable state when the slice failed — the group page always
 * renders whole (ADR-U042 envelope posture). Status strings render
 * vocabulary-tolerantly.
 */
export function GroupJourneysSection({
  enrollments,
}: {
  enrollments: { data?: GroupEnrollmentSummary; error?: string } | null;
}) {
  if (!enrollments) return null;

  return (
    <section
      data-testid="group-journeys"
      className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-800">Journeys</h2>

      {enrollments.error !== undefined ? (
        <p data-testid="group-journeys-unavailable" className="mt-3 text-sm text-gray-500">
          The group&apos;s journeys can&apos;t be shown right now.
        </p>
      ) : !enrollments.data || enrollments.data.enrollments.length === 0 ? (
        <p data-testid="group-journeys-empty" className="mt-3 text-sm text-gray-500">
          This group isn&apos;t travelling any journeys yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {enrollments.data.enrollments.map((e) => (
            <li
              key={e.journey_id}
              className="flex items-baseline justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm"
            >
              <Link href={`/journeys/${e.journey_id}`} className="font-medium text-gray-800 hover:underline">
                {e.title}
              </Link>
              <span className="text-xs text-gray-500">{e.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
