'use client';

/**
 * FEAT-H049 (DB-4) — the member-facing reason/note field a hold ceremony
 * renders inside its ConfirmModal message. Lifts the H041 wing's local
 * `ReasonField` (AdminSuspendedContentWing) into a shared primitive so the
 * six hold ceremonies, the bulk ceremony and the Steward's Rest/Wake control
 * share one shape: the label states WHO will read the text (the privacy
 * posture — the writer writes it as member-facing), the `data-testid` is the
 * H041 contract (`ceremony-reason`), and required-ness is the caller's
 * (Confirm gating), never this field's.
 */
export function CeremonyReasonField({
  value,
  onChange,
  label,
  testId = 'ceremony-reason',
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The accessible name — who sees this text ("Shown to the group's members"). */
  label: string;
  testId?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="mt-3 block text-left">
      <span className="block text-xs font-medium text-ink-mid">{label}</span>
      <textarea
        data-testid={testId}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? label}
        className="mt-1 w-full rounded-lg border border-edge px-3 py-2 text-left text-sm text-ink"
      />
    </label>
  );
}
