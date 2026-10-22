# ARONLINE – analýza rizika ochrany před bleskem

Česká webová aplikace pro projektanty elektro a LPS. Umí:

- načíst budovu a okolí z dat ČÚZK (RÚIAN, výškopis),
- provést výpočet řízení rizika podle **ČSN EN 62305-2 ed. 2** s úplnou stopou výpočtu,
- vygenerovat dokumentaci s razítkem zpracovatele v **PDF** a editovatelném **DOCX**,
- zpřístupnit dokumentaci až po **ověřené platbě** (GoPay), kreditu nebo předplatném.

> **Stav výpočetního jádra:** normové tabulky a vzorce byly porovnány s textem ČSN EN 62305-2 ed. 2 včetně Z1 (74 / 74 položek, viz [docs/verification-checklist.md](docs/verification-checklist.md)). Před ostrým provozem doporučujeme nezávislou kontrolu autorizovanou osobou.
>
> Aplikace počítá podle **ČSN EN 62305-2 ed. 2**, kterou lze používat do 31. 10. 2027. Výpočet podle **ed. 3** bude nasazen od 10/2027 (rozhodnutí provozovatele – do té doby se ed. 3 v aplikaci nepočítá ani podrobně nepopisuje).

## Dokumentace

| Dokument | Obsah |
|---|---|
| [docs/research.md](docs/research.md) | Průzkum: normy, právní rámec, existující software, data ČR, GoPay |
| [docs/architecture.md](docs/architecture.md) | Architektura, moduly, datový model, obchodní pravidla plateb |
| [docs/calculations.md](docs/calculations.md) | Implementované výpočty, zdroje hodnot, stav ověření |
| [docs/verification-checklist.md](docs/verification-checklist.md) | Kontrolní seznam pro odborné ověření (generovaný) |
| [docs/data-availability.md](docs/data-availability.md) | Co se načítá automaticky a co musí zadat projektant |
| [docs/deployment.md](docs/deployment.md) | GitHub, nasazení na Render nebo VPS, doména, přechod do produkce |
| [docs/gopay.md](docs/gopay.md) | Nastavení platební brány GoPay, testovací a produkční režim |
| [docs/admin.md](docs/admin.md) | Správa služby, doklady, platba převodem, podmínky opakovaných plateb |
| [docs/external-apis.md](docs/external-apis.md) | Služby ČÚZK, mapové podklady, limity a cache |
| [docs/backup.md](docs/backup.md) | Zálohování a obnova databáze |
| [docs/costs.md](docs/costs.md) | Odhad měsíčních provozních nákladů |
| [docs/security.md](docs/security.md) | Bezpečnostní opatření |
| [docs/test-results.md](docs/test-results.md) | Výsledky testů |
| [docs/remaining.md](docs/remaining.md) | **Co musí dodat nebo odborně ověřit člověk** |

## Technologie

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL 16 + Drizzle ORM · zod · Leaflet · docx · pdfmake · Vitest · Playwright · GitHub Actions.

## Rychlý start (lokální vývoj)

Požadavky: Node.js 22, PostgreSQL 16.

```bash
git clone https://github.com/fholesz-666/aronline.git
cd aronline
npm install
cp .env.example .env            # upravte DATABASE_URL
createdb aronline               # nebo vytvořte databázi jinak
npm run dev                     # migrace a ceník se aplikují při startu
```

Aplikace běží na <http://localhost:3000>. Ve vývoji (`PAYMENTS_MODE=mock`) se místo GoPay otevře **simulovaná platební brána**. E-maily se bez SMTP vypisují do konzole (odkaz pro ověření e-mailu najdete tam). Pro vyzkoušení placeného exportu bez ověřeného jádra nastavte v `.env` `REQUIRE_VERIFIED_CORE=false` (jen vývoj!).

## Skripty

| Příkaz | Účel |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` / `npm start` | produkční sestavení / spuštění |
| `npm test` | jednotkové a integrační testy (vyžaduje PostgreSQL, viz níže) |
| `npm run test:core` | jen testy výpočetního jádra (bez databáze) |
| `npm run test:e2e` | E2E test průchodu aplikací (běžící server, `PW_CHROMIUM_PATH` volitelně) |
| `npm run lint` / `npm run typecheck` | kontrola kódu |
| `npm run db:generate` | vygeneruje SQL migraci po změně `src/server/db/schema.ts` |
| `npm run db:migrate` | aplikuje migrace (jinak se aplikují při startu serveru) |
| `npm run db:seed` | doplní ceník (`-- --force-prices` přepíše ceny podle `src/config/pricing.ts`) |
| `npm run verification:checklist` | přegeneruje kontrolní seznam ověření jádra |

Integrační testy používají databázi z `TEST_DATABASE_URL` (výchozí `postgresql://postgres@127.0.0.1:5432/aronline_test`) a **před každým během ji smažou**.

## Struktura projektu

```
src/
  core/risk/                 výpočetní jádro (čisté funkce, bez I/O)
    methodologies/csn-en-62305-2-ed2/
      tables.ts              normové tabulky s původem hodnot
      equations.ts           rovnice s odkazy na normu
      verification.json      stav odborného ověření (upravuje odborník)
      schema.ts              vstupní schéma (zod)
      calculate.ts           výpočet se stopou
    registry.ts              registr metodik (ed. 2 implementována, ed. 3 ne)
  catalog/                   předvolby: druhy objektů, vedení, vnitřní systémy
  domain/                    sdílené typy projektu, geometrie, návrh CD
  server/
    db/                      schéma Drizzle, připojení, migrace, seed
    services/                účty, workspace, projekty, kredity, náhled
    payments/                GoPay klient, simulovaná brána, zpracování plateb
    geo/                     klient ČÚZK a zjištění objektu
    documents/               model dokumentu, export DOCX a PDF
  app/                       stránky a API (Next.js App Router)
  components/                UI komponenty, průvodce analýzou
drizzle/                     SQL migrace
tests/                       integrační a jednotkové testy
e2e/                         Playwright test celého průchodu
docs/                        dokumentace
```

## Ceny

Ceny jsou v `src/config/pricing.ts` (výchozí hodnoty) a v databázi (tabulka `products`). Po spuštění je lze měnit v aplikaci v sekci **Správa** (role správce přes `ADMIN_EMAILS`). Výpočetní jádro na cenách nezávisí.

## Licence a data

Geodata © ČÚZK, licence CC BY 4.0. Normy ČSN nejsou součástí repozitáře.
