/**
 * Transcendence policy facts — PURE constants, split from `transcendence.ts`
 * at COR-C W7 (Audit III GC-7/AC3-12): AuthContext and the become-a-fim page
 * value-import these, and a value import ships its module to the browser, so
 * they must not share a file with the rpc-bearing `finaliseTranscendence`.
 */
/**
 * The consent policy version shown in UX copy (ADR-U034 open identifier).
 * DISPLAY-ONLY since COR-D W3 (Audit IV AC4-1): the substrate stamps the
 * authoritative version server-side from consent_purposes.current_policy_version
 * — this constant is never sent to the platform. A policy bump updates the
 * catalog and this copy together (the re-consent flow's own procedure).
 */
export const TRANSCENDENCE_POLICY_VERSION = 'v1';

export const TRANSCENDENCE_CONSENT_REQUIRED_ERROR =
  'Please give your consent to become a FIM and keep your journey.';
