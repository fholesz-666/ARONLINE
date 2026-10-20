# Referenční příklady pro ověření výpočetního jádra

Sem patří **ověřené** referenční příklady, např. případové studie z přílohy E normy
ČSN EN 62305-2 ed. 2 (venkovský dům, kancelářská budova, nemocnice, bytový dům).

Text ani hodnoty normy nejsou v repozitáři, protože jde o placený dokument. Příklady doplní odborník,
který má normu legálně k dispozici. Soubor s příkladem nesmí kopírovat text normy, jen čísla
potřebná k testu.

## Formát souboru `*.json`

```json
{
  "name": "Příloha E.2 – venkovský dům, varianta bez ochrany",
  "source": "ČSN EN 62305-2 ed. 2, příloha E.2, tab. E.x",
  "verifiedBy": "Ing. …",
  "verifiedAt": "2026-11-15",
  "methodologyId": "CSN_EN_62305_2_ED2",
  "input": { "...": "vstup ve formátu zEd2Input (src/core/risk/methodologies/csn-en-62305-2-ed2/schema.ts)" },
  "expected": {
    "ND": 0.0,
    "NM": 0.0,
    "risks": { "L1": 0.0 },
    "components": { "L1": { "RA": 0.0, "RB": 0.0 } }
  },
  "relativeTolerance": 0.02
}
```

Test `reference.test.ts` načte všechny soubory v této složce a porovná výsledky s tolerancí
`relativeTolerance` (norma uvádí výsledky zaokrouhlené). Bez souborů se test přeskočí
a v přehledu testů je vidět jako „skipped“.
