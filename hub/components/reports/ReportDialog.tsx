'use client';

import { useEffect, useState } from 'react';
import { submitReport, hasReported, type ReportTargetKind } from '@/lib/reports/client';

/**
 * FEAT-H028 STORY-5 — the shared content-report dialog (COM-13, Cycle C-D).
 * Mounted on content that isn't the viewer's own (the mount does the own-check;
 * this component never reports own content because it is never rendered there).
 * A small modal: required reason, optional details, submit via the courier, a
 * confirmation on the confirmed write. An idempotent resubmit reads as "already
 * reported" — no duplicate, no error tone. A failure is surfaced honestly and
 * the entered reason is preserved. No queue, no status view this cycle (ADM-10
 * seam). Not `ConfirmModal` — this collects input rather than a yes/no.
 */
export function ReportDialog({
  targetKind,
  targetId,
}: {
  targetKind: ReportTargetKind;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Close on Escape (never mid-flight).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting]);

  function close() {
    setOpen(false);
    setReason('');
    setDetails('');
    setError(null);
    setConfirmation(null);
  }

  async function handleSubmit() {
    const r = reason.trim();
    if (!r) return;
    setSubmitting(true);
    setError(null);
    try {
      const { alreadyReported } = await submitReport(targetKind, targetId, r, details.trim() || undefined);
      setConfirmation(
        alreadyReported ? "You've already reported this." : 'Report submitted. Thank you.',
      );
    } catch (err) {
      // Refusal surfaced honestly; the entered reason/details are preserved.
      setError(err instanceof Error ? err.message : 'Your report could not be submitted');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid={`report-open-${targetId}`}
        onClick={() => setOpen(true)}
        className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
      >
        {hasReported(targetKind, targetId) ? 'Reported' : 'Report'}
      </button>

      {open && (
        <div
          data-testid="report-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Report content"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={submitting ? undefined : close}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Report this content</h2>

            {confirmation ? (
              <>
                <p role="status" data-testid="report-confirmation" className="text-sm text-gray-700">
                  {confirmation}
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    data-testid="report-close"
                    onClick={close}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    data-testid="report-reason"
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-gray-700">
                  Details (optional)
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    data-testid="report-details"
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    data-testid="report-cancel"
                    onClick={close}
                    disabled={submitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-testid="report-submit"
                    onClick={handleSubmit}
                    disabled={submitting || reason.trim() === ''}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
