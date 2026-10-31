# Přehled automatických a ručních údajů

| Údaj | Zdroj v aplikaci | Kvalita | Projektant musí |
|---|---|---|---|
| Souřadnice objektu | ČÚZK GeocodeSOE (adresa, parcela) nebo klik do mapy | přesné (adresní bod / definiční bod parcely) | zkontrolovat výběr budovy |
| Adresa | RÚIAN – nejbližší adresní místo | ověřené | potvrdit |
| Parcela, katastrální území | RÚIAN – vrstva Parcela a Katastrální území | ověřené | potvrdit |
| Obrys budovy | RÚIAN – Stavební objekt (z DKM/UKM) | dobré, jen u budov s digitální KM | vybrat správnou budovu, u chybějícího obrysu zadat rozměry |
| Délka L, šířka W | výpočet z obrysu (obdélník minimální plochy) | dobré (odchylka < 3 % u testované budovy) | potvrdit, u členitých budov upravit |
| Zastavěná plocha | výpočet z obrysu | dobré | – |
| Výška H | odhad DMP 1G − DMR 5G | **orientační** (stáří DMP, stromy, nástavby) | ověřit podle výkresů |
| Nadmořská výška terénu | DMR 5G | dobré | – |
| Okolní budovy a vzdálenosti | RÚIAN – obrysy, vzdálenost obrys–obrys | dobré | vyloučit nerelevantní objekty |
| Výška okolních budov | odhad z výškopisu (10 nejbližších) | orientační | doplnit u rozhodujících budov |
| Součinitel polohy CD | návrh z okolí do 3H | návrh | rozhodnout (včetně polohy na kopci) |
| Druh objektu | návrh z RÚIAN (způsob využití) | návrh | potvrdit |
| Hustota výbojů NG / Td | **nedostupné automaticky** | – | zadat se zdrojem |
| Přívodní vedení (typ, uložení, délka, stínění) | **nedostupné automaticky**, jen předvolby | – | zadat z vyjádření správce sítě / projektu přípojky, označit zdroj |
| Prostředí vedení CE | předvolba „předměstské“ | – | zvolit |
| Zóny, osoby, doba přítomnosti | předvolby podle druhu objektu | předvolba | upravit podle provozu |
| Požární riziko rf, opatření rp, panika hz | předvolby podle druhu objektu | předvolba | ověřit podle PBŘ |
| Ztráty LT, LF, LO | typické hodnoty z tabulek normy podle druhu objektu | normové (neověřené) | potvrdit nebo zadat vlastní hodnotu se zdůvodněním |
| Ochranná opatření (LPS, SPD, stínění) | – | – | zadat navržený stav |

Každý automaticky převzatý nebo předvyplněný údaj má v aplikaci štítek původu („převzato“, „předvolba“, „výchozí“, „ručně“), zdroj a datum. V kroku **Kontrola údajů** ho projektant potvrdí. V dokumentu je stav potvrzení uveden v tabulce v kap. 5 (sloupec „Potvrzeno“).

Rozlišení údajů o vedení: **ověřeno** (vyjádření / projekt správce), **orientačně** (mapa, prohlídka), **neověřeno – nutno od správce sítě**, **zadal projektant**.
