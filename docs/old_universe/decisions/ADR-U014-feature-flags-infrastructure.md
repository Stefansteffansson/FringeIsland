# ADR-014 — Feature flags in L0 Infrastructure

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland uses a vibe coding methodology — building with AI assistance in rapid sessions. Features are often built and tested before they are ready for all members. The transition from Ferd to Hamn requires new experiences to be deployed but not yet visible.

**Decision:**
Feature flags live in L0 as a simple database configuration table. A helper function reads flag state. Features can be deployed to production but remain invisible until the flag is enabled.

**Why L0:**
Feature flags are infrastructure — they are read before any application logic executes. They live closest to the ground.

**Why database over environment variables:**
Environment variables require a redeploy to change. A database flag can be toggled without deployment — enabling or disabling features for specific users, groups or environments in real time.
