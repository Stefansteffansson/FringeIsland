'use client';

import { useEffect, useState } from 'react';
import { fetchGroupJourneyProgress } from '@/lib/journeys/group-progress';
import { emitTelemetry } from '@/lib/observability/telemetry';
import type { GroupEnrollmentSummary, GroupJourneyProgress } from '@/lib/journeys/queries';

/**
 * FEAT-H022 STORY-3/4 (JRN-16/17) — the group progress panel, beside the group's
 * journeys section on the group detail page. Rendered ONLY for a view_group_progress
 * holder (from the already-fetched effective-permissions read — never a role-name
 * check). Each group enrolment gets an on-demand Progress expander: fetch on expand
 * only (never on group-page boot), a deferred skeleton (B6), and session reuse of
 * the fetched state (repeated expands re-read nothing).
 *
 * The panel renders the FEAT-PD005 payload faithfully and NEVER invents a
 * comparative surface (invariant 8 at the pixel layer): the aggregate carries its
 * honest basis ("of M sharing · N members"), members appear alphabetical AS SERVED
 * (never re-sorted, no bar/percentage/ranking), sharers show marks + required-
 * progress, non-sharers a quiet "not shared", and there is NO timing anywhere.
 *
 * Wiring note: the affordance keys on each enrolment's `enrollment_id`. The current
 * get_group_enrollment_summary payload does not carry it, so this section stays
 * dark until that contract serves `enrollment_id` (a one-line PD002 re-issue).
 */
export function GroupJourneyProgressSection({
  groupId,
  permissions,
  enrollments,
  skeletonDelay = 300,
}: {
  groupId: string;
  permissions: string[] | null;
  enrollments: { data?: GroupEnrollmentSummary; error?: string } | null;
  skeletonDelay?: number;
}) {
  const canView = permissions?.includes('view_group_progress') === true;
  const rows = (enrollments?.data?.enrollments ?? []).filter(
    (e): e is typeof e & { enrollment_id: string } => Boolean(e.enrollment_id),
  );
  if (!canView || rows.length === 0) return null;

  return (
    <section
      data-testid="group-journey-progress"
      className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-800">Progress</h2>
      <p className="mt-1 text-sm text-gray-500">
        How the group&rsquo;s walks are going — only what each traveller chose to share.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((e) => (
          <ProgressRow
            key={e.enrollment_id}
            groupId={groupId}
            enrollmentId={e.enrollment_id}
            title={e.title}
            skeletonDelay={skeletonDelay}
          />
        ))}
      </ul>
    </section>
  );
}

function ProgressRow({
  groupId,
  enrollmentId,
  title,
  skeletonDelay,
}: {
  groupId: string;
  enrollmentId: string;
  title: string;
  skeletonDelay: number;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<GroupJourneyProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    // Fetch on expand only, and only once — a re-expand reuses the fetched state.
    if (next && !data && !loading) {
      emitTelemetry('group.progress_expanded', { group: groupId, enrollment: enrollmentId });
      setLoading(true);
      setFailed(false);
      try {
        setData(await fetchGroupJourneyProgress(groupId, enrollmentId));
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <li className="rounded-lg border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <button
          type="button"
          data-testid={`progress-expand-${enrollmentId}`}
          aria-expanded={open}
          onClick={() => void toggle()}
          className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
        >
          {open ? 'Hide progress' : 'Progress'}
        </button>
      </div>
      {open && (
        <div data-testid={`progress-panel-${enrollmentId}`} className="mt-3">
          {data ? (
            <ProgressPanel data={data} />
          ) : failed ? (
            <p data-testid="progress-unavailable" className="text-sm text-gray-500">
              The group&rsquo;s progress can&rsquo;t be shown right now.
            </p>
          ) : (
            <ProgressSkeleton delay={skeletonDelay} />
          )}
        </div>
      )}
    </li>
  );
}

function ProgressPanel({ data }: { data: GroupJourneyProgress }) {
  const { steps, members, members_meta, aggregate } = data;
  const zeroSharing = members_meta.sharing === 0;
  const countByStep = new Map(aggregate.per_step.map((p) => [p.step_id, p.completed_count]));
  const memberWord = (n: number) => (n === 1 ? 'member' : 'members');

  return (
    <div>
      {zeroSharing ? (
        // Honest empty state — counts absent (all-zero coverage is not shown as
        // coverage), the basis still stated (invariant 8 / Q4).
        <p data-testid="progress-empty" className="text-sm text-gray-500">
          No one is sharing their progress yet &mdash; {members_meta.total} {memberWord(members_meta.total)} in
          the group.
        </p>
      ) : (
        <div data-testid="progress-aggregate">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Completed &middot; of {members_meta.sharing} sharing &middot; {members_meta.total}{' '}
            {memberWord(members_meta.total)}
          </p>
          <ul className="mt-2 space-y-1">
            {steps.map((s) => (
              <li
                key={s.step_id}
                className="flex items-center justify-between gap-2 text-sm text-gray-700"
              >
                <span>
                  <span className="text-xs text-gray-400">{s.step_order}. </span>
                  {s.title}
                  {s.required && (
                    <span aria-label="required" title="Required" className="text-red-500">
                      {' '}
                      *
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-gray-600">{countByStep.get(s.step_id) ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Members alphabetical AS SERVED — never re-sorted, no ranking. */}
      <ul data-testid="progress-members" className="mt-4 space-y-2 border-t border-gray-100 pt-3">
        {members.map((m) => (
          <li
            key={m.member_group_id}
            data-testid={`progress-member-${m.member_group_id}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="font-medium text-gray-800">{m.display_name}</span>
            {!m.sharing ? (
              <span data-testid="member-not-shared" className="text-xs italic text-gray-400">
                not shared
              </span>
            ) : m.per_step ? (
              <span className="flex items-center gap-3">
                <span className="flex gap-1" aria-hidden>
                  {steps.map((s) => {
                    const done = m.per_step?.some((p) => p.step_id === s.step_id && p.completed) === true;
                    return (
                      <span
                        key={s.step_id}
                        className={`inline-block h-2.5 w-2.5 rounded-full ${done ? 'bg-green-500' : 'bg-gray-200'}`}
                      />
                    );
                  })}
                </span>
                <span data-testid="member-required" className="whitespace-nowrap text-xs text-gray-500">
                  {m.required_completed ?? 0} of {m.required_total ?? 0} required
                </span>
                {m.traveller_completed && (
                  <span data-testid="member-completed" className="text-xs font-medium text-green-700">
                    completed
                  </span>
                )}
              </span>
            ) : (
              // Sharing member the caller may not see marks for (view_group_progress
              // without view_others_progress) — distinct from "not shared".
              <span data-testid="member-shared-nomarks" className="text-xs text-gray-500">
                shared
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressSkeleton({ delay = 300 }: { delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div data-testid="progress-skeleton" role="status" aria-label="Loading progress" className="animate-pulse space-y-2">
      <div className="h-4 w-1/2 rounded bg-gray-100" />
      <div className="h-4 w-full rounded bg-gray-100" />
      <div className="h-4 w-5/6 rounded bg-gray-100" />
    </div>
  );
}
