# Bezpečnost

| Oblast | Opatření | Kde |
|---|---|---|
| Hesla | Argon2id (m = 19 MiB, t = 2, p = 1). Pravidla síly hesla. Vyrovnání času při neexistujícím účtu | `src/server/auth/crypto.ts`, `services/auth.ts` |
| Relace | Náhodný 32B token v cookie `HttpOnly; Secure; SameSite=Lax` (`__Host-` prefix na https). V DB jen SHA-256. Platnost 30 dní. Zneplatnění všech relací po obnově hesla | `src/server/auth/session.ts` |
| CSRF | Kontrola hlavičky `Origin` u všech mutujících `/api` požadavků (výjimka: notifikace GoPay, která nic nemění bez ověření u GoPay) | `src/middleware.ts` |
| Oddělení zákazníků | Každý přístup k projektu přes `requireProjectAccess` (členství + workspaceId v dotazu). Cizí projekt vrací 404 | `services/workspace.ts`, testy `billing.test.ts` |
| Oprávnění k exportu | Server ověřuje existenci `project_unlocks` před každým exportem. Dokumenty se neukládají veřejně | `documents/export.ts` |
| Platby | Kredit jen po stavu `PAID` z API GoPay. Kontrola GoID, částky, měny a čísla objednávky. Zámek řádku platby, `fulfilled_at`, unikátní klíče v kreditní knize | `payments/service.ts`, testy |
| Souběh | Advisory lock při odemykání v rámci workspace. Optimistická kontrola verze projektu | `services/billing.ts`, `services/projects.ts` |
| Validace | zod na všech vstupech API. Limit velikosti těla (1 MB, projekt 600 kB). Validace obsahu loga podle signatury PNG/JPEG | `src/server/http.ts` |
| Rate limiting | DB fixní okno: přihlášení, registrace, obnova hesla, geodata, platby, export, výpočet, notifikace | `src/server/ratelimit.ts` |
| Hlavičky | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS v produkci | `src/middleware.ts` |
| Logy | Strukturované logy s redakcí klíčů obsahujících heslo, token, klíč apod. a s maskováním e-mailů. Obsah projektů se neloguje | `src/server/log.ts` |
| Audit | Důležité akce (registrace, přihlášení, platby, odemčení, export, změny cen) v tabulce `audit_logs` bez osobních dat | `src/server/audit.ts` |
| Tajemství | Jen proměnné prostředí. `.env` je v `.gitignore`. Simulovaná brána je v produkci zakázaná | `src/server/config.ts` |
| Závislosti | `npm audit --omit=dev` (20. 10. 2026): 0 známých zranitelností. `postcss` (závislost Next.js) je přes `overrides` povýšen na opravenou verzi. CI kontroluje build při každé změně | `package.json` |

## Známá omezení

- Rate limit je na úrovni aplikace. Proti velkým DDoS útokům je vhodná ochrana na úrovni hostingu nebo CDN.
- Notifikace GoPay nejsou podepsané (vlastnost GoPay). Řešeno ověřením stavu přes API.
- CSP povoluje `'unsafe-inline'` pro skripty a styly kvůli Next.js. Zpřísnění pomocí nonce je možné, ale zatím není implementováno.
- Dvoufázové ověření (2FA) není implementováno.
