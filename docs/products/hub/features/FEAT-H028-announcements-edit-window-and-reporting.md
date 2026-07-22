# FEAT-H028: Announcements, the edit window, and reporting — the Hub surface of C-D

---
id: FEAT-H028
title: Announcements on group page + home, forum edit/delete-own within the window, content reporting (COM-8/9/12/13 surface half)
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The platform half (FEAT-PD011, paired) gives announcements a durable home, returns windowed own-edits to the forum, and gives reports a store — but nobody can see or reach any of it. The Hub must surface: community announcements where the community lives (the group page), platform announcements where everyone passes (home), fix-and-withdraw affordances on a member's own fresh forum posts, and a report affordance wherever content can harm (forum + DM). All FIM-only (CB-1), all API-first over the paired contracts, **no socket work** (C-D carry rule) and **no bell** (A-NTF's tenant).

## Solution sketch

Four surface additions, no migration of its own, consuming FEAT-PD011 API-first:

- **Group page Announcements section** — a failure-isolated panel on `hub/app/groups/[id]` (the H026 Forum-section pattern): newest-first from `get_group_announcements`, keyset "load more", empty state, attribution at the content-display layer. Compose affordance rendered only on the platform's `send_announcements` grant (the H026 grant-render pattern); Retract behind ConfirmModal on the same grant, list updates from the confirmed response.
- **Landing Announcements section** — platform-scope announcements on **`/groups` (the groups overview — the real signed-in FIM landing surface)** from `get_platform_announcements`, labelled as platform announcements; absent for Mists (the contract refuses; the surface doesn't render the section). A justified standalone read (ADR-U042) with session cache + W9 registration, like the Forum section. *(Corrected at build 2026-07-20: the decomposition draft said "the signed-in home (`hub/app/page.tsx`)" — that file is the public identity-aware entry, not a home; the entry's FIM affordance lands on `/groups`. A decomposition placement miss, labelled per the walk discipline.)*
- **Forum window affordances** — on my own live posts younger than 15 minutes: Edit (inline, confirmed write-through via `edit_own_forum_post`) and Delete (ConfirmModal → `delete_own_forum_post`, tombstone rendered from the confirmed response exactly like moderation). Affordances derive from payload facts the forum read already carries (walk below); they disappear at window expiry client-side, and a race past the edge surfaces the server's refusal honestly (the optimistic-with-retry posture, H026). An "(edited)" marker renders when `updated_at > created_at`.
- **Report affordance** — on any forum post/reply and any DM message that is not mine: a small dialog (reason required, details optional) → `submit_content_report` → confirmation toast; an idempotent resubmit reads as "already reported". No queue, no status view beyond submission confirmation this cycle (ADM-10 seam).

**Payload walk (decomposition-verified against live contract sources, 2026-07-20):**
- Forum affordances key off the existing `get_group_forum` post-doc — `author_group_id` (own-check vs the session's personal group id), `created_at` (window), `updated_at` (edited marker), `id` (mutation target), `is_deleted` (no affordances on tombstones): all present (`20260720120000` §125-148). **No payload extension needed.**
- Report targets: forum post/reply `id` (same doc); DM message `id` + `sender_group_id` (own-check) from `get_conversation_detail` messages (`20260719230500` §331-344). Present.
- Announcement panels render `{id, title, body, created_at, author: {display_name, attribution}}` — every key named in FEAT-PD011's read row-doc; retraction filtering is platform-side (nothing for the surface to filter).
- Edit/delete responses return the post row-doc / tombstone doc — the surface writes through from confirmed responses, never from its own optimism alone.

## Appetite

One cycle (C-D), surface half — the H026 scale: sections + affordances + dialogs, unit + E2E, `next build` before 6-done.

## Rabbit holes

- No unread/badge mechanics for announcements (A-NTF); no announcement composer rich-text — plain title + body.
- No countdown timers per post — a cheap client-side visibility cutoff is enough; the server owns the true edge.
- No report-history surface ("my reports") — submission + toast only; the store is queryable when A-ADM needs it.
- COM-9 compose: **not in the Hub anywhere** — universe-scoped governance stays on the Console (ADR-U028); hub-v2 has no admin surface (verified) and this feature must not invent one. Member-facing *rendering* of platform announcements is this feature; composing seams to A-ADM.

## No-gos

- No edit/delete affordances on DMs — conversation detail renders none, ever (regression-asserted).
- No Mist rendering of any announcements section (CB-1).
- No new realtime channels or tenant changes — §L2 §4's named list is untouched; live self-delete tombstones arrive through the existing forum channel because the platform's existing trigger fires on the transition.
- No optimistic announcement/report writes without confirmed write-through.

## Stories

### STORY-1: The community reads its board (COM-8 render)
As a group member, I want the group page to show announcements newest-first, so the community's word reaches me where the community lives.

**Acceptance criteria:**
- Given a group with announcements, when the group page loads, then the section renders newest-first with title, body, sent-time, and attribution ("Former member"/"Unknown" ladder included); empty state when none; panel failure isolated from the rest of the page.
- Given I joined the group after an announcement was sent, when I open the group page, then I see it (read-time visibility — the late-joiner walk).
- Given more announcements than one page, when I ask for more, then keyset pagination continues without duplication.

### STORY-2: A Steward speaks once (COM-8 compose + retract)
As a Steward, I want to compose and, if needed, retract an announcement on the group page, so community word is one act, not N DMs.

**Acceptance criteria:**
- Given the `send_announcements` grant, when the page renders, then the compose affordance appears (and does not for members without it); given a valid title + body, when I send, then the new announcement renders from the confirmed response.
- Given the same grant, when I confirm Retract on an announcement, then it leaves the list from the confirmed response; given no grant, no retract affordance exists.
- Given a send refused by the platform (grant revoked mid-session), when it returns, then the refusal is surfaced honestly with the composed text preserved.

### STORY-3: Everyone hears the platform (COM-9 render)
As a FIM, I want platform announcements on my landing surface (`/groups`), so universe-scoped word reaches me without a bell existing yet.

**Acceptance criteria:**
- Given platform announcements exist, when a FIM's landing surface loads, then the section renders them newest-first, labelled as platform announcements; empty state when none.
- Given a Mist session, when the surface renders, then no announcements section (and the E2E walk shows the FIM/Mist difference).
- Given the section's read fails, when the landing surface renders, then the rest of the page is unaffected (failure isolation).

### STORY-4: Fifteen minutes to fix it (COM-12 surface)
As a forum author, I want Edit and Delete on my own fresh posts, so a typo or regret has an exit — briefly.

**Acceptance criteria:**
- Given my own live post younger than 15 minutes, when the forum renders, then Edit and Delete affordances appear on it — and on nobody else's, not on tombstones, and not on my posts past the window.
- Given an edit confirmed, when the post re-renders, then new content + "(edited)" (from `updated_at > created_at`); given Delete confirmed, then the tombstone renders in place exactly as moderation tombstones do.
- Given the window expires between render and submit, when the platform refuses, then the refusal is surfaced honestly and my draft edit is not lost.
- Given a conversation detail view, when any message renders (mine included), then no edit or delete affordance exists (DMs immutable — regression).

### STORY-5: Report what harms (COM-13 surface)
As a member, I want to report a forum post or DM message that isn't mine, so harm has somewhere to go.

**Acceptance criteria:**
- Given another's forum post/reply or DM message, when I open Report, then a dialog collects a required reason + optional details and submits; a confirmation toast follows the confirmed write.
- Given my own content, when rendered, then no report affordance.
- Given I already reported this target, when I submit again, then the surface reads the idempotent response as "already reported" — no duplicate, no error tone.

## Platform dependencies

FEAT-PD011 (paired — all contracts consumed API-first); FEAT-PD009/FEAT-H026's forum section (the affordances graft onto its rendering); FEAT-PD008/FEAT-H025's conversation detail (report targets); the session's personal-group identity from the auth context (own-checks).

## Cross-product impact

None outward this cycle. Forward: A-NTF's bell will badge announcements from delivery rows (nothing here to change); A-ADM's Console gets COM-9 compose + the ADM-10 queue.

## Vertical impact

- **Privacy/GDPR:** Platform-resolved display names only (V2 house rule); report dialogs send reason/details to the platform store — nothing report-related in client logs or telemetry payloads beyond content-free counts.
- **Notifications:** None rendered this cycle (no bell, no badge for announcements) — deliberate A-NTF seam.
- **Administration:** Retract affordance = the Steward's lifecycle control; everything else admin-shaped seams to A-ADM (named in Rabbit holes).
- **Observability:** Content-free telemetry on send/retract/edit/delete/report attempts + refusals surfaced honestly (the H026 posture).
- **Transactions:** None.
- **Extensibility:** No new enums or closed sets client-side; affordances key off platform grants and payload facts, never role names (ADR-U007).

## Implementation notes (6-done — Cycle C-D, 2026-07-20)

- **What landed (PR #224, built red-first by a delegated builder session; verified independently):** `GroupAnnouncementsSection` (group page, above the forum; compose + Retract-behind-ConfirmModal on the `send_announcements` grant via the existing my-permissions read) + `PlatformAnnouncementsSection` on **`/groups`** (the placement correction above) + `lib/announcements/` couriers (session cache + cache-registry); window affordances grafted into `GroupForumSection` (Edit/Delete on own live posts inside 15 minutes — own-check via the my-permissions payload's `member_group_id` (FEAT-H017 additive key; AuthContext deliberately not extended), a coarse ticker retires affordances client-side, "(edited)" from `updated_at > created_at`, tombstones render exactly as moderation tombstones — including, as built, the copy "Removed by a group moderator" on self-deletes, accepted under the no-distinguishing no-go; wording observation routed to A-ADM. **Amendment (A-COM walk, 2026-07-22, Stefan's fix-now disposition):** the shared copy is now the neutral "This post was removed" — still indistinguishable (the no-go holds), no longer attributing self-deletes to a moderator; the A-ADM routing is discharged) + `lib/forum` edit/delete couriers; `ReportDialog` (own small modal, not ConfirmModal — it collects input; inline `role=status` confirmation, no toast primitive exists in the house) on others' forum posts + DM messages, "already reported" on the idempotent resubmit; six new BFF routes (announcements group/platform/retract, forum edit/delete, reports).
- **Red→green:** every behaviour unit-first (8 new unit suites; builder-recorded reds per test, verified by the green run: unit **115 suites / 837 tests**, lint 0 errors, source tsc clean). E2E labelled **journey verification** (the red-first proof lives at the contract + unit tiers): `announcements-window-reports.spec.ts` **4/4** — the two-context announce→read→retract walk, the platform announcement on `/groups`, the edit-window + self-delete-tombstone walk, the report + idempotent re-report walk; fresh logins per context.
- **Three E2E authoring traps caught and fixed in-session** (all mine, spec-side): a cross-test module-state dependency (`/groups/undefined` on worker restart — tests made self-sufficient via RPC-provisioned fixture groups + serial mode), a hasText-filtered locator that stops matching mid-edit (pinned `data-testid` before mutating — the realtime.spec precedent), and a **global-scope `signOut()` in fixture provisioning that revoked the shared storageState server-side and felled 14 downstream fleet specs** — the C-C trap self-inflicted; removed (throwaway client, `persistSession: false`). Fleet after the fix: **74/75** (the 1: profile.spec STORY-4 — the pre-existing fenced flake, TASK-E2E-01, green 3/3 isolated, found-not-caused).
- **ADR-U043 disposition: not triggered** — both sections load post-paint behind B6 skeletons as failure-isolated standalone reads (the H026 class); no first-paint request added or rerouted.
- **Key files:** `hub/components/groups/GroupAnnouncementsSection.tsx`, `hub/components/announcements/PlatformAnnouncementsSection.tsx`, `hub/components/reports/ReportDialog.tsx`, `hub/components/groups/GroupForumSection.tsx`, `hub/lib/{announcements,reports}/`, `hub/lib/forum/{client,http,queries}.ts`, `hub/app/api/{announcements,reports}/…` + `hub/app/api/forum/[postId]/{edit,delete}/`, `hub/tests/e2e/announcements-window-reports.spec.ts`.

## Performance budget

- **First-paint class:** group page unchanged (the section is a failure-isolated panel on an existing page — B3 warm nav); the `/groups` landing gains one justified standalone read (ADR-U042) with session cache + W9 registration — post-paint behind a skeleton, B2/B3 budgets unchanged.
- **Interaction class:** compose/edit/delete/report are B5 (≤ 200 ms to next paint via optimistic-with-confirmed-write-through or dialog feedback within 100 ms).
- **Loading states:** B6 — skeletons for the two announcement sections; dialogs render instantly with inline pending states.
