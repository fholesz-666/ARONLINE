/**
 * Editovatelný DOCX protokolu o určení vnějších vlivů (jen placená verze).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
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
} from "docx";
import type { VvDocModel } from "./vv-model";

const FONT = "Arial";
const INK = "14213D";
const SOFT = "3D4A63";
const LINE = "9AA8B8";
const ACCENT = "0F766E";
const BAD = "FBE7E5";
const HEAD = "EEF4F3";

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

function run(text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) {
  return text.split("\n").map((l, i) => new TextRun({ text: l, break: i > 0 ? 1 : undefined, font: FONT, ...o }));
}

function cell(text: string, o: { width?: number; fill?: string; bold?: boolean; size?: number; color?: string; span?: number } = {}) {
  return new TableCell({
    borders,
    columnSpan: o.span,
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: run(text, { bold: o.bold, size: o.size ?? 17, color: o.color }) })],
  });
}

/** Šířka textu stránky A4 při okrajích 1000 twipů. */
const TEXT_WIDTH = 11906 - 2000;
const cols = (pct: number[]) => pct.map((p) => Math.round((TEXT_WIDTH * p) / 100));

function grid(widths: number[], header: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: cols(widths),
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, { width: widths[i], fill: HEAD, bold: true })) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, { width: widths[i] })) })),
    ],
  });
}

/** Rozměry obrázku PNG/JPEG z hlavičky (pro zachování poměru stran loga). */
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

function fitBox(buf: Buffer, maxW: number, maxH: number) {
  const s = imageSize(buf);
  if (!s || !s.width || !s.height) return { width: maxW, height: maxH };
  const k = Math.min(maxW / s.width, maxH / s.height);
  return { width: Math.round(s.width * k), height: Math.round(s.height * k) };
}

const p = (text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 100 }, children: run(text, o) });

const h = (text: string, size = 23, color = INK) => new Paragraph({ keepNext: true, spacing: { before: 200, after: 100 }, children: run(text, { bold: true, size, color }) });

export async function renderVvDocx(m: VvDocModel, logo?: { data: Buffer; mime: string } | null): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  if (logo) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new ImageRun({ type: logo.mime === "image/png" ? "png" : "jpg", data: logo.data, transformation: fitBox(logo.data, 180, 60) })],
      }),
    );
  }
  children.push(p(m.title, { bold: true, size: 32, color: ACCENT, align: AlignmentType.CENTER, after: 60 }));
  children.push(p(m.subtitle, { size: 19, color: SOFT, align: AlignmentType.CENTER, after: 60 }));
  if (m.number) children.push(p(`Evidenční číslo: ${m.number}`, { bold: true, align: AlignmentType.CENTER, after: 240 }));

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: cols([30, 70]),
      layout: TableLayoutType.FIXED,
      rows: m.facts.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell(k, { width: 30, fill: "F7F9FB", color: SOFT }), cell(v, { width: 70 })] })),
    }),
  );
  children.push(h("Složení komise"));
  children.push(grid([18, 38, 44], ["Funkce", "Jméno", "Profese / kvalifikace"], m.committee));
  children.push(h("Přehled posuzovaných prostor"));
  children.push(grid([6, 34, 15, 13, 32], ["Č.", "Prostor", "Výsledek", "Min. krytí", "Vlivy, které nejsou normální"], m.summary));
  children.push(p(""));
  children.push(p(m.generalConclusion));
  if (m.notes) children.push(p(`Poznámky komise: ${m.notes}`));

  for (const s of m.spaces) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(h(`${s.index}) Posuzovaný prostor: ${s.name}`, 25));
    if (s.note) children.push(p(s.note, { italics: true, size: 17, color: SOFT }));
    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: ["Vnější vliv", "Kód", "Charakteristika", "Vlivy považované za normální"].map((t, i) => cell(t, { width: [33, 13, 34, 20][i], fill: HEAD, bold: true })),
      }),
    ];
    for (const sec of s.sections) {
      if (!sec.rows.length) continue;
      rows.push(new TableRow({ cantSplit: true, children: [cell(sec.label, { span: 4, bold: true, color: ACCENT, fill: "F7F9FB" })] }));
      for (const r of sec.rows) {
        const fill = r.abnormal ? BAD : undefined;
        rows.push(
          new TableRow({
            cantSplit: true,
            children: [
              cell(r.name, { width: 33, fill, size: 16 }),
              cell(r.abnormal ? `${r.code} *` : r.code, { width: 13, fill, bold: r.abnormal, size: 16 }),
              cell(r.label, { width: 34, fill, size: 16 }),
              cell(r.normalCodes, { width: 20, fill, size: 15, color: SOFT }),
            ],
          }),
        );
      }
    }
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: cols([33, 13, 34, 20]), layout: TableLayoutType.FIXED, rows }));
    children.push(p("* vliv, který není považován za normální", { size: 15, color: SOFT }));
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({ text: "Závěr: prostor je ", bold: true, font: FONT }),
          new TextRun({ text: s.normal ? "NORMÁLNÍ" : "ABNORMÁLNÍ", bold: true, color: s.normal ? "2E7D4F" : "B3261E", font: FONT }),
          new TextRun({ text: `   ·   doporučené minimální krytí zařízení ${s.minIp}`, color: SOFT, font: FONT }),
        ],
      }),
    );
    if (!s.normal) {
      children.push(p("Doporučená opatření:", { bold: true, after: 40 }));
      for (const t of s.measures) children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: run(t, { size: 17 }) }));
    }
  }

  children.push(h("Podpisy členů komise"));
  children.push(p(m.signPlaceDate, { after: 480 }));
  const sigRows: TableRow[] = [];
  for (let i = 0; i < m.signatures.length; i += 3) {
    const slice = m.signatures.slice(i, i + 3);
    while (slice.length < 3) slice.push({ name: "", role: "" });
    sigRows.push(
      new TableRow({
        cantSplit: true,
        children: slice.map(
          (s) =>
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
              children: s.name
                ? [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: run("……………………………………", { color: SOFT }) }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: run(s.name, { bold: true, size: 18 }) }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: run(s.role, { size: 16, color: SOFT }) }),
                  ]
                : [new Paragraph("")],
            }),
        ),
      }),
    );
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: cols([33, 34, 33]), layout: TableLayoutType.FIXED, rows: sigRows }));
  if (m.confirmation) children.push(p(m.confirmation, { size: 15, color: SOFT }));

  const footer = new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
        children: [
          new TextRun({ text: m.number ? `Protokol o určení vnějších vlivů ${m.number}   |   ` : "Protokol o určení vnějších vlivů   |   ", size: 15, color: "66748B", font: FONT }),
          new TextRun({ children: ["Strana ", PageNumber.CURRENT, " z ", PageNumber.TOTAL_PAGES], size: 15, color: "66748B", font: FONT }),
        ],
      }),
    ],
  });

  const doc = new Document({
    title: m.title,
    styles: { default: { document: { run: { font: FONT, size: 19, color: "1A1A1A" }, paragraph: { spacing: { line: 264, lineRule: LineRuleType.AUTO } } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, footers: { default: footer }, children }],
  });
  return Packer.toBuffer(doc);
}
