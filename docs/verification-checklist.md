# Kontrolní seznam pro odborné ověření výpočetního jádra

> Soubor je generován skriptem `npm run verification:checklist`. Neupravujte ho ručně.

Metodika: **ČSN EN 62305-2 ed. 2:2013** · otisk normativních dat: `009e964664c0a030`

Stav: ověřeno **0 / 74**, neověřeno 74, zamítnuto 0.

## Postup ověření

1. Ověřovatel musí mít legálně pořízený text ČSN EN 62305-2 ed. 2 (únor 2013).
2. U každé tabulky porovná **všechny hodnoty** a u rovnice **vzorec i rozsah platnosti** s textem normy.
3. Výsledek zapíše do `src/core/risk/methodologies/csn-en-62305-2-ed2/verification.json`:
   ```json
   "ED2.TAB.A.1": { "status": "verified", "verifiedBy": "Ing. … (ČKAIT …)", "verifiedAt": "2026-11-15", "verifiedAgainst": "ČSN EN 62305-2 ed. 2, 02/2013" }
   ```
   Při nesouladu nastaví `"status": "rejected"`, do `note` uvede správnou hodnotu a nahlásí opravu.
4. Po opravě hodnot spustí `npm test`, zvýší `CORE_VERSION` v `src/core/risk/index.ts` a znovu vygeneruje tento seznam.
5. Doplní referenční příklady z normy (příloha E) do `src/core/risk/__tests__/reference/` – viz README v té složce.

Popisy řádků tabulek jsou parafráze, nikoliv text normy. Ověřuje se **hodnota** a **přiřazení k situaci**.

## Tabulky

### ED2.TAB.A.1 – Součinitel polohy objektu CD

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. A.1** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.3.1

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `surrounded_higher` | Objekt obklopený vyššími objekty | 0.25 |
| ☐ | `surrounded_same_or_lower` | Objekt obklopený objekty stejné nebo nižší výšky | 0.5 |
| ☐ | `isolated` | Osamělý objekt (v okolí do 3H nejsou jiné objekty) | 1 |
| ☐ | `isolated_hilltop` | Osamělý objekt na vrcholu kopce nebo pahorku | 2 |

### ED2.TAB.A.2 – Součinitel instalace vedení CI

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. A.2** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.3.2

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `aerial` | Venkovní (nadzemní) vedení | 1 |
| ☐ | `buried` | Vedení uložené v zemi | 0.5 |
| ☐ | `buried_meshed` | Kabel v zemi vedený celou délkou uvnitř mřížové uzemňovací soustavy | 0.01 |

### ED2.TAB.A.3 – Součinitel typu vedení CT

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. A.3** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.3.3

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `lv_tlc` | Silové vedení NN, telekomunikační nebo datové vedení | 1 |
| ☐ | `hv_with_transformer` | Silové vedení VN (s transformátorem VN/NN) | 0.2 |

### ED2.TAB.A.4 – Součinitel prostředí vedení CE

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. A.4** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.3.4

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `rural` | Venkovské prostředí | 1 |
| ☐ | `suburban` | Předměstské prostředí | 0.5 |
| ☐ | `urban` | Městské prostředí | 0.1 |
| ☐ | `urban_tall` | Městské prostředí s budovami vyššími než 20 m | 0.01 |

### ED2.TAB.B.1 – Pravděpodobnost PTA úrazu dotykovým a krokovým napětím (úder do objektu)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.1** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno. Při více opatřeních se hodnoty násobí (pravidlo uvedené u tabulky – ověřit).
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.4.1

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Bez ochranných opatření | 1 |
| ☐ | `warning_notices` | Výstražné tabulky | 0.1 |
| ☐ | `insulation` | Elektrická izolace přístupných částí (např. svodů) | 0.01 |
| ☐ | `soil_equipotential` | Účinné vyrovnání potenciálu v zemi | 0.01 |
| ☐ | `physical_restrictions` | Fyzické zábrany nebo konstrukce budovy využitá jako soustava svodů | 0 |

### ED2.TAB.B.2 – Pravděpodobnost PB hmotné škody podle ochranných opatření (LPS)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.2** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.4.2

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Objekt není chráněn LPS | 1 |
| ☐ | `lps_iv` | LPS třídy IV | 0.2 |
| ☐ | `lps_iii` | LPS třídy III | 0.1 |
| ☐ | `lps_ii` | LPS třídy II | 0.05 |
| ☐ | `lps_i` | LPS třídy I | 0.02 |
| ☐ | `lps_i_framework` | Jímací soustava odpovídající LPS I a spojitá kovová nebo železobetonová konstrukce jako náhodný svod | 0.01 |
| ☐ | `metal_roof_framework` | Kovová střecha a jímací soustava (i náhodné součásti) s úplnou ochranou střešních instalací a spojitá kovová nebo železobetonová konstrukce jako náhodný svod | 0.001 |

### ED2.TAB.B.3 – Pravděpodobnost PSPD podle LPL, pro kterou je navržen koordinovaný systém SPD

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.3** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010; shodují se s veřejným zdrojem DEHN LPG. Proti textu ČSN neověřeno.
- Veřejný zdroj: [DEHN – Lightning Protection Guide, 3. vyd. (2014), kap. 3.2](https://www.dehn-international.com/sites/default/files/media/files/lpg_en_complete.pdf), tab. 3.2.4.3

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Bez koordinovaného systému SPD | 1 |
| ☐ | `lpl_iii_iv` | Koordinované SPD pro LPL III–IV | 0.05 |
| ☐ | `lpl_ii` | Koordinované SPD pro LPL II | 0.02 |
| ☐ | `lpl_i` | Koordinované SPD pro LPL I | 0.01 |
| ☐ | `better_0005` | SPD s lepšími parametry než pro LPL I – horní mez rozsahu | 0.005 |
| ☐ | `better_0001` | SPD s lepšími parametry než pro LPL I – dolní mez rozsahu | 0.001 |

### ED2.TAB.B.4 – Součinitele CLD a CLI podle stínění, uzemnění a izolace vedení

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.4** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `aerial_unshielded` | Nestíněné venkovní vedení | cld: 1; cli: 1 |
| ☐ | `buried_unshielded` | Nestíněné vedení v zemi | cld: 1; cli: 1 |
| ☐ | `multi_grounded_neutral` | Silové vedení s vícenásobně uzemněným středním vodičem (PEN) | cld: 1; cli: 0.2 |
| ☐ | `shielded_buried_not_bonded` | Stíněné vedení v zemi – stínění NENÍ spojeno se stejnou ekvipotenciální přípojnicí jako zařízení | cld: 1; cli: 0.3 |
| ☐ | `shielded_aerial_not_bonded` | Stíněné venkovní vedení – stínění NENÍ spojeno se stejnou ekvipotenciální přípojnicí jako zařízení | cld: 1; cli: 0.1 |
| ☐ | `shielded_buried_bonded` | Stíněné vedení v zemi – stínění spojeno se stejnou ekvipotenciální přípojnicí jako zařízení | cld: 1; cli: 0 |
| ☐ | `shielded_aerial_bonded` | Stíněné venkovní vedení – stínění spojeno se stejnou ekvipotenciální přípojnicí jako zařízení | cld: 1; cli: 0 |
| ☐ | `lightning_protective_cable` | Bleskově odolný kabel nebo vedení v kovovém kanálu/trubce spojeném s ekvipotenciální přípojnicí | cld: 0; cli: 0 |
| ☐ | `no_external_line` | Bez připojení k vnějšímu vedení (samostatný systém) | cld: 0; cli: 0 |
| ☐ | `isolating_interface` | Libovolné vedení s oddělovacím rozhraním podle ČSN EN 62305-4 | cld: 0; cli: 0 |

### ED2.TAB.B.5 – Součinitel KS3 podle provedení vnitřní kabeláže

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.5** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `unshielded_no_precaution` | Nestíněný kabel bez opatření proti smyčkám (plocha smyčky řádově 50 m²) | 1 |
| ☐ | `unshielded_avoid_large_loops` | Nestíněný kabel, trasy volené proti velkým smyčkám (plocha smyčky řádově 10 m²) | 0.2 |
| ☐ | `unshielded_avoid_loops` | Nestíněný kabel, vodiče ve společném kabelu (plocha smyčky řádově 0,5 m²) | 0.01 |
| ☐ | `shielded_bonded` | Stíněné kabely nebo kabely v kovových trubkách, stínění spojeno na obou koncích s ekvipotenciální přípojnicí | 0.0001 |

### ED2.TAB.B.6 – Pravděpodobnost PTU úrazu dotykovým napětím (úder do vedení)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.6** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Bez ochranných opatření | 1 |
| ☐ | `warning_notices` | Výstražné tabulky | 0.1 |
| ☐ | `insulation` | Elektrická izolace | 0.01 |
| ☐ | `physical_restrictions` | Fyzické zábrany | 0 |

### ED2.TAB.B.7 – Pravděpodobnost PEB podle LPL, pro kterou jsou navrženy SPD pro vyrovnání potenciálů

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.7** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Bez SPD pro vyrovnání potenciálů | 1 |
| ☐ | `lpl_iii_iv` | SPD pro LPL III–IV | 0.05 |
| ☐ | `lpl_ii` | SPD pro LPL II | 0.02 |
| ☐ | `lpl_i` | SPD pro LPL I | 0.01 |
| ☐ | `better_0005` | SPD s lepšími parametry než pro LPL I – horní mez rozsahu | 0.005 |
| ☐ | `better_0001` | SPD s lepšími parametry než pro LPL I – dolní mez rozsahu | 0.001 |

### ED2.TAB.B.8 – Pravděpodobnost PLD podle odporu stínění RS a výdržného napětí UW

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.8** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `unshielded_or_not_bonded` | Nestíněné vedení, nebo stínění není spojeno se stejnou přípojnicí jako zařízení | 1: 1; 4: 1; 6: 1; 1.5: 1; 2.5: 1 |
| ☐ | `bonded_rs_5_20` | Stínění spojené se stejnou přípojnicí jako zařízení, 5 Ω/km < RS ≤ 20 Ω/km | 1: 1; 4: 0.9; 6: 0.8; 1.5: 1; 2.5: 0.95 |
| ☐ | `bonded_rs_1_5` | Stínění spojené se stejnou přípojnicí jako zařízení, 1 Ω/km < RS ≤ 5 Ω/km | 1: 0.9; 4: 0.3; 6: 0.1; 1.5: 0.8; 2.5: 0.6 |
| ☐ | `bonded_rs_le_1` | Stínění spojené se stejnou přípojnicí jako zařízení, RS ≤ 1 Ω/km | 1: 0.6; 4: 0.04; 6: 0.02; 1.5: 0.4; 2.5: 0.2 |

### ED2.TAB.B.9 – Pravděpodobnost PLI podle typu vedení a výdržného napětí UW

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. B.9** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `power` | Silová vedení | 1: 1; 4: 0.16; 6: 0.1; 1.5: 0.6; 2.5: 0.3 |
| ☐ | `tlc` | Telekomunikační vedení | 1: 1; 4: 0.08; 6: 0.04; 1.5: 0.5; 2.5: 0.2 |

### ED2.TAB.C.2.LT – L1 – typická střední hodnota LT (úraz dotykovým a krokovým napětím)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.2** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `all` | Všechny typy objektů | 0.01 |

### ED2.TAB.C.2.LF – L1 – typická střední hodnota LF (fyzická škoda)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.2** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `explosion` | Nebezpečí výbuchu | 0.1 |
| ☐ | `hospital_hotel_school_civic` | Nemocnice, hotel, škola, občanská budova | 0.1 |
| ☐ | `entertainment_church_museum` | Veřejná zábava, kostel, muzeum | 0.05 |
| ☐ | `industrial_commercial` | Průmyslový, obchodní objekt | 0.02 |
| ☐ | `other` | Ostatní (např. obytné budovy) | 0.01 |

### ED2.TAB.C.2.LO – L1 – typická střední hodnota LO (porucha vnitřních systémů)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.2** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `explosion` | Nebezpečí výbuchu | 0.1 |
| ☐ | `icu_operating` | Jednotka intenzivní péče a operační sály nemocnice | 0.01 |
| ☐ | `hospital_other` | Ostatní části nemocnice | 0.001 |

### ED2.TAB.C.3 – Redukční součinitel rt podle povrchu země nebo podlahy

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.3** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `agricultural_concrete` | Zemědělská půda, beton (přechodový odpor ≤ 1 kΩ) | 0.01 |
| ☐ | `marble_ceramic` | Mramor, keramika (1–10 kΩ) | 0.001 |
| ☐ | `gravel_carpet` | Štěrk, koberec, textilní podlaha (10–100 kΩ) | 0.0001 |
| ☐ | `asphalt_linoleum_wood` | Asfalt, linoleum, dřevo (≥ 100 kΩ) | 0.00001 |

### ED2.TAB.C.4 – Redukční součinitel rp podle opatření ke zmírnění následků požáru

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.4** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno. Při více opatřeních se použije nejnižší hodnota (pravidlo u tabulky – ověřit).

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Žádná opatření | 1 |
| ☐ | `manual` | Jedno z opatření: hasicí přístroje, ručně ovládané stabilní hasicí zařízení, ruční hlásiče požáru, hydranty, požární úseky, únikové cesty | 0.5 |
| ☐ | `automatic` | Jedno z opatření: automatické stabilní hasicí zařízení, automatická elektrická požární signalizace (chráněná proti přepětí, s dojezdem hasičů do 10 min) | 0.2 |

### ED2.TAB.C.5 – Redukční součinitel rf podle nebezpečí požáru nebo výbuchu

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.5** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `explosion_zone_0_20` | Výbuch – zóny 0, 20 a pevné výbušniny | 1 |
| ☐ | `explosion_zone_1_21` | Výbuch – zóny 1, 21 | 0.1 |
| ☐ | `explosion_zone_2_22` | Výbuch – zóny 2, 22 | 0.001 |
| ☐ | `fire_high` | Požár – vysoké nebezpečí | 0.1 |
| ☐ | `fire_ordinary` | Požár – běžné nebezpečí | 0.01 |
| ☐ | `fire_low` | Požár – malé nebezpečí | 0.001 |
| ☐ | `none` | Žádné nebezpečí požáru ani výbuchu | 0 |

### ED2.TAB.C.6 – Součinitel hz zvyšující ztrátu při zvláštním nebezpečí

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.6** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `none` | Bez zvláštního nebezpečí | 1 |
| ☐ | `panic_low` | Nízká úroveň paniky | 2 |
| ☐ | `panic_average` | Průměrná úroveň paniky | 5 |
| ☐ | `evacuation_difficult` | Obtížná evakuace | 5 |
| ☐ | `panic_high` | Vysoká úroveň paniky | 10 |

### ED2.TAB.C.8.LF – L2 – typická střední hodnota LF (ztráta veřejné služby, fyzická škoda)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.8** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `gas_water_power` | Dodávka plynu, vody, elektrické energie | 0.1 |
| ☐ | `tv_tlc` | TV a telekomunikační vedení | 0.01 |

### ED2.TAB.C.8.LO – L2 – typická střední hodnota LO (ztráta veřejné služby, porucha systémů)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.8** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `gas_water_power` | Dodávka plynu, vody, elektrické energie | 0.01 |
| ☐ | `tv_tlc` | TV a telekomunikační vedení | 0.001 |

### ED2.TAB.C.10 – L3 – typická střední hodnota LF (ztráta kulturního dědictví)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.10** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `museums_galleries` | Muzea, galerie | 0.1 |

### ED2.TAB.C.12.LT – L4 – typická střední hodnota LT (ztráta zvířat)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.12** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `animals` | Objekty, kde se vyskytují pouze zvířata | 0.01 |

### ED2.TAB.C.12.LF – L4 – typická střední hodnota LF (ekonomická ztráta, fyzická škoda)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.12** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `explosion` | Nebezpečí výbuchu | 1 |
| ☐ | `hospital_industrial_museum_agriculture` | Nemocnice, průmysl, muzeum, zemědělství | 0.5 |
| ☐ | `hotel_school_office_church_entertainment_commercial` | Hotel, škola, kancelářská budova, kostel, veřejná zábava, obchod | 0.2 |
| ☐ | `other` | Ostatní | 0.1 |

### ED2.TAB.C.12.LO – L4 – typická střední hodnota LO (ekonomická ztráta, porucha systémů)

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. C.12** · stav: **unverified**
- Původ: Hodnoty přepsány podle metodiky IEC 62305-2:2010 (znalost implementátora). Veřejný zdroj s úplnou tabulkou nebyl nalezen. Proti textu ČSN neověřeno.

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `explosion` | Nebezpečí výbuchu | 0.1 |
| ☐ | `hospital_industrial_office_hotel_commercial` | Nemocnice, průmysl, kancelářská budova, hotel, obchod | 0.01 |
| ☐ | `museum_agriculture_school_church_entertainment` | Muzeum, zemědělství, škola, kostel, veřejná zábava | 0.001 |
| ☐ | `other` | Ostatní | 0.0001 |

### ED2.TAB.T4 – Typické hodnoty přípustného rizika RT

- Odkaz: **ČSN EN 62305-2 ed. 2, tab. 4 a předmluva** · stav: **unverified**
- Původ: Hodnoty pro L3 a L4 podle veřejné předmluvy IEC 62305-2:2010. Hodnoty pro L1 a L2 podle znalosti implementátora. Proti textu ČSN neověřeno.
- Veřejný zdroj: [IEC 62305-2:2010 – veřejný náhled (předmluva): RT pro L3 sníženo na 10⁻⁴, zavedeno RT = 10⁻³ pro L4](https://webstore.ansi.org/preview-pages/IEC/preview_iec62305-2%7Bed2.0%7Den.pdf)

| ☐ | Klíč | Popis | Hodnota |
|---|---|---|---|
| ☐ | `L1` | Ztráta lidského života nebo trvalé zranění | 0.00001 |
| ☐ | `L2` | Ztráta veřejné služby | 0.001 |
| ☐ | `L3` | Ztráta kulturního dědictví | 0.0001 |
| ☐ | `L4` | Ztráta ekonomické hodnoty (není-li k dispozici analýza nákladů) | 0.001 |

## Rovnice

| ☐ | ID | Vzorec | Odkaz | Stav | Původ |
|---|---|---|---|---|---|
| ☐ | `ED2.EQ.A.1` | NG ≈ 0,1 · TD | příloha A, rov. (A.1) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG. Proti textu ČSN neověřeno. |
| ☐ | `CSN.332000-4-443.EQ.NG` | NG = 0,04 · TD^1,25 | ČSN 33 2000-4-443 ed. 2, čl. 443.3.2.1 | unverified | Vztah uvedený v nápovědě programu OEZ Prozik 2.60 (odkaz na ČSN 33 2000-4-443 ed. 2, čl. 443.3.2.1); číselně ověřeno na protokolech Prozik (Td 24 → NG 2,12; Td 25 → NG 2,24). Proti textu ČSN 33 2000-4-443 neověřeno. |
| ☐ | `ED2.EQ.A.2` | AD = L · W + 2 · (3 · H) · (L + W) + π · (3 · H)² | příloha A, rov. (A.2) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.3` | AD' = π · (3 · Hp)² | příloha A, rov. (A.3) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.4` | ND = NG · AD · CD · 10⁻⁶ | příloha A, rov. (A.4) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.5` | NDJ = NG · ADJ · CDJ · CT · 10⁻⁶ | příloha A, rov. (A.5) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.6` | NM = NG · AM · 10⁻⁶ | příloha A, rov. (A.6) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.7` | AM = 2 · 500 · (L + W) + π · 500² | příloha A, rov. (A.7) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.8` | NL = NG · AL · CI · CE · CT · 10⁻⁶ | příloha A, rov. (A.8) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.9` | AL = 40 · LL | příloha A, rov. (A.9) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.10` | NI = NG · AI · CI · CE · CT · 10⁻⁶ | příloha A, rov. (A.10) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.A.11` | AI = 4 000 · LL | příloha A, rov. (A.11) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG a číselně se shoduje s veřejnou zprávou (test v src/core/risk/__tests__). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.1` | PA = PTA · PB | příloha B, rov. (B.1) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG. Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.2` | PC = PSPD · CLD | příloha B, rov. (B.2) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG. Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.3` | PC = 1 − Π (1 − PCi) | příloha B, rov. (B.3) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.4` | PM = PSPD · PMS | příloha B, rov. (B.4) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.5` | PMS = (KS1 · KS2 · KS3 · KS4)² | příloha B, rov. (B.5) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.6` | KS1 = 0,12 · wm1 (max. 1) | příloha B, rov. (B.6) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.7` | KS2 = 0,12 · wm2 (max. 1) | příloha B, rov. (B.7) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.8` | KS4 = 1 / UW | příloha B, rov. (B.8) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.9` | PU = PTU · PEB · PLD · CLD | příloha B, rov. (B.9) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.10` | PV = PEB · PLD · CLD | příloha B, rov. (B.10) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.11` | PW = PSPD · PLD · CLD | příloha B, rov. (B.11) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.B.12` | PZ = PSPD · PLI · CLI | příloha B, rov. (B.12) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.1` | LA = rt · LT · nz/nt · tz/8 760 | příloha C, rov. (C.1) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.2` | LU = rt · LT · nz/nt · tz/8 760 | příloha C, rov. (C.2) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.3` | LB = LV = rp · rf · hz · LF · nz/nt · tz/8 760 | příloha C, rov. (C.3) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.4` | LC = LM = LW = LZ = LO · nz/nt · tz/8 760 | příloha C, rov. (C.4) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.5` | LB = LV = rp · rf · LF · nz/nt | příloha C, rov. (C.5) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.6` | LC = LM = LW = LZ = LO · nz/nt | příloha C, rov. (C.6) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.7` | LB = LV = rp · rf · LF · cz/ct | příloha C, rov. (C.7) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.8` | LA = LU = rt · LT · ca/ct | příloha C, rov. (C.8) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.9` | LB = LV = rp · rf · LF · (ca + cb + cc + cs)/ct | příloha C, rov. (C.9) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.C.10` | LC = LM = LW = LZ = LO · cs/ct | příloha C, rov. (C.10) | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.1` | RX = NX · PX · LX | kap. 6.1 (základní rovnice) | unverified | Vzorec odpovídá veřejnému zdroji DEHN LPG. Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.2.RA` | RA = ND · PA · LA | kap. 6.2 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.2.RB` | RB = ND · PB · LB | kap. 6.2 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.2.RC` | RC = ND · PC · LC | kap. 6.2 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.3.RM` | RM = NM · PM · LM | kap. 6.3 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.4.RU` | RU = (NL + NDJ) · PU · LU | kap. 6.4 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.4.RV` | RV = (NL + NDJ) · PV · LV | kap. 6.4 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.4.RW` | RW = (NL + NDJ) · PW · LW | kap. 6.4 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.6.5.RZ` | RZ = NI · PZ · LZ | kap. 6.5 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.4.3.R1` | R1 = RA1 + RB1 + RC1* + RM1* + RU1 + RV1 + RW1* + RZ1*  (* jen u objektů s nebezpečím výbuchu, nemocnic se životně důležitými zařízeními a objektů, kde porucha vnitřních systémů přímo ohrožuje život) | kap. 4.3 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.4.3.R2` | R2 = RB2 + RC2 + RM2 + RV2 + RW2 + RZ2 | kap. 4.3 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.4.3.R3` | R3 = RB3 + RV3 | kap. 4.3 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |
| ☐ | `ED2.EQ.4.3.R4` | R4 = RA4** + RB4 + RC4 + RM4 + RU4** + RV4 + RW4 + RZ4  (** jen kde může dojít ke ztrátě zvířat) | kap. 4.3 | unverified | Vzorec podle metodiky IEC 62305-2:2010 (znalost implementátora). Proti textu ČSN neověřeno. |

## Další body k ověření (mimo tabulky)

- Kombinace více vnitřních systémů v zóně (PC = 1 − Π(1 − PCi), stejně pro PM).
- Zahrnutí RU/RV/RW/RZ pro vedení připojená k vnitřním systémům zóny (model „jeden systém na vedení a zónu, rozhoduje nejnižší UW“).
- Pravidlo pro více opatření PTA (součin) a rp (nejnižší hodnota – aplikace umožňuje vybrat jen jedno opatření).
- Postup pro délku úseku vedení LL > 1 000 m a neznámou délku (aplikace použije 1 000 m).
- Stanovení AD pro objekt s vyčnívající částí (aplikace bere max(AD; AD')).
- Referenční stav „bez ochranných opatření“ – výčet parametrů, které se ruší (viz `stripProtection`).
- Přepočet NG ≈ 0,1 · TD a doporučené zdroje NG pro ČR.
- Datum konce použitelnosti ed. 2 (aplikace: 31. 10. 2027).
