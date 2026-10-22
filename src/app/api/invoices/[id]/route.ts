import { isAdmin, requireUser } from "@/server/auth/session";
import { renderInvoicePdf } from "@/server/documents/invoice-pdf";
import { handler } from "@/server/http";
import { getInvoiceFor, invoiceFileName } from "@/server/services/invoices";

type Ctx = { params: Promise<{ id: string }> };

/** PDF dokladu – pro člena prostoru, kde doklad vznikl, nebo pro správce. */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireUser();
  const { id } = await ctx.params;
  const inv = await getInvoiceFor(id, { userId: c.user.id, isAdmin: isAdmin(c) });
  const pdf = await renderInvoicePdf(inv);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceFileName(inv)}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
