import type { VvProtocolData } from "@/core/vv/schema";
import { buildVvDoc } from "@/server/documents/vv-model";
import { renderVvPdf } from "@/server/documents/vv-pdf";
import { handler } from "@/server/http";
import { getProtocol, protocolFileName } from "@/server/services/vv";
import { limitVvRead, vvToken, vvViewer } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/** PDF protokolu. Bezplatná verze s reklamní patičkou, placená bez ní a s logem. */
export const GET = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const row = await getProtocol(id, vvToken(req), (await vvViewer())?.userId);
  const premium = row.premiumAt != null;
  const confirmedAt = (row.confirmations as { at?: string } | null)?.at ?? null;
  const model = buildVvDoc(row.data as VvProtocolData, { premium, confirmedAt });
  const logo = premium && row.logo && row.logoMime ? { data: row.logo, mime: row.logoMime } : null;
  const pdf = await renderVvPdf(model, logo);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${protocolFileName(row, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  });
});
