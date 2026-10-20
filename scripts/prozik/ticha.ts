/**
 * Výpis porovnání ARONLINE × OEZ Prozik pro SO102 MŠ Tichá.
 * Spuštění: npx tsx scripts/prozik/ticha.ts
 */
import { calculate } from "../../src/core/risk";
import { PROZIK_TICHA, TICHA } from "../../src/core/risk/__tests__/prozik-ticha";

const out = calculate("CSN_EN_62305_2_ED2", TICHA, new Date("2026-10-20"));
if (!out.ok || !("result" in out)) {
  console.log(JSON.stringify(out, null, 2).slice(0, 3000));
  process.exit(1);
}
const r = out.result.designed;
console.log("NG", r.trace.find((t) => t.key === "NG")?.value, "ND", r.structure.ND, "NM", r.structure.NM);
for (const loss of ["L1", "L4"] as const) {
  const p = PROZIK_TICHA[loss] as Record<string, number>;
  const a = r.risks[loss]!;
  console.log(`\n${loss}  složka   ARONLINE(e-5)   Prozik(e-5)   rozdíl`);
  for (const k of ["RA", "RB", "RC", "RM", "RU", "RV", "RW", "RZ"]) {
    const v = (a.components as Record<string, number>)[k] * 1e5;
    const d = p[k] === 0 ? (Math.abs(v) < 1e-6 ? "OK" : "≠0") : `${(((v - p[k]) / p[k]) * 100).toFixed(1)} %`;
    console.log(`     ${k}   ${v.toFixed(4).padStart(10)}   ${p[k].toFixed(4).padStart(10)}   ${d}`);
  }
  console.log(`     R    ${(a.total * 1e5).toFixed(4).padStart(10)}   ${p.total.toFixed(4).padStart(10)}`);
}
