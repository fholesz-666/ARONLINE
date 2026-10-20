# Zálohování a obnova databáze

Všechna data (účty, projekty, výpočty, objednávky, kredity) jsou v PostgreSQL. Dokumenty PDF a DOCX se neukládají – generují se z uložených výpočtů. Stačí tedy zálohovat databázi.

## Render

- Placené databáze Renderu mají automatické zálohy. Rozsah (denní zálohy, obnova k bodu v čase) závisí na tarifu – ověřte v aktuální dokumentaci Renderu.
- Obnova: Render → databáze → Recovery / Backups → obnovit do nové instance → přepnout `DATABASE_URL` služby.
- Doporučení: navíc jednou týdně ruční záloha mimo Render (níže).

## Ruční nebo plánovaná záloha (`pg_dump`)

```bash
# záloha (komprimovaný formát)
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=aronline-$(date +%F).dump

# kontrola obsahu zálohy
pg_restore --list aronline-2026-10-20.dump | head
```

Na VPS přidejte do cronu (denně ve 3:00, uchovat 30 dní):

```cron
0 3 * * * pg_dump "postgresql://…/aronline" -Fc -f /var/backups/aronline/aronline-$(date +\%F).dump && find /var/backups/aronline -name '*.dump' -mtime +30 -delete
```

Zálohy kopírujte mimo server (např. šifrovaně do objektového úložiště). Zálohy obsahují osobní údaje – uchovávejte je šifrované a s omezeným přístupem.

## Obnova

```bash
# do prázdné databáze
createdb aronline_restore
pg_restore --no-owner --dbname="postgresql://…/aronline_restore" aronline-2026-10-20.dump
```

Pak přepněte `DATABASE_URL` aplikace na obnovenou databázi a restartujte ji. Při startu se aplikují případné novější migrace.

## Test obnovy

Obnovu vyzkoušejte alespoň jednou za čtvrtletí: obnovit zálohu do dočasné databáze, spustit proti ní aplikaci lokálně a otevřít několik projektů a export.
