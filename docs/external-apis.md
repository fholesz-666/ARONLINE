# Externí služby a API

## ČÚZK (bez klíče, zdarma, CC BY 4.0)

Ověřeno dotazy z prohlížeče **20. 10. 2026**:

| Účel | Endpoint | Poznámka |
|---|---|---|
| Našeptávání adres a parcel | `https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/exts/GeocodeSOE/suggest?text=…&f=json` | Vrací typ `AdresniMisto` nebo `ParcelaDefinicniBod` a `magicKey` |
| Souřadnice vybraného místa | `…/GeocodeSOE/find?text=…&magicKey=…&outSR=4326&f=json` | |
| Adresa v bodě | `…/GeocodeSOE/tables/1/reverseGeocode?location={x,y,wkid:4326}&distance=60&f=json` | |
| Budovy (polygony) | `https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/3/query` | Vrstva `StavebniObjekt`: obrys, `zpusobvyuzitikod`, `pocetpodlazi`, `zdroj` (DKM/UKM) |
| Parcela | `…/RUIAN/MapServer/5/query` | `cisloparcely`, `druhcislovanikod` (1 = stavební), `katastralniuzemi` |
| Katastrální území | `…/RUIAN/MapServer/7/query?where=kod=…` | název k. ú. |
| Terén DMR 5G | `https://ags.cuzk.gov.cz/arcgis/rest/services/3D/dmr5g/ImageServer/identify` | `getSamples` je zakázán (HTTP 403), funguje `identify` |
| Povrch DMP 1G | `https://ags.cuzk.gov.cz/arcgis/rest/services/3D/dmp/ImageServer/identify` | Výška budovy ≈ max. povrch uvnitř obrysu − medián terénu kolem |
| Mapové dlaždice | `https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}` a `ZTM_WM` | Web Mercator, cache |

Implementace: `src/server/geo/cuzk.ts`, `src/server/geo/site.ts`.

- Všechny dotazy jdou **přes server** (proxy), ne z prohlížeče. Cache v tabulce `geo_cache` platí 30 dní (našeptávač 1 den).
- Časový limit 10 s, jeden opakovaný pokus. Při výpadku aplikace hodnotu **nedoplní** a vyzve k ručnímu zadání.
- Rate limit na uživatele: 120 dotazů za minutu (`src/server/ratelimit.ts`).
- ČÚZK nezveřejňuje limity zatížení. Při větším provozu sledujte chyby `cuzk_request_failed` v logu.
- Povinná atribuce „© ČÚZK“ je v mapě, v patičce i v dokumentu.

**Omezení dat:**

- Polygon budovy je jen u budov s digitalizovanou katastrální mapou. Jinak aplikace budovu nenajde a rozměry se zadají ručně.
- DMP 1G může být starší než stavba a zachycuje i stromy. Výška je vždy označena jako odhad a vyžaduje potvrzení.
- Výška okolních budov se odhaduje jen u 10 nejbližších (kvůli počtu dotazů).

## Mapové podklady

- Výchozí: ortofoto ČÚZK. Alternativy: základní mapa ČÚZK, OpenStreetMap.
- Dlaždice OpenStreetMap (`tile.openstreetmap.org`) mají vlastní pravidla používání, která nejsou určena pro intenzivní komerční provoz. Při růstu provozu vrstvu OSM odstraňte nebo přejděte na placeného poskytovatele.

## Volitelné rozšíření (neimplementováno)

- **Mapy.com REST API** – záložní geokodér (API klíč, 4 kredity za dotaz, tarif Basic 250 000 kreditů měsíčně zdarma). <https://developer.mapy.com/pricing/>
- **OpenStreetMap / Overpass** – výšky a počty podlaží budov z OSM. Pro komerční provoz je nutná vlastní nebo placená instance Overpass.
- **Hustota výbojů NG** – žádný otevřený komerčně použitelný zdroj pro ČR nebyl nalezen. Pokud získáte licenci na data detekční sítě (např. EUCLID), lze doplnit poskytovatele do kroku Bouřková činnost.

## SMTP

Libovolný poskytovatel SMTP (např. transakční e-mailová služba nebo SMTP vašeho hostingu). Nastavte `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `MAIL_FROM`. U domény odesílatele nastavte SPF a DKIM.
