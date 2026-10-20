/**
 * Export do PDF (pdfmake, písmo Roboto s plnou českou diakritikou).
 */
import PdfPrinter from "pdfmake";
import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import type { Block, ReportModel } from "./model";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfsModule = require("pdfmake/build/vfs_fonts.js");
const vfs: Record<string, string> = vfsModule.pdfMake?.vfs ?? vfsModule.vfs ?? vfsModule;
const font = (name: string) => Buffer.from(vfs[name], "base64");

let printer: PdfPrinter | null = null;
function getPrinter() {
  printer ??= new PdfPrinter({
    Roboto: {
      normal: font("Roboto-Regular.ttf"),
      bold: font("Roboto-Medium.ttf"),
      italics: font("Roboto-Italic.ttf"),
      bolditalics: font("Roboto-MediumItalic.ttf"),
    },
  });
  return printer;
}

const INK = "#14213d";
const LINE = "#9aa8b8";
const OK = "#e3f3e9";
const BAD = "#fbe7e5";

const gridLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => LINE,
  vLineColor: () => LINE,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2.5,
  paddingBottom: () => 2.5,
};

function widthsFrom(cols: number, w?: number[]): (string | number)[] {
  if (w && w.length === cols) return w.map((x) => `${x}%`);
  return Array.from({ length: cols }, () => "*");
}

function blockToPdf(b: Block, accent: string): Content[] {
  switch (b.type) {
    case "heading":
      return [{ text: b.text, style: `h${b.level}`, color: b.level === 1 ? accent : INK, headlineLevel: b.level } as Content];
    case "paragraph":
      if (b.style === "warning") {
        return [
          {
            table: { widths: ["*"], body: [[{ text: b.text, bold: true, color: "#7a1a14", margin: [4, 3, 4, 3] }]] },
            layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i === 0 ? 3 : 0), vLineColor: () => "#b3261e", fillColor: () => BAD },
            margin: [0, 4, 0, 6],
          } as Content,
        ];
      }
      return [
        {
          text: b.text,
          margin: [0, 0, 0, 5],
          bold: b.style === "strong",
          italics: b.style === "note",
          fontSize: b.style === "small" ? 8 : b.style === "note" ? 8.5 : undefined,
          color: b.style === "small" || b.style === "note" ? "#3d4a63" : undefined,
        },
      ];
    case "bullets":
      // pdfmake upravuje předané pole – předáváme kopii, aby model zůstal nedotčen
      return [{ ul: [...b.items], margin: [0, 0, 0, 6] }];
    case "table": {
      const hl = new Map((b.highlightRows ?? []).map((h) => [h.index, h.tone === "ok" ? OK : BAD]));
      const body: TableCell[][] = [
        b.columns.map((c) => ({ text: c, bold: true, fillColor: "#eef2f6", fontSize: 8 })),
        ...b.rows.map((r, ri) =>
          r.map((v, ci) => ({
            text: v,
            fontSize: 8,
            alignment: (b.numericCols ?? []).includes(ci) ? ("right" as const) : ("left" as const),
            fillColor: hl.get(ri),
          })),
        ),
      ];
      return [{ table: { headerRows: 1, dontBreakRows: true, widths: widthsFrom(b.columns.length, b.widths), body }, layout: gridLayout, margin: [0, 2, 0, 8] }];
    }
    case "keyvalue":
      return [
        {
          table: {
            widths: ["36%", "64%"],
            dontBreakRows: true,
            body: b.rows.map(([k, v]) => [
              { text: k, fontSize: 8.5, color: "#3d4a63", fillColor: "#f7f9fb" },
              { text: v, fontSize: 8.5 },
            ]),
          },
          layout: gridLayout,
          margin: [0, 2, 0, 8],
        },
      ];
    case "link":
      return [{ text: b.text, link: b.url, color: accent, decoration: "underline", margin: [0, 0, 0, 6] }];
    case "pagebreak":
      return [{ text: "", pageBreak: "after" }];
  }
}

export async function renderPdf(model: ReportModel, logo?: { data: Buffer; mime: string } | null): Promise<Buffer> {
  const accent = model.accentColor;
  const cover: Content[] = [];
  if (logo && model.showLogoOnCover) {
    cover.push({ image: `data:${logo.mime};base64,${logo.data.toString("base64")}`, fit: [160, 60], margin: [0, 0, 0, 10] });
  }
  cover.push({ text: model.title, fontSize: 24, bold: true, color: accent, margin: [0, 90, 0, 6] });
  cover.push({ text: model.subtitle, fontSize: 13, color: "#3d4a63", margin: [0, 0, 0, 18] });
  cover.push({ text: model.projectName, fontSize: 16, bold: true, color: INK, margin: [0, 0, 0, 24] });
  if (model.unverified) {
    cover.push({
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: "NEOVĚŘENÝ VÝPOČET – výpočetní jádro dosud neprošlo nezávislým odborným ověřením. Dokument nelze použít jako normově ověřený podklad.",
              bold: true,
              color: "#7a1a14",
              margin: [6, 5, 6, 5],
            },
          ],
        ],
      },
      layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i === 0 ? 4 : 0), vLineColor: () => "#b3261e", fillColor: () => BAD },
      margin: [0, 0, 0, 18],
    } as Content);
  }
  for (const [k, v] of model.coverFacts) cover.push({ text: [{ text: `${k}: `, bold: true }, v], margin: [0, 0, 0, 4] });
  // Razítko
  cover.push({
    table: {
      widths: ["28%", "72%"],
      body: model.stamp.map(([k, v]) => [
        { text: k, fontSize: 7.5, color: "#3d4a63" },
        { text: v, fontSize: 9, bold: k === "Dokument" },
      ]),
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 1.2 : 0.5),
      vLineWidth: (i: number) => (i === 1 ? 0.5 : 1.2),
      hLineColor: () => INK,
      vLineColor: () => INK,
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
    margin: [0, 60, 0, 0],
    pageBreak: "after",
  } as Content);

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [50, 58, 50, 56],
    info: { title: `${model.title} – ${model.projectName}`, author: model.footerText || "ARONLINE", creator: "ARONLINE", subject: model.subtitle },
    defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.25, color: "#1a1a1a" },
    styles: {
      h1: { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      h2: { fontSize: 11.5, bold: true, margin: [0, 9, 0, 4] },
      h3: { fontSize: 10, bold: true, margin: [0, 6, 0, 3] },
    },
    header: (currentPage: number) =>
      currentPage === 1
        ? null
        : {
            margin: [50, 22, 50, 0],
            stack: [
              {
                columns: [
                  { text: model.headerText, fontSize: 8, color: "#3d4a63" },
                  model.unverified ? { text: "NEOVĚŘENÝ VÝPOČET", fontSize: 8, bold: true, color: "#b3261e", alignment: "right" } : { text: "" },
                ],
              },
              { canvas: [{ type: "line", x1: 0, y1: 4, x2: 495, y2: 4, lineWidth: 0.8, lineColor: accent }] },
            ],
          },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [50, 14, 50, 0],
      columns: [
        { text: model.footerText, fontSize: 7.5, color: "#66748b" },
        {
          stack: [
            { text: `Strana ${currentPage} z ${pageCount}   |   ID výpočtu ${model.meta.runId.slice(0, 8)}`, fontSize: 7.5, color: "#66748b", alignment: "right" },
            { text: "Projekce FVE a LPS: fvsol.cz", link: "https://fvsol.cz", fontSize: 7, color: "#66748b", alignment: "right" },
          ],
        },
      ],
    }),
    // nadpis nesmí zůstat osamocen na konci stránky
    pageBreakBefore: (node, followingNodesOnPage) =>
      Boolean((node as unknown as { headlineLevel?: number }).headlineLevel) && followingNodesOnPage.length === 0,
    content: [...cover, ...structuredClone(model.blocks).flatMap((b) => blockToPdf(b, accent))],
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
