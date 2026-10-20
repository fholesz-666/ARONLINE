# Průzkum – analýza rizika ochrany před bleskem (LPS)

**Datum ověření všech zdrojů v tomto dokumentu: 20. 10. 2026** (pokud není uvedeno jinak).
Zpracováno jako podklad pro návrh aplikace ARONLINE. Nejde o odborný posudek ani o výklad normy.

---

## 1. Shrnutí nejdůležitějších zjištění

| # | Zjištění | Dopad na aplikaci |
|---|---|---|
| 1 | Platí **ČSN EN IEC 62305-2 ed. 3** (říjen 2025, účinnost **1. 11. 2025**), nahrazuje ČSN EN 62305-2 ed. 2:2013. | Aplikace musí od začátku počítat s více vydáními normy a mít je striktně oddělená. |
| 2 | Evropská EN IEC 62305-2:2024 má **dow = 31. 10. 2027**. Do tohoto data lze podle dostupných informací souběžně používat ed. 2. | Výpočet podle **ed. 2** je použitelný **jen do 31. 10. 2027**. Aplikace to musí uživateli zobrazovat a v dokumentu uvádět. |
| 3 | Ed. 3 zásadně mění metodiku (jedno společné riziko R pro L1+L2, nová **četnost poškození F** vnitřních systémů, **NSG místo NG**, TWS, riziko osob ve volném prostoru, nová sběrná plocha AI). | Výpočet ed. 3 **nelze implementovat bez textu normy**. Vzorce ani tabulky nejsou veřejně dostupné. Modul ed. 3 je připraven jako „neimplementováno“. |
| 4 | Metodika ed. 2 (IEC 62305-2:2010) je částečně veřejně popsána v příručkách výrobců (DEHN Lightning Protection Guide) a v českých článcích. Úplné tabulky součinitelů jsou však **jen v placené normě**. | Výpočetní jádro ed. 2 je implementováno s tabulkami označenými **NEOVĚŘENO**. Před komerčním použitím je musí odborník porovnat s legálně pořízeným textem normy. |
| 5 | Neexistuje otevřený, komerčně použitelný zdroj **hustoty blesků NG** pro ČR. Detekční sítě (EUCLID, Blitzortung, WWLLN) mají licenční omezení. | NG / počet bouřkových dnů zadává projektant ručně **se zdrojem**. Aplikace nabízí přepočet NG ≈ 0,1 · Td (veřejně doložený). |
| 6 | Data ČÚZK (RÚIAN, katastrální mapa, ZABAGED, ortofoto, výškopis) jsou **otevřená data pod CC BY 4.0, zdarma** (ZABAGED, ortofoto a výškopis od 1. 7. 2023). | Lze je použít komerčně s uvedením zdroje „© ČÚZK“. |
| 7 | Inženýrské sítě (elektro, telekomunikace) **nelze spolehlivě získat automaticky**. DTM krajů zpřístupňuje veřejnosti jen základní informace, detail mají správci sítí. | Vedení zadává projektant (z vyjádření správce, z projektu přípojky). Aplikace nabízí předvolby a vysvětlení, nic nedomýšlí. |
| 8 | GoPay: REST API se sandboxem, notifikace **nejsou podepsané** (jen GET s `id`), stav se musí vždy ověřit dotazem na API. Opakované platby (AUTO / ON_DEMAND) vyžadují v produkci aktivaci u GoPay. | Serverové ověřování stavu, idempotentní připisování kreditu. Předplatné přes AUTO recurrence s měsíčním cyklem. |
| 9 | Akce GoPay „12 měsíců zdarma“ (tarif Start) existuje, ale s omezením: **karty do 50 000 Kč/měsíc**, pro nové obchodníky, kteří dosud nepřijímali karty. Měsíční poplatek je 12 měsíců zdarma, pak 80 Kč. | Nelze brát jako jistotu pro celý provoz. Podmínky ověřit při podpisu smlouvy. |
| 10 | Právní základ v ČR: **vyhláška 146/2024 Sb., § 26** (od 1. 7. 2024, nahradila 268/2009 Sb.) a **NV 190/2022 Sb., příloha 2, část A, bod I písm. f)** – „výpočet rizik pro zařízení určená na ochranu před účinky atmosférické elektřiny“ jako součást dokumentace pro výchozí revizi. | Do dokumentu uvádět právní a normový rámec. Konkrétní citace musí ověřit autor dokumentace. |

---

## 2. Normy – aktuální stav

### 2.1 ČSN EN IEC 62305-2 ed. 3 – Ochrana před bleskem – Část 2: Management rizika

- Katalogové číslo 522249, třídicí znak 341390, vydání **říjen 2025**, **účinnost od 1. 11. 2025**.
- Nahrazuje ČSN EN 62305-2 ed. 2:2013.
- Zdroje: [in-el.cz – ČSN EN IEC 62305-2 ed. 3](https://www.in-el.cz/norma/109820/ochrana-pred-bleskem-cast-2-management-rizik), [normy.biz – detail 522249](https://shop.normy.biz/detail/522249).
- Stránka technicke-normy-csn.cz (ÚNMZ/ČAS distributor) byla při ověření chráněna proti robotům. **Přechodné období na stránce ČAS nebylo ověřeno.**

### 2.2 EN IEC 62305-2:2024 (evropská úroveň)

- Publikováno 24. 10. 2024, schváleno CENELEC 17. 10. 2024.
- **dop 31. 10. 2025, dow 31. 10. 2027.** Nahrazuje EN 62305-2:2012.
- Zdroj: [iTeh – EN IEC 62305-2:2024](https://standards.iteh.ai/catalog/standards/clc/d8a84c19-131e-4a0c-ae4b-39055d4c72dc/en-iec-62305-2-2024).
- České shrnutí přechodu (vendor blog): „Přechodné období (do 31. 10. 2027)“, „Povinná účinnost (od 1. 11. 2027)“. Zdroj: [RB ELEKTRO](https://www.rbelektro.cz/l/nova-era-ochrany-pred-bleskem-co-prinasi-csn-en-62305-ed-3/). Jde o sekundární zdroj.
- ABB Furse uvádí pro BS EN 62305:2011/2012 úplné stažení k 31. 10. 2027. Zdroj: [ABB Furse – Standards Update Guide](https://search.abb.com/library/Download.aspx?DocumentID=9AKK108471A9047&LanguageCode=en&DocumentPartId=&Action=Launch).

> **K odbornému potvrzení:** přesné znění přechodného ustanovení v ČSN EN IEC 62305-2 ed. 3 (předmluva národní / „Souvisící ČSN“ / informace o souběžné platnosti). Aplikace zatím pracuje s datem **31. 10. 2027** jako koncem použitelnosti ed. 2.

### 2.3 Co mění ed. 3 (IEC 62305-2:2024) – veřejně známé informace

Podle předmluvy IEC 62305-2:2024 (veřejná ukázka) a shrnutí výrobců:

1. Koncept **jednoho rizika** sloučeného ze ztráty lidského života a ztráty požárem.
2. **Četnost poškození F**, které může narušit dostupnost vnitřních systémů, se porovnává s přípustnou četností **FT**.
3. Hustota úderů do země **NSG** nahrazuje hustotu výbojů NG. ABB Furse uvádí pro UK převod NSG = NG · k (k = 1,7). Hodnota k pro ČR není veřejně známa.
4. Dočasná opatření aktivovaná **systémem varování před bouřkou (TWS)** dle IEC 62793 snižují některé složky. Přibylo riziko přímého úderu do osob ve volném prostoru.
5. Sběrná plocha nepřímých úderů nově závisí na půdorysu a nejnižší impulzní odolnosti zařízení (místo pevných 500 m / 4 000 · LL).
6. Struktura normy: kap. 5–9 a přílohy A (N), B (PX), C (LX), D (PSPD), E (ztráty v okolí) a F (případové studie: dům, kancelářská budova, nemocnice).

Zdroje: [IEC 62305-2:2024 – ukázka (iTeh)](https://cdn.standards.iteh.ai/samples/22759/79367076f2d24b5ba0f2baae9cae4a36/IEC-62305-2-2024.pdf), [aetheric.nz – What changed](https://aetheric.nz/news/iec-62305-2-2024-changes/), [Ingesco](https://www.ingesco.com/en/print/43242), [ABB Furse](https://search.abb.com/library/Download.aspx?DocumentID=9AKK108471A9047&LanguageCode=en&DocumentPartId=&Action=Launch).

> **Závěr:** vzorce, tabulky ani přípustné hodnoty RT a FT ed. 3 nejsou veřejně dostupné. Bez legálně pořízeného textu normy je **nelze implementovat**. Aplikace má pro ed. 3 připravený oddělený modul se stavem „neimplementováno“.

### 2.4 ČSN EN 62305-2 ed. 2:2013 (IEC 62305-2:2010) – zdroj implementace

- Struktura tabulek ed. 2 je potvrzena veřejným náhledem IEC (seznam tabulek A.1–A.4, B.1–B.9, C.1–C.12, tabulka 4 „Typical values of tolerable risk RT“). Zdroj: [ANSI – náhled IEC 62305-2 ed. 2.0](https://webstore.ansi.org/preview-pages/IEC/preview_iec62305-2%7Bed2.0%7Den.pdf).
- Z předmluvy IEC 62305-2:2010: přípustné riziko ztráty kulturního dědictví sníženo z 10⁻³ na **10⁻⁴**, zavedena hodnota **RT = 10⁻³** pro ekonomické ztráty, když nejsou data pro analýzu nákladů.
- Veřejný sekundární zdroj se vzorci a částí tabulek: [DEHN Lightning Protection Guide (EN, 2014)](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf). Obsahuje vzorce AD, AM (500 m), AL = 40 · LL, AI = 4000 · LL, ND, NM, NL, NI, R = N · P · L, NG ≈ 0,1 · TD a tabulky CD, CE, CI, CT, PTA, PB, PSPD.
- Zbývající tabulky (CLD/CLI, KS3, PTU, PEB, PLD, PLI, LT/LF/LO, rt, rp, rf, hz) ve veřejných zdrojích v úplném znění dohledány nebyly.

> **Stav implementace:** hodnoty v `src/core/risk/methodologies/csn-en-62305-2-ed2/tables.ts` jsou u každé tabulky označeny číslem tabulky normy, veřejným zdrojem (pokud existuje) a stavem `unverified`. Viz `docs/verification-checklist.md`.

---

## 3. Právní rámec v ČR (pro text dokumentu)

| Předpis | Obsah relevantní pro analýzu rizika | Zdroj |
|---|---|---|
| Vyhláška **146/2024 Sb.**, o požadavcích na výstavbu, **§ 26 Ochrana před bleskem** (účinnost 1. 7. 2024, změněna vyhl. 97/2026 Sb.) | Odst. 1: povinná ochrana u výroben a skladů výbušných a hořlavých hmot a u nadzemních částí vyhrazených plynových zařízení. Odst. 2: ochrana tam, kde by blesk mohl ohrozit život či zdraví osob nebo zvířat, zejména u staveb pro bydlení a občanského vybavení, nebo způsobit značné škody. | [TZB-info – 146/2024 Sb.](https://www.tzb-info.cz/pravni-predpisy/vyhlaska-c-146-2024-sb-o-pozadavcich-na-vystavbu) |
| Nařízení vlády **190/2022 Sb.** | § 3 odst. 1 písm. b): LPS je vyhrazené technické elektrické zařízení. Příloha 2, část A, bod I písm. f): k výchozí revizi patří „výpočet rizik pro zařízení určená na ochranu před účinky atmosférické elektřiny“. Revizní lhůty (příloha 4): 2 roky (kritické systémy) / 4 roky. | [TZB-info – NV 190/2022 Sb.](https://www.tzb-info.cz/pravni-predpisy/narizeni-c-190-2022-sb-o-vyhrazenych-technickych-elektrickych-zarizenich-a-pozadavcich-na-zajisteni-jejich-bezpecnosti) |
| Vyhláška 268/2009 Sb., § 36 | **Historický** předpis, nahrazen vyhl. 146/2024 Sb. Starší vzorové zprávy se na něj odkazují. | [kníška.eu](https://www.kniska.eu/kniska/clanky-1/analyza_dle_vyhlasky), [in-el.cz](https://www.in-el.cz/is/1508/ktere-predpisy-plati-pro-ochranu-pred-bleskem) |

> **K odbornému potvrzení:** přesné znění § 26 po změně vyhláškou 97/2026 Sb.

---

## 4. Existující software a vzorové analýzy

### 4.1 Software

| Produkt | Výrobce | Poznámka |
|---|---|---|
| DEHNrisk (součást DEHNsupport Toolbox) | DEHN SE | Workflow: zákazník → projekt (NG podle PSČ) → objekt (poloha, typ, rozměry) → zóny → přívodní vedení → ztráty → opatření a náklady → tisk. [Návod Toolbox 3.1](https://www.dehn-international.com/sites/default/files/media/files/2137_EN_Instruction%20manual_Toolbox_3.1.pdf) |
| DEHN Risk Tool | DEHN SE | Generuje českou zprávu (příklad níže). |
| Prozik | OEZ s.r.o. | Český program, běžný v praxi. Veřejná dokumentace nebyla dohledána. |
| StrikeRisk v6 | ABB Furse | [ABB](https://new.abb.com/low-voltage/products/earthing-lightning-protection/furse/strikerisk-management-software) |
| Kníška | M. Kaucký (kniska.eu) | Bezplatný český program. [kniska.eu](https://www.kniska.eu/kniska/clanky-1/analyza_dle_vyhlasky) |

**Konkurenční výhoda ARONLINE:** webová aplikace bez instalace, automatické předvyplnění geometrie z ČÚZK, česká editovatelná dokumentace s razítkem zpracovatele a dohledatelný výpočet. Žádný z nalezených nástrojů nenabízí automatické načtení budovy a okolí z RÚIAN.

### 4.2 Struktura veřejně dostupných českých zpráv

Analyzované vzory (pouze struktura, žádné převzaté texty):

1. **Zpráva z DEHN Risk Tool** (SPŠ Náchod, 2022) – [smlouvy.gov.cz](https://smlouvy.gov.cz/smlouva/soubor/27646269/ZL6_P4_%C5%98%C3%ADzen%C3%AD%20rizika.pdf). Struktura:
   - Hlavička (program, datum, číslo projektu, strana)
   - Identifikace (projekt, parcely, investor, norma, zpracovatel s IČO)
   - 1. Normativní odkazy
   - 2. Riziko škod a příčiny (obecný úvod)
   - 3. Údaje o projektu: 3.1 vyhodnocovaná rizika a RT · 3.2 poloha a parametry budovy (sběrné plochy, hustota výbojů, součinitel polohy) · 3.3 zóny · 3.4 vedení · 3.5 riziko požáru · 3.6 protipožární opatření · 3.7 panika
   - 4. Vyhodnocení: R bez ochrany / s ochranou, tabulka opatření (opatření – požadavek – redukční součinitel)
   - 5. Právní stav
   - Místo, datum, podpis, razítko
2. **Zpráva „Výpočet řízení rizika dle ČSN EN 62305-2 ed. 2“** (Bílovec, 2023) – [nvb.cz](https://www.nvb.cz/base/files/attachments/831/61399-23022-3a-Vypocet-rizeni-rizik.pdf). Obsahuje: Ng z izokeraunické mapy, počet bouřkových dnů, rozměry L, W, H, AD, AM, ND, NM, tabulku vedení (AL, AI, NL, NI, NDJ, typ, uložení, prostředí, Uw, stínění) a zóny LPZ 0 / LPZ 1 s parametry. Výsledky R1–R4 jsou po zónách a porovnané s přípustnými hodnotami.

### 4.3 Co se v analýzách opakuje (pro předvolby)

| Údaj | Typicky | Lze předvyplnit? |
|---|---|---|
| Rozměry L × W × H | z výkresů | **Ano** – odhad z RÚIAN polygonu + výškopisu ČÚZK, s potvrzením |
| Součinitel polohy CD | „obklopen objekty stejné nebo nižší výšky“ | **Návrh** z okolních budov v okruhu 3H, rozhoduje projektant |
| NG / bouřkové dny | mapa, data detekční sítě | **Ne** – ruční zadání se zdrojem |
| NN přípojka | kabel v zemi, 1 000 m, předměstské/venkovské prostředí | Předvolba |
| Telekomunikační vedení | kabel v zemi / žádné | Předvolba |
| Zóny | Z1 venkovní prostor, Z2 vnitřek | Předvolba podle typu objektu |
| Požární riziko | běžné / malé podle požárního zatížení (PBŘ) | Výběr s nápovědou |
| Protipožární opatření | hasicí přístroje, hydranty | Výběr |
| Panika | do 2 podlaží a 100 osob = nízká | Výběr s nápovědou |
| Hodnocené ztráty | L1 vždy, L2 u veřejných služeb, L3 u památek, L4 dle investora | Podle typu objektu |
| Ztrátové hodnoty LT, LF, LO | typické hodnoty z tabulek | Podle typu objektu (z tabulky normy) |
| Třída LPS, SPD | III / LPL III–IV | Uživatel volí návrh |

---

## 5. Geografická a technická data v ČR

### 5.1 Licence ČÚZK

- RÚIAN: otevřená data od 2012. Digitální katastrální mapa: od 1. 1. 2014. ZABAGED®, ortofoto, státní mapová díla a geodetické základy: od **1. 7. 2023**. Licence **CC BY 4.0**, zdarma.
- Zdroje: [ČÚZK – Otevřená data](https://cuzk.gov.cz/Uvod/Produkty-a-sluzby/Otevrena-data/Otevrena-data-zakladni-informace.aspx), [Podmínky poskytování prostorových dat](https://cuzk.gov.cz/Predpisy/Podminky-poskytovani-prostor-dat-a-sitovych-sluzeb/Podminky-poskytovani-prostorovych-dat-CUZK.aspx).
- Povinnost: uvádět zdroj „© ČÚZK“ (CC BY). Limity zatížení služeb nejsou zveřejněny. Aplikace proto výsledky cachuje.

### 5.2 Konkrétní služby

| Účel | Služba | Poznámka |
|---|---|---|
| Vyhledání adresy | ArcGIS REST `https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/exts/GeocodeSOE` – `suggest`, `find`, `findAddressCandidates`, `tables/1/reverseGeocode` | [Rozhraní GeocodeSOE](https://geoportal.cuzk.gov.cz/Dokumenty/Rozhrani_GeocodeSOE.pdf), [Využití GeocodeSOE a QUERY](https://geoportal.cuzk.gov.cz/Dokumenty/Vyuziti_extenze_GeococeSOE_a_funkce_QUERY.pdf) |
| Adresní místa, stavební objekty, parcely | `https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/{id}/query` (vrstva 1 = AdresniMisto; ostatní ID se zjišťují za běhu z popisu služby) | Polygon stavebního objektu je v RÚIAN pro budovy s digitalizovanou KM. Jinak jen definiční bod. |
| Terén (DMR 5G) | `https://ags.cuzk.gov.cz/arcgis/rest/services/3D/dmr5g_wm/ImageServer` | Nadmořská výška terénu. [iteminfo](https://ags.cuzk.gov.cz/arcgis/rest/services/3D/dmr5g_wm/ImageServer/info/iteminfo) |
| Povrch (DMP 1G) | ImageServer DMP 1G (metadata [CZ-CUZK-AGS-DMP1G](https://geoportal.gov.cz/php/micka/record/turtle/CZ-CUZK-AGS-DMP1G)) | Výška budovy ≈ DMP − DMR. **Jen orientační odhad.** |
| Ortofoto | `https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer` (EPSG:3857) | Podklad mapy |
| Katastrální mapa | WMS ČÚZK | Podklad mapy (volitelné) |

### 5.3 Alternativy

- **Mapy.com REST API** (Seznam): geokódování za 4 kredity. Tarif Basic má 250 000 kreditů/měsíc zdarma, nad limit 1,60 Kč / 1 000 kreditů. Bezplatný tarif Extended podmiňuje veřejný bezplatný projekt. Zdroj: [developer.mapy.com/pricing](https://developer.mapy.com/pricing/). Použitelné jako záložní geokodér (vyžaduje API klíč).
- **OpenStreetMap / Overpass**: budovy s `height` / `building:levels`. Data ODbL (komerčně lze, s atribucí). Veřejné instance Overpass nejsou pro komerční provoz, komerční uživatelé mají použít vlastní nebo placený server. Zdroj: [OSM wiki – Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API). **Neimplementováno**, jen jako budoucí volba.

### 5.4 Hustota blesků / bouřková činnost

- Veřejně doložený přepočet: **NG ≈ 0,1 · TD** (TD = počet bouřkových dnů za rok). Zdroj: DEHN LPG (str. ~34). Stejně uvádí M. Kaucký ([elektrika.cz](https://elektrika.cz/data/clanky/vypocet-rizika-dle-csn-en-62305-2)).
- Detekční sítě nad ČR: EUCLID (komerční), Blitzortung (amatérská, nekomerční licence), WWLLN. Zdroj: [diplomová práce UK](https://dspace.cuni.cz/handle/20.500.11956/185459).
- **Otevřený komerčně použitelný zdroj NG pro ČR nebyl nalezen.**
- Ed. 3 pracuje s NSG. Převodní součinitel pro ČR není veřejný.

> **Řešení v aplikaci:** povinné ruční zadání NG (nebo Td s přepočtem) a povinný popis zdroje hodnoty. Hodnota se nikdy nedoplní automaticky.

### 5.5 Inženýrské sítě

- **DTM ČR** (digitální technická mapa, krajské systémy): „Základní informace jsou volně přístupné“, detail infrastruktury mají správci. Hromadné žádosti o vyjádření o existenci sítí podává např. MawisUtility. Zdroj: [BusinessInfo – DTM](https://www.businessinfo.cz/clanky/digitalni-technicka-mapa-cr-aneb-utility-cadastre-a-jeji-vyznam-pro-moderni-stavebnictvi/).
- Katastrální mapa průběh sítí neobsahuje.
- **Údaje nutné pro výpočet** (typ vedení, uložení, délka úseku LL, stínění a jeho spojení, transformátor VN/NN, prostředí, Uw) z veřejných dat spolehlivě získat nelze.

> **Řešení v aplikaci:** u každého údaje o vedení se zobrazuje rozlišení „ověřeno“ / „orientačně z mapy“ / „nutno od správce sítě“ / „zadal projektant“. Pokud délka LL není známa, aplikace nabídne bezpečnou volbu „neznámá → 1 000 m“, kterou uvádí DEHN LPG.

---

## 6. Platební brána GoPay

| Oblast | Zjištění | Zdroj |
|---|---|---|
| API | REST, sandbox `https://gw.sandbox.gopay.com/api`, produkce `https://gate.gopay.cz/api`. OAuth2 client_credentials, scope `payment-create` / `payment-all`, token platí 1 800 s. | [doc.gopay.com](https://doc.gopay.com/) |
| Vytvoření platby | `POST /payments/payment`, částka v haléřích, `order_number`, `callback.return_url` a `notification_url`, odpověď s `gw_url` | dtto |
| Stav | `GET /payments/payment/{id}`. Stavy: CREATED, PAYMENT_METHOD_CHOSEN, PAID, AUTHORIZED, CANCELED, TIMEOUTED, REFUNDED, PARTIALLY_REFUNDED | dtto, [help – stav platby](https://help.gopay.com/en/s/3) |
| Notifikace | HTTP **GET** na `notification_url` s `?id=` (u opakovaných i `parent_id`). **Bez podpisu** – obsahuje jen ID, stav je nutné zjistit dotazem na API. Server má vrátit HTTP 200, GoPay opakuje až 20×. | dtto |
| Opakované platby | `recurrence` AUTO (DAY/WEEK/MONTH + perioda + `recurrence_date_to`) nebo ON_DEMAND (`POST /payments/payment/{id}/create-recurrence`). Zrušení `POST /payments/payment/{id}/void-recurrence`. **V produkci nutná aktivace u GoPay.** Notifikace o zrušení karty se standardně neposílají. | [help – opakované platby](https://help.gopay.com/en/s/uR) |
| Refundace | `POST /payments/payment/{id}/refund` | [doc.gopay.com](https://doc.gopay.com/) |
| Ceník | Tarif **Start** (noví obchodníci, kteří dosud nepřijímali karty): karty zdarma 12 měsíců do 50 000 Kč/měsíc, pak 0,95 % + 0 Kč. Měsíční poplatek 12 měsíců zdarma, pak 80 Kč. Tarif **Growth**: 3 měsíce nebo do 500 000 Kč zdarma. Převod na účet 10 Kč, chargeback 990 Kč. | [gopay.com/en/pricing](https://www.gopay.com/en/pricing/) |
| Nový sazebník | Existuje „Sazebník poplatků … účinnost od 1. 11. 2026“. **Obsah nebyl při ověření dostupný.** | [help.gopay.com](https://help.gopay.com/cs/tema/cenik-a-obchodni-podminky/aktualni-cenik-a-obchodni-podminky/sazebniky-poplatku/sazebnik-poplatku-platebni-brany-gopay-ucinnost-od-1-11-2026) |

> **K ověření před spuštěním:** aktuální sazebník od 1. 11. 2026, nárok na akci Start, aktivace opakovaných plateb, podmínky pro neplátce DPH (vystavování dokladů).

---

## 7. Co musí odborně potvrdit člověk

1. **Všechny tabulkové hodnoty a vzorce ed. 2** v jádře – porovnat s textem ČSN EN 62305-2 ed. 2:2013 (checklist v `docs/verification-checklist.md`).
2. Přesné **přechodné ustanovení** pro souběžné použití ed. 2 a ed. 3 v ČR.
3. **Implementace ed. 3** – vyžaduje legálně pořízenou normu ČSN EN IEC 62305-2 ed. 3 a odborníka.
4. Přepočet **NG ≈ 0,1 · Td** a doporučené zdroje NG pro ČR.
5. Výklad pravidel pro **součinitel polohy CD** při automatickém návrhu z okolních budov.
6. Znění **závěru a upozornění** v dokumentu (odpovědnost zpracovatele).
7. Právní texty (obchodní podmínky, GDPR) – kontrola právníkem.
