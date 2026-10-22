/**
 * PDF dokladu o zaplacení (faktura neplátce / plátce DPH podle nastavení provozovatele).
 */
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { InvoiceItem, InvoiceParty, InvoiceRow } from "../services/invoices";
import { PAYMENT_METHOD_LABEL } from "../services/invoices";
import { getPrinter } from "./pdf";

const INK = "#14213d";
const LINE = "#9aa8b8";
const czk = (h: number) => `${(h / 100).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const date = (d: Date | string) => new Date(d).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });

function party(title: string, p: InvoiceParty): Content {
  const lines: string[] = [];
  if (p.company) lines.push(p.company);
  if (p.name && p.name !== p.company) lines.push(p.name);
  if (p.address) lines.push(...p.address.split(/,\s*|\n/).filter(Boolean));
  if (p.ico) lines.push(`IČO: ${p.ico}`);
  if (p.dic) lines.push(`DIČ: ${p.dic}`);
  if (p.email) lines.push(p.email);
  if (p.phone) lines.push(`tel. ${p.phone}`);
  return {
    stack: [
      { text: title, fontSize: 8, color: "#5b6b7f", margin: [0, 0, 0, 3] },
      { text: lines[0] ?? "", bold: true, fontSize: 11 },
      ...lines.slice(1).map((l) => ({ text: l })),
      ...(p.registry ? [{ text: p.registry, fontSize: 7.5, color: "#5b6b7f", margin: [0, 4, 0, 0] } as Content] : []),
    ],
  };
}

export async function renderInvoicePdf(inv: InvoiceRow): Promise<Buffer> {
  const supplier = inv.supplier as InvoiceParty;
  const customer = inv.customer as InvoiceParty;
  const items = inv.items as InvoiceItem[];
  const canceled = inv.canceledAt != null;

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [48, 48, 48, 56],
    info: { title: `Faktura ${inv.number}`, author: supplier.name, creator: "ARONLINE" },
    defaultStyle: { font: "Roboto", fontSize: 9.5, color: INK, lineHeight: 1.2 },
    footer: (page, pages) => ({
      columns: [
        { text: "Doklad vystaven automaticky aplikací ARONLINE (aronline.cz).", fontSize: 7.5, color: "#5b6b7f" },
        { text: `${page} / ${pages}`, alignment: "right", fontSize: 7.5, color: "#5b6b7f" },
      ],
      margin: [48, 16, 48, 0],
    }),
    content: [
      {
        columns: [
          { text: "ARONLINE", bold: true, fontSize: 16, characterSpacing: 1 },
          {
            stack: [
              { text: supplier.vatPayer ? "FAKTURA – DAŇOVÝ DOKLAD" : "FAKTURA", bold: true, fontSize: 14, alignment: "right" },
              { text: `č. ${inv.number}`, fontSize: 12, alignment: "right" },
              ...(canceled ? [{ text: "STORNOVÁNO", bold: true, color: "#b3261e", alignment: "right" } as Content] : []),
            ],
          },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 6, x2: 499, y2: 6, lineWidth: 1, lineColor: INK }], margin: [0, 0, 0, 14] },
      { columns: [party("DODAVATEL", supplier), party("ODBĚRATEL", customer)], columnGap: 24 },
      {
        margin: [0, 18, 0, 0],
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              { text: "Datum vystavení", fontSize: 8, color: "#5b6b7f" },
              { text: supplier.vatPayer ? "Datum uskut. zdan. plnění" : "Datum uskutečnění plnění", fontSize: 8, color: "#5b6b7f" },
              { text: "Datum splatnosti", fontSize: 8, color: "#5b6b7f" },
              { text: "Variabilní symbol", fontSize: 8, color: "#5b6b7f" },
            ],
            [date(inv.issuedAt), date(inv.paidAt), date(inv.paidAt), inv.variableSymbol ?? inv.number],
            [
              { text: "Způsob úhrady", fontSize: 8, color: "#5b6b7f" },
              { text: "Stav", fontSize: 8, color: "#5b6b7f" },
              { text: "", colSpan: 2 },
              "",
            ],
            [PAYMENT_METHOD_LABEL[inv.paymentMethod] ?? inv.paymentMethod, { text: "Uhrazeno – neplaťte", bold: true }, { text: "", colSpan: 2 }, ""],
          ],
        },
        layout: "noBorders",
      },
      {
        margin: [0, 18, 0, 0],
        table: {
          headerRows: 1,
          widths: ["*", 40, 30, 80, 80],
          body: [
            [
              { text: "Položka", bold: true },
              { text: "Množ.", bold: true, alignment: "right" },
              { text: "MJ", bold: true },
              { text: "Cena za MJ", bold: true, alignment: "right" },
              { text: "Celkem", bold: true, alignment: "right" },
            ],
            ...items.map((i) => [
              i.name,
              { text: String(i.quantity), alignment: "right" },
              i.unit,
              { text: czk(i.unitHaler), alignment: "right" },
              { text: czk(i.totalHaler), alignment: "right" },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === 1 || i === node.table.body.length ? 0.75 : 0.25),
          vLineWidth: () => 0,
          hLineColor: () => LINE,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
      {
        margin: [0, 10, 0, 0],
        columns: [
          { text: "" },
          {
            width: 200,
            table: {
              widths: ["*", "auto"],
              body: [[{ text: "Celkem uhrazeno", bold: true, fontSize: 11 }, { text: czk(inv.totalHaler), bold: true, fontSize: 11, alignment: "right" }]],
            },
            layout: { hLineWidth: (i: number) => (i === 0 ? 1 : 0), vLineWidth: () => 0, hLineColor: () => INK, paddingTop: () => 5 },
          },
        ],
      },
      ...(inv.note ? [{ text: inv.note, margin: [0, 18, 0, 0] } as Content] : []),
      {
        text: "Předmět plnění: zpřístupnění dokumentace analýzy rizika v aplikaci ARONLINE (digitální obsah).",
        fontSize: 8,
        color: "#5b6b7f",
        margin: [0, 10, 0, 0],
      },
    ],
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
