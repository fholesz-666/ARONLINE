import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { CancelOrderButton } from "@/components/order-actions";
import { Notice } from "@/components/ui";
import { formatIban, spayd } from "@/domain/bank";
import { getCurrent } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { invoices, memberships, orders } from "@/server/db/schema";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Objednávka" };

const czk = (h: number) => `${(h / 100).toLocaleString("cs-CZ")} Kč`;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await getCurrent();
  if (!c) redirect("/prihlaseni?next=/app/predplatne");
  const { id } = await params;
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) notFound();
  const member = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, c.user.id), eq(memberships.workspaceId, order.workspaceId)),
  });
  if (!member) notFound();
  const settings = await getSettings();
  const snap = order.productSnapshot as { name: string };
  const invs = await db.query.invoices.findMany({ where: eq(invoices.orderId, order.id) });
  const due = new Date(order.createdAt.getTime() + settings.bank.dueDays * 86_400_000);
  const qrText =
    order.paymentMethod === "BANK" && settings.bank.iban
      ? spayd({ iban: settings.bank.iban, amountHaler: order.amountHaler, vs: order.variableSymbol ?? undefined, message: `ARONLINE ${order.number}` })
      : null;
  const qrSvg = qrText ? await QRCode.toString(qrText, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 220 }) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm">
        <Link className="link" href="/app/predplatne">
          ← Předplatné a kredity
        </Link>
      </p>
      <h1 className="mt-2 text-2xl">Objednávka {order.number}</h1>
      <p className="mt-1 text-ink-soft">
        {snap.name} · {czk(order.amountHaler)}
      </p>

      {order.status === "PAID" ? (
        <div className="mt-6 space-y-3">
          <Notice tone="ok" title="Zaplaceno">
            Platba byla přijata{order.paidAt ? ` ${order.paidAt.toLocaleDateString("cs-CZ")}` : ""}. Kredit je připsán
            {order.projectId ? " a analýza je odemčená" : ""}.
          </Notice>
          {invs.map((i) => (
            <p key={i.id}>
              <a className="btn btn-secondary" href={`/api/invoices/${i.id}`} target="_blank" rel="noopener">
                Doklad {i.number} (PDF)
              </a>
            </p>
          ))}
          {order.projectId && (
            <Link className="btn btn-primary" href={`/app/projekty/${order.projectId}?krok=vysledky`}>
              Zpět k analýze
            </Link>
          )}
        </div>
      ) : order.status === "CANCELED" ? (
        <Notice tone="warning" title="Objednávka je zrušená">
          Pokud jste už zaplatili, napište nám na{" "}
          <a className="link" href={`mailto:${settings.operator.email}`}>
            {settings.operator.email}
          </a>{" "}
          – platbu dohledáme a analýzu odemkneme.
        </Notice>
      ) : order.paymentMethod === "BANK" ? (
        <section className="panel mt-6 grid gap-6 p-5 sm:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-lg">Platební údaje</h2>
            <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-y-1.5 text-sm">
              <dt className="text-ink-soft">Částka</dt>
              <dd className="font-semibold">{czk(order.amountHaler)}</dd>
              <dt className="text-ink-soft">Číslo účtu</dt>
              <dd className="font-mono">{settings.bank.account}</dd>
              <dt className="text-ink-soft">IBAN</dt>
              <dd className="font-mono">{formatIban(settings.bank.iban)}</dd>
              <dt className="text-ink-soft">Variabilní symbol</dt>
              <dd className="font-mono font-semibold">{order.variableSymbol}</dd>
              <dt className="text-ink-soft">Zpráva pro příjemce</dt>
              <dd>ARONLINE {order.number}</dd>
              <dt className="text-ink-soft">Splatnost</dt>
              <dd>{due.toLocaleDateString("cs-CZ")}</dd>
              <dt className="text-ink-soft">Příjemce</dt>
              <dd>{settings.operator.name}</dd>
            </dl>
            <p className="mt-4 text-sm text-ink-soft">{settings.texts.bankTransferNote}</p>
            <div className="mt-4">
              <CancelOrderButton orderId={order.id} />
            </div>
          </div>
          {qrSvg && (
            <figure className="text-center">
              <div className="mx-auto w-[220px] bg-white p-1" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <figcaption className="mt-1 text-xs text-muted">QR Platba – naskenujte v bankovní aplikaci</figcaption>
            </figure>
          )}
        </section>
      ) : (
        <Notice tone="info" title="Čeká na potvrzení platby">
          Platba kartou zatím nebyla potvrzena platební bránou. Stav se aktualizuje automaticky.
        </Notice>
      )}
    </div>
  );
}
