# Authentication

**Wave:** Ferd
**Category:** Authentication
**Status:** 🟡 Needs study

---

## What Is This

The authentication system governs how visitors and members interact with the
FringeIsland platform in terms of identity and access. It covers the full
lifecycle of a member's relationship with the platform from first visit to departure.

---

## Why We Are Building This

Authentication is the entry point to the entire platform. It must be secure,
clear and trustworthy. Members need to feel safe and in control of their identity
on FringeIsland from the very first interaction.

---

## How It Is Supposed to Work

### Visitor (not yet a member)
- Can access the platform in a limited, unauthenticated state
- Experiences are designed to invite but not require membership

### Member lifecycle
| Action | Description |
|--------|-------------|
| **Sign up** | A visitor becomes a member — creates identity on the platform |
| **Sign in** | A returning member authenticates and enters the platform |
| **Sign out** | A member ends their session but retains their account |
| **Leave platform** | A member permanently removes themselves and their data |

---

## Open Questions

- [ ] What authentication provider(s) are we using — Supabase Auth, third-party OAuth, or both?
- [ ] What sign-up methods are supported — email/password, magic link, social OAuth?
- [ ] What does the visitor experience look like — what can a visitor see and do?
- [ ] What is the exact data deletion behaviour when a member leaves the platform?
- [ ] How does "leave platform" interact with group memberships, journey data and journal entries?
- [ ] Are there any grace periods or reversibility windows for leaving the platform?
- [ ] How does authentication interact with the API ring — where is the auth check enforced?
- [ ] What session management approach is used — JWT, session tokens, cookie-based?
- [ ] How does multi-language support affect authentication UI?

---

*Status: 🟡 Needs study*
