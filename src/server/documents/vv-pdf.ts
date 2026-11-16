/**
 * PDF protokolu o určení vnějších vlivů (pdfmake, písmo Roboto s českou diakritikou).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { getPrinter } from "./pdf";
import type { VvDocModel } from "./vv-model";

const INK = "#14213d";
const SOFT = "#3d4a63";
const LINE = "#9aa8b8";
const ACCENT = "#0f766e";
const BAD = "#fbe7e5";
const HEAD = "#eef4f3";

/** Logo FVSOL do patičky bezplatné verze (public/brand/fvsol-logo.png); při chybě se patička vykreslí bez něj. */
let fvsolLogo: string | null | undefined;
function fvsolLogoDataUrl(): string | null {
  if (fvsolLogo !== undefined) return fvsolLogo;
  try {
    fvsolLogo = `data:image/png;base64,${readFileSync(path.join(process.cwd(), "public", "brand", "fvsol-logo.png")).toString("base64")}`;
  } catch {
    fvsolLogo = null;
  }
  return fvsolLogo;
}

const grid = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => LINE,
  vLineColor: () => LINE,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2.5,
  paddingBottom: () => 2.5,
};

const th = (text: string): TableCell => ({ text, bold: true, fontSize: 8, fillColor: HEAD });

function keyValue(rows: [string, string][]): Content {
  return {
    table: {
      widths: ["30%", "70%"],
      body: rows.map(([k, v]) => [
        { text: k, fontSize: 8.5, color: SOFT, fillColor: "#f7f9fb" },
        { text: v, fontSize: 9 },
      ]),
    },
    layout: grid,
    margin: [0, 2, 0, 10],
  };
}

export async function renderVvPdf(m: VvDocModel, logo?: { data: Buffer; mime: string } | null): Promise<Buffer> {
  const content: Content[] = [];

  /* ---------- Titulní část ---------- */
  if (logo) {
    content.push({ image: `data:${logo.mime};base64,${logo.data.toString("base64")}`, fit: [150, 50], margin: [0, 0, 0, 10] });
  }
  content.push({ text: m.title, fontSize: 17, bold: true, color: ACCENT, alignment: "center", margin: [0, 4, 0, 2] });
  content.push({ text: m.subtitle, fontSize: 9.5, color: SOFT, alignment: "center", margin: [0, 0, 0, 4] });
  if (m.number) content.push({ text: `Evidenční číslo: ${m.number}`, fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 12] });
  else content.push({ text: "", margin: [0, 0, 0, 8] });

  content.push(keyValue(m.facts));

  content.push({ text: "Složení komise", style: "h2" });
  content.push({
    table: {
      widths: ["18%", "38%", "44%"],
      body: [[th("Funkce"), th("Jméno"), th("Profese / kvalifikace")], ...m.committee.map((r) => r.map((t) => ({ text: t, fontSize: 9 })))],
    },
    layout: grid,
    margin: [0, 2, 0, 10],
  });

  content.push({ text: "Přehled posuzovaných prostor", style: "h2" });
  content.push({
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: ["6%", "34%", "15%", "13%", "32%"],
      body: [
        [th("Č."), th("Prostor"), th("Výsledek"), th("Min. krytí"), th("Vlivy, které nejsou normální")],
        ...m.summary.map((r) =>
          r.map((t, i) => ({
            text: t,
            fontSize: 8.5,
            bold: i === 2,
            color: i === 2 ? (t === "normální" ? "#2e7d4f" : "#b3261e") : undefined,
          })),
        ),
      ],
    },
    layout: grid,
    margin: [0, 2, 0, 10],
  });
  content.push({ text: m.generalConclusion, fontSize: 9, margin: [0, 0, 0, 6] });
  if (m.notes) content.push({ text: [{ text: "Poznámky komise: ", bold: true }, m.notes], fontSize: 9, margin: [0, 0, 0, 6] });

  /* ---------- Jednotlivé prostory ---------- */
  for (const s of m.spaces) {
    content.push({ text: `${s.index}) Posuzovaný prostor: ${s.name}`, style: "h1", pageBreak: "before" });
    if (s.note) content.push({ text: s.note, fontSize: 8.5, italics: true, color: SOFT, margin: [0, 0, 0, 6] });
    const body: TableCell[][] = [[th("Vnější vliv"), th("Kód"), th("Charakteristika"), th("Vlivy považované za normální")]];
    for (const sec of s.sections) {
      if (!sec.rows.length) continue;
      body.push([{ text: sec.label, colSpan: 4, bold: true, fontSize: 8.5, color: ACCENT, fillColor: "#f7f9fb" }, {}, {}, {}]);
      for (const r of sec.rows) {
        const fill = r.abnormal ? BAD : undefined;
        body.push([
          { text: r.name, fontSize: 8, fillColor: fill },
          { text: r.abnormal ? `${r.code} *` : r.code, fontSize: 8, bold: r.abnormal, fillColor: fill, color: r.notConsidered ? SOFT : undefined },
          { text: r.label, fontSize: 8, fillColor: fill, color: r.notConsidered ? SOFT : undefined },
          { text: r.normalCodes, fontSize: 7.5, color: SOFT, fillColor: fill },
        ]);
      }
    }
    content.push({ table: { headerRows: 1, dontBreakRows: true, widths: ["33%", "13%", "34%", "20%"], body }, layout: grid, margin: [0, 2, 0, 4] });
    content.push({ text: "* vliv, který není považován za normální", fontSize: 7.5, color: SOFT, margin: [0, 0, 0, 8] });

    const conclusion: Content[] = [
      {
        text: [
          { text: "Závěr: prostor je ", bold: true },
          { text: s.normal ? "NORMÁLNÍ" : "ABNORMÁLNÍ", bold: true, color: s.normal ? "#2e7d4f" : "#b3261e" },
          { text: `   ·   doporučené minimální krytí zařízení ${s.minIp}`, color: SOFT },
        ],
        fontSize: 10,
        margin: [0, 0, 0, 4],
      },
    ];
    if (!s.normal) {
      conclusion.push({ text: "Doporučená opatření:", bold: true, fontSize: 9, margin: [0, 4, 0, 2] });
      conclusion.push({ ul: s.measures.map((t) => ({ text: t, fontSize: 8.5 })), margin: [0, 0, 0, 4] });
    }
    content.push({ stack: conclusion, unbreakable: s.measures.length <= 8 });
  }

  /* ---------- Podpisy ---------- */
  const sigs: Content[] = [
    { text: "Podpisy členů komise", style: "h2", margin: [0, 18, 0, 6] },
    { text: m.signPlaceDate, fontSize: 9, margin: [0, 0, 0, 22] },
  ];
  const cols = m.signatures.map((p) => ({
    stack: [
      { text: "……………………………………", alignment: "center" as const, color: SOFT },
      { text: p.name, alignment: "center" as const, bold: true, fontSize: 9, margin: [0, 2, 0, 0] as [number, number, number, number] },
      { text: p.role, alignment: "center" as const, fontSize: 8, color: SOFT },
    ],
    margin: [0, 0, 0, 22] as [number, number, number, number],
  }));
  const rows: Content[] = [];
  for (let i = 0; i < cols.length; i += 3) {
    const row = cols.slice(i, i + 3);
    while (row.length < 3) row.push({ stack: [], margin: [0, 0, 0, 0] });
    rows.push({ columns: row, columnGap: 12 });
  }
  sigs.push(...rows);
  if (m.confirmation) sigs.push({ text: m.confirmation, fontSize: 7.5, color: SOFT, margin: [0, 4, 0, 0] });
  content.push({ stack: sigs, unbreakable: true });

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [48, 46, 48, m.branding ? 62 : 46],
    info: { title: `${m.title}${m.number ? ` ${m.number}` : ""}`, ...(m.branding ? { creator: "ARONLINE – VV online" } : {}) },
    defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.2, color: "#1a1a1a" },
    styles: {
      h1: { fontSize: 12.5, bold: true, color: INK, margin: [0, 0, 0, 6] },
      h2: { fontSize: 11, bold: true, color: INK, margin: [0, 8, 0, 4] },
    },
    footer: (page: number, count: number) => ({
      margin: [48, m.branding ? 10 : 14, 48, 0],
      stack: [
        ...(m.branding
          ? [
              { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.6, lineColor: ACCENT }] },
              {
                columns: [
                  ...(fvsolLogoDataUrl()
                    ? [{ image: fvsolLogoDataUrl()!, fit: [62, 16] as [number, number], width: 70, link: "https://fvsol.cz/?utm_source=aronline&utm_medium=vv&utm_campaign=pdf", margin: [0, 5, 0, 0] as [number, number, number, number] }]
                    : []),
                  {
                    stack: m.brandingLines.map((t, i) => ({ text: t, fontSize: 7, color: i === 0 ? ACCENT : "#66748b", bold: i === 0, margin: [0, i === 0 ? 3 : 1, 0, 0] as [number, number, number, number] })),
                  },
                  { text: `Strana ${page} z ${count}`, fontSize: 7.5, color: "#66748b", alignment: "right" as const, width: 70, margin: [0, 3, 0, 0] as [number, number, number, number] },
                ],
              },
            ]
          : [
              {
                columns: [
                  { text: m.number ? `Protokol o určení vnějších vlivů ${m.number}` : "Protokol o určení vnějších vlivů", fontSize: 7.5, color: "#66748b" },
                  { text: `Strana ${page} z ${count}`, fontSize: 7.5, color: "#66748b", alignment: "right" as const },
                ],
              },
            ]),
      ],
    }),
    content,
  };

  const pdf = getPrinter().createPdfKitDocument(doc);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.end();
  });
}
