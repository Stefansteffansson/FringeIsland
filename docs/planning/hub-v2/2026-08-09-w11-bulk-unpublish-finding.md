# W-11 — withdrawing an offer has no bulk door, and "all groups" does not mean all

**Found by Stefan, 2026-08-09**, on the live surface: `Walk Greeter` published to **14 named
groups**, and the only way back is fourteen individual **Unpublish** clicks.

This is the eleventh RD-B walk finding and the first found after the walk script ended.

---

## Half one — no bulk withdraw for named reach (Hub-only fix)

`AdminRoleTemplateDetail.tsx` offers a bulk withdraw **only** when the reach is
platform-wide:

```tsx
{reachIsAll ? <button>Unpublish from all groups</button>
            : <>Publish to all groups / Publish to specific groups…</>}
```

So a template published to N named groups has N per-row Unpublish buttons and nothing
else. Publishing to fourteen groups takes one ceremony; withdrawing takes fourteen.

**This needs no substrate change.** `admin_unpublish_role_template(p_role_template_id,
p_group_ids)` already accepts a list, and the surface already holds every published
group's id — the reach list it renders *is* that list. Passing all of them is one call.

## Half two — "Unpublish from all groups" does not clear named rows

The contract's delete predicate (`20260807090000:345-352`):

```sql
delete from public.role_template_publications pub
 where pub.role_template_id = p_role_template_id
   and ((p_group_ids is null     and pub.group_id is null)
     or (p_group_ids is not null and pub.group_id = any(p_group_ids)))
```

`p_group_ids => null` removes **only the platform-wide row**. It is not "remove
everything".

And the two kinds of row genuinely coexist: publishing platform-wide deliberately does not
delete targeted rows (RDB-6 — reach survives so an unretire restores what existed). So a
template published platform-wide **and** to three named groups, after clicking *"Unpublish
from all groups"*, is still offered to those three. The button's label promises more than
the contract delivers.

**Nobody has hit this yet** — it needs both kinds of row at once, which the walk did not
produce. It is a latent wrong-label, not an observed failure.

---

## Why half two is a decision, not a fix

Three shapes, and none is free:

| Option | Cost | Objection |
|---|---|---|
| **A. Surface calls unpublish twice** (null, then the named ids) | No migration | Two calls, not transactional. A partial failure leaves reach half-withdrawn. Recoverable — unpublish is idempotent and the reach list repaints — but it puts a multi-step mutation in the BFF, which ADR-U038 asks to be justified rather than assumed |
| **B. Widen the contract** so `p_group_ids => null` means *all reach* | Migration + gate | **Changes shipped semantics.** PC028's own cells assert the current behaviour, so they would need adapting — exactly the "migration that changes shipped semantics must name the sibling assertions it invalidates" rule |
| **C. New contract** `admin_unpublish_all_role_template_reach(p_role_template_id)` | Migration + gate | Additive, no semantic change, transactional in one call. A fourth publication verb to keep coherent |

**My recommendation: C**, and relabel the existing button so it stops over-promising in the
meantime. C keeps `admin_unpublish_role_template`'s meaning intact — which matters because
"withdraw exactly this reach" is a real and separate act — while giving "stop offering this
entirely" its own honest door. B is the tempting one and is the trap: it silently changes
what an existing call does.

## BUILT 2026-08-09 — on Stefan's second ask

I first recorded both halves and built neither, because shipping half one alone would
leave a button labelled *"all groups"* that still meant *"the platform-wide row"* — the
same class of defect as W-8's *"your group"*.

**Stefan asked twice, which settles it.** His point is decisive on its own terms: an admin
cannot tick hundreds of boxes to undo a publish that reached hundreds of groups. The
asymmetry — one ceremony to publish, N clicks to withdraw — is the defect, and holding the
fix behind a semantics ruling was the wrong trade.

**Built without a migration, by making the mislabel impossible instead of ruling on it.**
Each label now states its own scope, so no button can promise more than it delivers:

| Reach | Label | Calls |
|---|---|---|
| N named groups | *"Unpublish from all N groups"* | one, with the N ids |
| platform-wide only | *"Unpublish from all groups"* | one, with `null` |
| both | *"Stop offering this template"* | two — the named ids, then `null` |

Option **C** (a new `admin_unpublish_all_role_template_reach` contract) is still the
tidier long-term shape and remains open; this closes the user-facing defect now without
spending a gate, and without changing any shipped contract's meaning.

**The honest-report rule carried into it.** Both calls are idempotent, so a partial failure
is recoverable rather than corrupting — and the outcome is read from a **fresh repaint**,
never from what was attempted. A withdrawal that does not fully land says *"Not fully
withdrawn — N publications still offered"* instead of a green success it did not earn.
That is pinned by its own cell.
