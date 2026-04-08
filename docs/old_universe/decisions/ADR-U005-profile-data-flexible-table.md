# ADR-005 — L1 Identity — profile_data as a separate flexible table

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
The member profile needs to accumulate dynamic data from multiple sources over time: assessment results from L3 journeys, reflections from L4 content, insights from L7 Intelligence, self-defined intentions. The question was how to store this flexible, growing data.

**Decision:**
A separate `profile_data` table with a bucket/source model. Buckets are data, not schema. New data types (new buckets) are added by inserting records with a new `bucket` value — no migration required.

```sql
profile_data (
  id, user_id, bucket, source, source_id, content (jsonb), visibility, created_at
)
```

**Why not JSONB on the profile record:**
Fixed JSONB fields on the profile record lock the schema at the field level. Adding a new data category means a migration touching every profile record. The profile_data table approach makes the schema the container — the content (bucket types) is data, not schema.

**Why not separate tables per data type:**
A table per data type (assessments_data, reflections_data, insights_data) would require a new migration for every new type. More importantly, it makes querying a member's complete portrait across all data types more complex, not less.

**Performance:**
This pattern is standard and battle-tested. A typical active member accumulates hundreds of rows over years of engagement — trivially fast with proper indexes. Required indexes: `(user_id)`, `(user_id, bucket)`, `(source, source_id)`, `(user_id, visibility)`.

**Alternatives considered:**
- *JSONB fields on profile record* — rejected (see above)
- *Separate tables per data type* — rejected (see above)
- *EAV (Entity-Attribute-Value) pattern* — essentially what profile_data is, but with JSONB content for flexibility within each bucket
