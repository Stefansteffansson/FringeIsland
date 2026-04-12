# Deferral Protocol

> **⚠ REVIEW NEEDED (migrated 2026-04-12):** This file was migrated from `old_universe/processes/`. File paths and format predate the new planning structure. Stefan wants to challenge what should be brought forward into our new way of working. Review alongside PROCESS.md update.

**Version:** 1.0
**Last Updated:** April 5, 2026
**Purpose:** Ensures deferred work items don't fall between products. Every deferral requires acceptance by the receiving product.

---

## Principle

A deferral is not complete until the receiver has triaged it. Untriaged deferrals are visible as `Status: Proposed` — easy to filter and track.

---

## Deferral States

| State | Meaning |
|-------|---------|
| **Proposed** | Sender has deferred the item, receiver has not yet triaged it |
| **Accepted** | Receiver has reviewed and placed the item in their spec, requirements, research, or roadmap |
| **Re-deferred** | Receiver has deferred the item further (to a later wave) |
| **Rejected** | Receiver says "this doesn't belong to us either" — item moves to cross-wave OPEN_QUESTIONS.md |

---

## Workflow

### Step 1: Sender creates deferral

Add entry to sender's `DEFERRED.md` with status **Proposed**:

```markdown
### DF-XXX: [Item Title]
**Status:** Proposed → [receiving product]
**Deferred:** [date]
**Deferred to:** [product/wave]
**Accepted:** —
**Reason:** [why this was deferred]
```

### Step 2: Receiver gets notified

Add a triage item to receiver's `RESEARCH.md`:

```markdown
### RQ-X-XXX: Triage deferred item DF-XXX — [Item Title]
**Status:** Open
**Raised:** [date]
**Blocks:** [what can't proceed without this decision]
**Context:** Deferred from [sender]. See [sender]/planning/DEFERRED.md DF-XXX.
```

### Step 3: Receiver triages

During planning/spec sessions, the receiver reviews and decides:

- **Accept** — Place item in receiver's spec, requirements, or roadmap. Update sender's deferral entry:
  ```markdown
  **Status:** Accepted by [receiver]
  **Accepted:** [date] → [receiver] [location, e.g. REQUIREMENTS.md FR-L3-XXX]
  ```

- **Re-defer** — Receiver creates own DEFERRED.md entry, updates sender's entry:
  ```markdown
  **Status:** Re-deferred by [receiver] → [next wave]
  **Accepted:** [date] → See [receiver]/planning/DEFERRED.md DF-XXX
  ```

- **Reject** — Item has no clear owner. Move to ecosystem open questions:
  ```markdown
  **Status:** Rejected by [receiver] → OPEN_QUESTIONS.md OQ-XXX
  **Accepted:** [date] → Unowned, needs strategic decision
  ```

---

## File Locations

Each product maintains its own DEFERRED.md:

```
docs/old_products/ferd/planning/DEFERRED.md     — Ferd's deferrals
docs/old_products/hamn/planning/DEFERRED.md     — Hamn's deferrals
```

The entry lives where the *decision to defer* was made, not where the work eventually lands.

---

## Key Rules

1. **A deferral is not done until accepted.** `Status: Proposed` items require follow-up.
2. **The sender documents why.** The `Reason` field prevents re-litigating decisions.
3. **The receiver decides where it goes.** Acceptance means placement, not just acknowledgment.
4. **Rejected items are not lost.** They surface in OPEN_QUESTIONS.md for strategic resolution.
5. **Review periodically.** During planning sessions, filter for `Proposed` items and triage them.

---

## Related

- [Planning Protocol](./PLANNING_PROTOCOL.md)
- [Process](./PROCESS.md)
