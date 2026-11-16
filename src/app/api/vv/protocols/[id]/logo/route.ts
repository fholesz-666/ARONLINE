import { badRequest, handler, json, notFound } from "@/server/http";
import { getProtocol, setProtocolLogo } from "@/server/services/vv";
import { limitVvRead, vvToken } from "@/server/vv-http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const row = await getProtocol(id, vvToken(req));
  if (!row.logo || !row.logoMime) throw notFound("Logo není nahráno.");
  return new Response(new Uint8Array(row.logo), {
    headers: { "Content-Type": row.logoMime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
});

/** Nahrání loga (PNG/JPEG do 300 kB). V dokumentu se použije jen v placené verzi. */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > 400_000) throw badRequest("Logo může mít nejvýše 300 kB.");
  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) throw badRequest("Vyberte soubor s logem.");
  await setProtocolLogo(id, vvToken(req) ?? "", Buffer.from(await file.arrayBuffer()));
  return json({ ok: true });
});

export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await limitVvRead(req);
  const { id } = await ctx.params;
  await setProtocolLogo(id, vvToken(req) ?? "", null);
  return json({ ok: true });
});
