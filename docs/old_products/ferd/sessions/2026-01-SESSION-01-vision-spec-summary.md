# FringeIsland — Sessionsammanfattning
*Skapad: Mars 2026 — Vision & Specifikationssession 3*
*Språk: Svenska — intern dokumentation för Stefan*

---

## PROJEKT/KONTEXT: Vad handlar det om?

FringeIsland är ett **Immersive Edutainment**-projekt — en rörelse och ett ekosystem som skapar en alternativ verklighet parallellt med det vanliga livet. Det är inte en produkt — det är en rörelse med ett ekosystem.

Tre kärn frågor driver allt:
1. Vem är jag?
2. Vad vill jag?
3. Hur kommer jag dit?

Stefan är grundare, projektledare och ensam utvecklare i nuläget. Projektet befinner sig i en aktiv visions- och specifikationsfas — parallellt med pågående teknisk utveckling av webbplattformen (Ferd).

Denna session fokuserade på att producera fyra centrala visionsdokument och låsa in viktiga beslut kring produktstrategi, plattformsnamngivning och ekosystemets helhetsbild.

---

## BESLUT FATTADE: Vad bestämde vi, och varför?

### 1. Visionsdokument skapade och låsta

Fyra dokument skapades och placerades i `docs/vision/`:

**VISION.md** — Nordstiärnan. Det dokument allt annat flödar från. Skrivet i två liv: privat för Stefan nu, offentligt fundament för kommunikation med omvärlden senare.

**MANIFESTO.md** — FringeIslands Manifest. 11 principer i "X over Y"-format med förklarande text, grupperade i fyra kluster. Inspirerat av Agile Manifesto men med FringeIslands egen röst och djup.

**CONTRIBUTION_ARCHITECTURE.md** — Bidragsarkitektur på hög nivå. Fyra bidragsgrupper (Visitor, Member, Dreamineer, Council/Foundation) mappade mot fem bidragstyper (Content, Platform, Experience, Physical, Community).

**PRODUCTS_AND_PLATFORM.md** — Produktekosystem och plattformsstrategi. Täcker digitala produkter, fysiska produkter, events, webbplattformen (Ferd/Hamn), vågmodellen, enhetsstrategi och principer.

---

### 2. Webbplattformens namngivning

**Ferd** = nuvarande webbplattform. Avreseplatsen. En fungerande och bevisad plattform för individer, team och ledare att lära sig genom resor — ensamma eller i grupper med Stewards. Stefan's vibe coding PoC.

**Hamn** = den utvecklade FringeIsland-upplevelseplattformen. Där medlemmar verkligen anländer. Avatar, trädgård, narrativ, Dreamineer-marknadsplats. Lanseras tillsammans med native iOS och Android-appar.

**Varför dessa namn:** Hämtade från nordisk/svensk nautisk terminologi. Ferd = resa/avfärd. Hamn = hamn/ankomst. Kopplar till FringeIslands svenska rötter och heroisk resemetafor.

**Framtida versioner** namnges när de anländer — inte i förväg. Inga fler låsta namn i serien just nu.

---

### 3. Vågmodell istället för fasta faser

Faser överlappar och lever parallellt — inga hårda gränser.

- **Våg 1 — Ferd:** Bevisa grunden. Webb, Discord (temporärt), första Dreamineers, fri tier + första betaltier + donationer.
- **Våg 2 — Hamn:** Ön vaknar. Native iOS/Android, Dreamineer-marknadsplats, narrativ börjar, Discord pensioneras, online-events startar.
- **Våg 3 — Världen expanderar:** Full AR, fysiska produkter fördjupas, regionala träffar, första Summit, Foundation formellt etablerad, stiftelsekapital börjar byggas.
- **Våg 3+ — Spelet:** Unreal Engine, tre riken i full grafisk kvalitet, desktop/konsol/mobil/VR/AR.

**Varför vågmodell:** Verkligheten är inte sekventiell. Native-appar kan börja byggas under Ferd. AR-experiment kan starta under Hamn. Inget pensioneras — allt utvecklas.

---

### 4. Hjälteresans metafor

Webbplattformens evolution följer Hjälteresan (Joseph Campbell):

| Steg | Hjälteresan | Plattform |
|------|-------------|-----------|
| 1 | Den vanliga världen | Ferd — Avfärd |
| 2 | Kallelsen till äventyr | Hamn — Hamnen |
| 3 | Tröskeln korsas | Strand — Stranden |
| 4 | Prövningarnas väg | Fjord — Passagen |
| 5 | Återkomsten | Heim — Hemmet |

**Låst:** Hjälteresan som vägledande metafor och Ferd/Hamn som de två första kapitlens namn.
**Öppet:** Om framtida versioner följer Strand/Fjord/Heim-serien eller namnges på annat sätt.

**Varför:** Plattformens historia och medlemmens historia är samma historia. Det djupaste möjliga samstämmighet.

---

### 5. Produktfamiljen — fem uttryck

FringeIsland lever i fem parallella produktuttryck:

1. **Webbplattform** — djuparbetets hem, permanent hub, aldrig pensionerad
2. **Native iOS och Android** — sällskapet på språng, världen i fickan
3. **AR-lager** — världen blöder in i verkligheten
4. **Fysiska produkter** — världsartefakter, tryckt material, merchandise
5. **Spelet** — Unreal Engine, tre riken i full kvalitet (Våg 3+)

---

### 6. Enhetsstrategi

- **18–29:** Smartphone primärt. Native-appar icke förhandlingsbara. Ingen friktion eller de lämnar.
- **Dreamineers:** Laptop/desktop för djupt arbete, mobil för lättviktigt innehåll.
- **30–50:** Balanserat smartphone och laptop.
- **50+:** Surfplatta viktigt, större skärmar föredraget.
- **Våg 3+:** Konsol och VR/AR-headsets.

---

### 7. Manifestet — 11 principer låsta

**Vad vi tror om människan:**
- Story over data
- Curiosity over certainty
- Lived experience over passive consumption

**Hur vi tror att tillväxt sker:**
- Personal growth over performance
- Safe experimentation over fear of failure
- Direction over rigid destination

**Hur vi behandlar varandra:**
- Mutual respect over judgment of others
- Belonging over fitting in

**Hur rörelsen fungerar:**
- Member privacy over commercial opportunity
- Open contribution over closed gatekeeping
- Community ownership over corporate control

Format: "X over Y" som ### rubrik, förklarande text under. Fyra klusterrubriker som ## rubriker. Inledande intro-text + "At a Glance"-tabell + avslutande levande-dokument-notering.

---

### 8. Visitor/Shadow-upplevelsen

Fyra bidragsgrupper definierade:

- **Visitor (Grupp 0):** Rör sig som en skugga. Kan se sin trädgårdsdörr men inte öppna den. Ingen tidsgräns. Registreringsprompt är mjuk och frivillig. Allt från besökssessionen bärs över vid registrering.
- **Member (Grupp 1):** Registrerad. Profil och trädgård sparas mellan sessioner.
- **Dreamineer (Grupp 2):** Förtjänat genom bidrag. Makers (innehållsskapare) och Weavers (upplevelsearkitekter).
- **Council/Foundation (Grupp 3):** Innersta kretsen. Värdenas, varumärkets och IP:s väktare.

---

### 9. Ferd är ett PoC — inte en begränsning

Den nuvarande webbplattformen (Ferd) är ett personligt PoC — byggt av Stefan för att utveckla och demonstrera vibe coding-förmåga med AI. Det bevisar att den tekniska grunden är genomförbar. Det definierar eller begränsar INTE FringeIsland-visionen.

**Plattformen följer visionen — aldrig tvärtom.**

---

### 10. Nuvarande versionsfas och roadmap är föråldrad

Den befintliga `ROADMAP.md` beskriver en inlärningsplattform-PoC med fas 1–4. Den är nu föråldrad och behöver skrivas om för att återspegla vågmodellen och det fullständiga ekosystemet. Detta är planerat som en dedikerad nästa session.

---

## FÖRKASTADE ALTERNATIV: Vad övervägde vi men valde bort?

### Agile tvålagerformat för manifestet
Övervägde att separera 4 kärnvärden (som Agile Manifesto) från 7 principer. Förkastat — den förklarande texten under varje princip ÄR manifestet. Att flytta den till ett sekundärt lager försvagar den. Valde istället visuell hierarki (### rubriker) för skannbarhet.

### Fler låsta namn i versionsserien (Strand/Fjord/Heim)
Diskuterades som en komplett namngivningsserie för plattformens evolution. Förkastat — för många versioner kan existera mellan varje fas. Låsta namn kan bli begränsande. Namnger framtida versioner när de anländer.

### "Identity 1" och "Identity 2" för webbplattformen
Försökte skilja på den nuvarande inlärningsplattformen och den framtida FringeIsland-plattformen med "identitets"-terminologi. Förkastat — kändes konstigt. Ersatt av Ferd (nu) och Hamn (framtid) som naturliga namn.

### Spelet i tidiga faser
Diskuterades om Unreal Engine-spelet borde komma tidigare. Förkastat för nu — spelet är en Våg 3+ ambition byggd på ett validerat, blomstrande community. "Spelet förtjänas, antas inte."

### Enbart mjukvarufokus i produktdokumentet
Första versionen av produktdokumentet fokuserade enbart på SW-produkter. Utvidgades till att inkludera fysiska produkter och events efter Stefans påpekande att dessa annars riskerar att tappas bort.

### Hårdgränsade faser (fas 1 → fas 2 → fas 3)
Ursprunglig PoC-roadmap hade hårda sekventiella faser. Förkastat till förmån för vågmodellen där faser överlappar och lever parallellt.

---

## NULÄGE: Exakt var är vi nu?

### Visionsdokument
| Dokument | Status | Plats |
|----------|--------|-------|
| VISION.md | ✅ Klar v0.1 | docs/vision/ |
| MANIFESTO.md | ✅ Klar v0.1 | docs/vision/ |
| CONTRIBUTION_ARCHITECTURE.md | ✅ Klar v0.1 | docs/vision/ |
| PRODUCTS_AND_PLATFORM.md | ✅ Klar v0.2 | docs/vision/ |

### Webbplattform (Ferd)
- Version: v0.2.7+
- Stack: Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL
- Status: Fas 1.3 klar, ~70% av Fas 1 totalt
- Klart: Auth, profiler, avatar-uppladdning, grupphantering, navigationsfält, modaler
- Nästa tekniska milstolpe: Journey System (katalog, bläddring, registrering)

### Repo-struktur
```
docs/
  vision/
    VISION.md
    MANIFESTO.md
    CONTRIBUTION_ARCHITECTURE.md
    PRODUCTS_AND_PLATFORM.md
  planning/
    VISION_DECISIONS.md        ← behöver uppdateras
    ROADMAP.md                 ← behöver skrivas om (nästa session)
    DEFERRED_DECISIONS.md      ← behöver lätt uppdatering
README.md                      ← behöver lätt uppdatering
CLAUDE.md                      ← behöver lätt uppdatering
```

### Utforskningssessioner
| Session | Status |
|---------|--------|
| Contribution Architecture | ✅ Klar |
| The FringeIsland Manifesto | ✅ Klar |
| First Season Design | ⏳ Ej påbörjad |
| Kickstarter Campaign Design | ⏳ Ej påbörjad |

---

## NÄSTA STEG: Vad skulle vi göra härnäst?

### Omedelbart (Claude Code)
1. Kör lätta uppdateringar — README, DEFERRED_DECISIONS, CLAUDE.md
2. Uppdatera VISION_DECISIONS.md med alla beslut från denna session

### Nästa dedikerade session
3. **Roadmap-omskrivning** — ersätt befintlig ROADMAP.md med vågmodell och fullständigt ekosystem

### Framtida utforskningssessioner
4. **First Season Design** — grundnarrativet, S1:E1, världen som medlemmar först träder in i
5. **Kickstarter Campaign Design** — efter First Season Design är klar

---

## TEKNISK STATE: Kod, konfiguration, filstruktur som är relevant

### Befintlig tech stack (Ferd)
```
Framework:    Next.js 16.1 App Router
Language:     TypeScript
Styling:      Tailwind CSS
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth
Repo:         Stefansteffansson/FringeIsland (main branch)
```

### Databas
- 13 tabeller, 8 migrationer deployade till Supabase
- Supabase URL: `https://jveybknjawtvosnahebd.supabase.co`
- Viktigt fält: `users.full_name` (inte `display_name`)
- Permission-system: Universal Group Pattern med personliga grupper
- Ledarskapsroll kallas **Steward** (tidigare "Group Leader")

### Viktiga tekniska principer
- `proxy.ts` inte `middleware.ts` i Next.js 16.1
- Använd `ConfirmModal` — inga browser alerts
- PostgreSQL tillåter inte subqueries i CHECK constraints — använd triggers
- Soft delete: använd `SET NULL` + `RESTRICT` istället för `CASCADE`

### Dokumentationsstruktur
- `CLAUDE.md` — teknisk AI-kontext
- `README.md` — projektöversikt
- `CHANGELOG.md` — versionshistorik
- `docs/planning/ROADMAP.md` — teknisk roadmap (föråldrad, ska skrivas om)
- `docs/planning/DEFERRED_DECISIONS.md` — uppskjutna beslut

---

## ANTAGANDEN: Vad tar vi för givet som en ny session inte vet?

1. **Ferd är ett PoC** — den nuvarande kodbasen begränsar inte visionen. Plattformen följer visionen, aldrig tvärtom.

2. **Manifestet är levande** — v0.1 är "good enough for now". Det kommer att utvecklas när communityt växer och ny visdom förtjänas.

3. **Visionsdokumenten är låsta** — filerna i `docs/vision/` ska inte modifieras av Claude Code. De är låsta visionsdokument.

4. **Stefan arbetar ensam** — inga andra utvecklare eller teammedlemmar. Vibe coding med AI är den primära utvecklingsmetoden.

5. **Roadmap-omskrivningen är en dedikerad session** — rör inte ROADMAP.md förrän den sessionen.

6. **Governance är låst** — tre-lagerstruktur (Foundation → Dreamineer Council → Open Community) är låst och ska inte ifrågasättas.

7. **Affärsmodellen är låst** — fem intäktsströmmar (prenumerationer, donationer, marknadsplats, events, stiftelsefond). Ingen VC, inget aktiefinansiering, ingen bolagssponsring.

8. **IP/licensiering är låst** — MIT/Apache för plattformskod, CC BY-SA + CLA för community-innehåll, kommersiell marknadsplatslicens för fysiska produkter.

9. **Målgrupp är låst** — 18+ utan övre åldersgräns. Under 18 explicit exkluderade. 50+ välkomna som bidragsgivare och mentorer.

10. **Nästa stora kreativa arbete** — First Season Design kräver ett fräscht sinne och dedikerad tid. Forcera den inte.

---

*Denna fil kan kasseras när nästa session har startat framgångsrikt.*
