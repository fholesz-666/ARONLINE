/**
 * Export do editovatelného DOCX (Microsoft Word) – skutečný text, styly a tabulky, žádné obrázky stránek.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type { Block, ReportModel } from "./model";

const FONT = "Arial";
const INK = "14213D";
const LINE = "9AA8B8";
const OK_FILL = "E3F3E9";
const BAD_FILL = "FBE7E5";

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

function hex(c: string) {
  return c.replace("#", "").toUpperCase();
}

function textRuns(text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}): TextRun[] {
  const lines = text.split("\n");
  return lines.map(
    (l, i) =>
      new TextRun({ text: l, break: i > 0 ? 1 : undefined, bold: opts.bold, size: opts.size, color: opts.color, italics: opts.italics, font: FONT }),
  );
}

function cell(text: string, opts: { header?: boolean; width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string } = {}) {
  return new TableCell({
    borders,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { type: ShadingType.CLEAR, fill: "EEF2F6", color: "auto" } : opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ alignment: opts.align, children: textRuns(text, { bold: opts.header, size: 17 }) })],
  });
}

function table(columns: string[], rows: string[][], widths?: number[], numericCols: number[] = [], highlight?: { index: number; tone: "ok" | "bad" }[]) {
  const hl = new Map((highlight ?? []).map((h) => [h.index, h.tone === "ok" ? OK_FILL : BAD_FILL]));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, children: columns.map((c, i) => cell(c, { header: true, width: widths?.[i] })) }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            cantSplit: true,
            children: r.map((v, i) =>
              cell(v, { width: widths?.[i], align: numericCols.includes(i) ? AlignmentType.RIGHT : AlignmentType.LEFT, fill: hl.get(ri) }),
            ),
          }),
      ),
    ],
  });
}

function keyValue(rows: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          cantSplit: true,
          children: [cell(k, { width: 36, fill: "F7F9FB" }), cell(v, { width: 64 })],
        }),
    ),
  });
}

function blockToDocx(b: Block): (Paragraph | Table)[] {
  switch (b.type) {
    case "heading":
      return [
        new Paragraph({
          heading: b.level === 1 ? HeadingLevel.HEADING_1 : b.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          keepNext: true,
          children: [new TextRun({ text: b.text, font: FONT })],
        }),
      ];
    case "paragraph": {
      const style = b.style ?? "normal";
      if (style === "warning") {
        return [
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: BAD_FILL, color: "auto" },
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: "B3261E", space: 6 } },
            spacing: { before: 120, after: 120 },
            children: textRuns(b.text, { bold: true, color: "7A1A14" }),
          }),
        ];
      }
      return [
        new Paragraph({
          spacing: { after: 100 },
          children: textRuns(b.text, {
            bold: style === "strong",
            size: style === "small" ? 16 : style === "note" ? 18 : undefined,
            italics: style === "note",
            color: style === "small" || style === "note" ? "3D4A63" : undefined,
          }),
        }),
      ];
    }
    case "bullets":
      return b.items.map((t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: textRuns(t) }));
    case "table":
      return [table(b.columns, b.rows, b.widths, b.numericCols, b.highlightRows), new Paragraph({ text: "" })];
    case "keyvalue":
      return [keyValue(b.rows), new Paragraph({ text: "" })];
    case "link":
      return [
        new Paragraph({
          children: [new ExternalHyperlink({ link: b.url, children: [new TextRun({ text: b.text, style: "Hyperlink", font: FONT })] })],
        }),
      ];
    case "pagebreak":
      return [new Paragraph({ children: [new PageBreak()] })];
  }
}

export async function renderDocx(model: ReportModel, logo?: { data: Buffer; mime: string } | null): Promise<Buffer> {
  const accent = hex(model.accentColor);
  const cover: (Paragraph | Table)[] = [];
  if (logo && model.showLogoOnCover) {
    cover.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: logo.mime === "image/png" ? "png" : "jpg",
            data: logo.data,
            transformation: { width: 160, height: 60 },
          }),
        ],
      }),
    );
  }
  cover.push(
    new Paragraph({
      spacing: { before: 1800, after: 160, line: 240, lineRule: LineRuleType.AUTO },
      children: [new TextRun({ text: model.title, bold: true, size: 48, color: accent, font: FONT })],
    }),
  );
  cover.push(
    new Paragraph({
      spacing: { after: 300, line: 240, lineRule: LineRuleType.AUTO },
      children: [new TextRun({ text: model.subtitle, size: 26, color: "3D4A63", font: FONT })],
    }),
  );
  cover.push(new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: model.projectName, bold: true, size: 32, color: INK, font: FONT })] }));
  if (model.unverified) {
    cover.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: BAD_FILL, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: "B3261E", space: 8 } },
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: "NEOVĚŘENÝ VÝPOČET – výpočetní jádro dosud neprošlo nezávislým odborným ověřením. Dokument nelze použít jako normově ověřený podklad.",
            bold: true,
            color: "7A1A14",
            font: FONT,
          }),
        ],
      }),
    );
  }
  for (const [k, v] of model.coverFacts) {
    cover.push(new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true, font: FONT }), new TextRun({ text: v, font: FONT })] }));
  }
  cover.push(new Paragraph({ spacing: { before: 1400 }, text: "" }));
  cover.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: model.stamp.map(
        ([k, v]) =>
          new TableRow({
            children: [
              new TableCell({
                borders: { top: { style: BorderStyle.SINGLE, size: 8, color: INK }, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK }, left: { style: BorderStyle.SINGLE, size: 8, color: INK }, right: { style: BorderStyle.SINGLE, size: 4, color: INK } },
                width: { size: 28, type: WidthType.PERCENTAGE },
                margins: { top: 30, bottom: 30, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: k, size: 15, color: "3D4A63", font: FONT })] })],
              }),
              new TableCell({
                borders: { top: { style: BorderStyle.SINGLE, size: 8, color: INK }, bottom: { style: BorderStyle.SINGLE, size: 8, color: INK }, left: { style: BorderStyle.SINGLE, size: 4, color: INK }, right: { style: BorderStyle.SINGLE, size: 8, color: INK } },
                width: { size: 72, type: WidthType.PERCENTAGE },
                margins: { top: 30, bottom: 30, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: v, size: 18, bold: k === "Dokument", font: FONT })] })],
              }),
            ],
          }),
      ),
    }),
  );

  const header = new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 4 } },
        children: [
          new TextRun({ text: model.headerText, size: 16, color: "3D4A63", font: FONT }),
          ...(model.unverified ? [new TextRun({ text: "   |   NEOVĚŘENÝ VÝPOČET", size: 16, bold: true, color: "B3261E", font: FONT })] : []),
        ],
      }),
    ],
  });
  const footerChildren: ParagraphChild[] = [
    new TextRun({ text: model.footerText ? `${model.footerText}   |   ` : "", size: 15, color: "66748B", font: FONT }),
    new TextRun({ children: ["Strana ", PageNumber.CURRENT, " z ", PageNumber.TOTAL_PAGES], size: 15, color: "66748B", font: FONT }),
    new TextRun({ text: `   |   ID výpočtu ${model.meta.runId.slice(0, 8)}`, size: 15, color: "66748B", font: FONT }),
  ];
  const footer = new Footer({
    children: [new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } }, children: footerChildren })],
  });

  const doc = new Document({
    creator: "ARONLINE",
    title: `${model.title} – ${model.projectName}`,
    description: model.subtitle,
    styles: {
      default: { document: { run: { font: FONT, size: 19, color: "1A1A1A" }, paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: accent, font: FONT }, paragraph: { spacing: { before: 320, after: 140 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: INK, font: FONT }, paragraph: { spacing: { before: 220, after: 100 } } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 20, bold: true, color: INK, font: FONT }, paragraph: { spacing: { before: 160, after: 80 } } },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: cover,
      },
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        headers: { default: header },
        footers: { default: footer },
        children: model.blocks.flatMap(blockToDocx),
      },
    ],
  });
  return Packer.toBuffer(doc);
}
