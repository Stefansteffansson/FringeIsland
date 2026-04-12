# The solo developer's complete guide to systematic web development

**You don't need a team to build like one.** A solo developer armed with AI coding agents, a clear process, and markdown files in a git repository can match the systematic rigor of a professional engineering organization. This guide covers the full lifecycle — from turning vague ideas into buildable specifications, to choosing the right agile methodology, to shipping and monitoring production software. It's designed for a junior developer building an edutainment web platform with Next.js, TypeScript, Tailwind CSS, and Supabase, but the principles apply broadly.

The core insight is this: **your process should start minimal and grow with you**. Begin with a markdown backlog and a Kanban board. Add structure only when you feel pain. The goal is never the process itself — it's shipping software that users love.

---

## From napkin sketch to buildable task: requirements engineering

Every piece of work in your project falls into one of three requirement categories, and understanding the distinction shapes every decision downstream.

**Functional requirements** define *what* the system does — "users can create accounts via OAuth," "the quiz engine displays randomized questions," "teachers view student progress dashboards." These drive your application architecture. **Non-functional requirements** (also called quality attributes) define *how well* the system performs — page load under 2 seconds, WCAG AA accessibility, 99.9% uptime. These must be specific and measurable, not vague ("the app should be fast"). NFRs drive your *technical* architecture. **Architectural requirements** bridge the gap: choosing Supabase Row-Level Security addresses your security NFR, choosing Next.js SSR/ISR addresses your performance NFR, choosing Tailwind addresses your maintainability NFR.

The relationship flows in one direction: functional requirements define features → NFRs constrain how those features perform → architectural requirements translate NFRs into technology decisions.

### The work item hierarchy you actually need

Requirements decompose into a hierarchy, but the practical advice from experienced practitioners is clear: **keep your hierarchy to two levels maximum** (epics → stories) to avoid spending more time classifying than understanding work. Here's the full taxonomy for reference, simplified for solo use:

| Level | What it is | Scope | Example |
|-------|-----------|-------|---------|
| **Theme** | A label grouping related work across functional areas | Cross-cutting | "Gamification" |
| **Epic** | A large body of work spanning weeks or months | Weeks–months | "Quiz Engine" |
| **Feature** | A shippable capability within an epic | Days–weeks | "Multiple Choice Quizzes" |
| **User Story** | The smallest unit of user value, completable in 1–3 days | 1–3 days | "As a student, I want to answer timed quiz questions" |
| **Task** | Technical work to implement a story | Hours | "Create QuizPlayer component" |

For your daily work, focus on **epics and stories**. Themes are just labels. Features are mid-level groupings useful when an epic is large. Tasks are what you break stories into when you sit down to build.

### Maturity levels: the pipeline from idea to code

Not all work items are born equal. A core concept that prevents premature building is **progressive elaboration** — work items start vague and get refined as they approach execution. Here's a practical maturity model:

| Level | Name | What you have | Example |
|-------|------|--------------|---------|
| 0 | **Raw idea** | One sentence | "Something with spaced repetition" |
| 1 | **Concept** | Problem identified, who benefits | "Students forget material. Spaced repetition could improve quiz retention." |
| 2 | **Explored** | Research done, approach sketched, assumptions listed | "Use SM-2 algorithm, store intervals in Supabase, surface due cards on dashboard" |
| 3 | **Specified** | User stories with acceptance criteria written | Full Given/When/Then scenarios |
| 4 | **Ready** | All questions answered, dependencies resolved, estimable | Can hand to Claude Code and start building |
| 5 | **Done** | Implemented, tested, deployed | Feature live in production |

**The critical discipline**: never jump from Level 0 to Level 4. The pipeline from Concept → Study → Specify → Build ensures you do the thinking before the building. This matters even more with AI coding agents — since agents execute faster, the quality of your specifications determines output quality. A well-written user story with BDD acceptance criteria becomes the perfect "prompt" for Claude Code.

### User stories that work as both specs and AI prompts

Every user story should pass the **INVEST criteria**: Independent (no unresolved blockers), Negotiable (describes intent, not rigid solution), Valuable (a user would notice), Estimable (you can roughly size it), Small (completable in 1–3 days), and Testable (has clear pass/fail criteria).

The enhanced template that works for both human understanding and AI agent delegation:

```markdown
## STORY: Take Multiple Choice Quiz
**Epic:** Quiz Engine

As a student,
I want to answer multiple-choice questions in a timed quiz,
So that I can test my knowledge and get immediate feedback.

### Acceptance Criteria
Scenario 1: Starting a quiz
  Given I am logged in as a student and navigate to an assigned quiz
  When I click "Start Quiz"
  Then I see the first question with 4 answer options
  And I see a countdown timer set to the quiz time limit

Scenario 2: Completing the quiz
  Given I have answered all questions
  When I click "Submit Quiz"
  Then I see my score as a percentage
  And I see which answers were correct/incorrect
  And my results are saved to my progress record

### Technical Notes
- Questions from Supabase quiz_questions table
- Client-side timer with server validation
- Store answers in local state, batch save on submit
```

The Given/When/Then format is directly translatable to test specifications. Your acceptance criteria become both human-readable documentation and machine-readable test specs.

### When BDD and TDD earn their keep

**BDD** (Behavior-Driven Development) uses that Given/When/Then syntax to express acceptance criteria as executable specifications. It's appropriate when acceptance criteria benefit from concrete examples, when multiple behaviors need specification, and when you want tests to serve as living documentation. It's **premature** for trivial requirements, highly exploratory work where you don't yet know what you're building, and pure technical tasks like refactoring.

**TDD** (Test-Driven Development) operates at the code level: write a failing test, write minimum code to pass, refactor. The relationship is hierarchical: user stories produce BDD acceptance criteria (behavioral tests), which inform TDD unit tests (implementation tests). For a solo developer with AI agents, write BDD-style acceptance criteria in your stories, then let those guide your test-writing — whether you write tests first (TDD) or after implementation (risk-based testing).

---

## The methodology that actually works for one person

After comparing Scrum, Kanban, Scrumban, and Shape Up, the clear recommendation for a solo developer with AI coding agents is a **"Shaped Personal Kanban" hybrid** — Personal Kanban's continuous flow for daily execution, combined with Shape Up's strategic shaping for longer-term direction.

### Why pure Scrum fails solo

The Scrum Guide requires a minimum of three developers. The role tension between Product Owner, Scrum Master, and Developer cannot be replicated by one person — you lose the checks-and-balances that make Scrum effective. Standups are meaningless. Sprint boundaries feel artificial when you're the only one working. The ceremony overhead — planning, review, retrospective every two weeks — eats into building time. That said, Scrum's *artifacts* (backlog, sprint goal, definition of done) remain valuable. Take the artifacts, skip the ceremony.

### Personal Kanban: the foundation

Jim Benson and Tonianne DeMaria Barry's *Personal Kanban* has just two rules: **visualize your work** and **limit your work-in-progress**. Start with a WIP limit of 3. This prevents cognitive overload and context-switching, which research consistently identifies as the primary productivity killer for solo developers.

Your board columns: **Ideas → Ready → Doing (WIP=3) → Review → Done**. Cycle time (start-to-done per item) is the primary metric. Track it, and within 4–6 weeks you'll have a reliable baseline for forecasting.

The cons are real: no built-in cadence for reflection means you must self-impose retrospectives, and without timeboxing, individual items can bloat indefinitely.

### Shape Up's strategic layer fills the gaps

Basecamp's Shape Up methodology introduces concepts that solve Kanban's weaknesses. **Appetite** flips estimation on its head: instead of asking "how long will this take?" you ask "how much time is this worth?" This is fundamentally different and far more useful for a solo developer making prioritization decisions.

**Fixed time, variable scope** means you set a timebox (e.g., 3 weeks) and cut scope to fit, rather than extending deadlines. Shape Up's **shaping phase** forces strategic thinking before building — you define the problem, sketch a rough solution, identify rabbit holes and explicit no-gos. This prevents building the wrong thing, which is the single biggest risk for a solo developer.

Adapt Shape Up's 6-week cycles to **3-week build cycles with 1-week cooldown**. During cooldown: fix bugs, address tech debt, explore new ideas, process user feedback. This prevents burnout and creates natural reflection points.

### The hybrid in practice

**Strategic layer (Shape Up-inspired, at cycle boundaries):**
- Shape 1–2 "bets" using the pitch format: Problem → Appetite → Solution sketch → Rabbit holes → No-gos
- Fixed time, variable scope — if it doesn't ship in 3 weeks, scope-hammer or kill it

**Tactical layer (Personal Kanban, daily):**
- Board: Ideas | Shaped | Ready | Doing (WIP=3) | Review | Done
- Pull system: only start new work when current items move to Done
- Separate mental swim lane for work delegated to AI agents

**Daily practice (8 minutes total):**
- Morning (5 min): journal entry — what's the #1 thing to ship today? Any blockers? What can I delegate to AI?
- End of day (3 min): log what was accomplished, decisions made, open questions

**Weekly practice (30 min Friday):**
- Three Ls retrospective: **Liked** (what went well), **Learned** (new knowledge), **Lacked** (what was missing)
- Review cycle time trends and throughput
- Reprioritize Ready column

**Metrics that matter for solo developers:**

- **Cycle time** per item (primary — measures throughput efficiency)
- **Throughput**: items completed per week, split by type
- **Deployment frequency** (aim for 2–3x per week)
- **WIP count** (if consistently exceeding limit, you're context-switching too much)

Avoid story points for solo work — the overhead isn't justified. Simply count completed items and track cycle time. Use **throughput for forecasting**: "I complete ~5 items/week, my backlog has 20 items, so ~4 weeks."

---

## Product vision, roadmaps, and knowing what to build next

### The NOW/NEXT/LATER roadmap is your best friend

Invented by Janna Bastow of ProdPad, this format organizes work into three time horizons without specific dates. **NOW** contains validated initiatives currently in progress, fully specified. **NEXT** holds items in or pending discovery — important but not yet started. **LATER** captures long-term priorities where scope is undefined. Organize by problems to solve, not specific features: "Improve learner retention" rather than "Add streak counter."

This format matches the reality of solo development — you can't predict timelines precisely, and you need flexibility to pivot based on learning. Complement it with **milestones** as motivational checkpoints: "MVP launch," "First 10 beta users," "Retention baseline established."

### The one-page PRD

For major features, write a lightweight Product Requirements Document. The most powerful section across elite PRD templates (from Square, Basecamp, Intercom) is **explicit non-goals** — defining what you *won't* do prevents scope creep:

```markdown
# PRD: Quiz Engine
**Status:** In Progress  |  **Updated:** 2026-04-07

## Problem
Learners need engaging self-assessment with immediate feedback.
Current alternatives feel like traditional tests and lack gamification.

## Goal & Success Metrics
- Goal: Users complete >60% of started quizzes
- Key metric: Average session time >5 minutes

## User Stories
1. As a learner, I want timed questions so I feel challenged
2. As a learner, I want immediate answer feedback
3. As a content creator, I want to create quizzes with multiple question types

## In Scope (v1)
- Multiple choice, timer, scoring, results display

## Out of Scope (v1)
- Multiplayer quizzes, AI question generation, adaptive difficulty

## Open Questions
- Should wrong answers deduct points?
```

Spend more time on the problem statement than feels comfortable. The biggest product mistake is jumping to solutions too soon.

### Discovery without a team

**Dual-Track Agile** runs discovery (deciding what to build) in parallel with delivery (building it). As a solo developer, this becomes mental mode-switching: spend **70/30 discovery/delivery** early in a cycle, then flip to **20/80** during build phases.

**Teresa Torres's Opportunity Solution Tree** is the leading modern framework for continuous product discovery. Map a desired outcome (e.g., "Increase weekly active learners by 20%") → opportunities from real user needs → multiple potential solutions for each opportunity → assumption tests for each solution. Even without a team, this prevents you from chasing features that don't map to real user problems.

For user research on a zero budget, mine competitor app reviews (users are brutally honest on the App Store and Reddit), run **guerrilla usability tests** with 5 people (Jakob Nielsen proved this catches ~80% of major problems), and set up analytics from day one. Teresa Torres recommends talking to at least one user per week — even a 5-minute Zoom call builds continuous discovery muscle.

### Hypothesis-driven development

Instead of building features on assumptions, frame every piece of work as an experiment:

> "We believe that adding a daily streak counter for returning learners will increase the DAU/MAU ratio from 0.2 to 0.23 within 30 days."

This template — **we believe [action] for [users] will achieve [outcome], verified by [metric]** — forces clarity about what you're testing and how you'll know if it worked. Use feature flags to progressively expose experiments, and always define success criteria before you build.

---

## Organizing your backlog and defining "ready" and "done"

### Four backlogs, simplified

A solo developer needs four conceptual containers, though they can live in a single markdown file:

- **Discovery Backlog**: Ideas to investigate, hypotheses to test, research spikes (Levels 0–2)
- **Product Backlog**: Refined and ordered work, progressively elaborated (Levels 2–4)
- **Current Cycle**: What you're building right now (Level 4, pulled into active work)
- **Icebox**: Parked ideas. If an item sits here for 6 months and you haven't missed it, delete it.

Reserve **15–20% of each cycle's capacity for technical debt**. Track debt items in the same backlog as features, tagged distinctly. Classify by type (code, infrastructure, design, test, documentation) and prioritize using an impact/effort ratio.

### Definition of Ready — your quality gate before building

A story is ready to build when it passes this checklist:

- User story follows "As a… I want… So that…" format
- Value/purpose is clear (you know WHY you're building this)
- Acceptance criteria defined with Given/When/Then scenarios
- Story is independent (no unresolved blockers)
- Story is small enough (completable in 1–3 days)
- UI/UX approach is sketched or decided
- Data model implications understood
- Edge cases and error states identified
- No unresolved open questions

**The DoR is what prevents you from handing vague work to an AI agent.** If a story doesn't pass the DoR, it needs more discovery, not more coding.

### Definition of Done — your quality gate after building

```
CODE: Implements all acceptance criteria, passes ESLint/TypeScript, 
      self-documenting with clear naming
TESTING: Key logic unit-tested, acceptance criteria verified, 
         edge cases tested, mobile responsive
SECURITY: Supabase RLS policies applied, input validated, 
          no sensitive data exposed to client
DEPLOYMENT: Builds without errors, migrations applied, 
            deployed to preview and verified
DOCUMENTATION: README updated if needed, complex decisions documented
```

**Key distinction**: DoD defines universal quality standards (applies to ALL work). Acceptance criteria define functional requirements (specific to each story). Both must be met.

---

## Your project as markdown files in git

### The recommended folder structure

```
project-root/
├── .claude/
│   └── commands/           # Custom Claude Code slash commands
│       ├── plan.md         # "Research and plan a feature"
│       └── sprint-plan.md  # "Plan next sprint from backlog"
├── docs/
│   ├── planning/
│   │   ├── roadmap.md      # NOW/NEXT/LATER product roadmap
│   │   ├── backlog.md      # Full product backlog
│   │   └── prd-quiz.md     # PRDs for major features
│   ├── decisions/          # Architecture Decision Records
│   │   ├── 0001-use-nextjs-app-router.md
│   │   ├── 0002-choose-supabase.md
│   │   └── template.md
│   ├── sprints/
│   │   ├── sprint-current.md
│   │   └── sprint-2026-03-24.md
│   └── research/           # AI-generated research artifacts
│       └── research-auth-flow.md
├── CLAUDE.md               # AI agent project context (read automatically)
├── CHANGELOG.md            # Keep a Changelog format
├── README.md
└── src/                    # Application source code
```

**Design principles**: `docs/planning/` holds living documents that evolve. `docs/decisions/` holds immutable records (ADRs never get edited, only superseded). `docs/sprints/` holds time-boxed iteration files. `CLAUDE.md` at the root gives AI agents automatic project context.

### File naming conventions

Use **kebab-case** for all files. Date-prefix time-bound documents (`sprint-2026-04-07.md`). Number ADRs sequentially (`0003-use-tailwind.md`). ID-prefix work items if using individual files (`STORY-042-user-profile.md`). For most solo projects, keeping all stories inline in `backlog.md` is simpler than individual files.

### Linking code and planning documents

**Branch naming**: `feature/STORY-042-user-profile`, `bugfix/BUG-017-timer-overflow`, `spike/SPIKE-005-realtime`

**Conventional commits**: `feat(quiz): add multiple choice component [STORY-038]` — the type prefix enables automated changelog generation, and the story ID creates traceability.

**Cross-references**: In planning docs, link to implementation files and PRs. In code comments, reference the relevant ADR or PRD section. In your changelog, reference story IDs. This web of references means any artifact can be traced to its origin.

### The AI agent workflow that leverages markdown

The most effective pattern for Claude Code follows a **Research → Plan → Annotate → Implement** cycle:

1. Ask the agent to research relevant code and write findings to `docs/research/research-feature.md`
2. Request a detailed implementation plan with code snippets in `docs/research/plan-feature.md`
3. Review the plan, add inline annotations in your editor, then tell the agent: "I added notes, address them and update the plan. Don't implement yet."
4. Once the plan is solid, instruct: "Implement it all. Mark tasks as completed in the plan document."

The markdown file serves as **shared mutable state** between you and the AI — a structured specification that both can read and modify. The key guard phrase is "don't implement yet," which prevents agents from jumping to code before you've approved the approach.

Store custom slash commands in `.claude/commands/` to automate this workflow. A `plan.md` command can instruct the agent to read the codebase, research the feature, and produce both a research document and an implementation plan.

### What markdown can and can't replace

Markdown uniquely offers **version history** for every planning change, **diffs** showing exactly what shifted, **co-location with code** (no context-switching), **AI readability** (agents can read and write planning docs directly), and **zero vendor lock-in**. It cannot easily replicate dynamic filtering, real-time dashboards, drag-and-drop kanban, or automatic rollup calculations. For those, tools like GitHub Projects (free, integrates with your repo), Linear (keyboard-first, developer-focused), or Notion (flexible databases) each have strengths. But for a solo developer, markdown-in-git provides 80% of the value at 0% of the cost.

---

## Testing, shipping, and watching it run

### The testing trophy for Next.js and Supabase

Kent C. Dodds's Testing Trophy prioritizes tests by return on investment rather than the traditional pyramid. For your stack:

**Static analysis (base layer)**: TypeScript strict mode + ESLint + Prettier. You get this essentially free, and it catches the largest class of bugs. **Integration tests (largest layer)**: "Write tests. Not too many. Mostly integration." Test components with their dependencies, API routes with database calls. Use **Vitest + React Testing Library**. **E2E tests (critical paths)**: Test signup → onboard → core feature flows in a real browser with **Playwright**. **Database tests**: Test Supabase RLS policies with **pgTAP** via `supabase test db` — this is critical and unique to Supabase.

Important Next.js caveat: Vitest cannot test async Server Components. Use Playwright for those; use Vitest for synchronous components and pure logic.

**When to test (risk-based approach)**: Always test authentication, payment logic, RLS policies, and data mutations. Integration-test API routes and critical user flows. E2E-test the signup-to-core-feature path. Skip testing purely presentational components and prototype features. This approach maximizes confidence per minute of testing effort.

### CI/CD pipeline for solo developers

Deploy to **Vercel** (zero-config for Next.js, automatic preview deployments on every PR, free tier generous for solo projects). Run **GitHub Actions** for CI:

```yaml
# Parallel jobs: lint + type-check, unit tests, database tests
# Then: E2E tests (only if above pass)
# Then: Vercel handles deployment automatically
```

Automate versioning with **semantic-release** + conventional commits: every merge to main automatically bumps the version, generates changelog entries, and creates a GitHub release. Use **Dependabot** for automated dependency updates. Gate deployments behind passing tests — the `needs` keyword ensures deploy only runs if everything's green.

### Architecture Decision Records

ADRs capture the **why** behind decisions — something you'll forget in 3 months. Use the MADR format in `docs/decisions/`:

```markdown
# ADR-0003: Use Supabase for Authentication
**Status:** Accepted (2026-01-15)

## Context
We need auth with social login and RLS integration for the edutainment platform.

## Decision
Supabase Auth — integrates natively with RLS, eliminates separate auth service.

## Consequences
- Good: Zero additional infrastructure, native RLS, AI-friendly API
- Bad: Vendor lock-in, less flexibility than NextAuth for custom flows
```

Write an ADR when choosing a major library, deciding on data model structure, selecting deployment platform, or making any decision you'd need to explain to future-you.

### Monitoring after launch

**Error tracking**: Sentry with `@sentry/nextjs` — real-time error notifications, performance monitoring, session replay. Set `tracesSampleRate: 0.2` for cost-effective monitoring. **Uptime**: Pulsetic or Better Stack pinging your `/health` endpoint every 60 seconds. **Analytics**: Vercel Analytics (built-in, privacy-friendly) or PostHog (product analytics with funnels, session recording, generous free tier). This three-layer stack costs $0 on free tiers and catches the vast majority of production issues.

For user feedback, add an in-app feedback widget, trigger one-question surveys after key actions (completing a lesson, finishing a quiz), and maintain a weekly 30-minute review of all incoming feedback.

---

## Growing the process without drowning in it

### Start minimal, add only when you feel pain

The concept of **process debt** — workflows that no longer reflect how you actually work, stale backlog items, ceremonies you do "because you should" — is real and insidious. The antidote is simple: start with the minimum viable process and add structure only when its absence causes problems.

**Phase 1 (Weeks 1–4)**: Single markdown backlog, basic git workflow, CLAUDE.md file. That's it.

**Phase 2 (Months 2–3)**: Add sprint cycles, conventional commits, a `PROCESS.md` documenting your workflow.

**Phase 3 (Months 3–6)**: CI/CD pipeline, automated testing, Sentry monitoring, first ADRs.

**Phase 4 (Month 6+)**: Automated versioning, feedback loops, metrics tracking, quarterly process audits.

Move through phases only when the previous one feels natural and automatic. **Process should serve you, never the other way around.**

### Solo retrospectives that drive real change

The **Three Ls framework** works best for solo developers: every Friday, spend 15–30 minutes on what you **Liked** (went well), **Learned** (new insights), and **Lacked** (was missing or held you back). Then pick **1–3 concrete, actionable improvements** for next week. Track whether you actually implement them. A retrospective without follow-through is just journaling.

Quarterly, run a deeper **process audit**: Which parts of your process do you skip or dread? (Remove or simplify them.) Where do you keep making the same mistakes? (Add automation or a checklist.) What manual steps could be automated? Are your docs up to date?

### The process maturity checklist

```
□ Phase 1: Git + markdown backlog + CLAUDE.md
□ Phase 2: Conventional commits + sprint cycles + retrospectives  
□ Phase 3: CI/CD + automated tests + monitoring + ADRs
□ Phase 4: Automated versioning + feedback loops + metrics
□ Phase 5: Hypothesis-driven development + continuous discovery
```

Each phase builds on the last. Skip none. Rush none.

---

## Conclusion: the system that grows with you

The most important insight across all eight areas of this guide is that **systematic development is not about heavyweight process — it's about making the right decisions visible and traceable**. A markdown file with well-written user stories and acceptance criteria is worth more than any project management tool subscription. A Definition of Ready that prevents you from handing vague work to an AI agent is worth more than velocity tracking. A 15-minute Friday retrospective that produces one actionable improvement is worth more than a two-hour sprint ceremony.

Three practices deliver outsized returns from day one: **write acceptance criteria in Given/When/Then format** (they serve as specs, tests, and AI prompts simultaneously), **use conventional commits** (zero ongoing cost, enables automated changelogs and versioning), and **write ADRs for major decisions** (5 minutes now saves hours of "why did I do this?" later).

The emergence of AI coding agents like Claude Code shifts the solo developer's role from writing code to **orchestrating work** — decomposing problems, shaping specifications, reviewing output, and making architectural decisions. This makes the discovery and specification phases more important, not less. The pipeline from vague idea → explored concept → specified story → ready-to-build task is the conveyor belt that feeds your AI agents high-quality work. Invest in that pipeline, and the building takes care of itself.