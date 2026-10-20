# Implementované výpočty a jejich zdroje

## Metodiky

| Metodika | Stav | Použitelnost |
|---|---|---|
| ČSN EN 62305-2 ed. 2:2013 (IEC 62305-2:2010) | **implementováno**, tabulky a vzorce **neověřené** | do 31. 10. 2027 (podle dow EN IEC 62305-2:2024 – ověřit přechodné ustanovení ČSN) |
| ČSN EN IEC 62305-2 ed. 3:2025 (IEC 62305-2:2024) | **neimplementováno** | účinná od 1. 11. 2025. Vyžaduje legálně pořízený text normy |

Registr metodik: `src/core/risk/registry.ts`. Po 31. 10. 2027 jádro odmítne výpočet podle ed. 2.

## Co jádro ed. 2 počítá

| Oblast | Veličiny | Vzorec (odkaz) | Veřejný zdroj shody |
|---|---|---|---|
| Hustota výbojů | NG (z Td) | NG ≈ 0,1 · TD (A.1) | DEHN LPG |
| Sběrné plochy | AD, AD', AM, AL, AI, ADJ | (A.2), (A.3), (A.7), (A.9), (A.11) | DEHN LPG + číselná shoda s veřejnou zprávou (Bílovec 2023) |
| Nebezpečné události | ND, NM, NL, NI, NDJ | (A.4)–(A.10) | DEHN LPG + číselná shoda s veřejnou zprávou |
| Pravděpodobnosti | PA, PB, PC, PM, PMS, KS1–KS4, PU, PV, PW, PZ | (B.1)–(B.12) | PA, PC: DEHN LPG; ostatní bez veřejného zdroje |
| Ztráty | LA, LB, LC, LM, LU, LV, LW, LZ pro L1–L4 | (C.1)–(C.10) | bez veřejného zdroje |
| Složky rizika | RA, RB, RC, RM, RU, RV, RW, RZ | kap. 6 | R = N · P · L: DEHN LPG |
| Rizika | R1, R2, R3, R4 a porovnání s RT | kap. 4.3, tab. 4 | RT pro L3 a L4: veřejná předmluva IEC 62305-2:2010 |
| Referenční stav | totéž bez ochranných opatření | – | implementační volba (popsána v dokumentu) |

Normové tabulky (27) jsou v `src/core/risk/methodologies/csn-en-62305-2-ed2/tables.ts`. Každá tabulka má odkaz na číslo tabulky normy, popis původu hodnot a veřejné zdroje. Rovnice (46) jsou v `equations.ts`. Stav ověření vede `verification.json` a jeho souhrn je na stránce `/metodika`.

## Dohledatelnost

Ke každému výpočtu se ukládá (`calculation_runs`):

- úplný vstup a výsledek včetně **stopy výpočtu** (vzorec, dosazení, výsledek, jednotka a odkaz na normu u každé veličiny),
- `coreVersion` (verze jádra), `normativeDataHash` (otisk tabulek, vzorců a stavu ověření), `inputHash` (SHA-256 kanonického vstupu),
- kontext (identifikace stavby, zpracovatel, původ údajů).

Dokument PDF a DOCX obsahuje ID výpočtu, verzi jádra a oba otisky. Výpočet je deterministický: stejný vstup a stejná verze dávají stejný výsledek (ověřeno testem).

## Implementační volby, které musí posoudit odborník

1. **Vnitřní systémy:** v každé zóně jeden systém na vedení (rozhoduje nejnižší UW). PC a PM zóny = 1 − Π(1 − Pi).
2. **Složky z vedení** (RU, RV, RW, RZ) se počítají pro vedení připojená k vnitřním systémům zóny.
3. **PTA:** při více opatřeních součin. **rp:** volí se jedno opatření (s nejnižší hodnotou).
4. **LL:** neznámá délka = 1 000 m. Delší úsek = varování.
5. **AD složitého objektu:** max(AD; AD').
6. **Referenční stav bez opatření:** ruší se PB, PEB, PSPD, PTA, PTU, rp, KS1, KS2. Vedení, kabeláž (KS3), zóny a ztráty zůstávají.
7. **L4 bez údajů o hodnotách:** podíly hodnot zadává uživatel (výchozí 1 = konzervativní).
8. **Návrh CD z okolí:** pouze návrh podle budov do vzdálenosti 3H. Volbu potvrzuje projektant a „vrchol kopce“ aplikace nepozná.

## Testy

- `src/core/risk/__tests__/ed2.test.ts` – 30 testů: shoda příloh A s veřejnou zprávou, ruční kontrola vzorců, logika opatření, validace, determinismus, metadata.
- `src/core/risk/__tests__/reference.test.ts` – připravený test pro **referenční příklady z normy** (příloha E). Spustí se, až odborník doplní soubory do `src/core/risk/__tests__/reference/`.

## Postup ověření

Viz [verification-checklist.md](verification-checklist.md). Dokud nejsou všechny položky ověřené:

- dokumenty nesou výrazné označení **„Neověřený výpočet“**,
- při `REQUIRE_VERIFIED_CORE=true` (výchozí) jsou platby a placené exporty zablokovány.
