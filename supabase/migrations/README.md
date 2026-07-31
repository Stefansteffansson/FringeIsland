# Migration guidelines

**Created at COR-C W7/W8 (Audit III GC-2 + AC3-O3, 2026-07-31).** These rows
are the schema-gate review checklist for every new migration. GC-2's finding:
one-off corrective DML crossing owner boundaries is compliant in migration
scope but structurally ungated — no mechanical check can price it, so the
review checklist carries it.

## Review checklist (every migration PR)

1. **Ownership stated in the header.** Which service's substrate does this
   migration touch, and under what authority (FEAT/ADR/board-row citation)?
   The ownership manifest (`../ownership.manifest.json`) must agree — a new
   table or function fails the conformance suites until classified there
   (tables AND functions; CORE is declared, never defaulted — GC-1).
2. **Corrective DML is self-verifying (the `20260728190000` pattern).** A data
   fix must assert its own effect and abort loudly on surprise:

   ```sql
   DO $$
   DECLARE v_n integer;
   BEGIN
     UPDATE ... ;
     GET DIAGNOSTICS v_n = ROW_COUNT;
     IF v_n <> 1 THEN
       RAISE EXCEPTION 'expected 1 row, got %', v_n;
     END IF;
   END $$;
   ```

   A silent `UPDATE` that hits zero rows (or all of them) reads as success in
   the apply log — that silence is how the W1 no-op window stayed invisible.
3. **Cross-owner DML names its license.** One-off corrective writes across an
   ownership boundary are migration-scope-legitimate, but the header must say
   whose data is being corrected and why this migration may.
4. **Function re-issues carry their gates.** `CREATE OR REPLACE` preserves
   ACLs — say so, or re-assert grants at source (the `20260721220000`
   reproducibility lesson). `DROP FUNCTION` + `CREATE` loses them — re-issue
   REVOKE/GRANT explicitly.
5. **Trigger mounts on foreign tables need canon.** A DS-owned function
   mounted on a table its service does not own must carry a manifest
   `exceptions.triggerMounts` license citing an ADR (GC-8 /
   ADR-U048 Amendment 1) — the gate fails red otherwise.
6. **Schema-gate posture.** Function-body or RLS changes ride a HELD PR: red
   test demonstrated at HEAD + apply commands in the body; merge only on an
   explicitly named approval.
