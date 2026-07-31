/**
 * FEAT-H027 STORY-6 — the quiet reconnecting affordance shared by the comm
 * surfaces (inbox, open detail, group forum). Inline, small, polite — no toast,
 * no layout shift, no shouting (the rabbit-hole fence). Rendered only while a
 * comm channel has left the subscribed state; the rest of the Hub is untouched.
 */
export function ReconnectingNotice({ className = '' }: { className?: string }) {
  return (
    <p
      data-testid="comm-reconnecting"
      role="status"
      // COR-C W6: ink-subtle (gray-500), not gray-400 — the same AA contrast
      // floor the W5 bell fix applied (2.54:1 -> 4.83:1 on surface).
      className={`text-xs text-ink-subtle ${className}`.trim()}
    >
      Reconnecting…
    </p>
  );
}
