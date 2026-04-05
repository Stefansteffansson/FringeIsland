# Row Level Security (RLS) Policies

**Database:** PostgreSQL via Supabase
**Last Updated:** February 4, 2026

For complete RLS policy details, see `docs/architecture/AUTHORIZATION.md`.

This document provides a quick reference for RLS policies.

---

## 🔒 Overview

**RLS Status:** Enabled on all tables
**Purpose:** Enforce authorization at database level

---

## Quick Reference

See `docs/architecture/AUTHORIZATION.md` for full policy documentation.

**Key Principles:**
- Users see only their own data
- Group members see their group data
- Leaders can manage their groups
- Public groups visible to all
- Last leader protection via trigger

---

**For detailed policy documentation, see:** `docs/architecture/AUTHORIZATION.md`
