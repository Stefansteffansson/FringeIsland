# Session bridge — 2026-10-01 — The thinking folder holds universe material only; one way for findings to land

**Cycle:** The Eid kickoff (front door repointed to this bridge; the kickoff itself still waits for its fresh session)
**Span:** 2026-10-01, the same Claude Code session as the three bridges before it; pull requests #707 to #713
**Trigger:** Stefan asked where the bible holds "immersive edutainment", whether the chapter order should change, whether the two record files are still needed, and whether research findings from Claude.ai chats reach the research files on their own.

---

## Decisions (Stefan)

- **"Immersive edutainment" gets one home**: a named section in chapter 1, "the two halves and the join", built only from what the bible already concluded. *Locked (#707).*
- **The chapter order stays.** Renumbering would stale 175 glossary pointers, 39 links from 23 files and 69 section references in the never-rewritten discovery file, for no reader gain. *Locked.*
- **The thinking folder holds universe material only.** The finished bible plan is deleted (git keeps it); its session queue lives at `docs/planning/universe-discovery-queue.md`; the manifestation map lives at `docs/planning/reference/UNIVERSE-TO-SPEC-MANIFESTATION.md`, to be re-run against the bible when the Eid kickoff needs it. What remains: the bible, the discovery file, the questions register, the quotes, the research. *Locked (#708, #709, #710, #711).*
- **Findings never land on their own, so one rule says where each lands.** Every research report ends with an Addenda section (open, append-only, dated and sourced; the body never rewritten). The thinking README's "Where a finding goes" table routes every kind of finding to one home: the bible through a session; a discovery candidate or statement; a report's Addenda; a CQ; the quotes; an ADR; the queue. The Claude.ai project applies it in the session and says where each thing went; doc-health checks that every universe-bearing addendum has its route into the bible. *Locked (#712, #713).*

## What was produced

- The bible: chapter 1's "Immersive edutainment: the two halves and the join"; chapter 8 points at the queue's new home; chapter 1's "Where this comes from" says the reports grow by dated addenda.
- `docs/planning/universe-discovery-queue.md`: the queue, its two tracks and its upkeep rule, lifted from the plan record.
- The nine research reports: the "How this report grows" line and the Addenda section.
- The thinking README: "Where a finding goes"; no record register. The root CLAUDE.md document map: the queue row, Eid as the current wave, the Thinking row current. `docs/README.md` and `docs/planning/README.md` indexes current (Eid current there too).
- The Claude.ai opener: four registers, the queue's path, the Addenda rule, the routing; re-pasted twice today by Stefan. AGENTS.md: the queue's path, the Addenda sentence, "its registers" instead of a count.
- Doc-health: section 10 steps 6 and 7; two rows in the moved-files table.

## What is still open — Stefan

- The Eid kickoff decisions (the appetite and the first theme), which pick the next discovery session: row 2 or row 5 of the queue.
- The breach-response tooling carry-over, in or out at the kickoff.
- TASK-VOC-01's spec and code halves.

## Non-obvious insights

- **"Where does this go?" needs one answer per kind of finding, written where the writer looks.** Before today the rule for research was "write only if Stefan asks for a report", so a finding mentioned in a session had no home and stayed in the chat. The routing table lives in the folder README, and the Claude.ai opener restates it, because the project only ever holds a paste.
- **A merge chained behind `;` ignores a red gate.** Learned on 2026-09-30 (#705 merged red); every merge today ran only when the check count of failures was zero.
- **Shell backticks inside a double-quoted `node -e` run as commands.** A memory note lost two file names that way until a script file replaced the inline edit.

## The research audit (same day, #715)

Stefan asked what in the research reports is suitable for the bible. Four read-only auditors compared the six universe reports (about 67,000 words) with the bible and with Session 05's rulings on research ideas (Rs-1 to Rs-14). Already in the bible: the Kegan report about 80%, What Fills a Life 35 to 40%, the thinkers report about 40% with a third belonging to the Whisp's specification, the worlds reports 30 to 45% through the portal ideas. **The Theory U report had never been tabled**; it is named as an anchor and no mechanic cites it. Of 40 proposals Stefan okayed the three outputs: nine citations of real origins (twelve resemblances noticed afterwards were skipped: the rule keeps origins, not parallels); five sentences the bible rested on but never said; and fourteen session candidates, now Candidate D in Part 2 of the discovery file, each riding with its queue row. *Locked (#715, this PR).*
