# Internationalisation (i18n)

**Wave:** Ferd
**Category:** Internationalisation
**Status:** 🟡 Needs study

---

## What Is This

Multi-language support for the FringeIsland platform — enabling the interface
and platform-managed content to be presented in multiple languages.

---

## Why We Are Building This

FringeIsland is intended for a global audience. Building i18n into the foundation
in Ferd avoids the significant cost and rework of retrofitting it later.

---

## How It Is Supposed to Work

- The platform UI is available in multiple languages
- A member can select their preferred language
- Platform-managed strings (UI labels, system messages, notifications) are translated
- User-generated content (forum posts, journal entries, messages) is not translated — members write in their own language

---

## Open Questions

- [ ] What languages are in scope for Ferd — English only to start, or Swedish and English?
- [ ] What i18n library/framework is being used — next-intl, i18next, or other?
- [ ] How are translations stored and managed — files, database, external service?
- [ ] How does language selection interact with authentication — is language preference stored on the member profile?
- [ ] How does i18n interact with system notifications — are notification templates translated?
- [ ] Is right-to-left (RTL) language support needed now or is it a future consideration?
- [ ] How is user-generated content handled when a member's language differs from a reader's?

---

*Status: 🟡 Needs study*
