# Changelog — The Hub

User-visible changes to the Hub (the canvas surface of FringeIsland). The Hub is being rebuilt fresh under `hub/` ([ADR-U032](../docs/architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)); entries below track the Phase-3 rebuild. Each entry links the feature spec, which carries the full implementation notes.

## 2026-06-26 — Mist identity on arrival ([FEAT-H003](../docs/products/hub/features/FEAT-H003-mist-identity-on-arrival.md))

- **The FringeIsland entry.** A public landing reachable with no account and no session — *Sign in* / *Sign up* / **Look around**. Looking around leaves no trace (no session, no rows).
- **Enter as a Mist.** "Look around" begins an anonymous session just-in-time and lands on a minimal Mist-presence state, with a "become a FIM to keep your journey" path to sign-up.
- **Three-state identity.** The app distinguishes sessionless / Mist / FIM and shows each only the doors that are theirs (no Mist chrome for a FIM).

## 2026-06-25 — Credentialed FIM sign-up ([FEAT-H002](../docs/products/hub/features/FEAT-H002-credentialed-fim-sign-up.md))

- Create an account (email + password + consent) and your personal group, landing authenticated on your groups.

## 2026-06-24 — Walking skeleton: sign in ([FEAT-H001](../docs/products/hub/features/FEAT-H001-walking-skeleton-sign-in-and-groups.md))

- Sign in as an existing FIM and land on your groups — the first Phase-3 slice (architecture proof + the five vertical seams).
