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

## 3. Rozdíly, které vyžadují rozhodnutí podle textu normy

### 3.1 Více vnitřních systémů na jednom vedení
Prozik dovoluje připojit k jednomu vedení více zařízení (např. „Vedení NN“ i „Datové vedení“ na distribuční síť NN) a kombinuje je.
ARONLINE dovoluje jen jeden systém na vedení (zadává se nejhorší). Z protokolu Tichá vyplývá, že Prozik:
- PC a PM kombinuje 1 − Π(1 − Pi),
- PW na vedení vychází 1 (zařízení bez SPD),
- **PZ na vedení = max(PZi)** a pro datový systém vychází PZ = 0,6 = PSPD 1 · PLI 0,6 · **CLI 1** – ačkoli vedení je
  „silové vedení s vícenásobně uzemněnou nulou“, pro které ARONLINE (tab. B.4) bere CLI = 0,2.

Dopad: R4 Tichá – Prozik 27,5·10⁻⁵, ARONLINE (bez datového systému) 1,1·10⁻⁵. **Nutno ověřit v příloze B normy**:
pravidlo kombinace systémů pro PW/PZ a hodnotu CLI pro vedení s vícenásobně uzemněnou nulou.

### 3.2 Stíněný, ale nepospojovaný vnitřní kabel (KS3)
Prozik u „stíněný kabel nepospojovaný na obou koncích“ zjevně bere KS3 = 0,0001 (PM datového systému ≈ 0).
ARONLINE tuto kombinaci nemá; tab. B.5 podle znalosti implementátora dává 0,0001 jen pro stínění spojené na obou koncích.

### 3.3 Kabelové vedení a měrný odpor půdy
Prozik u „nestíněného kabelového vedení“ s ρ = 500 Ω·m počítá AL = 44 721 m² (= 2·√ρ·LL), ARONLINE AL = 40·LL = 40 000 m²
(rovnice A.9 ed. 2 – na ρ nezávisí). Nápověda Proziku uvádí „je-li měrný odpor půdy neznámý, předpokládá se 400 Ω·m“ – to odpovídá
vydání 1 normy. ARONLINE zůstává u ed. 2; ověřit v textu normy.

### 3.4 Vnitřní systémy „nevyhovují předmětovým normám“
Prozik má volbu „vnitřní systémy nevyhovují odolností…“ a pak „započítá maximální možnou hodnotu“. ARONLINE ji zatím nemá – ověřit,
na které pravděpodobnosti se v normě vztahuje.

## 4. Stav ověření

Text ČSN EN 62305-2 ed. 2 zatím k dispozici není (soubor `62305.PDF` na ploše je snímek obrazovky **části 4** ed. 3 v nízkém
rozlišení). Proto zůstávají všechny položky v `verification.json` jako **neověřené** a upozornění v aplikaci a dokumentech zůstává.
Po dodání PDF normy se ověří tabulky A.1–C.12 a body 3.1–3.4 a teprve pak se upozornění odstraní.
