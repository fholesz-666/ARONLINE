/**
 * Vygeneruje docs/verification-checklist.md – kontrolní seznam pro odborné ověření
 * všech normových tabulek a vzorců výpočetního jádra.
 *
 * Spuštění: npm run verification:checklist
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { ALL_EQUATIONS } from "../src/core/risk/methodologies/csn-en-62305-2-ed2/equations";
import { ALL_TABLES } from "../src/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import {
  getVerificationRecord,
  getVerificationSummary,
  NORMATIVE_DATA_HASH,
} from "../src/core/risk/methodologies/csn-en-62305-2-ed2/verification";

const lines: string[] = [];
const s = getVerificationSummary();
lines.push("# Kontrolní seznam pro odborné ověření výpočetního jádra");
lines.push("");
lines.push("> Soubor je generován skriptem `npm run verification:checklist`. Neupravujte ho ručně.");
lines.push("");
lines.push(`Metodika: **ČSN EN 62305-2 ed. 2:2013** · otisk normativních dat: \`${NORMATIVE_DATA_HASH}\``);
lines.push("");
lines.push(`Stav: ověřeno **${s.verified} / ${s.total}**, neověřeno ${s.unverified}, zamítnuto ${s.rejected}.`);
lines.push("");
lines.push("## Postup ověření");
lines.push("");
lines.push("1. Ověřovatel musí mít legálně pořízený text ČSN EN 62305-2 ed. 2 (únor 2013).");
lines.push("2. U každé tabulky porovná **všechny hodnoty** a u rovnice **vzorec i rozsah platnosti** s textem normy.");
lines.push("3. Výsledek zapíše do `src/core/risk/methodologies/csn-en-62305-2-ed2/verification.json`:");
lines.push("   ```json");
lines.push('   "ED2.TAB.A.1": { "status": "verified", "verifiedBy": "Ing. … (ČKAIT …)", "verifiedAt": "2026-11-15", "verifiedAgainst": "ČSN EN 62305-2 ed. 2, 02/2013" }');
lines.push("   ```");
lines.push("   Při nesouladu nastaví `\"status\": \"rejected\"`, do `note` uvede správnou hodnotu a nahlásí opravu.");
lines.push("4. Po opravě hodnot spustí `npm test`, zvýší `CORE_VERSION` v `src/core/risk/index.ts` a znovu vygeneruje tento seznam.");
lines.push("5. Doplní referenční příklady z normy (příloha E) do `src/core/risk/__tests__/reference/` – viz README v té složce.");
lines.push("");
lines.push("Popisy řádků tabulek jsou parafráze, nikoliv text normy. Ověřuje se **hodnota** a **přiřazení k situaci**.");
lines.push("");
lines.push("## Tabulky");
lines.push("");
for (const t of ALL_TABLES) {
  const v = getVerificationRecord(t.id);
  lines.push(`### ${t.id} – ${t.title}`);
  lines.push("");
  lines.push(`- Odkaz: **${t.normRef}** · stav: **${v.status}**${v.verifiedBy ? ` (${v.verifiedBy}, ${v.verifiedAt})` : ""}`);
  lines.push(`- Původ: ${t.provenance}`);
  for (const ps of t.publicSources) lines.push(`- Veřejný zdroj: [${ps.title}](${ps.url ?? ""})${ps.locator ? `, ${ps.locator}` : ""}`);
  lines.push("");
  lines.push("| ☐ | Klíč | Popis | Hodnota |");
  lines.push("|---|---|---|---|");
  for (const [k, row] of Object.entries(t.rows) as [string, { label: string; value: unknown }][]) {
    const val =
      typeof row.value === "object" && row.value !== null
        ? Object.entries(row.value as Record<string, number>)
            .map(([kk, vv]) => `${kk}: ${vv}`)
            .join("; ")
        : String(row.value);
    lines.push(`| ☐ | \`${k}\` | ${row.label} | ${val} |`);
  }
  lines.push("");
}
lines.push("## Rovnice");
lines.push("");
lines.push("| ☐ | ID | Vzorec | Odkaz | Stav | Původ |");
lines.push("|---|---|---|---|---|---|");
for (const e of ALL_EQUATIONS) {
  const v = getVerificationRecord(e.id);
  lines.push(`| ☐ | \`${e.id}\` | ${e.formula.replace(/\|/g, "\\|")} | ${e.normRef} | ${v.status} | ${e.provenance} |`);
}
lines.push("");
lines.push("## Další body k ověření (mimo tabulky)");
lines.push("");
lines.push("- Kombinace více vnitřních systémů v zóně (PC = 1 − Π(1 − PCi), stejně pro PM).");
lines.push("- Zahrnutí RU/RV/RW/RZ pro vedení připojená k vnitřním systémům zóny (model „jeden systém na vedení a zónu, rozhoduje nejnižší UW“).");
lines.push("- Pravidlo pro více opatření PTA (součin) a rp (nejnižší hodnota – aplikace umožňuje vybrat jen jedno opatření).");
lines.push("- Postup pro délku úseku vedení LL > 1 000 m a neznámou délku (aplikace použije 1 000 m).");
lines.push("- Stanovení AD pro objekt s vyčnívající částí (aplikace bere max(AD; AD')).");
lines.push("- Referenční stav „bez ochranných opatření“ – výčet parametrů, které se ruší (viz `stripProtection`).");
lines.push("- Přepočet NG ≈ 0,1 · TD a doporučené zdroje NG pro ČR.");
lines.push("- Datum konce použitelnosti ed. 2 (aplikace: 31. 10. 2027).");
lines.push("");

const out = path.join(__dirname, "..", "docs", "verification-checklist.md");
writeFileSync(out, lines.join("\n"));
console.log("Zapsáno:", out);
