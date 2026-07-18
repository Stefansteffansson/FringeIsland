'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * FEAT-H024 STORY-1/2/3 — the Ask's capture input (ADR-U046's surface half).
 * A plain textarea labelled by the step's own `ask_verb` (the registry speaks;
 * the Hub never keys on kind strings), prefilled from the saved response.
 * Optional-always (invariant 3): no required state, no reference from any
 * completion affordance.
 *
 * Saves are background (JRN-9 doctrine extended to words): on blur when dirty,
 * and on unmount (the save-on-navigation path — navigation swaps the canvas by
 * step key, so the unmount flush is exactly the navigate save; fire-and-forget,
 * never blocking). The quiet indicator tells the truth (Saving… / Saved / Not
 * saved + retry); a failure keeps the words in the input — never silent loss.
 * An emptied input saves as the platform's retraction (the parent transport
 * maps '' -> response: null). `readOnly` (frozen posture) shows the words with
 * the pen down: disabled, no save can fire.
 *
 * The parent owns the transport (`onSave` resolves to the CONFIRMED body) and
 * the session-cache write-through happens in that transport (J-D doctrine) —
 * this component only tends the draft and the indicator.
 */
export function StepResponseInput({
  askVerb,
  initialBody,
  readOnly = false,
  onSave,
}: {
  askVerb: string;
  initialBody: string;
  readOnly?: boolean;
  onSave: (body: string) => Promise<{ body: string }>;
}) {
  const [draft, setDraft] = useState(initialBody);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Refs so the unmount flush sees the latest values without re-arming effects;
  // synced post-render (never during render — the compiler rule).
  const draftRef = useRef(draft);
  const savedRef = useRef(initialBody);
  const onSaveRef = useRef(onSave);
  const readOnlyRef = useRef(readOnly);
  useEffect(() => {
    draftRef.current = draft;
    onSaveRef.current = onSave;
    readOnlyRef.current = readOnly;
  });

  const save = useCallback(async (body: string) => {
    if (readOnlyRef.current) return;
    if (body === savedRef.current) return; // nothing new — no write churn
    setStatus('saving');
    try {
      const confirmed = await onSaveRef.current(body);
      savedRef.current = confirmed.body;
      setStatus('saved');
    } catch {
      // The words stay in the input; the indicator + retry surface the truth.
      setStatus('error');
    }
  }, []);

  // Save-on-navigation: the canvas is keyed by step id, so navigating unmounts
  // this input — flush a dirty draft as a fire-and-forget background save.
  useEffect(() => {
    return () => {
      if (!readOnlyRef.current && draftRef.current !== savedRef.current) {
        void onSaveRef.current(draftRef.current).catch(() => {
          /* fire-and-forget: the next mount prefills from the cache truth */
        });
      }
    };
  }, []);

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      <label>
        <span
          data-testid="response-label"
          className="text-[11px] font-semibold uppercase tracking-wide text-gray-400"
        >
          {askVerb}
        </span>
        <textarea
          data-testid="response-input"
          value={draft}
          disabled={readOnly}
          onChange={(e) => {
            setDraft(e.target.value);
            if (status === 'saved' || status === 'error') setStatus('idle');
          }}
          onBlur={() => void save(draft)}
          rows={4}
          placeholder={readOnly ? undefined : 'Your words, if you want to leave them here.'}
          className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600"
        />
      </label>
      {!readOnly && status !== 'idle' && (
        <p
          data-testid="response-indicator"
          role="status"
          className={`mt-1 text-xs ${status === 'error' ? 'text-amber-700' : 'text-gray-400'}`}
        >
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved'}
          {status === 'error' && (
            <>
              <span>Not saved.</span>{' '}
              <button
                type="button"
                data-testid="response-retry"
                onClick={() => void save(draftRef.current)}
                className="font-medium text-amber-800 underline hover:no-underline"
              >
                Retry
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
