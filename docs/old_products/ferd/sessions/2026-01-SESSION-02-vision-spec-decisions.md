# FringeIsland — Session 4 Beslutsdokument
*Skapad: Mars 2026*
*Språk: Svenska — internt arbetsdokument*
*Syfte: Komplett redovisning av alla låsta beslut från Session 4*

---

## PROJEKT/KONTEXT: Vad handlar det om?

FringeIsland är en immersiv edutainment-plattform — en rörelse och ett ekosystem som skapar en imaginär alternativ värld parallellt med vardagslivet. Kärnan är tre frågor som driver allt:

1. **Vem är jag?**
2. **Vad vill jag?**
3. **Hur kommer jag dit?**

Plattformen består av två grundläggande etapper:

- **Ferd** — den nuvarande webb-plattformen. En välbyggd, funktionell grund. Ser ut och känns som ett LMS. Bevisar att byggaren kan bygga och att journey-metaforen fungerar på grundnivå.
- **Hamn** — den evolved plattformen där FringeIsland verkligen kommer till liv. Avatar, narrativ, AI-mentor, den parallella självets mekanik, den fulla upplevelsen.

Session 4 handlade uteslutande om att definiera **Ferd** — vad den är, vad den måste innehålla arkitektoniskt, och hur varje beslut måste fattas med Hamn i åtanke.

---

## BESLUT FATTADE: Vad bestämde vi, och varför?

---

### BESLUT 1 — Ferds grundläggande syfte och nordstjärna

**Beslutet:**
Ferd är inte FringeIsland. Ferd är fundamentet som gör FringeIsland möjligt.

Ferd bevisar två saker:
1. Byggaren kan bygga
2. Journey-metaforen fungerar på grundnivå

Ferd ser ut och känns som ett välbyggt, ändamålsenligt LMS. Det försöker inte vara den fulla FringeIsland-upplevelsen.

**Varför:**
Om vi försöker bygga hela FringeIsland-upplevelsen i Ferd riskerar vi att bygga fel saker på fel sätt. Hamn måste kunna byggas ovanpå Ferd — inte riva och bygga om.

**Arkitektonisk nordstjärna — gäller varje enskilt beslut i Ferd:**
*Behöver detta byggas om när Hamn kommer — eller kan Hamn bygga ovanpå det?*
- Om svaret är "bygga om" → ompröva beslutet
- Om svaret är "bygga ovanpå" → rätt spår

---

### BESLUT 2 — Ferds fyra kärndelar

**Beslutet:**
Ferd består av fyra kärndelar:

1. **Användare & Grupper** — identitet, tillhörighet, roller. Specat i repo. Gap adresseras via Claude Code.
2. **Journeys + Journey Designer** — upplevelser att färdas igenom. 🔲 Dedikerad session krävs.
3. **Administration (DeusEx)** — plattformsövergripande förvaltning. Delvis specat i repo. Gap adresseras via Claude Code.
4. **Direktmeddelanden (DM)** — kärnkommunikation. Finns idag.

**Varför:**
Dessa fyra delar är det minsta kompletta systemet som krävs för att Ferd ska fungera. Allt annat är antingen sekundärt eller tillhör Hamn.

---

### BESLUT 3 — Behörighetsmodellen (arkitektoniskt fundament)

**Beslutet:**
All behörighet styrs genom grupper och roller i grupper. Aldrig direkt på användarnivå.

- Supabase Auth används **endast** för fundamental autentisering
- Varje användare tillhör alltid sin egen **Personal Group** (skapas automatiskt vid registrering)
- **Grupper** enrollar journeys eller går med i andra grupper — aldrig användare direkt
- Roller är knutna till grupper — en användare har en roll genom sin grupptillhörighet
- **DeusEx** är en specialgrupp för plattformsadministration med fullständig access
- Det finns en plattformsövergripande grupp som alla medlemmar tillhör

**Varför:**
En flexibel, gruppstyrd behörighetsmodell kan skalas upp till Hamns komplexitet utan att behöva ritas om. Att binda behörighet direkt till användare skapar en rigid struktur som inte klarar FringeIslands framtida krav.

---

### BESLUT 4 — Journey Zero (onboarding som journey)

**Beslutet:**
Onboarding är inte en funktion. Det är **Journey Zero** — den första journey varje skugga/besökare automatiskt påbörjar vid ankomst till plattformen.

Journey Zero sker i ett oautentiserat tillstånd — plattformen måste stödja anonym access till vissa ytor.

**Varför:**
Om onboarding behandlas som en separat funktion riskerar den att bli generisk och plattformslik. Som Journey Zero är den en del av världen från första sekunden — och bevisar journey-metaforen på sig själv.

**Beroende:** Kan inte färdigdesignas förrän Journey + Journey Designer-sessionen är genomförd.

---

### BESLUT 5 — Medlemsprofil (två lager)

**Beslutet:**
Profilen består av två distinkta lager:

**Lager 1 — Struktur (statisk):**
Fasta fält — namn, avatar, bio, grundläggande information. Definieras vid registrering.

**Lager 2 — Journey-data (dynamisk):**
Ackumuleras över tid när journeys genomförs. Varje journey kan bidra med datapunkter till profilen. Medlemmen kontrollerar synlighet per datapunkt: privat / semi-publik / publik.

Profildatamodellen måste stödja dynamiska journey-bidrag från dag ett — även om Ferd bara har ett fåtal journeys som skriver till den.

Full visuell expression av profilen (avatar, hem, trädgård) tillhör Hamn. Funktionell grund är Ferd.

**Varför:**
Journeys skriver till profilen. Profilen är spegeln av resan. Om datamodellen inte är flexibel från start måste den ritas om inför Hamn — vilket bryter mot den arkitektoniska nordstjärnan.

---

### BESLUT 6 — Framsteg och slutförandespårning (tre lager)

**Beslutet:**
Framstegsspårning är inte ett enkelt procenttal. Det består av tre lager:

1. **Position** — var i journeyn medlemmen befinner sig just nu
2. **Slutförandetillstånd** — vilka steg är klara, vad återstår
3. **Personlig kontext** — anteckningar, journalanteckningar och reflektioner knutna till specifika steg

All personlig kontext är privat som standard. Medlemmen kontrollerar synlighet.

En medlem som loggar ut och in igen ska återuppta exakt där de lämnade — med sin kontext intakt.

**Varför:**
Utan stateful framstegsspårning med personlig kontext är Ferd bara ett kursbibliotek. Med det börjar det kännas som en resa. Dessutom skriver journal- och reflektionsdata till profilen — de är samma system.

---

### BESLUT 7 — Kommunikationsstacken (prioritetsordning)

**Beslutet:**
Kommunikation är inte en funktion — det är bindväven i tillhörighet. Fullständig stack, implementerad i prioritetsordning:

**Prioritet 1 — Fundament (Ferd dag ett):**
- DM basic — en-till-en textmeddelanden
- E-post — endast registreringsbekräftelse och kontoavslutning. Ingen marknadsföring.
- In-app notifieringscenter — klockan, aggregerar relevant aktivitet

**Prioritet 2 — Kärnengagemang (tidig Ferd):**
- Forum — gruppscoped, för engagemangsgrupper
- DM avancerat — strukturerade meddelanden med inbäddade frågor/val för begränsade svar (kraftfullt verktyg för admins och Stewards)
- Announcementlager — en-till-många, rollstyrt. Stewards annonserar till sin grupp, DeusEx annonserar plattformsövergripande.

**Prioritet 3 — Retentionslager (senare Ferd):**
- Fästa inlägg — viktigt innehåll synligt i grupper
- Aktivitetsflöde — lätt känsla av en levande plattform

Varje kommunikationstyp tjänar en specifik relation:
- DM — en-till-en, personlig
- Forum — gruppkonversation, peer-to-peer tillhörighet
- Announcements — en-till-många, riktning och nyheter
- Notifieringar — plattform till medlem, ambient medvetenhet
- Aktivitetsflöde — medlem till värld, känsla av community

**Varför:**
Kommunikation är det näst viktigaste efter journeys för att skapa tillhörighet och behålla medlemmar. En plattform där folk inte kan kommunicera på rätt sätt håller inte ihop.

---

### BESLUT 8 — Sökning och discovery

**Beslutet:**
Discovery för inloggade medlemmar är en kombination av:
- Aktiv sökning (journeys, grupper)
- Plattformssurfade rekommendationer baserade på var medlemmen befinner sig
- Kurerad ingångspunkt — "rätt för dig just nu"
- Rekommendationer från andra medlemmar

Skuggor kan bläddra men inte operera — ingen join, ingen posting, ingen medlemssökning.

Full definition av vad skuggor kan se (publika journeys, publika grupper, publika forum) är **avsiktligt uppskjutet** till en dedikerad session efter att hela specen är skriven.

**Varför:**
Discovery är grundläggande för att en ny medlem ska hitta rätt och stanna. Men skuggans access-modell kräver en bredare diskussion om öppenhet vs. konvertering — den diskussionen är bättre efter att specen är komplett.

---

### BESLUT 9 — Stegtyper i journeys (två nivåer)

**Beslutet:**
Journey-steg är inte innehållsformat — de är olika slags ljus som belyser olika facetter av vem medlemmen är.

**Nivå 1 — Kärna, Ferd dag ett:**

| Stegtyp | Vad det är | Skriver till profil? |
|---------|-----------|---------------------|
| Narrativ | Rik text/innehåll — berättelse, världsbyggande | Nej |
| Reflektionsprompt | Öppen fråga — fri text-svar | Ja — privat som standard |
| Strukturerad självskattning | Validerade ramverk (Big 5, VIA etc.) | Ja — kärn-profildata |
| Val/selektion | Väljer bland alternativ, formar journeyns riktning | Ja — avslöjar värderingar |
| Aktivitetsbekräftelse | Gör något i verkliga världen, bekräfta eller beskriv | Ja — valfritt |
| Journalanteckning | Fri skrivning kopplad till ett moment i journeyn | Ja — privat som standard |
| Checklista | Smååtgärder att slutföra innan man går vidare | Nej |

**Nivå 2 — Viktigt, tidig Ferd:**

| Stegtyp | Vad det är | Skriver till profil? |
|---------|-----------|---------------------|
| Video | Inbäddat videoinnehåll | Nej |
| Fil/resurs | Nedladdningsbart material | Nej |
| Quiz | Kunskapskontroll — rätt/fel | Nej |
| Humör/tillståndskontroll | Snabb emotionell/energiregistrering | Ja — mönsterdata |
| Extern länk | Pekar utanför plattformen | Nej |

**Medvetet exkluderat från Ferd:**
- SCORM — företagskomplexitet, behövs inte
- Live session-schemaläggning — eventlager, senare
- Röstjournaling — Hamn+, mobil native
- AI-genererade insikter utan samtycke — integritetskränkning

**Arkitektoniskt krav:** Stegtypsystemet måste vara utbyggbart från dag ett — nya typer ska kunna läggas till utan att bygga om kärndatamodellen. Detta är den viktigaste arkitektoniska beslutet i Journey-systemet.

**Varför:**
Ferd måste stödja journeys som spänner från enkla A→B→C till komplexa dynamiska flöden. Om stegtypsystemet är låst från start kan inte Journey Designer byggas utan omstrukturering.

---

### BESLUT 10 — AI-mentor (companion layer, opt-in)

**Beslutet:**
AI-mentorn är inte ett insiktsgeneratorverktyg. Det är en **companion layer** som löper parallellt med journeyn — närvarande när den bjuds in, tyst annars.

Tekniska krav:
- Opt-in per anteckning eller som global inställning
- Svarar i FringeIslands röst — varm, nyfiken, icke-föreskrivande
- Insikt är alltid en fråga eller observation — aldrig ett omdöme eller poäng
- Anteckningar lagras aldrig av AI-leverantören bortom API-anropet
- Medlemmen kan återställa eller radera mentorns minne när som helst

Full narrativ expression (den parallella självets mekanik) tillhör Hamn.
Ferd bygger det arkitektoniska fundamentet: integritetskontroller, samtycksmodell, kontextlagring.

**Varför detta är en kärnkillare:**
Ingen jämförbar plattform har en kontextuell, integritetsfirst, världsröstad AI-companion som följer med en medlem genom personlig utveckling. Detta är en av de saker som kan göra FringeIsland genuint annorlunda.

---

### BESLUT 11 — Grundmyten (arbetsversion, ej slutgiltig)

**Beslutet:**
Följande mening är låst som arbetsversion av FringeIslands grundmyt:

*"Somewhere in another universe, your avatar woke up empty. No name. No story. No sense of who they are or what they want. Just a quiet, persistent feeling that somewhere — in another version of the world — the right experiences would help the answers unfold."*

**Plattformens syfte i en mening:**
*FringeIsland is a world of experiences designed to help the answers unfold.*

Ska revideras och förfinas i en senare session — inte final, inte helig.

---

### BESLUT 12 — Den parallella självets mekanik (arbetsversion)

**Beslutet:**
AI-mentorn är inte ett externt stöd. Det är inte medlemmens framtida jag som redan har svaren.

Det är medlemmens **parallella jag** — från ett universum där de aldrig hittade svaren. De är lika tomma som medlemmen. De behöver medlemmens hjälp för att bli hela.

Genom att ställa genuina, nyfikna frågor born ur sin egen ofullständighet — ställer de av en slump exakt de frågor medlemmen behöver höra.

**Kärnprincip:**
De flesta människor har redan sina svar. De behöver bara rätt upplevelser — frågor, utmaningar, berättelser, reflektioner, aktiviteter — ställda vid rätt tidpunkt, med tillräckligt med tålamod, för att låta svaren vecklas ut av sig själva.

Denna mekanik tillhör Hamn, inte Ferd. Ferd bygger det arkitektoniska fundamentet för den.

**Flaggad för dedikerad session:** Avatar & Den Parallella Självet — narrativ design, UX och dataarkitektur.

---

## FÖRKASTADE ALTERNATIV: Vad övervägde vi men valde bort?

**AI-mentor som framtida jaget (som redan har svaren)**
Övervägdes. Förkastades. Problemet: implicerar att det finns ett korrekt mål, en färdig version av dig som vägleder dig dit. Fortfarande — hur försiktigt — föreskrivande. Den parallella självets mekanik är starkare eftersom ingen av dem har svaren. De frågar varandra till existens.

**E-postnotifieringar för engagemang och marknadsföring**
Övervägdes som del av kommunikationsstacken. Förkastades. FringeIsland respekterar medlemmarnas uppmärksamhet. E-post används minimalt — endast signup och kontoavslutning.

**SCORM-stöd i Journey-steg**
Övervägdes som stegtyp. Förkastades. Onödig företagskomplexitet som inte tjänar FringeIslands syfte.

**Röstjournaling i Ferd**
Övervägdes. Skjuts upp till Hamn+. Kräver mobil native — passar inte Ferds webb-first approach.

**AI-insikter utan explicit samtycke**
Övervägdes som standardfunktion. Förkastades. Bryter mot kärnprincipen: medlemmens integritet över kommersiell möjlighet. Alltid opt-in.

**Forum som kärnprioritering i Ferd**
Övervägdes. Nedprioriterat. Arkitektur och grundfunktionalitet finns — men forum är inte kärnprioritering i Ferd. Tillhör tidigt Ferd, inte dag ett.

**Ferd som den fulla FringeIsland-upplevelsen**
Det ursprungliga antagandet i äldre specs och roadmap. Förkastades i sin helhet. Ferd är fundamentet — inte upplevelsen. Upplevelsen är Hamn.

---

## NULÄGE: Exakt var är vi nu?

### Plattformen tekniskt
- Next.js 16 + Supabase full-stack app
- 19 RLS-skyddade tabeller
- RBAC med 4 roller, 31 permissions
- 659 tester
- Befintliga routes: auth, profiler, grupper, journeys, invitationer, notifieringar, DM, forum (embryo), admin (DeusEx)
- Fas 1 MVP på ~95% enligt gammal roadmap
- Den gamla roadmapen stämmer inte längre överens med visionen

### Dokumentation
- `docs/vision/` — komplett med VISION.md, MANIFESTO.md, CONTRIBUTION_ARCHITECTURE.md, PRODUCTS_AND_PLATFORM.md
- `docs/planning/VISION_DECISIONS.md` — behöver uppdateras med Session 3 och Session 4-beslut
- `docs/planning/ROADMAP.md` — behöver full omskrivning
- `docs/planning/PRODUCT_SPEC.md` — gammal spec, i stort sett ersatt
- `docs/planning/DEFERRED_DECISIONS.md` — behöver lätt uppdatering

### Beslutsstatus
- Ferds syfte och nordstjärna — ✅ låst
- Ferds fyra kärndelar — ✅ låst
- Behörighetsmodell — ✅ låst (implementerad i repo)
- Journey Zero — ✅ låst som koncept, design väntar på Journey-session
- Medlemsprofil (två lager) — ✅ låst
- Framstegsspårning (tre lager) — ✅ låst
- Kommunikationsstacken — ✅ låst med prioritetsordning
- Sökning och discovery — ✅ delvis låst, skuggtillgång uppskjuten
- Stegtyper (två nivåer) — ✅ låst
- AI-mentor — ✅ låst som companion layer
- Grundmyten — ✅ låst som arbetsversion
- Parallella självets mekanik — ✅ låst som arbetsversion
- UI/Design — 🔲 ej påbörjat
- Journey + Journey Designer — 🔲 dedikerad session krävs
- Skuggtillgångsmodell — 🔲 uppskjuten
- Avatar & Parallella Självets mekanik (full) — 🔲 dedikerad session krävs

---

## NÄSTA STEG: Vad skulle vi göra härnäst?

### Omedelbart (Claude Code — redo att köra)

**Uppgift 1 — Lätta repo-uppdateringar:**
Uppdatera README.md, DEFERRED_DECISIONS.md och CLAUDE.md för att referera till PRODUCTS_AND_PLATFORM.md.

**Uppgift 2 — VISION_DECISIONS.md-uppdatering:**
Uppdatera med alla låsta beslut från Session 3 och Session 4.

### Nästa planeringssessioner (i prioritetsordning)

1. **Journey + Journey Designer** — strukturen hos en journey, hur designern fungerar, stegtypers datamodell, förgreningslogik
2. **Skuggtillgångsmodell** — vad skuggor kan se innan registrering, pros/cons öppen vs stängd
3. **ROADMAP.md full omskrivning** — efter Journey-sessionen, reflekterar vågmodellen, Ferd/Hamn, ekosystemet
4. **Avatar & Den Parallella Självets mekanik** — narrativ design, UX, dataarkitektur
5. **First Season Design** — grundnarrativ, S1:E1
6. **UI/Design** — vad Ferd ser ut och känns som
7. **Kickstarter Campaign Design** — efter First Season Design

### Omskrivning av FERD_SPEC.md
En fullständig produktspecifikation för Ferd ska skrivas — baserad på alla låsta beslut ovan. Redo att påbörjas efter Journey-sessionen när alla fyra kärndelar är fullt specade.

---

## TEKNISK STATE: Kod, konfiguration, filstruktur som är relevant

### Stack
```
Frontend:   Next.js 16, TypeScript, Tailwind CSS
Backend:    Supabase (PostgreSQL + Auth + RLS + Realtime)
Testing:    Jest (659 tester) + Playwright (E2E)
Proxy:      proxy.ts (route protection, ersätter middleware.ts i Next.js 16)
```

### Mappstruktur (förenklad)
```
app/
  admin/          → DeusEx admin dashboard
  api/            → API routes
  groups/         → Grupphantering
  invitations/    → Inbjudningshantering
  journeys/       → Journey-katalog + innehåll
  login/          → Auth
  signup/         → Auth
  messages/       → DM
  my-journeys/    → Användarens enrollade journeys
  profile/        → Användarprofil

components/
  groups/         → Grupp CRUD, medlemmar, forum
  journeys/       → Journey-kort, spelare, enrollment
  notifications/  → Notifieringar
  auth/           → Auth-formulär
  admin/          → Admin UI

lib/
  supabase/       → client.ts, server.ts
  auth/           → AuthContext, hooks
  types/          → TypeScript-typer

supabase/migrations/  → 19 aktiva migrationer + arkiv
docs/                 → ~100+ markdown-dokument
```

### Databas
- 19 tabeller, alla med RLS
- RBAC: 4 roller, 31 permissions
- Nyckelmigrationer: rebuild_universal_group_pattern (D15 schema-omarbetning), enhanced_member_invitations, add_display_name_system

### Kända problem (från gammal roadmap)
- Föräldralösa grupper efter hard delete (behöver stewardship transfer UI)
- `app/admin/fix-orphans/page.tsx` använder `alert()` (ska använda ConfirmModal)
- Hydration mismatch-varning i AuthForm.tsx (kosmetisk)

---

## ANTAGANDEN: Vad tar vi för givet som en ny session inte vet?

**Om projektet:**
- FringeIsland är ett långsiktigt projekt — inte en produkt att sälja, utan en rörelse att bygga
- Grundaren (Stefan) är ensam utvecklare i nuläget, arbetar med AI-assisterad "vibe coding"
- GitHub-repo: Stefansteffansson/FringeIsland
- Projektet är finansierat personligen — inga externa investerare, ingen tidsbegränsning

**Om arkitekturen:**
- Supabase är vald och låst för Ferd — inga planer på att byta
- Next.js 16 App Router är vald och låst
- All behörighet går genom grupper — aldrig direkt på användarnivå
- Detta är redan implementerat i repot men inte fullständigt

**Om visionen:**
- FringeIsland Foundation (non-profit) är planerad men inte juridiskt etablerad ännu
- Dreamineer-ekosystemet (Makers + Weavers) är definierat men inte implementerat
- Marketplace och monetisering tillhör Wave 2+ — inte Ferd
- Discord används temporärt som community-verktyg — ska fasas ut i Hamn

**Om besluten:**
- Alla beslut i detta dokument är fattade i dialog mellan Stefan (grundare) och Claude (AI-assistent)
- Beslut är "låsta" i den meningen att de är genomtänkta och övertygade — inte juridiskt bindande
- Grundmyten och parallella självets mekanik är arbetsversioner — förväntas revideras
- Ingenting i `docs/vision/` ska modifieras utan explicit beslut

**Om sessionsformatet:**
- Planering och vision sker i Claude.ai (detta format)
- Implementation sker i Claude Code (repo-kontext)
- SESSION_BRIDGE-dokument används för att föra kontext mellan sessioner
- Alla vision-dokument lagras i `docs/vision/` och behandlas som låsta

---

*Detta dokument kompletterar SESSION_BRIDGE.md och går djupare in på beslutens kontext och motivering. Båda ska laddas upp vid start av nästa session för full kontext.*
