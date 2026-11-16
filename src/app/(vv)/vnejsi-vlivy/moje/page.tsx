import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VvPromoStrip } from "@/components/vv/chrome";
import { getCurrent } from "@/server/auth/session";
import { creditBalance } from "@/server/services/billing";
import { listUserProtocols } from "@/server/services/vv";

export const metadata: Metadata = {
  title: { absolute: "Moje protokoly | VV online" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VvMinePage() {
  const c = await getCurrent();
  if (!c || c.user.isGuest) redirect("/prihlaseni?next=/vnejsi-vlivy/moje");
  const [protocols, credits] = await Promise.all([listUserProtocols(c.user.id), c.workspaceId ? creditBalance(c.workspaceId) : Promise.resolve(0)]);
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Moje protokoly</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Přihlášen: {c.user.email} · kredity na účtu: <strong>{credits}</strong>
            {credits > 0 && " – kreditem odemknete Profi verzi protokolu"}
          </p>
        </div>
        <Link href="/vnejsi-vlivy/novy" className="vv-btn vv-btn-primary">
          Nový protokol
        </Link>
      </div>
      {protocols.length === 0 ? (
        <div className="vv-card p-6 text-sm text-ink-soft">
          Zatím tu nemáte žádný protokol. Protokoly vytvořené po přihlášení, nebo otevřené přes odkaz z e-mailu v přihlášeném stavu, se sem uloží
          automaticky.
        </div>
      ) : (
        <ul className="vv-card divide-y divide-[var(--vv-line)]">
          {protocols.map((p) => (
            <li key={p.id}>
              <Link href={`/vnejsi-vlivy/protokol/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 no-underline hover:bg-[var(--vv-bg)]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {p.name}
                    {p.number ? ` · ${p.number}` : ""}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {p.address} · {p.spaces} {p.spaces === 1 ? "prostor" : p.spaces < 5 ? "prostory" : "prostorů"} · upraveno {new Date(p.updatedAt).toLocaleDateString("cs-CZ")}
                  </span>
                </span>
                <span className={`vv-chip ${p.premium ? "vv-chip-accent" : "bg-line-soft text-ink-soft"}`}>{p.premium ? "Profi" : "Zdarma"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <VvPromoStrip campaign="moje" />
    </div>
  );
}
