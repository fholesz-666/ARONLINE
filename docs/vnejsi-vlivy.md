# VV online – protokol o určení vnějších vlivů

Stránka `/vnejsi-vlivy` (vlastní vzhled, route group `src/app/(vv)`) umožňuje komisi vyplnit protokol o určení vnějších vlivů zdarma a bez registrace.

## Normový podklad

- **ČSN 33 2000-5-51 ed. 3 + Z1 + Z2 (07/2022)**, příloha ZA, tabulka ZA.1 „Charakteristiky vnějších vlivů“ a příloha A „Stručný seznam vnějších vlivů“ – kódy, meze, požadované charakteristiky a příznak „normální“.
- Národní poznámky ČR: za normální se považují **AD1, AE1 a BC2**.
- Ověřeno proti plnému textu normy (sponzorovaný přístup ČAS) 16. 11. 2026.
- Katalog: `src/core/vv/catalog.ts`. Popisy a doporučená opatření jsou vlastní formulace, nejde o citace normy.
- U skupiny AM tabulka často neuvádí výslovně „normální“. Za normální je označena úroveň, u které tabulka nepožaduje zvláštní opatření ani zvláštní zařízení (viz komentáře v katalogu). Před ostrým provozem doporučujeme odbornou kontrolu.
- Klasifikaci „prostor normální / nebezpečný / zvlášť nebezpečný“ současné normy (ČSN 33 2000-1 ed. 2, 4-41 ed. 3, 5-51 ed. 3) neobsahují. Protokol proto uvádí závěr **normální / abnormální** podle toho, zda všechny posuzované vlivy jsou normální.

## Průběh

1. Objekt – název, adresa, objednatel, evidenční číslo, datum, podklady.
2. Komise – předseda + 1 až 8 členů.
3. Prostory – předvolby typických prostor (`src/core/vv/presets.ts`), úprava každého vlivu, vyhodnocení a minimální krytí IP.
4. Potvrzení – každý člen komise zaškrtne potvrzení (ukládá se s časem a IP – ochrana provozovatele), e-mail, souhlas s podmínkami, volitelně marketingový souhlas.

Po uložení dostane autor odkaz `/vnejsi-vlivy/protokol/<id>#t=<token>` (také e-mailem). Token je ve fragmentu, na server se posílá jen v hlavičce `X-VV-Token`; v DB je uložen jen jeho SHA-256.

## Zdarma a Profi

| | Zdarma | Profi (produkt `VV_PREMIUM`, výchozí 99 Kč) |
|---|---|---|
| PDF | jemný vodoznak, patička s logem FVSOL a odkazy na ARONLINE a FVSOL, zamčené proti úpravám (tisk povolen) | bez vodoznaku, patičky a zámku, s logem |
| DOCX | – | ano |

- Platba jen kartou (GoPay). Bez přihlášení se na pozadí založí účet hosta – stejně jako u jednorázové analýzy.
- Platba produktu VV **nezávisí** na `REQUIRE_VERIFIED_CORE` (ověření jádra analýzy rizika).
- Po ověřené platbě `fulfil()` nastaví `vv_protocols.premium_at`; vrácení platby ho zruší.
- Cenu lze měnit v administraci (Ceník). Produkt se nezobrazuje v ceníku analýz (`isAnalysisProduct`).

## API

| Metoda | Cesta | Popis |
|---|---|---|
| POST | `/api/vv/protocols` | nový protokol (rate limit 30/h na IP) |
| GET / PUT | `/api/vv/protocols/:id` | načtení / úprava (znovu potvrzení komise) |
| GET | `/api/vv/protocols/:id/pdf` | PDF |
| GET | `/api/vv/protocols/:id/docx` | DOCX (jen Profi, jinak 402) |
| GET / POST / DELETE | `/api/vv/protocols/:id/logo` | logo PNG/JPEG do 300 kB |
| POST | `/api/vv/protocols/:id/order` | objednávka Profi verze → přesměrování na GoPay |

Migrace: `drizzle/0003_vnejsi_vlivy.sql` (tabulka `vv_protocols`, sloupec `orders.vv_protocol_id`).

## Účty a kredity

- Do účtu (`vv_protocols.user_id`) se ukládají **jen protokoly v Profi verzi**: po zaplacení (kupující je registrovaný), po odemknutí kreditem, nebo když přihlášený uživatel otevře Profi protokol přes odkaz. Bezplatné protokoly zůstávají jen na odkazu z e-mailu.
- Vlastník protokol otevře bez tokenu; seznam je na `/vnejsi-vlivy/moje`.
- **Profi zdarma**: správce v administraci přidá workspace uživatele kredity (Administrace → kredity). Uživatel na stránce protokolu klikne „Odemknout za 1 kredit“ (`POST /api/vv/protocols/:id/redeem`). Odečet je idempotentní (`vv:<id>`), jde o stejné kredity jako u analýz rizika.

## E-maily

`RESEND_API_KEY` (Resend, HTTPS) má přednost před SMTP. Render na bezplatném plánu blokuje odchozí SMTP, proto SMTP končí „Connection timeout“. Odesílací doména (`MAIL_FROM`) musí být v Resendu ověřená.
