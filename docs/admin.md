# Správa služby, doklady a platby převodem

## Přístup správce
- Správcem je každý účet s rolí ADMIN **a ověřeným e-mailem**.
- `fholesz@gmail.com` (a e-maily v proměnné `ADMIN_EMAILS`) dostane roli správce automaticky po ověření e-mailu nebo při přihlášení.
- Heslo se nikde v kódu ani v repozitáři neukládá – správce se zaregistruje běžně na `/registrace` a potvrdí e-mail.
- Další správce lze jmenovat ve Správě → Uživatelé a kredity.
- Správce odemyká dokumentaci analýz bez platby a bez odečtu kreditů (záznam `project_unlocks.source = ADMIN`).

## Sekce správy (`/app/admin`)
| Sekce | Co umí |
|---|---|
| Přehled | počty uživatelů, analýz, předplatných, tržby měsíce, čekající převody, chybějící údaje |
| Uživatelé a kredity | hledání, blokace/odblokování, ruční ověření e-mailu, role správce, připsání/odebrání kreditů |
| Objednávky a doklady | filtr objednávek, potvrzení platby převodem, zrušení, kniha dokladů, storno, export CSV |
| Texty webu | oznámení, úvodní nadpis a perex, texty ceníku, patičky, kontaktů a pokynů k převodu |
| Provozovatel a platby | jméno, IČO, sídlo, e-mail, telefon, DPH, bankovní účet, splatnost, poznámka na dokladu |
| Ceník | ceny a parametry produktů |

Nastavení se ukládá do tabulky `site_settings` a má přednost před výchozími hodnotami v `src/config/operator.ts` a `src/config/site-texts.ts`.

## Doklady
- Vystavují se automaticky ke každé přijaté platbě (karta, převod, každá obnova předplatného), číslo `RRRRNNNN`, řada bez mezer.
- PDF: `/api/invoices/{id}` (člen pracovního prostoru nebo správce); příloha e-mailu „Platba přijata“.
- Neplátce DPH: na dokladu „Dodavatel není plátcem DPH.“ Plátce: přepnout ve správě (doplnit DIČ).

## Platba převodem
1. Zákazník zvolí „Zaplatit převodem“ (jen jednorázová analýza a balíček).
2. Dostane e-mail a stránku `/app/objednavky/{id}` s číslem účtu, IBAN, VS a QR Platbou.
3. Po připsání na účet správce ve Správě → Objednávky klikne „Platba přijata“ → kredit, odemčení, doklad, e-mail.

## Opakované platby GoPay (předplatné)
Implementováno podle článku GoPay „Jaké informace musím prezentovat pro opakované platby?“ (ověřeno 22. 10. 2026):
- parametry (důvod, max. částka, fixní částka, frekvence a datum, doba, kontakt pro změnu, zrušení) jsou zobrazené odděleně od OP před platbou (`RecurrenceConsentBox`) a na stránce Ceník,
- povinný checkbox souhlasu s opakovanou platbou a uložením karty u GoPay + informace o PCI DSS Level 1,
- souhlas se ukládá k objednávce (`orders.consents`: verze, čas, IP, parametry),
- e-mail „Opakovaná platba založena“ hned po první platbě, e-mail s dokladem po každé obnově, e-mail po zrušení,
- čl. 3.1 obchodních podmínek (`/pravni/obchodni-podminky#opakovane-platby`).

Před ostrým provozem je nutné požádat GoPay o aktivaci opakovaných plateb a doplnit ve správě sídlo a telefon.
