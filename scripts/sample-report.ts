/**
 * Vygeneruje ukázkový dokument (PDF + DOCX) z testovacího vstupu – pro kontrolu vzhledu.
 * Spuštění: npx tsx scripts/sample-report.ts <výstupní složka>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { familyHouse } from "../src/core/risk/__tests__/fixtures";
import { calculate } from "../src/core/risk";
import { METHODOLOGIES } from "../src/core/risk/registry";
import { renderDocx } from "../src/server/documents/docx";
import { buildReport } from "../src/server/documents/model";
import { renderPdf } from "../src/server/documents/pdf";
import { zIdentification, zProcessorData } from "../src/domain/project";

async function main() {
  const out = process.argv[2] ?? "sample-output";
  mkdirSync(out, { recursive: true });
  const input = familyHouse();
  input.structure.lps = "lps_iii";
  input.lines[0].peb = "lpl_iii_iv";
  input.lines.push({ ...input.lines[0], id: "tlc", name: "Telekomunikační přípojka", service: "tlc", shielding: "buried_unshielded" });
  input.zones[0].internalSystems.push({ id: "s2", name: "Telekomunikace", lineId: "tlc", uw: "1.5", ks3: "unshielded_avoid_loops", pspd: "none" });
  const res = calculate("CSN_EN_62305_2_ED2", input);
  if (!res.ok || !("result" in res)) throw new Error(JSON.stringify(res));
  const model = buildReport({
    id: "ukazka-0000-0000",
    createdAt: new Date(),
    coreVersion: res.coreVersion,
    inputHash: res.inputHash ?? "",
    input: res.input,
    result: res.result,
    context: {
      identification: zIdentification.parse({
        projectName: "Rodinný dům Novákovi – FVE 9,9 kWp",
        jobNumber: "26-014",
        docStage: "DPS",
        date: "2026-10-20",
        revision: "Rev01",
        investor: { name: "Jan Novák", address: "Lesní 12, 466 01 Jablonec nad Nisou" },
        building: { name: "Rodinný dům č. p. 483", address: "Lesní 12, 466 01 Jablonec nad Nisou", parcel: "st. 2275/1", cadastralArea: "Jablonec nad Nisou (655970)" },
      }),
      processor: zProcessorData.parse({ fullName: "Ing. Ukázka Projektant", company: "Projekce Ukázka s.r.o.", ico: "12345678", email: "projekce@example.cz", phone: "+420 600 000 000" }),
      buildingType: { key: "family_house", label: "Rodinný dům" },
      site: {
        location: { lon: 15.17062, lat: 50.72448 },
        address: { text: "Lesní 12, 466 01 Jablonec nad Nisou" },
        parcel: { label: "st. 2275/1", cadastralArea: "Jablonec nad Nisou (655970)" },
        building: { area: 223, length: 18.1, width: 12.3, heightEstimate: 11.4, terrainElevation: 516.1, source: "RÚIAN" },
        neighbours: [{ distance: 12, height: 7, include: true }],
        dataNotes: ["Výška je jen orientační odhad z digitálního modelu povrchu."],
      },
      provenance: {
        "calc.structure.L": { origin: "auto", source: "RÚIAN (ČÚZK) – obrys budovy", retrievedAt: new Date().toISOString(), quality: "measured", confirmed: true },
        "calc.structure.H": { origin: "auto", source: "DMP 1G − DMR 5G (ČÚZK)", retrievedAt: new Date().toISOString(), quality: "estimated", confirmed: true },
        "calc.zones[0]": { origin: "preset", source: "Typ objektu: Rodinný dům", confirmed: true },
      },
      methodology: METHODOLOGIES.CSN_EN_62305_2_ED2,
    },
  });
  writeFileSync(path.join(out, "ukazka.pdf"), await renderPdf(model));
  writeFileSync(path.join(out, "ukazka.docx"), await renderDocx(model));
  console.log("Hotovo:", out);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
