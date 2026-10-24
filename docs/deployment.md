# Nasazení

Aplikace potřebuje **Node.js server a PostgreSQL**. GitHub slouží jako úložiště kódu a spouští testy. Statický hosting (GitHub Pages) nestačí, protože platby, výpočty a ochrana dokumentů musí běžet na serveru.

Popsány jsou dvě varianty:

- **A – Render** (doporučeno pro začátek): spravovaný hosting v EU (Frankfurt), databáze a TLS v ceně, nasazení z GitHubu.
- **B – vlastní VPS s Dockerem** (např. český poskytovatel): nejnižší cena, ale správu serveru, záloh a aktualizací děláte sami.

## 1. GitHub

1. Repozitář: `fholesz-666/aronline`. Hlavní větev `main`.
2. Při každém push a pull requestu běží **CI** (`.github/workflows/ci.yml`): lint, typová kontrola, jednotkové a integrační testy s PostgreSQL, build a E2E test celého průchodu se simulovanou platbou.
3. Po úspěšném CI na `main` workflow **Deploy** (`.github/workflows/deploy.yml`) zavolá deploy hook Renderu. Hook uložte jako tajemství repozitáře `RENDER_DEPLOY_HOOK_URL` (GitHub → Settings → Secrets and variables → Actions).
4. Doporučené nastavení větve `main` (Settings → Branches): povinný úspěšný běh CI před sloučením.

## 2A. Render

1. Účet na <https://render.com>, připojte GitHub.
2. **New → Blueprint**, vyberte repozitář. Render načte `render.yaml` a založí:
   - webovou službu `aronline` (Node 22, `npm ci && npm run build`, `npm start`, health check `/api/health`),
   - databázi `aronline-db` (PostgreSQL 16, Frankfurt).
   Při importu Blueprintu Render ukáže chyby, pokud se mezitím změnil formát `render.yaml` nebo názvy tarifů. Pak je opravte podle hlášky.
3. Doplňte proměnné označené `sync: false` (Render se na ně při importu zeptá):
   - `APP_URL` – veřejná adresa, např. `https://aronline.cz`,
   - `GOPAY_*` – viz [gopay.md](gopay.md),
   - `SMTP_*`, `MAIL_FROM` – odesílání e-mailů (ověření e-mailu, obnova hesla, pozvánky),
   - `OPERATOR_*` – údaje provozovatele do patičky a právních textů,
   - `ADMIN_EMAILS` – váš e-mail (po registraci získáte roli správce).
4. Databázové spojení na Renderu používá TLS: nastavte `DATABASE_SSL=true`. Pokud připojení selže kvůli certifikátu, nastavte navíc `DATABASE_SSL_INSECURE=true`. Interní spojení v rámci Renderu je šifrované i tak.
   Databáze na **Supabase** (Session pooler, port 5432) používá vlastní certifikační autoritu: stáhněte certifikát (Supabase → Database Settings → SSL Configuration → Download certificate) a jeho obsah vložte do proměnné `DATABASE_SSL_CA`. `DATABASE_SSL_INSECURE` pak není potřeba.
5. Migrace databáze a výchozí ceník se aplikují **automaticky při startu** (`src/instrumentation.ts`).
6. V nastavení služby zkopírujte **Deploy Hook** do GitHub tajemství (bod 1.3). V `render.yaml` je `autoDeploy: false`, takže se nasazuje jen přes CI.

## 2B. VPS s Dockerem

```bash
# na serveru (Ubuntu 24.04, Docker + Docker Compose)
git clone https://github.com/fholesz-666/aronline.git && cd aronline
cp .env.example .env   # doplňte, APP_ENV=production, DATABASE_URL na vaši DB
docker build -t aronline .
docker run -d --name aronline --restart unless-stopped --env-file .env -p 127.0.0.1:3000:3000 aronline
```

Před aplikaci dejte reverzní proxy s TLS (Caddy nebo Nginx + Let's Encrypt). Příklad Caddyfile:

```
aronline.cz {
  reverse_proxy 127.0.0.1:3000
}
```

PostgreSQL 16 provozujte na stejném serveru (balíček `postgresql-16`) nebo jako spravovanou službu. Zálohy viz [backup.md](backup.md).

> Docker obraz nebyl v rámci vývoje sestaven (vývojové prostředí nemělo přístup k Docker Hubu). Před prvním nasazením ho sestavte a otestujte lokálně.

## 3. Připojení domény

1. Registrace domény (např. `.cz` u libovolného registrátora).
2. **Render:** služba → Settings → Custom Domains → přidat `aronline.cz` a `www.aronline.cz`. Render ukáže DNS záznamy:
   - pro `www` záznam **CNAME** na `aronline.onrender.com`,
   - pro holou doménu záznam **A** nebo **ALIAS/ANAME** podle pokynů Renderu.
   Certifikát TLS vystaví Render automaticky.
3. **VPS:** záznam **A** (a případně **AAAA**) na IP serveru, certifikát vystaví Caddy automaticky.
4. Po připojení domény nastavte `APP_URL=https://aronline.cz` a znovu nasaďte. Adresa se používá v e-mailech a v adresách pro GoPay (návrat z brány a notifikace).

## 4. Přechod do ostrého provozu – kontrolní seznam

- [ ] Výpočetní jádro odborně ověřeno (`verification.json`, všechny položky `verified`) – do té doby jsou platby blokovány.
- [ ] Právní texty zkontrolované právníkem, doplněné údaje provozovatele.
- [ ] GoPay: smlouva, produkční GoID a klíče, aktivované opakované platby, `PAYMENTS_MODE=production`.
- [ ] SMTP funkční (ověřovací e-mail dorazí, neskončí ve spamu – SPF/DKIM u domény).
- [ ] `APP_ENV=production`, `APP_URL` s https, `REQUIRE_VERIFIED_CORE=true`.
- [ ] Zálohy databáze nastavené a obnova vyzkoušená.
- [ ] Testovací nákup v produkci (jednorázová analýza) a refundace přes administraci GoPay.
