# Session bridge — 2026-08-19: the wielded-forum live walk is green; one new ruling captured (TASK-EDT-01)

**Continuation of the `2026-08-18_01` bridge** (tranche 2 merged at the gate, #556). Stefan walked the shipped acting pair live on the dev server with a dedicated cast (walk-* users; Harbour/Riverside/Drift; fixtures idempotent and left in place, verified back at rest state).

## The walk — all four scenarios green

1. **The hat is the only door:** non-member Wanda saw members-only copy; the selector offered only hats with standing (Drift correctly absent); selecting Riverside rendered the banner and the forum.
2. **The group speaks:** per-act confirm naming the wielding, post + reply landed authored **Riverside** with the Group badge; edit/delete/moderate/report affordances absent under the hat; Mona's plain view showed the badged posts with her own affordances intact.
3. **No key, no offer:** Kalle (Riverside member, no `act_as_group`) got "Myself" only.
4. **The hat withdraws by itself:** Bert paused Riverside's membership from the UI; Wanda's untouched window got the bell (PD020's expansion delivering to the key-holder personally), the hat left the selector without reload, the amber honest-copy notice rendered, the forum fell back to her own standing. Bert's Reactivate restored the fixtures (DB-verified post-walk).

**One environment finding, not a feature fault:** the walk's first attempt hit 500s that mimicked a wielding regression — a dev server surviving from 2026-08-16 with a severed stdout pipe (EPIPE on newly-compiled routes). Recognized, killed, restarted; recorded in auto-memory (taskstop-dev-server-epipe) so it is never re-diagnosed as substrate.

## New ruling captured mid-walk (merged, #559)

**[TASK-EDT-01](../backlog/tasks/TASK-EDT-01-unlimited-edit-with-label-and-grace.md)** (Stefan, after the industry-pattern review): own-post editing goes **unlimited** with an always-on "(edited)" label, except a **3-minute silent grace** for typo fixes. Platform half will hold at the schema gate when pulled (the 15-minute edge lives in `edit_own_forum_post`); the label can render display-side (`updated_at − created_at > 3 min`, no schema). Open at pull: whether own-**delete** keeps its window; wielded no-edit posture unchanged.

## Open items (carried)

1. The Hub half for **conversations** (tranche 2 has no surface yet — walking it waits for that pull); tranche 3 (announcements, PD020-interplay walk); TASK-EDT-01; wave assignment for the PD019/PD020/H046 family; PD020's prod-apply NOTICE.
2. Walk fixtures (walk-* users, password on the walk card in-session; Harbour public) stay in the dev DB for future walks — separate namespace from e2e-*, untouched by suite teardowns.
