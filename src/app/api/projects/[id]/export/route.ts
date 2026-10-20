import { requireMember } from "@/server/auth/session";
import { exportDocument } from "@/server/documents/export";
import { badRequest, handler } from "@/server/http";
import { enforce, LIMITS } from "@/server/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const fmt = (sp.get("format") ?? "pdf").toUpperCase();
  if (fmt !== "PDF" && fmt !== "DOCX") throw badRequest("Neznámý formát.");
  await enforce(`export:${c.user.id}`, LIMITS.export);
  const doc = await exportDocument({
    userId: c.user.id,
    workspaceId: c.workspaceId,
    projectId: id,
    format: fmt,
    runId: sp.get("run"),
  });
  return new Response(new Uint8Array(doc.body), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `attachment; filename="${doc.filename}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
