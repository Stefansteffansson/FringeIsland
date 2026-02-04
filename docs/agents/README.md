# Agent Contexts

**Purpose:** Provide focused, minimal context for AI agents working on specific domains

**Last Updated:** February 4, 2026

---

## 🎯 What Are Agent Contexts?

Agent contexts are **curated documentation packages** that contain only the information needed for a specific type of work. This helps AI assistants:

- **Load faster** - Only relevant information
- **Focus better** - No distraction from unrelated code
- **Work smarter** - Pre-filtered context for the task
- **Stay under token limits** - Minimal, focused content

---

## 📋 Available Contexts

### [database-agent.md](./contexts/database-agent.md)
**For:** Database schema changes, migrations, RLS policies
**Includes:** Schema overview, migration patterns, RLS guidelines, Supabase patterns
**Skip:** UI components, styling, frontend logic

### [ui-agent.md](./contexts/ui-agent.md)
**For:** UI components, styling, user experience
**Includes:** Component patterns, Tailwind conventions, UX guidelines, modal patterns
**Skip:** Database schema, backend logic, migrations

### [feature-agent.md](./contexts/feature-agent.md)
**For:** Implementing new features end-to-end
**Includes:** Full-stack patterns, feature workflow, testing guidelines, documentation requirements
**Skip:** Deep implementation details (load specific docs as needed)

---

## 🚀 How to Use Agent Contexts

### For AI Assistants

**Starting a database task:**
```
"Read docs/agents/contexts/database-agent.md, then help me add a new table for notifications."
```

**Starting a UI task:**
```
"Read docs/agents/contexts/ui-agent.md, then help me create a modal for confirming deletion."
```

**Starting a feature:**
```
"Read docs/agents/contexts/feature-agent.md, then help me implement the messaging system."
```

### For Humans

Use agent contexts to:
- Understand what domain-specific context an AI needs
- Review key patterns before assigning work
- Onboard new team members faster

---

## 📐 Context Design Principles

**Each agent context should:**

1. **Be focused** - One domain, one purpose
2. **Be complete** - Everything needed for that domain
3. **Be minimal** - Nothing extra
4. **Reference other docs** - Don't duplicate, link instead
5. **Include examples** - Show don't tell

**Token Budget:**
- Target: ~5,000-10,000 tokens per context
- Leave room for actual code/files
- Link to detailed docs rather than including full text

---

## 🔧 Creating New Agent Contexts

### When to Create a New Context

Create a new agent context when:
- A new domain emerges (e.g., "API-agent" for external APIs)
- An existing context grows too large (split it)
- A specialized workflow needs unique context (e.g., "migration-agent")

### Template Structure

```markdown
# [Domain] Agent Context

**Purpose:** [One-line description]
**For:** [Types of tasks]
**Last Updated:** [Date]

---

## Quick Reference

[Key information in bullet points]

---

## Essential Patterns

[Code patterns specific to this domain]

---

## Related Documentation

[Links to detailed docs]

---

## Common Tasks

[Step-by-step for frequent operations]
```

---

## 🎓 Learning Path

**New to the project?**
1. Read `PROJECT_STATUS.md` (current state)
2. Read `CLAUDE.md` (technical patterns)
3. Choose your domain:
   - Database work → database-agent.md
   - UI work → ui-agent.md
   - Feature work → feature-agent.md
4. Load relevant feature docs from `docs/features/`

---

## 📊 Context Usage Guidelines

### For Database Work
- **Always load:** database-agent.md
- **Usually load:** schema-overview.md, migrations-log.md
- **Sometimes load:** Specific feature docs if touching feature data
- **Rarely load:** UI components, frontend code

### For UI Work
- **Always load:** ui-agent.md
- **Usually load:** Relevant feature docs from features/implemented/
- **Sometimes load:** Database schema if querying data
- **Rarely load:** Migration files, backend logic

### For Feature Work
- **Always load:** feature-agent.md, CLAUDE.md
- **Usually load:** Relevant existing feature docs
- **Sometimes load:** database-agent.md OR ui-agent.md (depending on focus)
- **Rarely load:** Everything at once (too much context)

---

## 🔄 Keeping Contexts Updated

**Update agent contexts when:**
- New patterns emerge (e.g., new modal pattern)
- Technology changes (e.g., Next.js upgrade)
- Common mistakes identified (add to guidelines)
- New tools added (e.g., new database library)

**Don't update for:**
- Individual feature implementations (those go in features/)
- Project-specific details (those go in CLAUDE.md)
- Temporary workarounds (document those separately)

---

## 💡 Tips for Effective Context Use

### Do's
- ✅ Load the right context for your task
- ✅ Reference other docs when you need more detail
- ✅ Follow patterns shown in the context
- ✅ Update the context if you discover better patterns

### Don'ts
- ❌ Load all contexts at once (context overload)
- ❌ Skip contexts and load entire codebase (inefficient)
- ❌ Ignore patterns in favor of custom approaches (consistency matters)
- ❌ Let contexts become outdated (maintain them)

---

## 📚 Related Documentation

- **Main technical reference:** `CLAUDE.md`
- **Current project state:** `PROJECT_STATUS.md`
- **Feature docs:** `docs/features/`
- **Database docs:** `docs/database/`
- **Architecture docs:** `docs/architecture/`

---

## 🤝 Contributing

When you use an agent context and discover:
- **Missing information:** Add it
- **Outdated information:** Update it
- **Confusing information:** Clarify it
- **Wrong information:** Fix it

Keep contexts **lean**, **accurate**, and **helpful**.

---

**Agent contexts are living documents. Improve them as you use them.**
