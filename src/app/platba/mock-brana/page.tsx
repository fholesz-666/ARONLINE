import { notFound } from "next/navigation";
import { MockGatewayActions } from "@/components/mock-gateway";
import { getConfig } from "@/server/config";
import { MockGateway } from "@/server/payments/mock";

export const dynamic = "force-dynamic";

/** Simulovaná platební brána – existuje jen v režimu PAYMENTS_MODE=mock. */
export default async function MockGatewayPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (getConfig().PAYMENTS_MODE !== "mock") notFound();
  const { id } = await searchParams;
  const p = id ? MockGateway.get(id) : undefined;
  if (!p) notFound();
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="panel space-y-4 p-6">
        <p className="rounded-sm bg-signal-soft px-2 py-1 text-sm font-semibold">Testovací režim – simulovaná platební brána</p>
        <h1 className="text-xl">Platba objednávky {p.orderNumber}</h1>
        <p className="type-wide text-3xl font-bold">{(p.amountHaler / 100).toLocaleString("cs-CZ")} Kč</p>
        {p.recurrence && <p className="text-sm text-ink-soft">Opakovaná platba (předplatné), měsíční cyklus.</p>}
        <MockGatewayActions id={p.id} />
      </div>
    </main>
  );
}
