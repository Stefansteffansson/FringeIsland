# leave_group last-member refusal copy — point at Close (post-PC014)

---
id: TASK-PC013-03
title: leave_group's last-member refusal still says closing is "not yet available" — false since FEAT-PC014 shipped close_group; copy-only function-body replacement pointing at Close
status: done
assigned_to: claude
priority: medium
feature: FEAT-PC013
owner: platform/core
wave: ferd
cycle: Groups G-E (post-6-done fix)
depends_on: []
estimated_hours: 1
---

## Description

Found at the H017 build (2026-07-05): the G-D last-member Leave refusal copy — *"cannot leave: you are the group's last member, and closing a group is not yet available"* — became false the moment PC014 shipped `close_group`. The Surface relays refusal messages verbatim by design (the H016 pass-through contract), and the H017 group page now renders the working **Close this group** affordance right beside the stale sentence.

Fix: migration `20260705115243` replaces `leave_group` in place — the PC013 body **verbatim except the one message**, which now mirrors `hand_stewardship_to_deusex`'s last-member shape: *"cannot leave: you are the group's last member — close the group instead"*. Same errcode (P0001), same guards, same cascade — zero behavioural change. Grant hygiene re-asserted explicitly (revoke names `anon`, not just PUBLIC — the standing finding-2 discipline).

## Acceptance criteria

- [x] Red demonstrated against the live substrate: the carried-forward refusal test extended to assert the message contains "close the group" and not "not yet available" — received the exact stale string
- [x] Migration applied (`node scripts/apply-migration-temp.js 20260705115243_fix_leave_group_last_member_copy.sql` + `repair --status applied`) — applied 2026-07-05 on Stefan's gate nod
- [x] Groups integration domain green after apply — 157/157

## Verification

Schema gate: function-body replacement → status `review`, explicit nod (the TASK-PC012-03 invite-fix precedent). The direct-caller answer is unchanged from PC013's gate: same grants, same guards, message-only.
