# The Universe Bible — the plan (a single truth)

**Status (2026-09-25):** Phases 0–3 done — the rulings list is complete (discovery Sessions 04–05, S79–S114). Next is Phase 4, starting with the glossary.
**Origin:** drafted 2026-09-24 with Stefan at the end of discovery Session 03; kept in the claude.ai project as `claude/universe-bible-plan.md`; this copy placed in the repository on 2026-09-25 so Claude Code can read it. If the two differ, the newer date wins.

## Goal

One place where anyone with the right authority can read what FringeIsland **is** and how it is **supposed to work**, today, in the present tense. No history, no "ratified on", no statement numbers in the body. Git keeps the history; the discovery log becomes the workshop where new thinking happens before it is baked in.

The bible contains the backdrop (Session 03), so it is the **deep bible** of CQ-018. A trimmed story bible for authors can be cut from it later.

## Decisions (Stefan, 2026-09-24)

1. **Built in Cowork or Claude Code**, chapter by chapter; Claude Code does the switch-over (Phase 5) and all git.
2. **One file**, a new register: `docs/fringeisland-thinking/bible--fringeisland-universe.md` — a table of contents at the top, chapters as sections. Estimated 12,000–18,000 words. At switch-over the seven old `canon--` files become one-line pointers to the right section (old links keep working; current documents are relinked to the bible).
3. **Open questions: each written once, in its chapter**, as a clearly marked "Open" box where the topic is discussed; **plus one index chapter** near the end — a table with a line per question (short title, link to its box, what it waits for, who is needed, priority). Never two copies. When a question is answered, its box is replaced by the answer and its index line removed. Business and technical questions stay in the questions register; the index points to it in one line.
4. **Research stays separate** as background reading, never part of the truth — and is **never deleted** (Decision 7).
5. **Model:** the strongest available for Phases 2–4, chapter by chapter; Sonnet-class is enough for Phase 5.

## Decisions (Stefan, 2026-09-25)

6. **Always keep citations and references to research origins** in the bible (S113). No statistics in the body (R-27), but every research-grounded idea carries its source (thinker, work, and where useful the research report in this folder).
7. **The research and the Whisp's wisdom are core origin material: rename and rearrange if necessary, never delete** (S114). This covers the `research--` reports (above all `research--growth--thinkers-and-models-behind-the-whisp.md`, the Kegan, Theory U and what-fills-a-life reports, the worlds and method reports), the discovery log and the candidate material. They stay **outside** the bible; the bible cites them. Binding on Phase 5.
8. **Plain English first**, the technical term and its source beside it.

## Shape of the bible (one file)

1. Start here — what FringeIsland is, in one page
2. The worlds — the Ordinary World, the Shimmer, **Nalome** and Marath, the three reaches (near side / far side / beyond), the Void and the cord, anchoring and seeds, portals, the Tree (roots, trunk, branches, limbs, drips) and the lines
3. The beings — the Whisp (future self, the newborn's openness, two channels, its face), Mara and the Shadow (individual, pair, community), NPCs, Mists and FIMs, the birth
4. Growth — the three questions, the three perspectives, Live/Grow/Matter, the Mara-to-Whisp transfer, the zones (comfort → fear → learning → growth, panic as the fence; informed by Immunity to Change), rest, graduation
5. Story — seasons, episodes, respawn, the backdrop and the dark branch, the older mythology (the first opening, the altered states), how the mythology is held
6. Roles and governance
7. Community and the founding moment
8. Open questions — the index
9. Glossary — the vocabulary authority

Three kinds of content only: **true** (baked in), **open** (in its chapter's Open box, listed in the index), and nothing in between — candidates are ruled on before they enter.

## Phases

**Phase 0 — Close Session 03.** Done 2026-09-24.

**Phase 1 — Decide the method.** Done 2026-09-24.

**Phase 2 — Inventory and rulings list.** Done 2026-09-24: `record--universe-bible-phase-2-rulings.md` and `record--universe-bible-phase-2-chapter-maps.md`.

**Phase 3 — Rulings.** Done 2026-09-25: discovery Session 04 (S79–S102: R-01, R-02, R-05, R-08 and the Mist / Gimbal / ball / portal mechanics) and Session 05 (S103–S114: R-03–R-50 and Part 3 of the rulings record). Place 2 named **Nalome** (S111–S112). Where a Session 04–05 statement differs from the rulings record's suggestion, the statement wins.

**Phase 4 — Write the bible, chapter by chapter** (strongest model). Order: glossary → worlds → beings → growth → story → roles and governance → community → open-questions index → start here (last). Each chapter reviewed by Stefan before the next. Sources, in order of authority (later wins): discovery Sessions 04–05; the rulings record (Parts 1–3); the chapter maps (incl. the glossary draft and open-items map O-001–O-075); Sessions 01–03; the `canon--` files.

**Phase 5 — Switch-over** (Claude Code). Turn the old canon files into pointer stubs, update README and cross-repo links, adapt `doc-health-check`, retire the graduation tracker, commit in batches. Also: vocabulary-only corrections to VISION.md (R-50) and to the ADRs touched by Sessions 04–05 (ADR-U031: transcendence names the birth, consent is "becoming a FIM", seeds at portals optional, the ball opens portals, the far side not "the Beyond"; ADR-U025: the Gimbal is the phone; the Hub's `transcend` route and telemetry naming). **Never delete research or origin material** (Decision 7).

**Phase 6 — Prioritise and plan the open questions** (the index is the base).

## Rules throughout

- The session record (discovery Part 3) is never rewritten; it is simply no longer needed for reading.
- Where the material is ambiguous, ask rather than guess.
- Mechanics before experience design (2026-06-14): the bible describes how the world works; the first hour stays open.
- The backdrop is never told in the experience; the bible carries a notice that it is deep-bible tier (R-49).
- Research and origin material: rename and rearrange, never delete.
- Related: CQ-018 (who holds the mythology), CQ-019 (repository set-up before contributors).
