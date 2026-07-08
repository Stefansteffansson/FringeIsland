'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineError } from '@/components/ui/InlineError';
import { enrollSelf, enrollGroup, withdrawEnrollment } from '@/lib/journeys/client';
import type { JourneyDetail, JourneyGroupRef, JourneyEnrolledVia } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-3/4/5 — the viewer-shaped enrolment block.
 *
 * Everything renders from the payload's viewer block (ADR-U041 posture — the
 * Hub never computes eligibility): Start when not individually enrolled;
 * "Enrol a group" offering exactly `enrollable_groups` (absence when empty,
 * never a disabled tease); Withdraw exactly where the payload grants it (own
 * active enrolment; a via-group entry with `can_withdraw`). Frozen enrolments
 * render a held state with no affordance. Confirms name the group (the H018
 * wielding-confirm pattern); Withdraw rides the destructive ConfirmModal.
 * Mutations re-read through onRefresh — never optimistic (B5: busy on the
 * pressed affordance, no double-submit).
 */
export function JourneyEnrollmentPanel({
  journey,
  onRefresh,
}: {
  journey: JourneyDetail;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingGroup, setPendingGroup] = useState<JourneyGroupRef | null>(null);
  const [pendingWithdraw, setPendingWithdraw] = useState<
    { enrollment_id: string; label: string } | null
  >(null);

  const run = async (act: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await act();
      onRefresh();
    } catch (err) {
      setError((err as Error).message || 'The request was refused.');
    } finally {
      setBusy(false);
    }
  };

  const own = journey.individual_enrollment ?? null;
  const ownFrozen = own?.status === 'frozen';
  const withdrawableVia = journey.enrolled_via.filter(
    (v): v is Required<JourneyEnrolledVia> =>
      Boolean(v.can_withdraw && v.enrollment_id && v.status === 'active'),
  );
  const frozenVia = journey.enrolled_via.filter((v) => v.status === 'frozen');

  return (
    <section data-testid="journey-enrollment-block" className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Travel this journey</h2>

      {error && <InlineError message={error} />}

      {/* STORY-3: the self affordance OR the enrolled state — never both. */}
      {!journey.is_enrolled_individually ? (
        <button
          type="button"
          data-testid="enroll-self"
          disabled={busy}
          onClick={() => void run(() => enrollSelf(journey.id))}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Working...' : 'Start this journey'}
        </button>
      ) : (
        <div data-testid="enrolled-individually" className="mt-4 text-sm text-gray-700">
          <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            You are on this journey
          </span>
          {/* FEAT-H020: resume the player for this enrolment (active only). */}
          {own?.status === 'active' && (
            <Link
              href={`/journeys/${journey.id}/play?enrollment=${own.enrollment_id}`}
              data-testid="continue-individual"
              className="ml-3 text-xs font-medium text-blue-600 hover:underline"
            >
              Continue
            </Link>
          )}
          {/* FEAT-H021 STORY-4: a completed walk opens Review where an active one
              offers Continue — the affordance swaps on status, deep-link preserved. */}
          {own?.status === 'completed' && (
            <Link
              href={`/journeys/${journey.id}/play?enrollment=${own.enrollment_id}`}
              data-testid="review-individual"
              className="ml-3 text-xs font-medium text-blue-600 hover:underline"
            >
              Review
            </Link>
          )}
          {ownFrozen ? (
            <p data-testid="frozen-state" className="mt-2 text-xs text-gray-500">
              This enrolment is held for review and cannot be changed here.
            </p>
          ) : (
            own && (
              <button
                type="button"
                data-testid="withdraw-self"
                disabled={busy}
                onClick={() =>
                  setPendingWithdraw({ enrollment_id: own.enrollment_id, label: 'your own travel' })
                }
                className="ml-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Withdraw
              </button>
            )
          )}
        </div>
      )}

      {/* Enrolled via groups — state + payload-granted withdraw only. */}
      {journey.enrolled_via.length > 0 && (
        <div className="mt-4 text-sm text-gray-700">
          <p>
            Travelling via{' '}
            {journey.enrolled_via.map((g) => g.group_name).join(', ')}
          </p>
          {/* FEAT-H020: resume the player for each active via-group enrolment. */}
          {journey.enrolled_via
            .filter((v): v is Required<JourneyEnrolledVia> =>
              Boolean(v.status === 'active' && v.enrollment_id),
            )
            .map((v) => (
              <Link
                key={v.enrollment_id}
                href={`/journeys/${journey.id}/play?enrollment=${v.enrollment_id}`}
                data-testid="continue-via"
                className="mt-1 mr-3 inline-block text-xs font-medium text-blue-600 hover:underline"
              >
                Continue {v.group_name}
              </Link>
            ))}
          {withdrawableVia.map((g) => (
            <button
              key={g.enrollment_id}
              type="button"
              data-testid="withdraw-group"
              disabled={busy}
              onClick={() =>
                setPendingWithdraw({ enrollment_id: g.enrollment_id, label: g.group_name })
              }
              className="mt-1 mr-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Withdraw {g.group_name}
            </button>
          ))}
          {frozenVia.length > 0 && (
            <p data-testid="frozen-state" className="mt-2 text-xs text-gray-500">
              {frozenVia.map((g) => g.group_name).join(', ')}: held for review — no changes here.
            </p>
          )}
        </div>
      )}

      {/* STORY-4: the wielding walk — exactly the payload's groups, or nothing. */}
      {journey.enrollable_groups.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            data-testid="enroll-group-open"
            disabled={busy}
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Enrol a group
          </button>
          {pickerOpen && (
            <ul className="mt-2 space-y-1">
              {journey.enrollable_groups.map((g) => (
                <li key={g.group_id}>
                  <button
                    type="button"
                    data-testid="enroll-group-option"
                    disabled={busy}
                    onClick={() => {
                      setPickerOpen(false);
                      setPendingGroup(g);
                    }}
                    className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {g.group_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The wielding confirm — names the group (H018 pattern). */}
      <ConfirmModal
        isOpen={pendingGroup !== null}
        title="Enrol a group"
        message={
          pendingGroup
            ? `You are answering for ${pendingGroup.group_name}: enrol it in "${journey.title}"? Every active member travels together.`
            : ''
        }
        confirmText="Enrol the group"
        busy={busy}
        onCancel={() => setPendingGroup(null)}
        onConfirm={() => {
          const g = pendingGroup;
          if (!g) return;
          void run(() => enrollGroup(journey.id, g.group_id)).finally(() =>
            setPendingGroup(null),
          );
        }}
      />

      {/* Withdraw — deliberate, destructive-styled (STORY-5). */}
      <ConfirmModal
        isOpen={pendingWithdraw !== null}
        title="Withdraw from this journey"
        message={
          pendingWithdraw
            ? `Withdraw ${pendingWithdraw.label} from "${journey.title}"? The enrolment is removed; you can enrol again later.`
            : ''
        }
        confirmText="Withdraw"
        variant="danger"
        busy={busy}
        onCancel={() => setPendingWithdraw(null)}
        onConfirm={() => {
          const w = pendingWithdraw;
          if (!w) return;
          void run(() => withdrawEnrollment(journey.id, w.enrollment_id)).finally(() =>
            setPendingWithdraw(null),
          );
        }}
      />
    </section>
  );
}
