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
      className={`text-xs text-gray-400 ${className}`.trim()}
    >
      Reconnecting…
    </p>
  );
}
