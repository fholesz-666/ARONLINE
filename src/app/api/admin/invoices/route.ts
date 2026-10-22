import { requireAdmin } from "@/server/auth/session";
import { handler, json } from "@/server/http";
import { invoicesCsv, listAllInvoices } from "@/server/services/admin";

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const u = new URL(req.url);
  const y = Number(u.searchParams.get("year"));
  const rows = await listAllInvoices({ year: Number.isInteger(y) && y > 2000 && y < 2200 ? y : undefined });
  if (u.searchParams.get("format") === "csv") {
    return new Response(invoicesCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="doklady${y ? `-${y}` : ""}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return json({ invoices: rows });
});
