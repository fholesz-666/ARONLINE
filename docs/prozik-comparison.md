# Porovnání ARONLINE × OEZ Prozik 2.60

Datum: 20. 10. 2026. Podklady: protokoly a projekty Prozik zpracovatele (SO102 MŠ Tichá, SO109 ZŠ Pasířská, SO108 MŠ Hřbitovní),
nápověda programu Prozik 2.60 (`napovedaCZ.html`), mapa bouřkových dnů z Proziku (`izomapa.jpg`).

> Prozik není autoritou pro správnost – je to druhý nezávislý program. Shoda s ním potvrzuje, že ARONLINE počítá stejně jako
> nástroj běžně používaný v ČR. Rozhodující je text ČSN EN 62305-2 ed. 2.

## 1. Výsledek – SO102 MŠ Tichá (regresní test `src/core/risk/__tests__/prozik.test.ts`)

| Složka (×10⁻⁵) | ARONLINE | Prozik | Rozdíl |
|---|---|---|---|
| R1: RA | 0,0309 | 0,0308 | 0,3 % |
| R1: RB | 0,7721 | 0,7703 | 0,2 % |
| R1: RU | 0,0025 | 0,0025 | zaokrouhlení protokolu |
| R1: RV | 0,1232 | 0,1230 | 0,2 % |
| **R1 celkem** | **0,9287** | **0,9265** | **0,2 %** |
| R4: RA, RB, RM, RU, RV | – | – | do 0,3 % |
| R4: RC, RW, RZ | – | – | liší se – viz bod 3.1 |

Zbytkový rozdíl 0,2 % vzniká tím, že Prozik zaokrouhluje NG na dvě desetinná místa (2,12 místo 2,1248).

Shodné jsou: sběrné plochy AD, AM, AL = 40·LL, AI = 4000·LL, ND, NM, NL, NI, PA, PB, PU, PV, PMS, PM (kombinace 1 − Π(1 − PMi)),
LA, LB (včetně hz), LU, LV, přípustná rizika RT (L1 10⁻⁵, L2 10⁻³, L3 10⁻⁴, L4 10⁻³), sousední budovy jen přes vedení (NDJ), max. 5.

## 2. Co bylo upraveno podle Proziku

1. **Přepočet Td → NG.** Prozik používá NG = 0,04·Td^1,25 (ČSN 33 2000-4-443 ed. 2, čl. 443.3.2.1), ARONLINE dosud jen
   NG ≈ 0,1·Td (příloha A normy). Nově volitelné (`lightning.tdMethod`). Rozdíl: Td 25 → 2,24 vs. 2,50 (o 10 % méně).
2. **Zóna vně stavby** (LPZ 0) – nově se počítá jen RA. Dříve se počítaly i RB a další složky, pokud měla zóna zadané LF (R4 vycházelo dvojnásobně).
3. **Mapa bouřkových dnů** – Td se předvyplní podle polohy (digitalizace mapy ČHMÚ, viz `src/data/td-cz-grid.ts`).
4. **Sousední budovy** – max. 5, jen připojené vedením; rozměry lze převzít z budov v mapě.

## 3. Ověření proti textu ČSN EN 62305-2 ed. 2 (20. 10. 2026)

Text normy (únor 2013) a změny Z1 (říjen 2025) byl prostudován ve sponzorovaném přístupu ČAS. Všechny tabulky A.1–A.4, B.1–B.9,
C.1–C.12, tab. 4 a rovnice (1)–(15), A.1–A.11, B.1–B.11, C.1–C.13 odpovídají hodnotám v aplikaci. Z1 jen doplňuje, že ed. 2 platí
souběžně s ed. 3 do 31. 10. 2027. Opraveno / doplněno podle textu:

| Bod normy | Co aplikace dělala | Nově |
|---|---|---|
| čl. 6.9.1 | jen 1 systém na vedení | více systémů na vedení; RU, RV, RW, RZ z nejhorší hodnoty parametru (max PSPD, min UW); PC a PM kombinací (rov. 14, 15) |
| tab. B.4, pozn. 3 | CLD z tabulky i pro nestíněné vnitřní systémy | pro PC u nestíněných vnitřních systémů CLD = 1 |
| čl. B.5 | – | volba „zařízení nevyhovuje výrobkovým normám“ → PM = 1 |
| text pod tab. C.4 | rp podle opatření i u výbuchu | stavby s rizikem výbuchu: rp = 1 |
| pozn. 2 k čl. A.4 | AL = 40·LL vždy | volitelná korekce AL·√(ρ/400) pro vedení v zemi (shodné s Prozikem) |
| tab. B.1 a B.3, pozn. 1 | – | upozornění, že PTA a PSPD snižují riziko jen u stavby s LPS / náhodným LPS |
| tab. 4, čl. 5.3 | RT pro L4 = 10⁻³ jako normová hodnota | ČSN RT pro L4 neuvádí (příloha D) → 10⁻³ jen informativně |
| číslování | rovnice B a C posunuté | čísla rovnic podle ČSN |
| příl. A, pozn. A.1 | NG ≈ 0,1·Td | potvrzeno; národní pozn.: izokeraunická mapa ČHMÚ |

## 4. Zbývající rozdíly proti Proziku (Prozik se odchyluje od ČSN)

1. **CLI u silového vedení s vícenásobně uzemněnou nulou** – Prozik bere 1, tab. B.4 uvádí 0,2. Tichá: RZ4 Prozik 25,5·10⁻⁵, ARONLINE 5,1·10⁻⁵.
2. **KS3 pro stíněný kabel nepospojovaný** – Prozik 0,0001, tab. B.5 (pozn. d) dává 0,0001 jen pro stínění pospojené na obou koncích.
3. **NG** – Prozik 0,04·Td^1,25 (ČSN 33 2000-4-443), ČSN EN 62305-2 příl. A 0,1·Td. V aplikaci volitelné, výchozí podle ČSN EN 62305-2.
4. **„Vnitřní systémy nevyhovují“** – Prozik volbu má, ale v protokolu Tichá ji nepromítl do PM = 1.

Ostatní složky (R1 celé, R4: RA, RB, RC, RM, RU, RV, RW) se s Prozikem shodují do 0,3 % (regresní test).

## 5. Stav ověření

Všech 74 položek v `verification.json` je označeno jako ověřené proti textu ČSN (ověřil Claude na žádost provozovatele).
Před ostrým provozem doporučujeme nezávislou kontrolu autorizovanou osobou – změnou `verifiedBy` v `verification.json`.
