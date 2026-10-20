/**
 * Neutrální model dokumentu „Analýza rizika“ – z něj se generuje DOCX i PDF.
 * Veškeré texty závěru se odvozují výhradně z vypočtených hodnot.
 */
import { buildingType } from "@/catalog";
import { LIABILITY_DOCUMENT_TEXT, RESULT_DISCLAIMER } from "@/config/liability";
import type { Ed2CalculationResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2";
import { COMPONENTS, UNPROTECTED_DESCRIPTION, type Component, type Ed2ScenarioResult } from "@/core/risk/methodologies/csn-en-62305-2-ed2/calculate";
import type { Ed2Input, LossValueInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import * as T from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import type { MethodologyInfo } from "@/core/risk/registry";
import { fmtNum, fmtRisk } from "@/core/util/format";
import { DOC_STAGE_LABELS, type FieldMeta, type Identification, type ProcessorData } from "@/domain/project";

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string; style?: "normal" | "small" | "note" | "warning" | "strong" }
  | { type: "bullets"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][]; widths?: number[]; numericCols?: number[]; highlightRows?: { index: number; tone: "ok" | "bad" }[] }
  | { type: "keyvalue"; rows: [string, string][] }
  | { type: "link"; text: string; url: string }
  | { type: "pagebreak" };

export interface ReportModel {
  title: string;
  subtitle: string;
  projectName: string;
  unverified: boolean;
  /** Upozornění na orientační povahu výsledku – titulní strana. */
  disclaimer: string;
  accentColor: string;
  headerText: string;
  footerText: string;
  showLogoOnCover: boolean;
  /** Razítko (title block) – dvojice popis/hodnota */
  stamp: [string, string][];
  coverFacts: [string, string][];
  blocks: Block[];
  meta: { runId: string; createdAt: string; coreVersion: string; inputHash: string; normativeDataHash: string };
  fileBaseName: string;
}

export interface RunContext {
  identification: Identification;
  processor: ProcessorData;
  buildingType: { key: string; label: string };
  site: {
    location: { lon: number; lat: number } | null;
    address: { text: string } | null;
    parcel: { label: string; cadastralArea?: string } | null;
    building: {
      area?: number;
      length?: number;
      width?: number;
      heightEstimate?: number | null;
      terrainElevation?: number | null;
      source?: string;
    } | null;
    neighbours: { distance: number; height: number | null; include: boolean }[];
    dataNotes: string[];
  };
  provenance: Record<string, FieldMeta>;
  methodology: MethodologyInfo;
}

export interface RunRecord {
  id: string;
  createdAt: Date;
  coreVersion: string;
  inputHash: string;
  input: Ed2Input;
  result: Ed2CalculationResult;
  context: RunContext;
}

const LOSS_NAMES: Record<T.LossType, string> = {
  L1: "ztráta lidského života (včetně trvalého poranění)",
  L2: "ztráta veřejné služby",
  L3: "ztráta kulturního dědictví",
  L4: "ztráta ekonomické hodnoty",
};

const COMPONENT_DESC: Record<Component, string> = {
  RA: "úraz živých bytostí dotykovým a krokovým napětím – úder do objektu",
  RB: "hmotná škoda (požár, výbuch) – úder do objektu",
  RC: "porucha vnitřních systémů – úder do objektu",
  RM: "porucha vnitřních systémů – úder v blízkosti objektu",
  RU: "úraz živých bytostí – úder do vedení",
  RV: "hmotná škoda – úder do vedení",
  RW: "porucha vnitřních systémů – úder do vedení",
  RZ: "porucha vnitřních systémů – úder v blízkosti vedení",
};

/** Parametry, které danou složku ovlivňují (odvozeno ze vzorců). */
const COMPONENT_LEVERS: Record<Component, string> = {
  RA: "opatření proti dotykovému a krokovému napětí (PTA), třída LPS (PB), povrch (rt)",
  RB: "třída LPS (PB), protipožární opatření (rp)",
  RC: "koordinovaný systém SPD (PSPD), stínění a provedení vedení (CLD)",
  RM: "koordinovaný systém SPD (PSPD), prostorové stínění (KS1, KS2), vedení kabeláže (KS3), odolnost zařízení (UW)",
  RU: "opatření proti dotykovému napětí (PTU), SPD pro vyrovnání potenciálů (PEB), stínění vedení (PLD, CLD)",
  RV: "SPD pro vyrovnání potenciálů (PEB), stínění vedení (PLD, CLD), protipožární opatření (rp)",
  RW: "koordinovaný systém SPD (PSPD), stínění vedení (PLD, CLD), odolnost zařízení (UW)",
  RZ: "koordinovaný systém SPD (PSPD), stínění vedení (PLI, CLI), odolnost zařízení (UW)",
};

const SHORT_CI: Record<string, string> = { aerial: "venkovní", buried: "v zemi", buried_meshed: "v zemi v mřížové uzemňovací soustavě" };
const SHORT_CT: Record<string, string> = { lv_tlc: "NN / telekom. / data", hv_with_transformer: "VN s transformátorem VN/NN" };
const SHORT_CE: Record<string, string> = { rural: "venkovské", suburban: "předměstské", urban: "městské", urban_tall: "městské, budovy > 20 m" };

const n = (v: number | null | undefined, d = 3) => (v == null ? "–" : fmtNum(v, d));
const yesNo = (b: boolean) => (b ? "ano" : "ne");

function row<K extends string>(table: T.NormTable<K, unknown>, key: K): string {
  return (table.rows as Record<string, { label: string } | undefined>)[key]?.label ?? key;
}

function lossLabel(lv: LossValueInput | null | undefined, table: T.NormTable<string>): string {
  if (!lv) return "–";
  if (lv.source === "custom") return `${fmtNum(lv.value)} (vlastní hodnota: ${lv.note})`;
  const r = (table.rows as Record<string, { label: string; value: number } | undefined>)[lv.key];
  return r ? `${fmtNum(r.value)} – ${r.label}` : lv.key;
}

function originLabel(m: FieldMeta): string {
  return { auto: "automaticky", manual: "ručně", preset: "předvolba", default: "výchozí" }[m.origin];
}

function verdict(sc: Ed2ScenarioResult, loss: T.LossType) {
  const r = sc.risks[loss]!;
  return `${loss.replace("L", "R")} = ${fmtRisk(r.total)} ${r.exceeds ? ">" : "≤"} RT = ${fmtRisk(r.tolerable)}`;
}

export function buildReport(run: RunRecord): ReportModel {
  const { input, result, context: ctx } = run;
  const id = ctx.identification;
  const p = ctx.processor;
  const d = result.designed;
  const u = result.unprotected;
  const unverified = !result.verification.fullyVerified;
  const created = new Date(run.createdAt);
  const dateText = id.date ? new Date(id.date).toLocaleDateString("cs-CZ") : created.toLocaleDateString("cs-CZ");
  const losses = (Object.keys(d.risks) as T.LossType[]).filter((l) => d.risks[l]);
  const blocks: Block[] = [];

  /* 1. Identifikace -------------------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "1. Identifikační údaje" });
  blocks.push({ type: "heading", level: 2, text: "1.1 Stavba a investor" });
  blocks.push({
    type: "keyvalue",
    rows: [
      ["Název projektu", id.projectName || "–"],
      ["Stavba", id.building.name || id.projectName || "–"],
      ["Adresa stavby", id.building.address || ctx.site.address?.text || "–"],
      ["Parcela", id.building.parcel || ctx.site.parcel?.label || "–"],
      ["Katastrální území", id.building.cadastralArea || ctx.site.parcel?.cadastralArea || "–"],
      ["Investor / objednatel", [id.investor.name, id.investor.ico ? `IČO ${id.investor.ico}` : "", id.investor.address].filter(Boolean).join(", ") || "–"],
      ["Stupeň dokumentace", DOC_STAGE_LABELS[id.docStage] ?? id.docStage],
      ["Číslo zakázky", id.jobNumber || "–"],
      ["Datum", dateText],
      ["Revize", id.revision || "–"],
    ],
  });
  blocks.push({ type: "heading", level: 2, text: "1.2 Zpracovatel" });
  blocks.push({
    type: "keyvalue",
    rows: [
      ["Zpracovatel", p.fullName || "–"],
      ["Firma", p.company || "–"],
      ["IČO / DIČ", [p.ico, p.dic].filter(Boolean).join(" / ") || "–"],
      ["Adresa", p.address || "–"],
      ["Kontakt", [p.email, p.phone].filter(Boolean).join(", ") || "–"],
      ...(p.authorization ? ([["Autorizace", p.authorization]] as [string, string][]) : []),
    ],
  });

  /* 2. Normy a metodika ---------------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "2. Podklady, normy a metodika" });
  blocks.push({
    type: "bullets",
    items: [
      `${ctx.methodology.norm} – metodika použitá pro tento výpočet`,
      "ČSN EN 62305-1 ed. 2 – Ochrana před bleskem – Část 1: Obecné principy",
      "ČSN EN 62305-3 ed. 2 – Ochrana před bleskem – Část 3: Hmotné škody na stavbách a ohrožení života",
      "ČSN EN 62305-4 ed. 2 – Ochrana před bleskem – Část 4: Elektrické a elektronické systémy ve stavbách",
      "Vyhláška č. 146/2024 Sb., o požadavcích na výstavbu, § 26 Ochrana před bleskem",
      "Nařízení vlády č. 190/2022 Sb., o vyhrazených technických elektrických zařízeních",
    ],
  });
  for (const note of ctx.methodology.notes) blocks.push({ type: "paragraph", style: "note", text: note });
  blocks.push({
    type: "paragraph",
    text: "Riziko R je součtem složek RX = NX · PX · LX, kde NX je roční počet nebezpečných událostí, PX pravděpodobnost škody a LX následná ztráta. Vypočtené riziko se porovnává s přípustným rizikem RT. Je-li R ≤ RT, ochrana je pro daný druh ztráty dostatečná; je-li R > RT, je nutné přijmout ochranná opatření, která riziko sníží na hodnotu R ≤ RT.",
  });
  blocks.push({ type: "paragraph", text: `Pro porovnání se počítá i referenční stav. ${UNPROTECTED_DESCRIPTION}` });

  /* 3. Popis objektu a okolí ----------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "3. Popis objektu a okolí" });
  const s = input.structure;
  const neighbours = ctx.site.neighbours.filter((x) => x.include);
  blocks.push({
    type: "keyvalue",
    rows: [
      ["Druh objektu", ctx.buildingType.label],
      ["Rozměry L × W × H", `${n(s.L)} × ${n(s.W)} × ${n(s.H)} m`],
      ["Výška vyčnívající části Hp", s.prominentHeight != null ? `${n(s.prominentHeight)} m` : "neuvažuje se"],
      ["Poloha (WGS84)", ctx.site.location ? `${ctx.site.location.lat.toFixed(6)} N, ${ctx.site.location.lon.toFixed(6)} E` : "–"],
      ["Nadmořská výška terénu", ctx.site.building?.terrainElevation != null ? `${n(ctx.site.building.terrainElevation, 4)} m n. m. (Bpv, DMR 5G)` : "–"],
      ["Součinitel polohy CD", `${fmtNum(T.TABLE_CD.rows[s.cd].value)} – ${row(T.TABLE_CD, s.cd)}`],
      ["Okolní objekty do 3H", `${neighbours.filter((x) => x.distance <= 3 * s.H).length} (zahrnuto do posouzení polohy)`],
      ["Hustota výbojů NG", `${n(d.NG)} 1/(km²·rok)${input.lightning.mode === "td" ? ` (z Td = ${n(input.lightning.td)} dnů/rok)` : ""}`],
      ["Zdroj NG / Td", input.lightning.source],
      ["Celkový počet osob nt", n(s.totalPersons)],
      ["Hodnocené ztráty", losses.map((l) => `${l} – ${LOSS_NAMES[l]}`).join("; ")],
    ],
  });

  /* 4. Vstupní parametry --------------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "4. Vstupní parametry" });
  blocks.push({ type: "heading", level: 2, text: "4.1 Ochranná opatření objektu" });
  blocks.push({ type: "keyvalue", rows: [["Vnější LPS (PB)", `${row(T.TABLE_PB, s.lps)} (PB = ${fmtNum(T.TABLE_PB.rows[s.lps].value)})`]] });

  blocks.push({ type: "heading", level: 2, text: "4.2 Připojená vedení" });
  if (!input.lines.length) {
    blocks.push({ type: "paragraph", text: "K objektu nejsou připojena žádná kovová vedení." });
  } else {
    blocks.push({
      type: "table",
      columns: ["Vedení", "Druh", "Uložení (CI)", "Typ (CT)", "Prostředí (CE)", "LL [m]", "Stínění (CLD/CLI)", "SPD na vstupu (PEB)"],
      widths: [14, 8, 10, 12, 13, 9, 20, 14],
      rows: input.lines.map((l) => [
        l.name,
        l.service === "power" ? "silové" : "telekom.",
        SHORT_CI[l.installation],
        SHORT_CT[l.lineType],
        SHORT_CE[l.environment],
        l.lengthM == null ? "1 000 (neznámá)" : n(l.lengthM, 4),
        row(T.TABLE_CLD_CLI, l.shielding) + (l.shieldResistance ? `; RS ${l.shieldResistance.replace("rs_", "").replace("_", "–").replace("le", "≤ ")} Ω/km` : ""),
        row(T.TABLE_PEB, l.peb),
      ]),
    });
  }

  blocks.push({ type: "heading", level: 2, text: "4.3 Zóny objektu" });
  for (const z of input.zones) {
    blocks.push({ type: "heading", level: 3, text: `Zóna „${z.name}“ (${z.location === "inside" ? "uvnitř objektu" : "vně objektu"})` });
    const kv: [string, string][] = [
      ["Počet osob nz / doba přítomnosti tz", `${n(z.persons)} / ${n(z.hoursPerYear, 4)} h/rok`],
      ["Povrch (rt)", row(T.TABLE_RT_FLOOR, z.floor)],
      ["Opatření proti dotykovému a krokovému napětí (PTA)", z.pta.map((k) => row(T.TABLE_PTA, k)).join(" + ")],
      ["Opatření proti dotykovému napětí z vedení (PTU)", row(T.TABLE_PTU, z.ptu)],
      ["Nebezpečí požáru / výbuchu (rf)", row(T.TABLE_RF, z.fireRisk)],
      ["Protipožární opatření (rp)", row(T.TABLE_RP, z.fireProvisions)],
      ["Zvláštní nebezpečí (hz)", row(T.TABLE_HZ, z.specialHazard)],
      ["Vnější prostorové stínění (KS1)", z.shieldExternal.continuous ? "spojité kovové stínění" : z.shieldExternal.wm != null ? `mřížové, wm = ${n(z.shieldExternal.wm)} m` : "bez stínění"],
      ["Vnitřní prostorové stínění (KS2)", z.shieldInternal.continuous ? "spojité kovové stínění" : z.shieldInternal.wm != null ? `mřížové, wm = ${n(z.shieldInternal.wm)} m` : "bez stínění"],
    ];
    if (input.lossTypes.L1) {
      kv.push(["L1: LT", lossLabel(z.l1.lt, T.TABLE_L1_LT)], ["L1: LF", lossLabel(z.l1.lf, T.TABLE_L1_LF)]);
      if (input.options.l1InternalSystemsEndangerLife) kv.push(["L1: LO", lossLabel(z.l1.lo, T.TABLE_L1_LO)]);
    }
    if (input.lossTypes.L2 && z.l2) kv.push(["L2: LF / LO", `${lossLabel(z.l2.lf, T.TABLE_L2_LF)} / ${lossLabel(z.l2.lo, T.TABLE_L2_LO)}`], ["L2: obsluhovaní uživatelé nz", n(z.l2.servedUsers)]);
    if (input.lossTypes.L3 && z.l3) kv.push(["L3: LF / cz/ct", `${lossLabel(z.l3.lf, T.TABLE_L3_LF)} / ${n(z.l3.valueShare)}`]);
    if (input.lossTypes.L4 && z.l4)
      kv.push(
        ["L4: LF / LO", `${lossLabel(z.l4.lf, T.TABLE_L4_LF)} / ${lossLabel(z.l4.lo, T.TABLE_L4_LO)}`],
        ["L4: podíly hodnot", `(ca+cb+cc+cs)/ct = ${n(z.l4.shareTotal)}; cs/ct = ${n(z.l4.shareSystems)}${input.options.l4Animals ? `; ca/ct = ${n(z.l4.shareAnimals)}` : ""}`],
      );
    blocks.push({ type: "keyvalue", rows: kv });
    if (z.internalSystems.length) {
      blocks.push({
        type: "table",
        columns: ["Vnitřní systém", "Připojené vedení", "UW [kV]", "Kabeláž (KS3)", "Koordinované SPD (PSPD)"],
        widths: [22, 18, 8, 30, 22],
        rows: z.internalSystems.map((sy) => [
          sy.name,
          sy.lineId ? (input.lines.find((l) => l.id === sy.lineId)?.name ?? sy.lineId) : "bez vnějšího vedení",
          sy.uw.replace(".", ","),
          row(T.TABLE_KS3, sy.ks3),
          row(T.TABLE_PSPD, sy.pspd),
        ]),
      });
    }
  }

  /* 5. Původ údajů ------------------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "5. Zdroj automaticky převzatých a předvyplněných údajů" });
  const prov = Object.entries(ctx.provenance);
  if (prov.length) {
    blocks.push({
      type: "table",
      columns: ["Údaj", "Původ", "Zdroj", "Datum", "Potvrzeno"],
      widths: [24, 12, 40, 12, 12],
      rows: prov.map(([k, m]) => [
        k.replace(/^calc\./, ""),
        originLabel(m),
        [m.source, m.quality === "estimated" ? "(odhad)" : "", m.note].filter(Boolean).join(" "),
        m.retrievedAt ? new Date(m.retrievedAt).toLocaleDateString("cs-CZ") : "–",
        yesNo(m.confirmed),
      ]),
    });
  } else {
    blocks.push({ type: "paragraph", text: "Všechny vstupní údaje zadal zpracovatel ručně." });
  }
  for (const note of ctx.site.dataNotes) blocks.push({ type: "paragraph", style: "note", text: note });
  blocks.push({
    type: "paragraph",
    style: "small",
    text: "Geografická data: © ČÚZK (RÚIAN, DMR 5G, DMP 1G), licence CC BY 4.0. Automaticky převzaté hodnoty jsou orientační a zpracovatel je ověřil a potvrdil.",
  });

  /* 6. Výpočet ----------------------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "6. Výpočet" });
  blocks.push({ type: "heading", level: 2, text: "6.1 Počty nebezpečných událostí" });
  const nRows: string[][] = [
    ["Sběrná plocha objektu AD", "m²", n(d.structure.AD, 6)],
    ["Sběrná plocha blízkých úderů AM", "m²", n(d.structure.AM, 6)],
    ["Úder do objektu ND", "1/rok", n(d.structure.ND, 4)],
    ["Úder v blízkosti objektu NM", "1/rok", n(d.structure.NM, 4)],
  ];
  for (const l of d.lines) {
    nRows.push(
      [`${l.name}: AL / AI`, "m²", `${n(l.AL, 6)} / ${n(l.AI, 6)}`],
      [`${l.name}: NL / NI`, "1/rok", `${n(l.NL, 4)} / ${n(l.NI, 4)}`],
    );
    if (l.ADJ != null) nRows.push([`${l.name}: NDJ (sousední objekt)`, "1/rok", n(l.NDJ, 4)]);
  }
  blocks.push({ type: "table", columns: ["Veličina", "Jednotka", "Hodnota"], widths: [60, 15, 25], numericCols: [2], rows: nRows });

  blocks.push({ type: "heading", level: 2, text: "6.2 Složky rizika po zónách (navržený stav)" });
  for (const loss of losses) {
    const r = d.risks[loss]!;
    blocks.push({ type: "heading", level: 3, text: `${loss} – ${LOSS_NAMES[loss]}` });
    blocks.push({
      type: "table",
      columns: ["Složka", ...d.zones.map((z) => z.name), "Celkem"],
      numericCols: d.zones.map((_, i) => i + 1).concat([d.zones.length + 1]),
      rows: COMPONENTS.filter((c) => r.included.includes(c)).map((c) => [
        `${c} – ${COMPONENT_DESC[c]}`,
        ...d.zones.map((z) => fmtRisk(z.components[loss]?.[c] ?? 0)),
        fmtRisk(r.components[c]),
      ]),
    });
  }

  /* 7. Výsledky a porovnání s RT ----------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "7. Výsledky a porovnání s přípustným rizikem" });
  blocks.push({
    type: "table",
    columns: ["Riziko", "Bez ochranných opatření", "Navržený stav", "Přípustné RT", "Vyhodnocení"],
    numericCols: [1, 2, 3],
    rows: losses.map((l) => [
      `${l.replace("L", "R")} – ${LOSS_NAMES[l]}`,
      fmtRisk(u.risks[l]!.total),
      fmtRisk(d.risks[l]!.total),
      fmtRisk(d.risks[l]!.tolerable) +
        (d.risks[l]!.tolerableSource === "user" ? " (stanoveno)" : l === "L4" ? " (informativně, příl. D)" : ""),
      d.risks[l]!.exceeds ? "R > RT – nevyhovuje" : "R ≤ RT – vyhovuje",
    ]),
    highlightRows: losses.map((l, i) => ({ index: i, tone: d.risks[l]!.exceeds ? "bad" : "ok" })),
  });

  /* 8. Závěr ------------------------------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "8. Závěr" });
  const failing = losses.filter((l) => d.risks[l]!.exceeds);
  const measures: string[] = [];
  if (s.lps !== "none") measures.push(`vnější ochrana před bleskem: ${row(T.TABLE_PB, s.lps)}`);
  for (const l of input.lines) if (l.peb !== "none") measures.push(`SPD pro vyrovnání potenciálů na vstupu vedení „${l.name}“: ${row(T.TABLE_PEB, l.peb)}`);
  for (const z of input.zones) {
    for (const sy of z.internalSystems) if (sy.pspd !== "none") measures.push(`koordinovaný systém SPD – ${sy.name} (zóna „${z.name}“): ${row(T.TABLE_PSPD, sy.pspd)}`);
    if (!z.pta.includes("none")) measures.push(`opatření proti dotykovému a krokovému napětí (zóna „${z.name}“): ${z.pta.map((k) => row(T.TABLE_PTA, k)).join(", ")}`);
    if (z.ptu !== "none") measures.push(`opatření proti dotykovému napětí z vedení (zóna „${z.name}“): ${row(T.TABLE_PTU, z.ptu)}`);
    if (z.fireProvisions !== "none") measures.push(`protipožární opatření (zóna „${z.name}“): ${row(T.TABLE_RP, z.fireProvisions)}`);
    if (z.shieldExternal.continuous || z.shieldExternal.wm != null || z.shieldInternal.continuous || z.shieldInternal.wm != null)
      measures.push(`prostorové stínění (zóna „${z.name}“)`);
  }

  if (!failing.length) {
    blocks.push({
      type: "paragraph",
      style: "strong",
      text: `Pro všechny hodnocené druhy ztrát je vypočtené riziko v navrženém stavu menší nebo rovno přípustnému riziku (${losses.map((l) => verdict(d, l)).join("; ")}).`,
    });
    blocks.push({
      type: "paragraph",
      text: measures.length
        ? "Výsledek platí za předpokladu, že budou provedena a udržována tato ochranná opatření, se kterými výpočet počítá:"
        : "Výpočet nepočítá s žádnými ochrannými opatřeními – riziko je přípustné i bez nich.",
    });
    if (measures.length) blocks.push({ type: "bullets", items: measures });
  } else {
    blocks.push({
      type: "paragraph",
      style: "warning",
      text: `V navrženém stavu riziko PŘEKRAČUJE přípustnou hodnotu pro: ${failing.map((l) => verdict(d, l)).join("; ")}. Navržená ochranná opatření nejsou dostatečná – je nutné přijmout další opatření a výpočet zopakovat.`,
    });
    for (const l of failing) {
      const dom = d.risks[l]!.dominant.filter((x) => x.share >= 0.05).slice(0, 3);
      blocks.push({
        type: "paragraph",
        text: `${l.replace("L", "R")}: největší podíl mají složky ${dom.map((x) => `${x.component} (${Math.round(x.share * 100)} %)`).join(", ")}. Tyto složky lze snížit opatřeními, která ovlivňují: ${dom.map((x) => `${x.component} – ${COMPONENT_LEVERS[x.component]}`).join("; ")}.`,
      });
    }
    if (losses.some((l) => !d.risks[l]!.exceeds)) {
      blocks.push({ type: "paragraph", text: `Vyhovující: ${losses.filter((l) => !d.risks[l]!.exceeds).map((l) => verdict(d, l)).join("; ")}.` });
    }
  }

  /* 9. Předpoklady a upozornění ----------------------------------- */
  blocks.push({ type: "heading", level: 1, text: "9. Předpoklady, upozornění a rozsah zpracování" });
  const warnings = [...result.messages, ...d.messages].filter((m) => m.severity !== "info");
  const infos = d.messages.filter((m) => m.severity === "info");
  if (unverified) {
    blocks.push({
      type: "paragraph",
      style: "warning",
      text: `Výpočetní jádro aplikace dosud neprošlo nezávislým odborným ověřením proti textu normy (ověřeno ${result.verification.verified} z ${result.verification.total} normových tabulek a vzorců). Tento dokument proto NELZE považovat za normově ověřený výpočet.`,
    });
  }
  if (warnings.length) blocks.push({ type: "bullets", items: warnings.map((m) => m.message) });
  if (infos.length) blocks.push({ type: "bullets", items: infos.map((m) => m.message) });
  const unconfirmed = prov.filter(([, m]) => !m.confirmed);
  if (unconfirmed.length) {
    blocks.push({
      type: "paragraph",
      style: "warning",
      text: `Nepotvrzené předvyplněné údaje (${unconfirmed.length}): ${unconfirmed.map(([k]) => k.replace(/^calc\./, "")).join(", ")}. Zpracovatel je musí ověřit.`,
    });
  }
  blocks.push({ type: "heading", level: 2, text: "Odpovědnost zpracovatele" });
  for (const t of LIABILITY_DOCUMENT_TEXT) blocks.push({ type: "paragraph", text: t });
  blocks.push({
    type: "paragraph",
    text: "Analýza rizika neobsahuje návrh vnější ani vnitřní ochrany před bleskem – ten je předmětem samostatné projektové dokumentace.",
  });
  blocks.push({
    type: "paragraph",
    style: "note",
    text: "Návrh hromosvodu (LPS), přepěťových ochran nebo kompletní projektovou dokumentaci fotovoltaické elektrárny vám zpracuje FVSOL – https://fvsol.cz",
  });

  /* 10. Identifikace výpočtu -------------------------------------- */
  blocks.push({ type: "heading", level: 2, text: "Identifikace výpočtu" });
  blocks.push({
    type: "keyvalue",
    rows: [
      ["ID výpočtu", run.id],
      ["Datum a čas výpočtu", created.toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })],
      ["Metodika", ctx.methodology.title],
      ["Verze výpočetního jádra", run.coreVersion],
      ["Otisk vstupních dat (SHA-256)", run.inputHash],
      ["Otisk normativních dat", result.normativeDataHash],
    ],
  });

  /* Příloha – stopa výpočtu ---------------------------------------- */
  blocks.push({ type: "pagebreak" });
  blocks.push({ type: "heading", level: 1, text: "Příloha A – Podrobná stopa výpočtu (navržený stav)" });
  blocks.push({
    type: "paragraph",
    style: "small",
    text: "U každé veličiny je uveden vzorec, dosazení, výsledek a odkaz na článek normy. Hodnoty jsou zaokrouhleny na 4 platné číslice, výpočet probíhá v plné přesnosti.",
  });
  blocks.push({
    type: "table",
    columns: ["Veličina", "Vzorec a dosazení", "Výsledek", "Odkaz"],
    widths: [24, 50, 13, 13],
    numericCols: [2],
    rows: d.trace.map((t) => [
      `${t.symbol} – ${t.label}`,
      `${t.formula}\n${t.substituted}`,
      `${fmtNum(t.value, 4)}${t.unit ? ` ${t.unit}` : ""}`,
      t.normRef ?? "",
    ]),
  });

  /* Odkaz na služby (bod 10 zadání) -------------------------------- */
  blocks.push({
    type: "paragraph",
    style: "small",
    text: "Potřebujete kompletní projektovou dokumentaci fotovoltaické elektrárny (FVE) nebo ochrany před bleskem (LPS) – návrh hromosvodu, přepěťových ochran, technickou zprávu a výkresy? Více informací naleznete na fvsol.cz.",
  });
  blocks.push({ type: "link", text: "https://fvsol.cz", url: "https://fvsol.cz" });

  const stamp: [string, string][] = [
    ["Zpracovatel", [p.fullName, p.authorization].filter(Boolean).join(", ") || "–"],
    ["Firma", [p.company, p.ico ? `IČO ${p.ico}` : ""].filter(Boolean).join(", ") || "–"],
    ["Kontakt", [p.email, p.phone].filter(Boolean).join(", ") || "–"],
    ["Investor", id.investor.name || "–"],
    ["Stavba", id.building.name || id.projectName || "–"],
    ["Místo stavby", id.building.address || ctx.site.address?.text || "–"],
    ["Stupeň", id.docStage],
    ["Číslo zakázky", id.jobNumber || "–"],
    ["Datum", dateText],
    ["Revize", id.revision || "–"],
    ["Dokument", "Analýza rizika – ochrana před bleskem"],
  ];
  if (p.stampNote) stamp.push(["Poznámka", p.stampNote]);

  const safeName = (id.jobNumber || id.projectName || "analyza")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .slice(0, 60);

  return {
    title: "Analýza rizika ochrany před bleskem",
    subtitle: `Ověření rizika podle ${ctx.methodology.title}`,
    projectName: id.projectName || "Projekt",
    unverified,
    disclaimer: RESULT_DISCLAIMER,
    accentColor: p.appearance.accentColor,
    headerText: p.appearance.headerText || `${id.projectName || "Analýza rizika"} – analýza rizika LPS`,
    footerText: p.appearance.footerText || [p.company || p.fullName, p.email].filter(Boolean).join(" | "),
    showLogoOnCover: p.appearance.showLogoOnCover,
    stamp,
    coverFacts: [
      ["Druh objektu", buildingType(ctx.buildingType.key).label],
      ["Výsledek", losses.map((l) => verdict(d, l)).join("; ")],
    ],
    blocks,
    meta: {
      runId: run.id,
      createdAt: created.toISOString(),
      coreVersion: run.coreVersion,
      inputHash: run.inputHash,
      normativeDataHash: result.normativeDataHash,
    },
    fileBaseName: `Analyza_rizika_${safeName || "projekt"}`,
  };
}
