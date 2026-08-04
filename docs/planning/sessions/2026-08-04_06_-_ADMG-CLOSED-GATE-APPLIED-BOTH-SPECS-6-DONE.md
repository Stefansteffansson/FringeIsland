# Session bridge — ADM-G closed: gate applied on the named approval, both specs 6-done, every tier green

**Date:** 2026-08-04 (session 9, continued) · **Wave:** Ferd · **Cycle:** ADM-G (**closed**)
**Follows:** [`2026-08-04_05_-_ADMG-BUILT-PC026-HELD-AT-GATE-H041-TRANCHE1-MERGED.md`](./2026-08-04_05_-_ADMG-BUILT-PC026-HELD-AT-GATE-H041-TRANCHE1-MERGED.md)

---

## READ THIS FIRST — the fresh session starts after ADM-G

1. **ADM-G is fully closed.** Stefan's named approval ("ok merge 418") unlocked the gate: migration `20260804230000` applied + repaired (log consistent), #418 merged. Both specs are **`6-done`** with Implementation notes; L4 + README rows advanced same-batch; CHANGELOG entries in all three registers (root cycle entry · hub member register · platform-core substrate register).
2. **The numbers:** PC026 gate suite 12-red/7-labelled-green at head → **19/19** post-apply (one test-only fix: `conversation_participants` is composite-keyed) · full integration **1027/1027** (73 suites) after the one labelled sibling adaptation · H041 E2E journey **6/6** with leak 0→0 · full E2E **131/132** (the one red = the recorded shared-session flake signature in `entry.spec`, 3/3 green solo — fenced found-not-caused, third distinct spec on TASK-E2E-01's docket) · unit 1291/1291 · lint 0 errors · `next build` green.
3. **Two sibling catches worth the retro (both recorded):**
   - The ADM-D **S8a `moderation.*` catalog pin** went red at the post-apply sweep — it queries the audit-log **action namespace**, which a function-name/refusal-string sweep cannot see. Adapted labelled (the "only via the contract" law it pins is preserved; the catalog legitimately gained `moderation.forum_post_moderated`). Retro question: should catalog-style pins (DISTINCT-set assertions over open namespaces) be a named sweep category?
   - The dossier's premise 7 ("PC023's exits family passes admins through the availability guard") was **wrong for the remove door** — the delegated walk verified the doors it audited, and `admin_remove_member_from_group` was composed-not-audited. The spec's own "gate finding, not silent scope" clause absorbed it cleanly.
4. **The sequence after ADM-G (unchanged from session 7):** **N-E** (WF-1 bell-answerable invitations + the polish rider) → **AB-6** (the FULL audit — docket now carries: the Tier-1 `has_permission` finding, the `/admin/roles` + admin-plane deep-cold ADR-U043 pass, and one new observation from this cycle's walkthrough: **sealed conversations are outside admin sight** — `get_group_conversations` excludes `sealed_at` rows by its existing law, so a bully's sealed thread is invisible to the wing; render-what-the-contract-returns was the H041 no-go, but whether the *contract* should arm sealed threads for the admin plane is a safety question AB-6 or a walk should answer).

## The plain-English walkthrough (J-B, walked against shipped behaviour)

*A group got ugly — bullying in the messages, garbage on the forum. I suspended it days ago; the members see the found-but-that's-it shell and nothing else. Today I opened its admin page and the page had grown: a banner told me I was looking at a suspended group's content and that my access is audited. I read the forum, the announcements, and — because the evidence lives in messages — I opened the group's conversations and read the bodies. I moderated the worst post: the confirmation named its author and the group, made me write down why, and told me every member will see it gone. I removed the ringleader: the confirmation showed their name AND email so I couldn't nuke the wrong same-named person, made me write a reason, and warned me they lose access. Both acts are in the audit log. Then I reactivated the group — the wing folded away, the members got their group back, the tombstone stands where the post was, and the removed member finds nothing at the old address.*

Continuity questions asked against the build: a group suspended in an earlier era serves the wing (arms key on live status, not suspension date) ✓ · the tombstone survives reactivation and renders identically on both planes ✓ · the removed member's authored posts remain for inspection, attributed 'former member' by the COM-14 ladder ✓ · removing the LAST member of a held group takes the closure leg (suspended → closed — the wing folds with the status, and closed-group content is out of WF-2's scope by the board's own line) ✓ · DMs between members of the held group stayed unreadable in every status ✓ · **sealed threads are invisible to the wing** (existing contract law — surfaced to AB-6, point 4).

## What this session did (gate-to-gate, after the _05 bridge)

- Applied `20260804230000` on the named approval; repair + list consistent; gate suite 19/19; #418 merged; discovery synced.
- Full integration sweep surfaced the S8a catalog pin (1026/1027) → adapted labelled → suite 29/29 → final full sweep **1027/1027**.
- E2E: journey spec written (content laid via member contracts, labelled; journey UI-driven end-to-end; member-side verification after reactivation per the quarantine law), two test-side selector fixes against correct product behaviour (the busy modal's W-4 echo; the member-plane no-leak copy), 6/6 + leak 0→0; full sweep 131/132 with the entry.spec flake fenced and logged on TASK-E2E-01.
- A wedged leftover dev server on :3000 (Next-internal jest-worker error on every route) was identified by command line, killed, and replaced — worth remembering as a probe-before-trust case.
- 6-done batch: Implementation notes both specs (build findings, deviations, the new route-tier suite pattern) · maturity + L4 + README rows · the FEAT-PC021 amendment pointer (the contract-change cross-reference rule) · three CHANGELOG entries · TASK-ADMG-01/02 → done · TASK-E2E-01 third occurrence logged.

## Standing items

TASK-E2E-02 (consented-fixture leak; purge decision Stefan's) · **TASK-E2E-01 — the watch condition is over-met (three distinct specs); schedule the 2 h fix at the next boundary** · the deferred Eid piles · AB-6's docket (Tier-1 finding · `/admin/roles` + admin-plane deep-cold U043 pass · the sealed-threads sight question, new) · the G-3 journeys deferral (dated 2026-08-04).

## Close ritual (this session)

- [x] All gates green (numbers in point 2); both specs `6-done`; tasks closed
- [x] CHANGELOG ×3 (root · hub · platform-core)
- [x] Session bridge (this file) + plain-English walkthrough
- [x] Dashboard refreshed at close
- [ ] No doc-health run owed (no cross-cutting change; next boundary carries the cycle-retro doc-health slot)
- [x] Discovery synced after every merge; checkout left on main, clean
