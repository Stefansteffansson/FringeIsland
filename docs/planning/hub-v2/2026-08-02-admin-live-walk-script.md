# A-ADM live walk — Stefan's script (gate leg 4)

**Date prepared:** 2026-08-02 · **Environment:** production `fringe-island.vercel.app` (the shared Supabase project) · **Surfaces:** the eight admin surfaces (`/admin`, groups + detail, members + detail, moderation + detail, audit).

**No seeding, no teardown.** The precheck found the walk's material already living in the DB — real test relics. The walk therefore doubles as cleanup: every ceremony below acts on something that genuinely needs acting on, and nothing is fabricated.

## Preconditions — DB-verified 2026-08-02 (service-role read, this session)

| Fact | Verified value |
|---|---|
| Platform admins (active DeusEx memberships) | **5**: `deusex@fringeisland.com` (seed root, 2026-03-20) + **four leaked E2E fixtures**: `Adminessa` (elevated 2026-08-01), `Katherine Johnson` (2026-07-06), `CDaOvercd1784925662707` (2026-07-24), `Journal Eraser Admin` (2026-07-24) — all `…@fringeisland.test`, all ACTIVE |
| Stefan's account | `stefan.steffansson@yahoo.com` — active, **NOT a platform admin yet** (the grant is walk step 3) |
| Open reports | **12** — test relics, 2026-07-21..26; 11× `forum_post` ("harmful"), 1× `direct_message` ("Not good enough") |
| Users / groups | **2 015 / 3 612** — overwhelmingly test fixtures (893 of the first 1 000 emails are `@fringeisland.test`) |
| Perf measurement FIM | absent (torn down, verified 0/0/0) |

**Finding recorded at precheck (feeds the retro):** four test fixtures hold standing ACTIVE platform-admin on the shared DB — elevation fixtures that were not torn down by their suites, and their credentials are fixture passwords in the repo. The walk revokes them (step 5). Whether suites re-leak on the next run is a retro item, as is general fixture-data hygiene (2 k users / 3.6 k groups / relic reports) ahead of launch.

**You need:** the `deusex@fringeisland.com` password (the seed root). If you don't have it, tell me and I'll elevate your yahoo account by SQL instead — then start at step 2 signed in as yourself, and skip step 3's grant (it becomes a revoke-only walk).

---

## Step 1 — Sign in as the root admin; the dashboard

Sign in as `deusex@fringeisland.com`. Navigate to `/admin`.

**Expect:** the admin nav (Groups / Members / Moderation / Audit) and stat tiles. The tiles should show numbers consistent with the precondition row above (~2 015 members, ~3 612 groups, 12 open reports). If a tile disagrees wildly with the DB-verified numbers, that's a finding — note it, keep walking.

**Consequences of this step:** none (reads only).

## Step 2 — Groups: list, detail, suspend → reactivate

`/admin/groups` → browse the list (expect a wall of obvious test names; filters/search are client-side). Open any clearly-test engagement group's detail.

Then, on that group: **Suspend** (the H035 ceremony — confirm dialog states the consequence: the group is locked/hidden for members; no humans are in it). **Expect:** status badge flips to suspended. Then **Reactivate** the same group. **Expect:** badge returns to active.

**Consequences:** two audit rows (`group.suspend`, `group.reactivate`) with you (root) as actor; the group ends where it started. Both rows are real and permanent — append-only is the design, and a walked ceremony is a legitimate entry.

## Step 3 — Members: grant YOURSELF platform admin (the real grant ceremony)

`/admin/members` → find `Stefan Steffansson` (search/lookup is client-side over the fetched set — with 2 015 rows this is itself a walk observation; note the feel). Open the detail page.

**Grant platform admin** to your own account via the ceremony. **Before you click:** this writes `platform_admin.grant` to the audit log with root as actor and makes your yahoo account a real platform admin — intended and permanent (until revoked).

Then **sign out of root, sign in as yourself** (`stefan.steffansson@yahoo.com`), return to `/admin`. **Expect:** the admin plane opens for you. Everything from here on is walked as YOU.

## Step 4 — Members: the state ceremonies on a test member

Pick any obvious test member (NOT one of the four leaked admins yet — they're step 5). On their detail page (**expect:** profile + memberships + the action rail):

1. **Suspend** → **expect** state badge appears (suspended); the confirm copy states the member loses access while suspended. **Reactivate** → badge clears. (Two audit rows: `member.suspend`, `member.reactivate`.)
2. **Force logout** → **expect** success feedback; consequence copy is honest about the refresh-layer timing. (Audit: `member.force_logout`. The target is a test account; nothing is lost.)

**Deliberately NOT walked:** decommission and hard-delete. Both are terminal; the E2E suite proves them, and the walk gains nothing by destroying a row. If you want to see the terminal wall live anyway, decommission a `@fringeisland.test` member and then attempt reactivation — **expect the refusal verbatim** — but know the account stays decommissioned forever.

## Step 5 — Members: revoke the four leaked admins (real cleanup)

One by one, open each of these on `/admin/members` and walk the **Revoke platform admin** ceremony:

| Name | Email |
|---|---|
| Adminessa | `test-467101078584000-1757282077@fringeisland.test` |
| Katherine Johnson | `test-118867712311500-588313149@fringeisland.test` |
| CDaOvercd1784925662707 | `test-540164909346700-1250494096@fringeisland.test` |
| Journal Eraser Admin | `test-540183886463600-2045966538@fringeisland.test` |

**Before each click:** this removes real (leaked) admin standing — exactly what should happen; four `platform_admin.revoke` audit rows, you as actor.

**Optional floor demo:** after the four revokes, admins = root + you. Revoke **root's** admin (leaving yourself last), then attempt to revoke **your own** — **expect the last-DeusEx floor refusal verbatim** (the S7e behaviour, live). If you do this, re-grant root afterwards (or leave yourself sole admin — your call; note it either way).

## Step 6 — Moderation: queue, drift honesty, resolve

`/admin/moderation` → **expect** the queue listing the 12 relic reports (11 forum_post + 1 direct_message). Open the **newest** forum_post report.

**Expect on the detail page:** reporter, reason, the **content snapshot** taken at report time, and the drift-honesty render — if the reported content no longer exists (likely for July relics), the page must say so honestly rather than pretend. This render was a measured, legitimate read in the perf pass; now see it as a human.

**Resolve** the report: pick an outcome, write a short resolution note. **Before you click:** writes the resolution columns + `moderation.report_resolved` audit; notifies the reporter (a test account — the `report_resolved` registered kind; suppression honours their preferences). **Expect:** the report leaves the open queue; reopening its detail shows the resolved state.

Optionally resolve the `direct_message` one too ("Not good enough") — same ceremony over the other target kind. The remaining ~10 relics: leave them; whether they're bulk-resolved or purged is a retro/cleanup call (and a taste of why you re-scoped **ADM-7 bulk actions** into this wave).

## Step 7 — Audit: the walk reads itself

`/admin/audit` → **expect** every ceremony you just performed, newest first, dotted namespaces: `platform_admin.grant` (actor root), `group.suspend`/`.reactivate`, `member.suspend`/`.reactivate`/`.force_logout`, four `platform_admin.revoke`, `moderation.report_resolved` — actor **you** from step 3 onward. Exercise the filters. This is the gate's composition story read back end-to-end through the UI door.

## Aftermath — what the walk leaves behind

Permanent, by design: the audit rows (append-only). Changed state: your account is a platform admin; the four leaked elevations are gone; 1–2 relic reports resolved. Nothing needs teardown — nothing was seeded.

**Report back findings in any form** — anything that surprised you, any copy that lied, any surface that felt wrong at 2 000 rows (the members list is the one to watch — pagination is deliberately absent until a payload measurement asks; your walk IS that felt measurement). Findings feed the gate verdict; if it's clean, the gate closes.
