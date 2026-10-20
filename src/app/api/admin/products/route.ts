import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { products } from "@/server/db/schema";
import { handler, json, notFound, readJson } from "@/server/http";
import { listProducts } from "@/server/services/billing";

export const GET = handler(async () => {
  await requireAdmin();
  return json({ products: await listProducts(false) });
});

/** Úprava ceny a parametrů produktu (bez zásahu do výpočetního jádra). */
export const PUT = handler(async (req: Request) => {
  const c = await requireAdmin();
  const body = await readJson(
    req,
    z.object({
      code: z.string().max(40),
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(500),
      priceCzk: z.number().int().min(1).max(1_000_000),
      credits: z.number().int().min(0).max(10_000).nullable(),
      unlocksPerPeriod: z.number().int().min(1).max(100_000).nullable(),
      maxMembers: z.number().int().min(1).max(500),
      active: z.boolean(),
    }),
  );
  const [row] = await getDb()
    .update(products)
    .set({
      name: body.name,
      description: body.description,
      priceHaler: body.priceCzk * 100,
      credits: body.credits,
      unlocksPerPeriod: body.unlocksPerPeriod,
      maxMembers: body.maxMembers,
      active: body.active,
    })
    .where(eq(products.code, body.code))
    .returning();
  if (!row) throw notFound();
  await audit("admin.product_update", { userId: c.user.id, meta: { code: body.code, priceCzk: body.priceCzk } });
  return json({ ok: true });
});
