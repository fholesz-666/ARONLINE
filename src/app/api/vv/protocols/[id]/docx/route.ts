import type { VvProtocolData } from "@/core/vv/schema";
import { renderVvDocx } from "@/server/documents/vv-docx";
import { buildVvDoc } from "@/server/documents/vv-model";
import { handler, paymentRequired } from "@/server/http";
import { getProtocol, protocolFileName } from "@/server/services/vv";
import { limitVvRead, vvToken } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/** Editovatelný DOCX – jen placená verze protokolu. */
export const GET = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const row = await getProtocol(id, vvToken(req));
  if (!row.premiumAt) throw paymentRequired("Export do Wordu je součástí placené verze protokolu.");
  const confirmedAt = (row.confirmations as { at?: string } | null)?.at ?? null;
  const model = buildVvDoc(row.data as VvProtocolData, { premium: true, confirmedAt });
  const logo = row.logo && row.logoMime ? { data: row.logo, mime: row.logoMime } : null;
  const docx = await renderVvDocx(model, logo);
  return new Response(new Uint8Array(docx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${protocolFileName(row, "docx")}"`,
      "Cache-Control": "no-store",
    },
  });
});
