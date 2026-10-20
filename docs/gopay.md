# Platební brána GoPay

## Jak to v aplikaci funguje

1. Uživatel zvolí produkt (jednorázová analýza, balíček, předplatné). Server vytvoří objednávku s **pevnou cenou ze snapshotu ceníku** a založí platbu přes `POST /payments/payment` (OAuth2 token se scope `payment-all`).
2. Uživatel zaplatí na bráně GoPay a vrátí se na `/platba/navrat?id=…`.
3. GoPay pošle **HTTP notifikaci** `GET /api/payments/notify?id=…` (u opakovaných plateb i `parent_id`).
4. Návrat i notifikace pouze spustí `syncPayment`. Ten **zjistí stav dotazem `GET /payments/payment/{id}`** a ověří:
   - GoID příjemce = náš `GOPAY_GOID`,
   - částku, měnu a číslo objednávky,
   - stav `PAID`.
5. Teprve potom se v jedné transakci se zámkem řádku platby připíše kredit, aktivuje nebo prodlouží předplatné, případně se odemkne projekt. Opakované notifikace nic znovu nepřipíší: brání tomu `payments.fulfilled_at` a unikátní klíč `payment:<provider>:<id>` v kreditní knize.

Notifikace GoPay nejsou podepsané. Bezpečnost proto stojí na tom, že server stav vždy ověří přímo u GoPay vlastními přihlašovacími údaji.

## Nastavení

| Proměnná | Hodnota |
|---|---|
| `PAYMENTS_MODE` | `sandbox` (testovací prostředí GoPay) nebo `production` |
| `GOPAY_GOID` | GoID e-shopu |
| `GOPAY_CLIENT_ID`, `GOPAY_CLIENT_SECRET` | přístupové údaje k REST API |
| `GOPAY_RECURRENCE_ENABLED` | `true`, pokud má GoPay aktivované opakované platby |
| `APP_URL` | veřejná adresa (https). Z ní se skládá `return_url` a `notification_url` |

Klíče patří **jen do proměnných prostředí serveru** (Render → Environment). Nikdy ne do repozitáře.

## Testovací režim (sandbox)

1. Požádejte GoPay o přístup do testovacího prostředí (sandbox). Dostanete testovací GoID, ClientID a ClientSecret.
2. Nastavte `PAYMENTS_MODE=sandbox` a klíče.
3. Testovací platební karty a scénáře (zaplaceno, zamítnuto) uvádí dokumentace GoPay (<https://doc.gopay.com/>, sekce testovacího prostředí).
4. Vyzkoušejte: jednorázovou analýzu s odemčením projektu, balíček, předplatné, zrušení předplatného, zrušenou platbu a opakované otevření návratové adresy.

Ve vývoji bez GoPay lze použít `PAYMENTS_MODE=mock` (simulovaná brána na `/platba/mock-brana`). V produkci konfigurace režim `mock` nepovolí.

## Přepnutí do produkce

1. Uzavřete smlouvu s GoPay a nechte si **aktivovat opakované platby** (bez aktivace nelze prodávat předplatné, nastavte `GOPAY_RECURRENCE_ENABLED=false`).
2. Nastavte produkční GoID a klíče a `PAYMENTS_MODE=production`.
3. Zkontrolujte, že `APP_URL` je veřejná https adresa – GoPay na ni posílá notifikace.
4. Proveďte testovací nákup a refundaci v administraci GoPay. Refundace se do aplikace propíše po notifikaci (kredity se odeberou, předplatné ukončí).

## Předplatné

- Používá se opakovaná platba **AUTO** s cyklem `MONTH` a periodou 1. GoPay strhává platby sám. Každá další platba přijde jako notifikace s `parent_id` a po ověření prodlouží předplatné o měsíc.
- Zrušení v aplikaci volá `POST /payments/payment/{id}/void-recurrence`. Předplatné platí do konce zaplaceného období.
- Neúspěšná automatická platba předplatné neprodlouží, takže po konci období vyprší.
- Notifikace o zrušení karty uživatelem GoPay standardně neposílá. Lze o ně požádat technickou podporu GoPay.

## Omezení a doporučení

- **Doklady:** GoPay nevystavuje faktury. Pro účetnictví je potřeba vystavovat doklady (např. napojením na fakturační službu). Viz [remaining.md](remaining.md).
- **Ceník GoPay:** akce „12 měsíců zdarma“ (tarif Start) platí pro nové obchodníky, kteří dosud nepřijímali karty, a jen do 50 000 Kč měsíčně. Od 1. 11. 2026 platí nový sazebník – ověřte aktuální podmínky.
- **Změna tarifu předplatného:** zrušit stávající a po skončení období koupit nový. Okamžitá změna s doplatkem není implementována.
