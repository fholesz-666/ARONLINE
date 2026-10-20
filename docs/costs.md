# Odhad měsíčních provozních nákladů

> Ceny poskytovatelů se mění. Render oznámil změnu tarifů od 1. 8. 2026. Hodnoty níže jsou **orientační** a vycházejí z ceníků známých do poloviny roku 2026. Před spuštěním je ověřte na <https://render.com/pricing> a <https://www.gopay.com/cs/cenik/>.

## Varianta A – Render (EU, spravovaný hosting)

| Položka | Odhad | Poznámka |
|---|---|---|
| Webová služba (Starter, 512 MB RAM) | cca 7 USD | Pro začátek stačí, PDF se generuje bez prohlížeče |
| PostgreSQL (Basic 256 MB) | cca 6 USD + úložiště | Při růstu Basic 1 GB |
| Tarif pracovního prostoru Render | 0–19 USD | Podle zvoleného plánu (jeden uživatel) |
| Doména .cz | cca 20–30 Kč | 250–350 Kč ročně |
| SMTP | 0–250 Kč | Řada transakčních služeb má bezplatný limit stovek e-mailů denně |
| **Celkem bez plateb** | **cca 300–900 Kč** | |

## Varianta B – VPS v ČR

| Položka | Odhad |
|---|---|
| VPS 2 vCPU / 4 GB RAM | cca 200–400 Kč |
| Záloha mimo server | cca 0–100 Kč |
| Doména, SMTP | jako výše |
| **Celkem** | **cca 250–550 Kč** + čas na správu serveru |

## Platební brána GoPay

| Položka | Hodnota (ceník gopay.com, ověřeno 20. 10. 2026) |
|---|---|
| Transakční poplatek (karty) | 0,95 % + 0 Kč (tarif Start: prvních 12 měsíců zdarma do 50 000 Kč měsíčně, pro nové obchodníky) |
| Měsíční poplatek | 80 Kč (tarif Start: prvních 12 měsíců zdarma) |
| Převod výnosů na účet | 10 Kč za převod |
| Chargeback | 990 Kč |

Příklad: 50 analýz po 149 Kč = 7 450 Kč obratu → poplatky cca 71 Kč + 80 Kč měsíčně (po skončení akce).

## Odhad zátěže

- Jeden výpočet trvá milisekundy. Export PDF/DOCX trvá řádově stovky milisekund.
- Zjištění objektu z ČÚZK znamená cca 15–30 dotazů na ČÚZK (výsledky se cachují).
- Pro stovky uživatelů měsíčně stačí nejmenší tarify.
