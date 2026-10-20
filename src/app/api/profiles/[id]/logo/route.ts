import { requireMember } from "@/server/auth/session";
import { badRequest, handler, json, notFound } from "@/server/http";
import { getProfile, setLogo } from "@/server/services/profiles";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const p = await getProfile(c.workspaceId, id);
  if (!p.logo || !p.logoMime) throw notFound("Logo není nahráno.");
  return new Response(new Uint8Array(p.logo), {
    headers: { "Content-Type": p.logoMime, "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" },
  });
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > 400_000) throw badRequest("Logo může mít nejvýše 300 kB.");
  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) throw badRequest("Vyberte soubor s logem.");
  await setLogo(c.workspaceId, id, Buffer.from(await file.arrayBuffer()));
  return json({ ok: true });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const c = await requireMember();
  const { id } = await ctx.params;
  await setLogo(c.workspaceId, id, null);
  return json({ ok: true });
});
