import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/ui";
import { getCurrent } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { orders, payments } from "@/server/db/schema";
import { errorMeta, log } from "@/server/log";
import { syncPayment } from "@/server/payments/service";
import { getMembership } from "@/server/services/workspace";

export const dynamic = "force-dynamic";

/**
 * Návrat z platební brány. Samotný návrat NENÍ důkazem platby –
 * stav se ověří dotazem na API brány (syncPayment).
 */
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const c = await getCurrent();
  if (!c) redirect(`/prihlaseni?next=${encodeURIComponent(`/platba/navrat?id=${id ?? ""}`)}`);
  let state: string | null = null;
  let order: typeof orders.$inferSelect | undefined;
  let error: string | null = null;

  if (!id || !/^\d{1,20}$/.test(id)) {
    error = "Chybí identifikace platby.";
  } else {
    const db = getDb();
    const [row] = await db
      .select({ order: orders })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(eq(payments.providerPaymentId, id)))
      .limit(1);
    if (!row || !(await getMembership(c.user.id, row.order.workspaceId))) {
      error = "Platba nebyla nalezena.";
    } else {
      try {
        const r = await syncPayment(id, "return");
        state = r && "state" in r ? (r.state ?? null) : null;
      } catch (e) {
        log.warn("return_sync_failed", errorMeta(e));
        error = "Stav platby se nepodařilo ověřit. Pokud byla platba provedena, připíše se automaticky po potvrzení bránou.";
      }
      order = (await db.query.orders.findFirst({ where: eq(orders.id, row.order.id) })) ?? row.order;
    }
  }

  const paid = order?.status === "PAID" || state === "PAID";
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Brand href="/app" />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-12">
        <h1 className="text-2xl">Výsledek platby</h1>
        {error && <Notice tone="error">{error}</Notice>}
        {order && paid && (
          <Notice tone="ok" title="Platba přijata">
            Objednávka {order.number} je zaplacená.{" "}
            {order.projectId ? "Analýza je odemčená – dokumentaci můžete stáhnout." : "Kredity nebo předplatné jsou aktivní."}
          </Notice>
        )}
        {order && !paid && (state === "CANCELED" || state === "TIMEOUTED") && (
          <Notice tone="warning" title="Platba neproběhla">
            Platba byla zrušena nebo vypršela. Nic vám nebylo účtováno. Můžete to zkusit znovu.
          </Notice>
        )}
        {order && !paid && state !== "CANCELED" && state !== "TIMEOUTED" && (
          <Notice tone="info" title="Čekáme na potvrzení platby">
            Platební brána zatím platbu nepotvrdila. Jakmile ji potvrdí, kredit se připíše automaticky. Stránku můžete za chvíli obnovit.
          </Notice>
        )}
        <div className="flex gap-2">
          {order?.projectId && (
            <Link className="btn btn-primary" href={`/app/projekty/${order.projectId}?krok=vysledky`}>
              Zpět k analýze
            </Link>
          )}
          <Link className="btn btn-secondary" href="/app/predplatne">
            Přehled plateb
          </Link>
        </div>
      </main>
    </div>
  );
}
