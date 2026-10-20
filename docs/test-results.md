# Výsledky testů

Běh: **20. 10. 2026**, Node.js 22, PostgreSQL 16 (lokální vývojové prostředí). Stejné testy spouští CI na GitHubu při každé změně.

## Jednotkové a integrační testy (`npm test`, Vitest)

```
 ✓ src/core/risk/__tests__/ed2.test.ts        (30 testů)  výpočetní jádro ed. 2
 ↓ src/core/risk/__tests__/reference.test.ts  (přeskočeno – čeká na referenční příklady z normy)
 ✓ src/core/util/util.test.ts                 (4 testy)   SHA-256, formátování čísel
 ✓ tests/unit/geo.test.ts                     (10 testů)  geometrie budov, návrh CD, zjištění objektu z ČÚZK
 ✓ tests/unit/gopay.test.ts                   (5 testů)   klient GoPay REST API
 ✓ tests/integration/auth.test.ts             (8 testů)   registrace, přihlášení, relace, ověření e-mailu, obnova hesla
 ✓ tests/integration/billing.test.ts          (21 testů)  oddělení dat, autosave, kredity, platby, předplatné, refundace
 ✓ tests/integration/export.test.ts           (1 test)    nárok na export, PDF a DOCX, cizí uživatel

 Test Files  7 passed | 1 skipped (8)
      Tests  79 passed (79)
```

Co testy ověřují (výběr):

- **Výpočet:** sběrné plochy a počty událostí se číselně shodují s veřejnou zprávou (Bílovec 2023). Každá složka rizika odpovídá ručně dosazenému vzorci. LPS mění RB přesně podle PB, SPD mění RV podle PEB. Platí složení R1–R4, přípustná rizika a determinismus (stejný vstup = stejný výsledek a otisk). Ed. 3 je odmítnuta a ed. 2 je po 31. 10. 2027 odmítnuta. Neúplný vstup vrací srozumitelné chyby.
- **Oprávnění:** cizí projekt nelze číst, upravit, kopírovat, smazat, spočítat, odemknout, koupit ani exportovat.
- **Platby:** kredit se připíše jen po stavu PAID ověřeném u brány. Pouhý návrat z brány nestačí. Opakované a souběžné notifikace připíšou kredit jen jednou. Podvržená částka nic nepřipíše. Zrušená platba nic nepřipíše. Souběžné odemykání neodečte víc kreditů, než je projektů. Předplatné se obnovuje, má limit za období a jde zrušit. Refundace odebere kredity. Neověřený e-mail a neověřené jádro (v produkčním nastavení) platbu zablokují.
- **Export:** bez odemčení HTTP 402. Po odemčení vznikne platné PDF (`%PDF`) i DOCX (ZIP). Exporty se zapisují do logu.

## E2E test (`npm run test:e2e`, Playwright, Chromium)

```
  ✓  e2e/flow.spec.ts › kompletní průchod analýzou s platbou a exportem
  ✓  e2e/flow.spec.ts › nepřihlášený uživatel nemá přístup do aplikace ani k API
  2 passed
```

Průchod: úvodní stránka → registrace → profil zpracovatele → nová analýza → identifikace → rozměry (ručně) → CD → NG → NN přípojka z předvolby → zóny → LPS III → kontrola a potvrzení údajů → výpočet → platba přes simulovanou bránu → stažení PDF a DOCX → kontrola zamčení adresy. Test proběhl i na nové prázdné databázi, kde se migrace a ceník aplikovaly automaticky při startu serveru.

## Statická kontrola a build

- `npm run lint` – bez chyb
- `npm run typecheck` – bez chyb
- `npm run build` – úspěšný (Next.js 15.5)

## Co testováno nebylo

- Skutečný sandbox GoPay (chybí přístupové údaje) – testováno proti simulovaným odpovědím ve tvaru dokumentace GoPay.
- Služby ČÚZK z běžící aplikace – vývojové prostředí nemá síťový přístup k ČÚZK. Odpovědi služeb byly ověřeny dotazy z prohlížeče a zpracování je otestované na skutečných datech (obrysy budov v Jablonci nad Nisou).
- Načítání mapových dlaždic v prohlížeči (ze stejného důvodu).
- Docker obraz a nasazení na Render.
- Odesílání e-mailů přes SMTP.
