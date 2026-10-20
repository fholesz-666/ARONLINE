# Architektura ARONLINE

## 1. Přehled

```
┌──────────────────────────── Prohlížeč (projektant) ───────────────────────────┐
│ Next.js (React) – ceník, účet, profil/razítko, vícekrokový formulář, mapa      │
│ Leaflet + dlaždice ČÚZK (ortofoto) / OSM                                      │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ HTTPS (cookie relace, SameSite=Lax, kontrola Origin)
┌───────────────▼───────────────────────────────────────────────────────────────┐
│ Next.js server (Route Handlers /api/*, Server Components)                     │
│  ├─ auth/        registrace, přihlášení, relace v DB, reset hesla, rate limit │
│  ├─ projects/    CRUD, autosave s kontrolou verze, historie, kopie            │
│  ├─ geo/         proxy + cache na ČÚZK (RÚIAN, budovy, výškopis)             │
│  ├─ calc/        volá výpočetní jádro, ukládá CalculationRun (snapshot)      │
│  ├─ export/      DOCX (docx) + PDF (pdfmake) – jen po ověření nároku          │
│  └─ payments/    GoPay REST (OAuth2), notifikace → dotaz na stav → kredit     │
│                                                                               │
│  src/core/risk – ČISTÉ výpočetní jádro (bez I/O, bez DB, plně testované)      │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ Prisma
┌───────────────▼───────────────┐    ┌──────────────────────────────────────────┐
│ PostgreSQL 16                 │    │ Externí: ČÚZK ArcGIS REST, GoPay REST,   │
│ uživatelé, workspace, projekty│    │ SMTP (e-maily)                           │
│ výpočty, objednávky, kredity  │    └──────────────────────────────────────────┘
└───────────────────────────────┘
```

## 2. Technologie

| Vrstva | Volba | Důvod |
|---|---|---|
| Frontend + server | **Next.js 15.5 (App Router), TypeScript strict** | Jeden projekt, SSR, Route Handlers, snadné nasazení z GitHubu |
| Styly | Tailwind CSS 4 | Rychlý, konzistentní a čitelný vzhled bez knihovny komponent |
| DB | **PostgreSQL 16 + Prisma 6** | Transakce a zámky pro platby a kredity, migrace ve verzovacím systému |
| Validace | zod | Stejná schémata na klientu i serveru |
| Hesla | Argon2id (`@node-rs/argon2`) | Doporučený algoritmus pro ukládání hesel |
| Mapa | Leaflet + react-leaflet | Lehká, bez licenčních poplatků |
| DOCX | `docx` | Skutečně editovatelný Word (tabulky, styly, záhlaví, zápatí) |
| PDF | `pdfmake` (font Roboto s českou diakritikou) | Čistý JS, bez headless prohlížeče, běží i na malém serveru |
| Testy | Vitest (jednotkové a integrační s reálnou PostgreSQL), Playwright (E2E) | |
| CI/CD | GitHub Actions → Render (nebo Docker na VPS) | Viz `docs/deployment.md` |

GitHub Pages nestačí: platby, výpočty a ochrana dokumentů musí běžet na serveru.

## 3. Moduly a hranice

### 3.1 Výpočetní jádro `src/core/risk`
- Bez závislostí na frameworku, DB a síti. Vstup je JSON (validovaný zod), výstup je výsledek se **stopou výpočtu**. U každé veličiny stopa obsahuje symbol, vzorec, dosazení, hodnotu, jednotku, odkaz na článek normy a zdroje vstupů.
- **Metodiky jsou oddělené moduly** (`methodologies/<id>`). Registry obsahuje stav (`implemented` / `not_implemented`), normu a datum konce použitelnosti.
  - `CSN_EN_62305_2_ED2` – implementováno. Tabulky jsou označeny `unverified` a použitelnost končí 31. 10. 2027.
  - `CSN_EN_IEC_62305_2_ED3` – **neimplementováno** (chybí legální podklady).
- Normové tabulky a rovnice mají metadata: číslo tabulky/rovnice, veřejný zdroj, stav ověření (`verification.json`). Z nich se počítá otisk **`normativeDataHash`**, který se ukládá ke každému výpočtu.
- `CORE_VERSION` (semver) se ukládá ke každému výpočtu.

### 3.2 Reprodukovatelnost
`CalculationRun` ukládá: vstup (snapshot), výsledek, `coreVersion`, `methodologyId`, `normativeDataHash`, `inputHash` (SHA-256 kanonického JSON) a datum. Export se vždy generuje z konkrétního `CalculationRun`. Dokument obsahuje jeho ID a otisky.

### 3.3 Multi-tenant model
Každý uživatel má osobní **workspace**. Firemní tarif = workspace typu COMPANY s více členy. Projekty, kredity, předplatné, šablony a profily zpracovatele patří workspace. **Každý dotaz na data obsahuje podmínku `workspaceId` ověřenou proti členství přihlášeného uživatele** (`requireProjectAccess`).

### 3.4 Platby a nároky (obchodní pravidla)
| Produkt | Účinek po ověřené platbě |
|---|---|
| Jednorázová analýza | +1 kredit a automatické odemčení vybraného projektu |
| Balíček 20 analýz | +20 kreditů (bez expirace – lze změnit v konfiguraci) |
| Profesionální předplatné | odemykání projektů bez kreditů po dobu předplatného, limit podle konfigurace |
| Firemní předplatné | totéž + více členů workspace |

- **Odemčení projektu** (`ProjectUnlock`) je jednorázové a trvalé. Spotřebuje 1 kredit, nebo jde z aktivního předplatného. Unikátní klíč `unlock:<projectId>` brání dvojímu odečtu. Po odemčení se **zamkne identifikace objektu** (adresa, souřadnice, parcela). Výpočet lze dál upravovat a exportovat bez dalšího kreditu. Jiný objekt = nový projekt.
- **Kredit se připisuje jen po stavu PAID ověřeném dotazem na GoPay API** (notifikace nebo návrat z brány jen spouští ověření). Unikátní `idempotencyKey = payment:<goPayId>` v `CreditLedger` a zámek řádku platby brání dvojímu připsání.
- Export (DOCX/PDF) server povolí jen při existujícím `ProjectUnlock`. Soubory se generují na požádání a neukládají se veřejně.
- V produkci se platby a export **zablokují, dokud není výpočetní jádro odborně ověřeno** (`REQUIRE_VERIFIED_CORE=true`).

### 3.5 Geodata
Serverové proxy s cache (`GeoCache`, TTL 30 dní) na služby ČÚZK. Každá automaticky získaná hodnota nese `source`, `retrievedAt`, `quality` (`measured` / `estimated` / `manual`) a `note`. Uživatel musí automatické hodnoty potvrdit. Chybějící hodnota se nikdy nenahrazuje odhadem bez označení.

### 3.6 Bezpečnost
- Relace: náhodný token 32 B v cookie `HttpOnly; Secure; SameSite=Lax`. V DB je jen SHA-256 hash. Expirace 30 dní, rotace při přihlášení.
- CSRF: kontrola hlavičky `Origin` u všech mutujících požadavků (middleware) a SameSite cookie.
- Rate limiting (DB, fixní okno) na přihlášení, registraci, reset hesla, geo-proxy, platby a export.
- Validace všech vstupů zod na serveru. Limit velikosti těla požadavku.
- Logy bez osobních údajů a tajemství (redakce e-mailů, tokenů a hesel).
- Hlavičky: CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.

## 4. Datový model
Viz `prisma/schema.prisma`. Hlavní entity: User, Session, EmailToken, Workspace, Membership, Invitation, ProcessorProfile, Project, ProjectRevision, CalculationRun, ProjectUnlock, ExportLog, Product, Order, Payment, PaymentEvent, CreditLedger, Subscription, Template, GeoCache, RateLimit, AuditLog.

## 5. Uživatelský průchod
1. Úvod a ceník (veřejné), registrace nebo přihlášení.
2. Profil zpracovatele a razítko (jednou, pak se předvyplňuje).
3. Nový projekt → průvodce:
   1. **Identifikace** – zpracovatel (z profilu), investor, stavba, stupeň, číslo zakázky
   2. **Objekt** – adresa / parcela / klik do mapy → budova z RÚIAN, rozměry, výška (odhad), nadmořská výška
   3. **Okolí** – sousední budovy, vzdálenosti, návrh součinitele polohy CD
   4. **Bouřková činnost** – NG nebo Td se zdrojem
   5. **Vedení** – NN, VN, telekomunikace, data (předvolby)
   6. **Zóny a ztráty** – podle typu objektu, osoby, požár, panika, typické hodnoty ztrát
   7. **Ochranná opatření** – LPS, SPD, stínění, opatření proti dotyku a kroku
   8. **Kontrola** – přehled auto / ručních / výchozích údajů, chybějící a neověřené vstupy
4. Výpočet → náhled výsledku (R vs RT, verdikt, dominantní složky).
5. Platba / kredit / předplatné → odemčení → stažení PDF a DOCX (kdykoli později znovu).
