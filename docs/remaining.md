# Co musí dodat nebo odborně ověřit člověk

Seznam je seřazený podle důležitosti. Bez bodů A1–A3 nelze aplikaci komerčně spustit. Aplikace to sama hlídá: při `REQUIRE_VERIFIED_CORE=true` blokuje platby.

## A. Blokující pro komerční provoz

| # | Úkol | Kdo | Jak |
|---|---|---|---|
| A1 | **Ověřit všech 73 normových tabulek a vzorců** jádra ed. 2 proti legálně pořízenému textu ČSN EN 62305-2 ed. 2:2013 | odborník LPS s normou (nezávislý na implementaci) | [verification-checklist.md](verification-checklist.md) → zapsat do `verification.json`, `npm test` |
| A2 | Doplnit **referenční příklady z přílohy E normy** (min. 2 případové studie) jako automatické testy | odborník | `src/core/risk/__tests__/reference/README.md` |
| A3 | Posoudit **implementační volby** jádra (zóny, systémy na vedení, referenční stav bez opatření, LL, AD složitého objektu, L4 bez dat o hodnotách) | odborník | [calculations.md](calculations.md), kap. Implementační volby |
| A4 | Ověřit **přechodné ustanovení** souběžné platnosti ed. 2 a ed. 3 v ČR (aplikace počítá s koncem ed. 2 k 31. 10. 2027) | odborník / ČAS | upravit `usableUntil` v `src/core/risk/registry.ts` |
| A5 | **Právní kontrola** obchodních podmínek, zásad ochrany osobních údajů a reklamačního řádu. Doplnit provozovatele | právník | `src/app/(site)/pravni/*`, proměnné `OPERATOR_*` |
| A6 | Znění **závěru a upozornění** v dokumentu (odpovědnost zpracovatele, rozsah) | odborník + právník | `src/server/documents/model.ts`, kap. 8 a 9 |

## B. Přístupy a integrace (čekají na údaje)

| # | Úkol | Stav |
|---|---|---|
| B1 | **GoPay**: smlouva, sandbox klíče, test, produkční klíče, **aktivace opakovaných plateb** | Integrace hotová a otestovaná proti simulované bráně a simulovaným odpovědím API. **Proti skutečnému GoPay sandboxu netestováno** (chybí přístupové údaje) |
| B2 | **Hosting**: účet Render (nebo VPS), import `render.yaml`, proměnné prostředí | **Nenasazeno.** Připraveno |
| B3 | **Push do GitHubu**: nainstalovat Claude GitHub App pro repozitář `aronline` (nebo kód nahrát ručně) | Kód je zatím jen v lokálních commitech v pracovním prostředí |
| B4 | **SMTP** pro e-maily (ověření e-mailu, obnova hesla, pozvánky) + SPF/DKIM | Nenastaveno. Ve vývoji se e-maily vypisují do konzole |
| B5 | **Doména** a `APP_URL` | Nenastaveno |
| B6 | Deploy hook Renderu jako tajemství `RENDER_DEPLOY_HOOK_URL` v GitHubu | Nenastaveno |
| B7 | **Docker obraz** sestavit a otestovat (jen u varianty VPS) | Nesestaveno – vývojové prostředí nemělo přístup k Docker Hubu |

## C. Obchodní rozhodnutí

| # | Otázka | Výchozí návrh v aplikaci |
|---|---|---|
| C1 | Limity předplatného | Profesionální: 30 analýz měsíčně, 1 uživatel. Firemní: 150 analýz, 5 uživatelů |
| C2 | Rozsah náhledu před zaplacením | Souhrn: rizika, verdikt a dominantní složky (`PREVIEW_DETAIL=summary`) |
| C3 | Co je „jedna analýza“ | Jeden objekt. Po odemčení se zamyká adresa, poloha a parcela |
| C4 | Platnost kreditů z balíčku | Bez omezení |
| C5 | **Účetní doklady** | GoPay faktury nevystavuje. Je nutné napojit fakturaci (např. Fakturoid / iDoklad) nebo vystavovat doklady ručně. **Neimplementováno** |
| C6 | Ceny | 149 Kč / 1 490 Kč / 499 Kč měsíčně / 1 990 Kč měsíčně (lze měnit v sekci Správa) |

## D. Odborná data, která aplikace nemá

- **Hustota výbojů NG pro ČR** – žádný otevřený komerčně použitelný zdroj. Projektant zadává ručně se zdrojem. Možnost: licence na data detekční sítě.
- **Ed. 3 (NSG, F, FT, nové sběrné plochy)** – implementace vyžaduje text normy ČSN EN IEC 62305-2 ed. 3. Doporučení: po ověření ed. 2 zahájit implementaci ed. 3 jako samostatný modul `methodologies/csn-en-iec-62305-2-ed3`. Do 31. 10. 2027 musí být hotová, jinak aplikace přestane počítat.
- **Inženýrské sítě** – nelze získat automaticky. Případně integrace na službu pro hromadné žádosti o vyjádření (MawisUtility) – mimo rozsah.

## E. Doporučená vylepšení (nepovinná)

1. Editace obrysu budovy v mapě (zatím: výběr budovy a ruční úprava rozměrů L, W, H).
2. Analýza nákladů a přínosů pro L4 (příloha D normy ed. 2) – neimplementováno.
3. Dodatečné ztráty v okolí (LE) – neimplementováno.
4. Dvoufázové přihlášení, přísnější CSP s nonce.
5. Generování dokladů o platbě (viz C5).
6. Záložní geokodér Mapy.com.
7. Šablony celých projektů (kind PROJECT je v DB připraven, UI ne).

## F. Co je hotové a otestované

- Výpočetní jádro ed. 2 se stopou výpočtu a metadaty původu: 30 testů, shoda příloh A s veřejnou zprávou.
- Účty, relace, workspace, oddělení dat: integrační testy.
- Kredity, odemykání, objednávky, platby (simulovaná brána), předplatné, obnovy, zrušení, refundace, idempotence a souběh: integrační testy.
- Export PDF a DOCX s českou diakritikou: integrační test a vizuální kontrola.
- Integrace ČÚZK: odpovědi ověřeny na živých službách, parsování otestováno na skutečných datech.
- Celý průchod aplikací v prohlížeči (registrace → analýza → platba → stažení): E2E test.

Výsledky testů: [test-results.md](test-results.md).
